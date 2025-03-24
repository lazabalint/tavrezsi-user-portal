import { db } from './server/db';
import { properties } from './shared/schema';

async function main() {
  try {
    const allProperties = await db.select().from(properties);
    console.log('All properties:');
    allProperties.forEach(prop => {
      console.log(`ID: ${prop.id}, Name: ${prop.name}, Address: ${prop.address}, Owner ID: ${prop.ownerId}`);
    });
    
    // Check property with ID 9 specifically
    console.log('\nChecking property with ID 9:');
    const property9 = allProperties.find(p => p.id === 9);
    console.log(property9);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();