// Script to create a new Pinecone index with correct dimensions for Gemini embeddings
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function createCorrectIndex() {
  try {
    console.log('🔧 Creating Pinecone index with correct dimensions...');
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY not found');
      return;
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const newIndexName = 'interview-docs-gemini';
    
    // Check if index already exists
    const indexes = await pinecone.listIndexes();
    const existingIndex = indexes.indexes?.find(i => i.name === newIndexName);
    
    if (existingIndex) {
      console.log(`✅ Index "${newIndexName}" already exists with correct dimensions!`);
      console.log('Index details:', {
        name: existingIndex.name,
        dimension: existingIndex.dimension,
        metric: existingIndex.metric
      });
      
      // Update .env file to use this index
      console.log('\n🔧 Please update your .env file:');
      console.log(`PINECONE_INDEX_NAME="${newIndexName}"`);
      return;
    }

    // Create new index with correct dimensions
    console.log(`📊 Creating index "${newIndexName}" with 768 dimensions...`);
    
    await pinecone.createIndex({
      name: newIndexName,
      dimension: 768, // Match Gemini embedding dimensions (correct property name)
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('✅ Index created successfully!');
    console.log('\n🔧 Please update your .env file:');
    console.log(`PINECONE_INDEX_NAME="${newIndexName}"`);
    console.log('\nThen restart your development server.');
    
  } catch (error) {
    console.error('❌ Failed to create index:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('✅ Index already exists, you can use it!');
    } else if (error.message.includes('quota')) {
      console.log('\n💡 Alternative solution:');
      console.log('1. Delete the existing "developer-quickstart-js" index from Pinecone dashboard');
      console.log('2. Create a new one with 768 dimensions');
      console.log('3. Or use a different embedding model that produces 1024 dimensions');
    }
  }
}

async function suggestAlternatives() {
  console.log('\n🔧 Alternative Solutions:');
  console.log('\n1️⃣ **Create new index** (Recommended):');
  console.log('   - Run this script to create a new index with 768 dimensions');
  console.log('\n2️⃣ **Delete and recreate existing index**:');
  console.log('   - Go to Pinecone dashboard');
  console.log('   - Delete "developer-quickstart-js" index');
  console.log('   - Create new index with 768 dimensions');
  console.log('\n3️⃣ **Use different embedding model**:');
  console.log('   - Switch to a model that produces 1024 dimensions');
  console.log('   - But Gemini text-embedding-004 is optimal for this use case');
}

async function main() {
  console.log('🚀 Pinecone Index Dimension Fix Tool\n');
  
  try {
    await createCorrectIndex();
  } catch (error) {
    console.error('Error:', error.message);
    await suggestAlternatives();
  }
}

main();