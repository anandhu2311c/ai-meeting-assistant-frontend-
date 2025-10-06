import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { safePdfParse } from '../../../lib/safePdfParse';

// Use Node.js runtime for PDF processing
export const runtime = 'nodejs';

async function generateEmbeddings(text: string): Promise<number[]> {
  // Try Gemini first, then fall back to OpenAI
  try {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_NEW_GEMINI_API_KEY_HERE") {
      console.log('🧮 Trying Gemini embeddings...');
      const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = gemini.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      
      if (result.embedding && result.embedding.values) {
        console.log('✅ Gemini embeddings successful');
        return result.embedding.values;
      }
    }
  } catch (error: any) {
    console.log('⚠️ Gemini embeddings failed, trying OpenAI fallback...', error.message);
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('🧮 Using OpenAI embeddings as fallback...');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      
      if (response.data && response.data[0]?.embedding) {
        console.log('✅ OpenAI embeddings successful');
        return response.data[0].embedding;
      }
    } catch (error: any) {
      console.log('❌ OpenAI embeddings also failed:', error.message);
    }
  }

  throw new Error('No embedding service available - check your API keys');
}

async function uploadPDFToVectorDB(file: File): Promise<boolean> {
  try {
    console.log('🔍 Checking API keys...');
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY not found');
      return false;
    }

    console.log('✅ Pinecone API key found, initializing services...');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    console.log('📄 Parsing PDF...');
    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await safePdfParse(buffer);

    if (!pdfData.text || pdfData.text.length === 0) {
      throw new Error('PDF parsing failed - no text content found');
    }

    console.log(`📄 PDF parsed successfully, text length: ${pdfData.text.length}`);

    // Split into chunks
    const chunks = splitIntoChunks(pdfData.text, 1000);
    console.log(`📄 Split into ${chunks.length} chunks`);
    
    // Generate embeddings and store
    const indexName = process.env.PINECONE_INDEX_NAME || 'interview-docs';
    const index = pinecone.index(indexName);
    const vectors = [];

    console.log('🧮 Generating embeddings...');
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbeddings(chunks[i]);
        
        vectors.push({
          id: `${file.name}-chunk-${i}`,
          values: embedding,
          metadata: {
            content: chunks[i],
            filename: file.name,
            chunkIndex: i,
            title: file.name.replace('.pdf', ''),
            uploadDate: new Date().toISOString(),
            contentType: 'text'
          }
        });

        console.log(`✅ Generated embedding for chunk ${i + 1}/${chunks.length}`);
      } catch (embeddingError: any) {
        console.error(`❌ Embedding error for chunk ${i}:`, embeddingError.message);
        throw new Error(`Embedding generation failed: ${embeddingError.message}`);
      }
    }

    console.log('📤 Uploading to Pinecone...');
    await index.upsert(vectors);
    console.log('✅ Upload to Pinecone completed');
    
    return true;
  } catch (error: any) {
    console.error('❌ Error uploading PDF:', error);
    return false;
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  
  return chunks;
}

async function deletePDFFromVectorDB(filename: string): Promise<boolean> {
  try {
    if (!process.env.PINECONE_API_KEY) {
      return false;
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'interview-docs';
    const index = pinecone.index(indexName);
    
    // Find all chunks for this document
    const searchResponse = await index.query({
      vector: new Array(1536).fill(0), // Default dimension for most embedding models
      topK: 10000,
      includeMetadata: true,
      filter: { filename: { $eq: filename } }
    });

    if (searchResponse.matches && searchResponse.matches.length > 0) {
      const idsToDelete = searchResponse.matches.map(match => match.id);
      await index.deleteMany(idsToDelete);
    }

    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📄 PDF upload request received');
    
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error('❌ No file provided in request');
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    console.log(`📄 Processing PDF: ${file.name} (${file.size} bytes)`);

    const success = await uploadPDFToVectorDB(file);

    if (success) {
      console.log('✅ PDF upload completed successfully');
      return NextResponse.json({ 
        message: "PDF uploaded successfully",
        filename: file.name,
        size: file.size
      });
    } else {
      console.error('❌ PDF upload failed');
      return NextResponse.json({ 
        error: "Failed to upload PDF - check server logs for details" 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("❌ PDF upload error:", error);
    console.error("Error stack:", error.stack);
    
    // Provide more specific error messages
    let errorMessage = "Internal server error";
    if (error.message) {
      if (error.message.includes('API key not valid')) {
        errorMessage = "Invalid API key - please check your configuration";
      } else if (error.message.includes('embedding')) {
        errorMessage = "Failed to generate embeddings - check API access";
      } else if (error.message.includes('Pinecone')) {
        errorMessage = "Database connection error - check Pinecone configuration";
      } else {
        errorMessage = `Upload failed: ${error.message}`;
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const success = await deletePDFFromVectorDB(filename);

    if (success) {
      return NextResponse.json({ message: "PDF deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 });
    }
  } catch (error) {
    console.error("PDF delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}