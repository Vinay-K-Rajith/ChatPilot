/**
 * Migration script to convert existing GMT_KB articles from title to query field structure
 * 
 * This script updates articles that have a 'title' field to use 'query' field instead,
 * maintaining backward compatibility while standardizing the schema.
 * 
 * Run with: node server/scripts/migrate-articles.js
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function migrateArticles() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'test';
  
  console.log('🔄 Starting article migration...');
  console.log(`📡 Connecting to: ${uri}`);
  console.log(`📚 Database: ${dbName}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('GMT_KB');
    
    // Find articles that have 'query' field but no 'title' field
    const articlesToMigrate = await collection.find({
      query: { $exists: true },
      title: { $exists: false }
    }).toArray();
    
    console.log(`📄 Found ${articlesToMigrate.length} articles to migrate`);
    
    if (articlesToMigrate.length === 0) {
    console.log('🎉 No migration needed - all articles already have title fields!');
    return;
    }
    
    // Migrate each article
    let migratedCount = 0;
    
    for (const article of articlesToMigrate) {
      try {
        await collection.updateOne(
          { _id: article._id },
          {
            $set: { title: article.query },
            $unset: { query: "" }
          }
        );
        
        console.log(`✅ Migrated: "${article.query}" -> title field`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate article ${article._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} articles`);
    console.log(`❌ Failed migrations: ${articlesToMigrate.length - migratedCount} articles`);
    
    // Verify migration
    const remainingQueryArticles = await collection.countDocuments({
      query: { $exists: true },
      title: { $exists: false }
    });
    
    if (remainingQueryArticles === 0) {
      console.log('✅ Verification: All articles now have title fields');
    } else {
      console.warn(`⚠️  Warning: ${remainingQueryArticles} articles still have query field`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateArticles()
    .then(() => {
      console.log('\n🚀 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateArticles };