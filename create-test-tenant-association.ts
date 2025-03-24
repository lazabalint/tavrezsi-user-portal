import { neon, neonConfig } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://tavrezsi-main_owner:npg_GOaANP7ZXv4w@ep-long-dream-a26etgjh-pooler.eu-central-1.aws.neon.tech/tavrezsi-main?sslmode=require";

const main = async () => {
  console.log('Creating test tenant-property association...');
  
  try {
    // Configure neon to work in serverless environments
    neonConfig.fetchConnectionCache = true;
    
    // Create a Neon client
    const sql = neon(DATABASE_URL);
    
    // First get tenant ID
    const tenantResult = await sql`SELECT id FROM users WHERE username = 'berlo'`;
    if (tenantResult.length === 0) {
      console.error('Tenant user not found');
      return;
    }
    
    const tenantId = tenantResult[0].id;
    console.log(`Tenant ID: ${tenantId}`);
    
    // Get a property from owner1 (ID = 2)
    const propertyResult = await sql`SELECT id FROM properties WHERE owner_id = 2 LIMIT 1`;
    if (propertyResult.length === 0) {
      console.error('No properties found for owner1');
      return;
    }
    
    const propertyId = propertyResult[0].id;
    console.log(`Property ID: ${propertyId}`);
    
    // Create association
    const insertResult = await sql`
      INSERT INTO property_tenants (property_id, tenant_id, is_active) 
      VALUES (${propertyId}, ${tenantId}, true)
      RETURNING id
    `;
    
    console.log(`Created tenant-property association with ID: ${insertResult[0].id}`);
    console.log('Test tenant-property association created successfully');
    
  } catch (err) {
    console.error("Error creating tenant-property association:", err);
  }
};

main();