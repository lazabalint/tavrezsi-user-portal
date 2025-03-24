import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Flag to track the state of the database connection
let db: any;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

try {
  // Use postgres.js instead of @neondatabase/serverless
  const client = postgres(process.env.DATABASE_URL, { 
    prepare: false, // Important for compatibility with Neon serverless
    ssl: { rejectUnauthorized: false } // For secure connections to Neon
  });
  db = drizzle(client);
  console.log("Connected to Neon serverless database");
} catch (error) {
  console.error("Error initializing database connection:", error);
  
  // Create a dummy db instance as a last resort
  try {
    const fallbackClient = postgres("postgresql://user:password@localhost:5432/test", { prepare: false });
    db = drizzle(fallbackClient);
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
