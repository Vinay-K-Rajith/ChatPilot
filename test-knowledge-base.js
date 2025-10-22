// Test script to verify knowledge base integration
// Run this with: node test-knowledge-base.js

const fetch = require('node-fetch');

async function testKnowledgeBaseIntegration() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Knowledge Base Integration...\n');
  
  try {
    // 1. Test adding knowledge base entries
    console.log('1. Adding sample knowledge base entries...');
    
    const sampleKnowledge = [
      {
        title: 'Steel Sheets',
        content: 'We offer high-quality steel sheets in various grades including A36, A572, and stainless steel. Available in thicknesses from 0.5mm to 25mm. Prices start at $2.50 per square foot.'
      },
      {
        title: 'Aluminum Products',
        content: 'Our aluminum products include sheets, plates, bars, and tubes. We carry 6061-T6, 7075-T6, and 2024-T3 alloys. Custom cutting and fabrication services available.'
      },
      {
        title: 'Pricing Information',
        content: 'Our pricing is competitive and based on current market rates. Volume discounts available for orders over 1000 lbs. Contact our sales team for custom quotes.'
      },
      {
        title: 'Delivery Services',
        content: 'We offer same-day pickup and next-day delivery within 50 miles. Nationwide shipping available via freight carriers. Free delivery on orders over $500.'
      }
    ];
    
    for (const entry of sampleKnowledge) {
      const response = await fetch(`${baseUrl}/api/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      
      if (response.ok) {
        console.log(`✅ Added: ${entry.title}`);
      } else {
        console.log(`❌ Failed to add: ${entry.title}`);
      }
    }
    
    // 2. Test retrieving all knowledge base entries
    console.log('\n2. Retrieving all knowledge base entries...');
    const knowledgeResponse = await fetch(`${baseUrl}/api/knowledge-base`);
    const knowledge = await knowledgeResponse.json();
    console.log(`✅ Found ${knowledge.length} knowledge base entries`);
    
    // 3. Test preview chat with knowledge base integration
    console.log('\n3. Testing preview chat with knowledge base...');
    
    const testMessages = [
      'What steel products do you have?',
      'Tell me about aluminum sheets',
      'What are your prices?',
      'Do you offer delivery?'
    ];
    
    for (const message of testMessages) {
      console.log(`\n📤 User: ${message}`);
      
      const chatResponse = await fetch(`${baseUrl}/api/chat/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          conversationHistory: []
        })
      });
      
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log(`🤖 AI: ${chatData.content}`);
      } else {
        console.log(`❌ Chat failed for: ${message}`);
      }
    }
    
    console.log('\n✅ Knowledge base integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testKnowledgeBaseIntegration();
