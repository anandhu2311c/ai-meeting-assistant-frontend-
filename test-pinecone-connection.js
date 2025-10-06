// Test script to verify Pinecone connection and PDF upload process
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPineconeConnection() {
  try {
    console.log('🔑 Testing Pinecone Connection...');
    console.log('Pinecone API Key:', process.env.PINECONE_API_KEY ? 'Found' : 'Not found');
    console.log('Index Name:', process.env.PINECONE_INDEX_NAME);
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY not found in environment variables');
      return false;
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    console.log('📊 Testing index connection...');
    const indexName = process.env.PINECONE_INDEX_NAME || 'interview-docs';
    
    // List indexes to see what's available
    try {
      const indexes = await pinecone.listIndexes();
      console.log('Available indexes:', indexes.indexes?.map(i => i.name) || 'None');
      
      // Check if our target index exists
      const targetIndex = indexes.indexes?.find(i => i.name === indexName);
      if (!targetIndex) {
        console.error(`❌ Index "${indexName}" not found!`);
        console.log('💡 Available indexes:', indexes.indexes?.map(i => i.name).join(', ') || 'None');
        return false;
      }
      
      console.log(`✅ Index "${indexName}" found!`);
      console.log('Index details:', {
        name: targetIndex.name,
        dimension: targetIndex.dimension,
        metric: targetIndex.metric,
        status: targetIndex.status
      });
      
      // Test actual connection to the index
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      console.log('📊 Index stats:', {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension
      });
      
      // Test a simple query to make sure the connection works
      console.log('🔍 Testing query functionality...');
      const testVector = new Array(stats.dimension || 768).fill(0.1);
      const queryResult = await index.query({
        vector: testVector,
        topK: 1,
        includeMetadata: false
      });
      
      console.log('✅ Pinecone connection test successful!');
      console.log('Query returned:', queryResult.matches?.length || 0, 'matches');
      
      return true;
      
    } catch (indexError) {
      console.error('❌ Index operation failed:', indexError.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Pinecone connection test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('Unauthorized')) {
      console.log('\n🔧 Solutions:');
      console.log('1. Check if your Pinecone API key is correct');
      console.log('2. Verify your Pinecone project settings');
    } else if (error.message.includes('not found')) {
      console.log('\n🔧 Solutions:');
      console.log('1. Create the index in your Pinecone dashboard');
      console.log('2. Check the index name in your .env file');
    }
    
    return false;
  }
}

async function testCompleteWorkflow() {
  try {
    console.log('\n🧪 Testing Complete PDF Upload Workflow...');
    
    // Test 1: Gemini Embeddings
    console.log('\n1️⃣ Testing Gemini Embeddings...');
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({ model: 'text-embedding-004' });
    const testText = "This is a test document for interview preparation.";
    const result = await model.embedContent(testText);
    
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Failed to generate embedding');
    }
    
    console.log('✅ Gemini embeddings working, dimensions:', result.embedding.values.length);
    
    // Test 2: Pinecone Connection
    console.log('\n2️⃣ Testing Pinecone Connection...');
    const pineconeOk = await testPineconeConnection();
    
    if (!pineconeOk) {
      console.log('❌ Pinecone connection failed - this is likely the issue!');
      return;
    }
    
    // Test 3: Full Upload Simulation
    console.log('\n3️⃣ Testing simulated upload...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'interview-docs';
    const index = pinecone.index(indexName);
    
    // Create a test vector
    const testVector = {
      id: `test-upload-${Date.now()}`,
      values: result.embedding.values,
      metadata: {
        content: testText,
        filename: 'test.pdf',
        chunkIndex: 0,
        title: 'test',
        uploadDate: new Date().toISOString(),
        contentType: 'text'
      }
    };
    
    // Try to upsert
    await index.upsert([testVector]);
    console.log('✅ Test upload successful!');
    
    // Clean up test data
    await index.deleteOne(testVector.id);
    console.log('✅ Test cleanup successful!');
    
    console.log('\n🎉 All tests passed! PDF upload should work now.');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    console.error('Full error:', error);
  }
}

async function main() {
  console.log('🧪 Starting comprehensive PDF upload diagnostics...\n');
  
  // Test individual components
  await testCompleteWorkflow();
}

main();