const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'test';

async function checkKB() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  console.log('Checking GMT_KB collection...');
  const articles = await db.collection('GMT_KB').find().limit(5).toArray();
  console.log('Articles found:', articles.length);
  articles.forEach((a, i) => {
    console.log(`Article ${i+1}:`, {
      _id: a._id,
      title: a.title,
      query: a.query,
      content: a.content?.substring(0, 100) + '...'
    });
  });
  
  await client.close();
}

checkKB().catch(console.error);