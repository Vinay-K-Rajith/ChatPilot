import { MongoDBService, ServerLead } from '../server/services/mongodb.service';
import type { CreateLead } from '../shared/models/lead';

/**
 * Migration script to populate GMT_Leads collection with sample data
 * Run with: tsx scripts/migrateDummyLeads.ts
 */

const sampleLeads: Array<Omit<ServerLead, '_id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: "Sarah Johnson",
    phone: "+1 234 567 8900",
    email: "sarah.j@example.com",
    status: "qualified",
    engagementScore: 85,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    name: "Mike Chen",
    phone: "+1 234 567 8901",
    email: "mike.chen@example.com",
    status: "contacted",
    engagementScore: 62,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    name: "Emma Davis",
    phone: "+1 234 567 8902",
    email: "emma.d@example.com",
    status: "new",
    engagementScore: 30,
  },
  {
    name: "James Wilson",
    phone: "+1 234 567 8903",
    email: "j.wilson@example.com",
    status: "converted",
    engagementScore: 95,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
  {
    name: "Lisa Anderson",
    phone: "+1 234 567 8904",
    email: "lisa.anderson@example.com",
    status: "lost",
    engagementScore: 15,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
  },
  {
    name: "Robert Taylor",
    phone: "+1 555 123 4567",
    email: "robert.taylor@example.com",
    status: "new",
    engagementScore: 45,
  },
  {
    name: "Jennifer Brown",
    phone: "+1 555 987 6543",
    email: "jen.brown@example.com",
    status: "contacted",
    engagementScore: 72,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
  },
  {
    name: "Michael Davis",
    phone: "+1 555 555 5555",
    email: "mdavis@example.com",
    status: "qualified",
    engagementScore: 88,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    name: "Amanda Rodriguez",
    phone: "+1 777 888 9999",
    email: "amanda.r@example.com",
    status: "new",
    engagementScore: 25,
  },
  {
    name: "David Kim",
    phone: "+1 444 333 2222",
    email: "david.kim@example.com",
    status: "converted",
    engagementScore: 92,
    lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
  }
];

async function main() {
  console.log('🚀 Starting lead migration...');
  
  try {
    // Get MongoDB service instance
    const mongodbService = MongoDBService.getInstance();
    
    // Connect to database
    await mongodbService.connect();
    console.log('✅ Connected to MongoDB');
    
    // Check if leads already exist
    const existingLeads = await mongodbService.getLeads({}, { limit: 1 });
    
    if (existingLeads.total > 0) {
      console.log(`ℹ️  Found ${existingLeads.total} existing leads in database`);
      console.log('❓ Do you want to add sample leads anyway? (They might conflict with existing phone numbers)');
      
      // In a real implementation, you might want to add readline for user input
      // For now, let's skip if leads exist
      console.log('⏭️  Skipping migration - leads already exist');
      return;
    }
    
    // Import sample leads
    console.log(`📥 Importing ${sampleLeads.length} sample leads...`);
    
    const result = await mongodbService.importLeads(sampleLeads);
    
    console.log(`✅ Migration completed!`);
    console.log(`   - Successfully imported: ${result.success}`);
    console.log(`   - Failed imports: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Import errors:`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error}`);
      });
    }
    
    // Display final stats
    const finalStats = await mongodbService.getLeads({}, { limit: 1 });
    console.log(`📊 Total leads in database: ${finalStats.total}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  console.log('✨ Migration script completed!');
  process.exit(0);
}

// Run the migration
main();

export { main };
