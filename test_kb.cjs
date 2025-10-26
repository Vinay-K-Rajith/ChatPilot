const { MongoClient } = require('mongodb');
require('dotenv').config();

class MongoDBService {
  constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.MONGODB_DB_NAME || 'test';
    this.client = new MongoClient(uri);
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.legacyArticles = db.collection('GMT_KB');
    this.isConnected = true;
  }

  async getRelevantKnowledge(query) {
    await this.connect();
    if (!query?.trim()) return '';
    
    // Extract meaningful words from the query
    const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    if (words.length === 0) return '';
    
    // Create regex patterns for flexible matching
    const searchConditions = words.map(word => ({
      $or: [
        { title: { $regex: word, $options: 'i' } },
        { content: { $regex: word, $options: 'i' } }
      ]
    }));
    
    // Find articles that match any of the search words
    const results = await this.legacyArticles.find({
      $or: searchConditions
    }).limit(10).toArray();
    
    console.log(`Knowledge search for "${query}" found ${results.length} articles`);
    
    return results.map(r => `${r.title}: ${r.content}`).join('\n\n');
  }

  async close() {
    await this.client.close();
  }
}

async function testKnowledgeRetrieval() {
  const service = new MongoDBService();
  
  console.log('Testing knowledge retrieval...\n');
  
  const testQueries = [
    'global metal direct',
    'products',
    'business model',
    'steel',
    'pricing'
  ];
  
  for (const query of testQueries) {
    console.log(`=== Testing query: "${query}" ===`);
    const result = await service.getRelevantKnowledge(query);
    console.log('Result:', result ? result.substring(0, 200) + '...' : 'No results');
    console.log('');
  }
  
  await service.close();
}

testKnowledgeRetrieval().catch(console.error);