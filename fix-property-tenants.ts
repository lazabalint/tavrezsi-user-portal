import { db } from './server/db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { propertyTenants } from './shared/schema';
import { sql } from 'drizzle-orm';

/**
 * This script alters the property_tenants table to change tenant_id to user_id if needed
 * or creates the correct columns based on the schema definition
 */
async function main() {
  try {
    console.log("Starting property_tenants table fix...");
    
    // First check if the column exists
    const columnCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'property_tenants' AND column_name = 'user_id'
    `);
    
    const rows = columnCheckResult.rows;
    console.log("Column check result:", rows);
    
    if (rows.length === 0) {
      console.log("Column 'user_id' does not exist, trying to add it");
      
      // Check if tenant_id exists (perhaps there was a naming mismatch)
      const tenantIdCheckResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'property_tenants' AND column_name = 'tenant_id'
      `);
      
      if (tenantIdCheckResult.rows.length > 0) {
        // Rename tenant_id to user_id
        console.log("Found tenant_id column, renaming to user_id");
        await db.execute(sql`
          ALTER TABLE property_tenants RENAME COLUMN tenant_id TO user_id
        `);
      } else {
        // The column doesn't exist at all, add it
        console.log("Adding user_id column to property_tenants table");
        await db.execute(sql`
          ALTER TABLE property_tenants ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        `);
      }
    } else {
      console.log("Column 'user_id' already exists, no changes needed");
    }
    
    console.log("Property tenants table fix completed successfully");
  } catch (error) {
    console.error("Error fixing property_tenants table:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });