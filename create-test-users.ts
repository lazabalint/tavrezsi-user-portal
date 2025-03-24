import { neon, neonConfig } from '@neondatabase/serverless';
import { hashPassword } from './server/auth';
import { DatabaseStorage } from './server/storage';

const main = async () => {
  console.log('Creating test users...');
  
  try {
    const storage = new DatabaseStorage();
    
    // Create Owner 1
    let owner1User;
    try {
      owner1User = await storage.getUserByUsername("tulajdonos");
    } catch (error) {
      console.log("Error checking for tulajdonos user:", error);
    }
    
    if (!owner1User) {
      try {
        await storage.createUser({
          username: "tulajdonos",
          password: await hashPassword("tulajdonos123456"),
          email: "tulajdonos@tavrezsi.hu",
          name: "Tulajdonos 1",
          role: "owner",
        });
        console.log("Owner1 user (tulajdonos) created");
      } catch (createError) {
        console.error("Failed to create owner1 user:", createError);
      }
    } else {
      console.log("Owner1 user (tulajdonos) already exists");
    }
    
    // Create Owner 2
    let owner2User;
    try {
      owner2User = await storage.getUserByUsername("tulajdonos2");
    } catch (error) {
      console.log("Error checking for tulajdonos2 user:", error);
    }
    
    if (!owner2User) {
      try {
        await storage.createUser({
          username: "tulajdonos2",
          password: await hashPassword("tulajdonos123456"),
          email: "tulajdonos2@tavrezsi.hu",
          name: "Tulajdonos 2",
          role: "owner",
        });
        console.log("Owner2 user (tulajdonos2) created");
      } catch (createError) {
        console.error("Failed to create owner2 user:", createError);
      }
    } else {
      console.log("Owner2 user (tulajdonos2) already exists");
    }
    
    // Create Tenant
    let tenantUser;
    try {
      tenantUser = await storage.getUserByUsername("berlo");
    } catch (error) {
      console.log("Error checking for berlo user:", error);
    }
    
    if (!tenantUser) {
      try {
        await storage.createUser({
          username: "berlo",
          password: await hashPassword("berlo123456"),
          email: "berlo@tavrezsi.hu",
          name: "Bérlő 1",
          role: "tenant",
        });
        console.log("Tenant user (berlo) created");
      } catch (createError) {
        console.error("Failed to create tenant user:", createError);
      }
    } else {
      console.log("Tenant user (berlo) already exists");
    }
    
    console.log('Test users creation completed successfully');
  } catch (err) {
    console.error("Error in test users creation:", err);
  }
};

main();