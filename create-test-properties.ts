import { neon, neonConfig } from '@neondatabase/serverless';
import { DatabaseStorage } from './server/storage';

const main = async () => {
  console.log('Creating test properties...');
  
  try {
    const storage = new DatabaseStorage();
    
    // Get owner users
    const owner1 = await storage.getUserByUsername("tulajdonos");
    const owner2 = await storage.getUserByUsername("tulajdonos2");
    
    if (!owner1) {
      console.log("Owner1 (tulajdonos) not found in database");
      return;
    }
    
    if (!owner2) {
      console.log("Owner2 (tulajdonos2) not found in database");
      return;
    }
    
    console.log("Owner1 ID:", owner1.id);
    console.log("Owner2 ID:", owner2.id);
    
    // Create properties for owner1
    try {
      await storage.createProperty({
        name: "Budapest Lakás",
        address: "Budapest, Petőfi utca 1.",
        owner_id: owner1.id
      });
      console.log("Property 1 created for Owner1");
    } catch (error) {
      console.error("Failed to create Property 1:", error);
    }
    
    try {
      await storage.createProperty({
        name: "Debrecen Ház",
        address: "Debrecen, Kossuth tér 5.",
        owner_id: owner1.id
      });
      console.log("Property 2 created for Owner1");
    } catch (error) {
      console.error("Failed to create Property 2:", error);
    }
    
    // Create property for owner2
    try {
      await storage.createProperty({
        name: "Szeged Villa",
        address: "Szeged, Tisza part 10.",
        owner_id: owner2.id
      });
      console.log("Property created for Owner2");
    } catch (error) {
      console.error("Failed to create Property for Owner2:", error);
    }
    
    console.log('Test properties creation completed successfully');
  } catch (err) {
    console.error("Error in test properties creation:", err);
  }
};

main();