import { db } from './server/db';
import { propertyTenants, users, properties } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking property tenant associations for user 17...');
    const tenantAssocs = await db.select().from(propertyTenants).where(eq(propertyTenants.userId, 17));
    console.log('Property tenant associations:', tenantAssocs);
    
    // Check if there are any inactive associations
    console.log('Checking for inactive property tenant associations...');
    const inactiveAssocs = await db.select().from(propertyTenants).where(
      and(
        eq(propertyTenants.userId, 17),
        eq(propertyTenants.isActive, false)
      )
    );
    console.log('Inactive property tenant associations:', inactiveAssocs);
    
    // Get user details
    console.log('Getting user details for ID 17...');
    const user = await db.select().from(users).where(eq(users.id, 17));
    console.log('User details:', user);
    
    // Get Kartács property
    console.log('Looking for Kartács property...');
    const kartacsProperty = await db.select().from(properties).where(eq(properties.address, 'Budapest, Kartács utca 25.'));
    console.log('Kartács property:', kartacsProperty);
    
    if (kartacsProperty.length > 0) {
      const propertyId = kartacsProperty[0].id;
      
      // Create active association if it doesn't exist
      if (tenantAssocs.length === 0) {
        console.log('Creating association between user 17 and property', propertyId);
        
        const newAssoc = await db.insert(propertyTenants).values({
          userId: 17,
          propertyId: propertyId,
          isActive: true,
        }).returning();
        
        console.log('Created new association:', newAssoc);
      } else if (inactiveAssocs.length > 0) {
        // Update inactive association to active
        console.log('Updating inactive association to active');
        
        const updated = await db.update(propertyTenants)
          .set({ isActive: true })
          .where(
            and(
              eq(propertyTenants.userId, 17),
              eq(propertyTenants.propertyId, propertyId)
            )
          )
          .returning();
          
        console.log('Updated association:', updated);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();