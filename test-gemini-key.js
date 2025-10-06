// Test script to verify Gemini API key
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiKey() {
  try {
    console.log('🔑 Testing Gemini API Key...');
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Found' : 'Not found');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return;
    }

    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test with embedding model (used for PDF upload)
    console.log('🧮 Testing embedding model...');
    const model = gemini.getGenerativeModel({ 
      model: 'text-embedding-004'
    });
    
    const result = await model.embedContent('test content');
    
    if (result.embedding && result.embedding.values) {
      console.log('✅ Gemini API key is working!');
      console.log('🎯 Embedding dimensions:', result.embedding.values.length);
    } else {
      console.log('❌ Failed to get embedding response');
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.log('\n🔧 Solutions:');
      console.log('1. Get a new API key from https://aistudio.google.com/app/apikey');
      console.log('2. Make sure the API key has access to embedding models');
      console.log('3. Check if there are any usage quotas exceeded');
    }
  }
}

testGeminiKey();