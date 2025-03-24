import { 
  users, type User, type InsertUser, 
  properties, type Property, type InsertProperty,
  meters, type Meter, type InsertMeter,
  readings, type Reading, type InsertReading, 
  correctionRequests, type CorrectionRequest, type InsertCorrectionRequest,
  propertyTenants, type PropertyTenant, type InsertPropertyTenant,
  passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken,
  insertUserSchema, insertPropertyTenantSchema
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
  getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(role?: string): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  
  // Property methods
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  listProperties(options?: { userId?: number; role?: string }): Promise<Property[]>;
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
  getPropertyTenant(id: number): Promise<typeof propertyTenants.$inferSelect | undefined>;
  createPropertyTenant(propertyTenant: InsertPropertyTenant): Promise<typeof propertyTenants.$inferSelect>;
  updatePropertyTenant(id: number, data: Partial<typeof propertyTenants.$inferSelect>): Promise<typeof propertyTenants.$inferSelect>;
  listPropertyTenants(propertyId?: number): Promise<Array<typeof propertyTenants.$inferSelect>>;
  deletePropertyTenant(id: number): Promise<void>;
  getPropertyTenantByUserAndProperty(userId: number, propertyId: number): Promise<typeof propertyTenants.$inferSelect | undefined>;
  
  // Password reset token methods
  createPasswordResetToken(data: { userId: number; token: string; expiresAt: Date; isUsed: boolean }): Promise<typeof passwordResetTokens.$inferSelect>;
  getPasswordResetToken(token: string): Promise<typeof passwordResetTokens.$inferSelect | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deletePasswordResetToken(id: number): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return await db.select().from(users).where(eq(users.role, role as any));
    }
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    try {
      console.log("Getting property with ID:", id);
      const [property] = await db.select().from(properties).where(eq(properties.id, id));
      console.log("Retrieved property:", property);
      return property;
    } catch (err) {
      console.error("Error getting property:", err);
      throw err;
    }
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      console.log("Creating property with data:", property);
      const [createdProperty] = await db.insert(properties).values(property).returning();
      console.log("Created property:", createdProperty);
      return createdProperty;
    } catch (err) {
      console.error("Error creating property:", err);
      throw err;
    }
  }

  /**
   * Lists properties based on user role and ID
   * 
   * @param userId The user ID
   * @param role The user role (admin, owner, tenant)
   * @returns List of properties filtered by user permissions
   */
  async listProperties(options?: { userId?: number; role?: string }): Promise<Property[]> {
    try {
      console.log("Listing properties with options:", options);
      
      // If no options provided or admin role, return all properties
      if (!options || options.role === "admin") {
        console.log("Admin access or no filtering, returning all properties");
        const result = await db.select().from(properties);
        console.log("Retrieved properties:", result);
        return result;
      }
      
      // For owner, return only their properties
      if (options.role === "owner" && options.userId) {
        console.log("Owner access, filtering by ownerId:", options.userId);
        const result = await db.select()
          .from(properties)
          .where(eq(properties.ownerId, options.userId));
        console.log("Retrieved owner properties:", result);
        return result;
      }
      
      // For tenant, return properties they have access to via property_tenants join
      if (options.role === "tenant" && options.userId) {
        console.log("Tenant access, filtering by tenant associations");
        const result = await db.select({
            id: properties.id,
            name: properties.name,
            address: properties.address,
            ownerId: properties.ownerId,
            createdAt: properties.createdAt
          })
          .from(properties)
          .innerJoin(
            propertyTenants,
            and(
              eq(properties.id, propertyTenants.propertyId),
              eq(propertyTenants.userId, options.userId),
              eq(propertyTenants.isActive, true)
            )
          );
        console.log("Retrieved tenant-accessible properties:", result);
        return result;
      }
      
      // Default case - no properties should be accessible
      console.log("No properties accessible due to insufficient permissions");
      return [];
    } catch (err) {
      console.error("Error listing properties:", err);
      throw err;
    }
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
  async getPropertyTenant(id: number): Promise<typeof propertyTenants.$inferSelect | undefined> {
    const [propertyTenant] = await db.select().from(propertyTenants).where(eq(propertyTenants.id, id));
    return propertyTenant;
  }

  async createPropertyTenant(propertyTenant: InsertPropertyTenant): Promise<typeof propertyTenants.$inferSelect> {
    const [createdPropertyTenant] = await db.insert(propertyTenants).values({
      propertyId: propertyTenant.propertyId,
      userId: propertyTenant.userId,
      startDate: new Date(),
      isActive: propertyTenant.isActive ?? true
    }).returning();
    return createdPropertyTenant;
  }

  async updatePropertyTenant(id: number, data: Partial<typeof propertyTenants.$inferSelect>): Promise<typeof propertyTenants.$inferSelect> {
    const [updatedPropertyTenant] = await db
      .update(propertyTenants)
      .set(data)
      .where(eq(propertyTenants.id, id))
      .returning();
    return updatedPropertyTenant;
  }

  async listPropertyTenants(propertyId?: number): Promise<Array<typeof propertyTenants.$inferSelect>> {
    if (propertyId) {
      return await db.select().from(propertyTenants).where(eq(propertyTenants.propertyId, propertyId));
    }
    return await db.select().from(propertyTenants);
  }

  async deletePropertyTenant(id: number): Promise<void> {
    await db.delete(propertyTenants).where(eq(propertyTenants.id, id));
  }
  
  // Password reset token methods
  async createPasswordResetToken(data: { userId: number; token: string; expiresAt: Date; isUsed: boolean }): Promise<typeof passwordResetTokens.$inferSelect> {
    const [resetToken] = await db.insert(passwordResetTokens).values(data).returning();
    return resetToken;
  }
  
  async getPasswordResetToken(token: string): Promise<typeof passwordResetTokens.$inferSelect | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken;
  }
  
  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({ isUsed: true }).where(eq(passwordResetTokens.token, token));
  }

  // Property tenant methods
  async getPropertyTenantByUserAndProperty(userId: number, propertyId: number): Promise<typeof propertyTenants.$inferSelect | undefined> {
    const [propertyTenant] = await db
      .select()
      .from(propertyTenants)
      .where(and(
        eq(propertyTenants.userId, userId),
        eq(propertyTenants.propertyId, propertyId)
      ));
    return propertyTenant;
  }

  async deletePasswordResetToken(id: number): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
  }
}

// In-memory storage implementation for demo
export class MemStorage implements IStorage {
  private users: Array<typeof users.$inferSelect> = [];
  private properties: Property[] = [];
  private meters: Meter[] = [];
  private readings: Reading[] = [];
  private correctionRequests: CorrectionRequest[] = [];
  private propertyTenants: Array<typeof propertyTenants.$inferSelect> = [];
  private passwordResetTokens: Array<typeof passwordResetTokens.$inferSelect> = [];
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create an admin user by default
    this.createUser({
      username: "admin",
      password: "108f64d2292ec8f5a74a0c8811e989ae85891f2136c17f3b77e1d224bb5146e6c1ad39e4397b974509500ad06e9986c42b604a84856f06eac6c9ba40bf3de089.af6bd46612511b3dfe2f9ccc3ad79625",
      email: "admin@tavrezsi.hu",
      name: "Admin User",
      role: "admin",
      isActive: true
    }).then(() => console.log("Default admin user created"));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    return this.users.find(u => u.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = { ...user, id: this.users.length + 1 } as User;
    this.users.push(newUser);
    return newUser;
  }

  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return this.users.filter(u => u.role === role);
    }
    return this.users;
  }

  async deleteUser(id: number): Promise<void> {
    this.users = this.users.filter(u => u.id !== id);
  }

  // Property methods
  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.find(p => p.id === id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = {
      ...property,
      id: this.properties.length + 1,
      createdAt: new Date()
    };
    this.properties.push(newProperty);
    return newProperty;
  }

  async listProperties(options?: { userId?: number; role?: string }): Promise<Property[]> {
    // If no options provided or admin role, return all properties
    if (!options || options.role === "admin") {
      return this.properties;
    }
    
    // For owner, return only their properties
    if (options.role === "owner" && options.userId) {
      return this.properties.filter(p => p.ownerId === options.userId);
    }
    
    // For tenant, return properties they have access to via property_tenants
    if (options.role === "tenant" && options.userId) {
      const tenantPropertyIds = this.propertyTenants
        .filter(pt => pt.userId === options.userId && pt.isActive)
        .map(pt => pt.propertyId);
      
      return this.properties.filter(p => tenantPropertyIds.includes(p.id));
    }
    
    // Default case - no properties should be accessible
    return [];
  }

  async deleteProperty(id: number): Promise<void> {
    const index = this.properties.findIndex(p => p.id === id);
    if (index !== -1) {
      this.properties.splice(index, 1);
    }
  }

  // Meter methods
  async getMeter(id: number): Promise<Meter | undefined> {
    return this.meters.find(m => m.id === id);
  }

  async createMeter(meter: InsertMeter): Promise<Meter> {
    const newMeter: Meter = {
      ...meter,
      id: this.meters.length + 1,
      createdAt: new Date(),
      lastCertified: meter.lastCertified || null,
      nextCertification: meter.nextCertification || null
    };
    this.meters.push(newMeter);
    return newMeter;
  }

  async listMeters(propertyId?: number): Promise<Meter[]> {
    if (propertyId) {
      return this.meters.filter(m => m.propertyId === propertyId);
    }
    return this.meters;
  }

  async deleteMeter(id: number): Promise<void> {
    const index = this.meters.findIndex(m => m.id === id);
    if (index !== -1) {
      this.meters.splice(index, 1);
    }
  }

  // Reading methods
  async getReading(id: number): Promise<Reading | undefined> {
    return this.readings.find(r => r.id === id);
  }

  async createReading(reading: InsertReading): Promise<Reading> {
    const newReading: Reading = {
      ...reading,
      id: this.readings.length + 1,
      timestamp: new Date(),
      submittedById: reading.submittedById || null,
      isIoT: reading.isIoT ?? true
    };
    this.readings.push(newReading);
    return newReading;
  }

  async listReadings(meterId?: number, limit?: number): Promise<Reading[]> {
    let filteredReadings = meterId 
      ? this.readings.filter(r => r.meterId === meterId)
      : this.readings;
    
    // Sort by timestamp descending
    filteredReadings.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply limit if specified
    if (limit && limit > 0) {
      filteredReadings = filteredReadings.slice(0, limit);
    }
    
    return filteredReadings;
  }

  // Correction requests methods
  async getCorrectionRequest(id: number): Promise<CorrectionRequest | undefined> {
    return this.correctionRequests.find(r => r.id === id);
  }

  async createCorrectionRequest(request: InsertCorrectionRequest): Promise<CorrectionRequest> {
    const newRequest: CorrectionRequest = {
      ...request,
      id: this.correctionRequests.length + 1,
      status: "pending",
      createdAt: new Date(),
      resolvedAt: null,
      resolvedById: null
    };
    this.correctionRequests.push(newRequest);
    return newRequest;
  }

  async listCorrectionRequests(status?: string): Promise<CorrectionRequest[]> {
    if (status) {
      return this.correctionRequests.filter(r => r.status === status);
    }
    return this.correctionRequests;
  }

  async updateCorrectionRequestStatus(id: number, status: string, resolvedById: number): Promise<CorrectionRequest> {
    const request = this.correctionRequests.find(r => r.id === id);
    if (!request) {
      throw new Error(`Correction request with id ${id} not found`);
    }
    
    request.status = status;
    request.resolvedById = resolvedById;
    request.resolvedAt = new Date();
    
    return request;
  }

  // Property-tenant methods
  async getPropertyTenant(id: number): Promise<typeof propertyTenants.$inferSelect | undefined> {
    return this.propertyTenants.find(pt => pt.id === id);
  }

  async createPropertyTenant(data: typeof insertPropertyTenantSchema._type): Promise<typeof propertyTenants.$inferSelect> {
    const propertyTenant = {
      id: this.propertyTenants.length + 1,
      ...data,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || null,
      isActive: data.isActive ?? true
    };
    this.propertyTenants.push(propertyTenant);
    return propertyTenant;
  }

  async updatePropertyTenant(id: number, data: Partial<typeof propertyTenants.$inferSelect>): Promise<typeof propertyTenants.$inferSelect> {
    const propertyTenant = this.propertyTenants.find(pt => pt.id === id);
    if (!propertyTenant) {
      throw new Error(`Property tenant not found: ${id}`);
    }
    Object.assign(propertyTenant, data);
    return propertyTenant;
  }

  async listPropertyTenants(propertyId?: number): Promise<Array<typeof propertyTenants.$inferSelect>> {
    if (propertyId) {
      return this.propertyTenants.filter(pt => pt.propertyId === propertyId);
    }
    return this.propertyTenants;
  }

  async deletePropertyTenant(id: number): Promise<void> {
    const index = this.propertyTenants.findIndex(pt => pt.id === id);
    if (index === -1) {
      throw new Error(`Property tenant not found: ${id}`);
    }
    this.propertyTenants.splice(index, 1);
  }
  
  // Password reset token methods
  async createPasswordResetToken(data: { userId: number; token: string; expiresAt: Date; isUsed: boolean }): Promise<typeof passwordResetTokens.$inferSelect> {
    const resetToken = {
      id: this.passwordResetTokens.length + 1,
      ...data,
      createdAt: new Date()
    };
    this.passwordResetTokens.push(resetToken);
    return resetToken;
  }
  
  async getPasswordResetToken(token: string): Promise<typeof passwordResetTokens.$inferSelect | undefined> {
    return this.passwordResetTokens.find(rt => rt.token === token);
  }
  
  async markPasswordResetTokenUsed(token: string): Promise<void> {
    const resetToken = this.passwordResetTokens.find(rt => rt.token === token);
    if (resetToken) {
      resetToken.isUsed = true;
    }
  }

  // Property tenant methods
  async getPropertyTenantByUserAndProperty(userId: number, propertyId: number): Promise<typeof propertyTenants.$inferSelect | undefined> {
    return this.propertyTenants.find(pt => pt.userId === userId && pt.propertyId === propertyId);
  }

  async deletePasswordResetToken(id: number): Promise<void> {
    const index = this.passwordResetTokens.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Password reset token not found: ${id}`);
    }
    this.passwordResetTokens.splice(index, 1);
  }
}

// Create and export storage instance
// Use database storage as we have proper connectivity to Neon serverless
export const storage = new DatabaseStorage();
