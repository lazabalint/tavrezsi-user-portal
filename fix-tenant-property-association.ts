import { db } from './server/db';
import { propertyTenants } from './shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * This script creates a property tenant association for the user with ID 17
 * to access the property with ID 9 (Kartács 25)
 */
async function main() {
  try {
    console.log('Updating property tenant association...');
    
    // Update the existing association to set isActive to true
    const updated = await db.update(propertyTenants)
      .set({ isActive: true })
      .where(
        and(
          eq(propertyTenants.userId, 17),
          eq(propertyTenants.propertyId, 9)
        )
      )
      .returning();
    
    console.log('Updated association:', updated);
    
    if (updated.length === 0) {
      console.log('No association found to update. Creating new one...');
      
      // Create a new association if update didn't find any records
      const inserted = await db.insert(propertyTenants).values({
        userId: 17,
        propertyId: 9,
        isActive: true,
        startDate: new Date()
      }).returning();
      
      console.log('Created new association:', inserted);
    }
    
    // Verify the update
    const verifyAssociation = await db.select().from(propertyTenants)
      .where(
        and(
          eq(propertyTenants.userId, 17), 
          eq(propertyTenants.propertyId, 9)
        )
      );
    
    console.log('Current association status:', verifyAssociation);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();