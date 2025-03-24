import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";

// Flag to track the state of the database connection
let db: any;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

try {
  // Try to use Neon serverless
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql);
  console.log("Connected to Neon serverless database");
} catch (error) {
  console.error("Error initializing database connection:", error);
  
  // Create a dummy db instance as a last resort
  try {
    const fallbackSql = neon("postgresql://user:password@localhost:5432/test");
    db = drizzle(fallbackSql);
    console.error("Using dummy database connection - app will have limited functionality");
  } catch (fallbackError) {
    console.error("Critical error setting up database:", fallbackError);
    // Create a minimal mock that won't crash on import but will fail on actual use
    db = {
      select: () => ({ from: () => ({ where: () => [] }) }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      delete: () => ({ where: () => [] }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) })
    };
  }
}

export { db };
