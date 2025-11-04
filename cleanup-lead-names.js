// MongoDB script to clean up leads that have phone numbers as names
// This removes the name field from any lead where the name contains digits

// Run this script using MongoDB shell or Node.js with MongoDB driver

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupLeadNames() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'test';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const leadsCollection = db.collection('GMT_Leads');
    
    // Find leads with names containing digits (phone numbers)
    const invalidLeads = await leadsCollection.find({
      name: { $regex: /\d/ }
    }).toArray();
    
    console.log(`\nFound ${invalidLeads.length} leads with invalid names (containing digits)\n`);
    
    if (invalidLeads.length === 0) {
      console.log('✓ No cleanup needed. All lead names are valid!');
      return;
    }
    
    // Show what will be cleaned
    console.log('Leads to be cleaned:');
    console.log('='.repeat(70));
    invalidLeads.forEach((lead, idx) => {
      console.log(`${idx + 1}. Phone: ${lead.phone}, Invalid Name: "${lead.name}"`);
    });
    console.log('='.repeat(70));
    
    // Remove the name field from these leads
    const result = await leadsCollection.updateMany(
      { name: { $regex: /\d/ } },
      { $unset: { name: "" } }
    );
    
    console.log(`\n✓ Cleanup completed!`);
    console.log(`  - Leads updated: ${result.modifiedCount}`);
    console.log(`  - Matched leads: ${result.matchedCount}`);
    console.log('\nThese leads will now be asked for their name when they message again.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupLeadNames()
    .then(() => {
      console.log('\n✓ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupLeadNames };
