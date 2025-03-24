import { 
  users, type User, type InsertUser, 
  properties, type Property, type InsertProperty,
  meters, type Meter, type InsertMeter,
  readings, type Reading, type InsertReading, 
  correctionRequests, type CorrectionRequest, type InsertCorrectionRequest,
  propertyTenants, type PropertyTenant, type InsertPropertyTenant
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, InferSelectModel, SQL, is } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(role?: string): Promise<User[]>;
  
  // Property methods
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  listProperties(ownerId?: number): Promise<Property[]>;
  deleteProperty(id: number): Promise<void>;
  
  // Meter methods
  getMeter(id: number): Promise<Meter | undefined>;
  createMeter(meter: InsertMeter): Promise<Meter>;
  listMeters(propertyId?: number): Promise<Meter[]>;
  deleteMeter(id: number): Promise<void>;
  
  // Reading methods
  getReading(id: number): Promise<Reading | undefined>;
  createReading(reading: InsertReading): Promise<Reading>;
  listReadings(meterId?: number, limit?: number): Promise<Reading[]>;
  
  // Correction requests methods
  getCorrectionRequest(id: number): Promise<CorrectionRequest | undefined>;
  createCorrectionRequest(request: InsertCorrectionRequest): Promise<CorrectionRequest>;
  listCorrectionRequests(status?: string): Promise<CorrectionRequest[]>;
  updateCorrectionRequestStatus(id: number, status: string, resolvedById: number): Promise<CorrectionRequest>;
  
  // Property-tenant methods
  getPropertyTenant(id: number): Promise<PropertyTenant | undefined>;
  createPropertyTenant(propertyTenant: InsertPropertyTenant): Promise<PropertyTenant>;
  listPropertyTenants(propertyId?: number): Promise<PropertyTenant[]>;
  deletePropertyTenant(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Use memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return await db.select().from(users).where(eq(users.role, role));
    }
    return await db.select().from(users);
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [createdProperty] = await db.insert(properties).values(property).returning();
    return createdProperty;
  }

  async listProperties(ownerId?: number): Promise<Property[]> {
    if (ownerId) {
      return await db.select().from(properties).where(eq(properties.ownerId, ownerId));
    }
    return await db.select().from(properties);
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Meter methods
  async getMeter(id: number): Promise<Meter | undefined> {
    const [meter] = await db.select().from(meters).where(eq(meters.id, id));
    return meter;
  }

  async createMeter(meter: InsertMeter): Promise<Meter> {
    const [createdMeter] = await db.insert(meters).values(meter).returning();
    return createdMeter;
  }

  async listMeters(propertyId?: number): Promise<Meter[]> {
    if (propertyId) {
      return await db.select().from(meters).where(eq(meters.propertyId, propertyId));
    }
    return await db.select().from(meters);
  }

  async deleteMeter(id: number): Promise<void> {
    await db.delete(meters).where(eq(meters.id, id));
  }

  // Reading methods
  async getReading(id: number): Promise<Reading | undefined> {
    const [reading] = await db.select().from(readings).where(eq(readings.id, id));
    return reading;
  }

  async createReading(reading: InsertReading): Promise<Reading> {
    const [createdReading] = await db.insert(readings).values(reading).returning();
    return createdReading;
  }

  async listReadings(meterId?: number, limit?: number): Promise<Reading[]> {
    let query = db.select().from(readings);
    
    if (meterId) {
      query = query.where(eq(readings.meterId, meterId));
    }
    
    query = query.orderBy(desc(readings.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  // Correction requests methods
  async getCorrectionRequest(id: number): Promise<CorrectionRequest | undefined> {
    const [request] = await db.select().from(correctionRequests).where(eq(correctionRequests.id, id));
    return request;
  }

  async createCorrectionRequest(request: InsertCorrectionRequest): Promise<CorrectionRequest> {
    const [createdRequest] = await db.insert(correctionRequests).values(request).returning();
    return createdRequest;
  }

  async listCorrectionRequests(status?: string): Promise<CorrectionRequest[]> {
    if (status) {
      return await db.select().from(correctionRequests).where(eq(correctionRequests.status, status));
    }
    return await db.select().from(correctionRequests);
  }

  async updateCorrectionRequestStatus(id: number, status: string, resolvedById: number): Promise<CorrectionRequest> {
    const [updatedRequest] = await db
      .update(correctionRequests)
      .set({ 
        status, 
        resolvedById, 
        resolvedAt: new Date() 
      })
      .where(eq(correctionRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Property-tenant methods
  async getPropertyTenant(id: number): Promise<PropertyTenant | undefined> {
    const [propertyTenant] = await db.select().from(propertyTenants).where(eq(propertyTenants.id, id));
    return propertyTenant;
  }

  async createPropertyTenant(propertyTenant: InsertPropertyTenant): Promise<PropertyTenant> {
    const [createdPropertyTenant] = await db.insert(propertyTenants).values(propertyTenant).returning();
    return createdPropertyTenant;
  }

  async listPropertyTenants(propertyId?: number): Promise<PropertyTenant[]> {
    if (propertyId) {
      return await db.select().from(propertyTenants).where(eq(propertyTenants.propertyId, propertyId));
    }
    return await db.select().from(propertyTenants);
  }

  async deletePropertyTenant(id: number): Promise<void> {
    await db.delete(propertyTenants).where(eq(propertyTenants.id, id));
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();
