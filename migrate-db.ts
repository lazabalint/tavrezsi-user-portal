import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './shared/schema';

// Hardcoded database connection string to ensure consistency
const connectionString = "postgresql://tavrezsi-main_owner:npg_GOaANP7ZXv4w@ep-long-dream-a26etgjh-pooler.eu-central-1.aws.neon.tech/tavrezsi-main?sslmode=require";

const main = async () => {
  console.log('Starting database migration...');
  
  try {
    // Configure neon to work in serverless environments
    neonConfig.fetchConnectionCache = true;
    
    // Create a Neon client
    const sql = neon(connectionString);
    
    // Manually run our SQL commands with the Neon client
    console.log('Creating database schema from models...');
    
    // Create enums first
    try {
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('admin', 'owner', 'tenant');
          END IF;
        END$$;
      `;
      console.log('Created user_role enum if it didn\'t exist');
    } catch (err) {
      console.error('Error creating user_role enum:', err);
    }
    
    try {
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meter_type') THEN
            CREATE TYPE meter_type AS ENUM ('electricity', 'gas', 'water', 'other');
          END IF;
        END$$;
      `;
      console.log('Created meter_type enum if it didn\'t exist');
    } catch (err) {
      console.error('Error creating meter_type enum:', err);
    }
    
    // Now create tables
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "name" TEXT NOT NULL,
          "role" user_role NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      console.log('Created users table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating users table:', err);
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "properties" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "owner_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      console.log('Created properties table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating properties table:', err);
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "meters" (
          "id" SERIAL PRIMARY KEY,
          "identifier" TEXT NOT NULL UNIQUE,
          "name" TEXT NOT NULL,
          "type" meter_type NOT NULL,
          "unit" TEXT NOT NULL,
          "property_id" INTEGER NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
          "last_certified" TIMESTAMP,
          "next_certification" TIMESTAMP
        )
      `;
      console.log('Created meters table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating meters table:', err);
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "readings" (
          "id" SERIAL PRIMARY KEY,
          "meter_id" INTEGER NOT NULL REFERENCES "meters"("id") ON DELETE CASCADE,
          "reading" INTEGER NOT NULL,
          "timestamp" TIMESTAMP DEFAULT NOW() NOT NULL,
          "is_iot" BOOLEAN DEFAULT TRUE NOT NULL,
          "submitted_by_id" INTEGER REFERENCES "users"("id")
        )
      `;
      console.log('Created readings table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating readings table:', err);
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "correction_requests" (
          "id" SERIAL PRIMARY KEY,
          "meter_id" INTEGER NOT NULL REFERENCES "meters"("id") ON DELETE CASCADE,
          "requested_reading" INTEGER NOT NULL,
          "requested_by_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "reason" TEXT NOT NULL,
          "status" TEXT DEFAULT 'pending' NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
          "resolved_at" TIMESTAMP,
          "resolved_by_id" INTEGER REFERENCES "users"("id")
        )
      `;
      console.log('Created correction_requests table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating correction_requests table:', err);
    }
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "property_tenants" (
          "id" SERIAL PRIMARY KEY,
          "property_id" INTEGER NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
          "tenant_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "start_date" TIMESTAMP DEFAULT NOW() NOT NULL,
          "end_date" TIMESTAMP,
          "is_active" BOOLEAN DEFAULT TRUE NOT NULL
        )
      `;
      console.log('Created property_tenants table if it didn\'t exist');
    } catch (err) {
      console.error('Error creating property_tenants table:', err);
    }
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:');
    console.error(error);
  }
};

main();