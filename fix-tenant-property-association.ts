import { storage } from "./server/storage";

/**
 * This script creates a property tenant association for the user with ID 14
 * to access the property with ID 7 (Debrecen Ház)
 */
async function main() {
  try {
    console.log("Creating property tenant association...");
    const propertyTenant = await storage.createPropertyTenant({
      propertyId: 7,
      userId: 14,
      isActive: true
    });
    console.log("Property tenant association created:", propertyTenant);
    process.exit(0);
  } catch (error) {
    console.error("Error creating property tenant association:", error);
    process.exit(1);
  }
}

main();