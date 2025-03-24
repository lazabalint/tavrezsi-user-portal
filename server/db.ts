import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);
