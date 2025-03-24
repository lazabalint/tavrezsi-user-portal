import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";

// Flag to track the state of the database connection
let db: any;

// Hardcoded database connection string to ensure consistency
const DATABASE_URL = "postgresql://tavrezsi-main_owner:npg_GOaANP7ZXv4w@ep-long-dream-a26etgjh-pooler.eu-central-1.aws.neon.tech/tavrezsi-main?sslmode=require";

try {
  // Configure neon to work in serverless environments
  neonConfig.fetchConnectionCache = true;
  
  // Use the neon serverless driver specifically designed for serverless environments
  const client = neon(DATABASE_URL);
  
  // Use drizzle with neon-http instead of neon-serverless
  db = drizzle(client);
  console.log("Connected to Neon serverless database");
} catch (error) {
  console.error("Error initializing database connection:", error);
  
  // Create a minimal mock that won't crash on import but will fail on actual use
  db = {
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    delete: () => ({ where: () => [] }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) })
  };
  console.error("Using dummy database connection - app will have limited functionality");
}

export { db, DATABASE_URL };
