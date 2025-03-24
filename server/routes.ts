import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertPropertySchema, insertMeterSchema, insertCorrectionRequestSchema, insertPropertyTenantSchema, insertReadingSchema, insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Check if user is authenticated and has permission
  function authMiddleware(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  // Check if user is an admin
  function adminMiddleware(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  }

  // Check if user is an owner or admin
  function ownerMiddleware(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated() || (req.user.role !== "owner" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  }

  // =============== USER ROUTES ===============
  
  // Get list of users (admin only)
  app.get("/api/users", adminMiddleware, async (req, res) => {
    try {
      const { role } = req.query;
      const users = await storage.listUsers(role as string);
      res.json(users.map(user => {
        // Don't send passwords
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create a new user (admin only)
  app.post("/api/users", adminMiddleware, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Import the hashPassword function from auth
      const { hashPassword } = await import('./auth');
      
      // Hash the password before storing
      const hashedUserData = {
        ...userData,
        password: await hashPassword(userData.password)
      };
      
      const user = await storage.createUser(hashedUserData);
      
      // Don't send password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      console.error("Error creating user:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // =============== PROPERTY ROUTES ===============
  
  // Get all properties
  app.get("/api/properties", authMiddleware, async (req, res) => {
    try {
      let properties;
      
      // Filter by owner if user is not admin
      if (req.user.role === "admin") {
        properties = await storage.listProperties();
      } else if (req.user.role === "owner") {
        properties = await storage.listProperties(req.user.id);
      } else {
        // For tenants, get properties where they are associated
        const propertyTenants = await storage.listPropertyTenants();
        const tenantProperties = propertyTenants
          .filter(pt => pt.tenantId === req.user.id && pt.isActive)
          .map(pt => pt.propertyId);
          
        // Get all properties by IDs
        properties = [];
        for (const id of tenantProperties) {
          const property = await storage.getProperty(id);
          if (property) properties.push(property);
        }
      }
      
      res.json(properties);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Create a new property
  app.post("/api/properties", ownerMiddleware, async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      
      // If not admin, can only create properties for themselves
      if (req.user.role !== "admin" && propertyData.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You can only create properties for yourself" });
      }
      
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Delete a property
  app.delete("/api/properties/:id", ownerMiddleware, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Check ownership
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this property" });
      }
      
      await storage.deleteProperty(propertyId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // =============== METER ROUTES ===============
  
  // Get all meters
  app.get("/api/meters", authMiddleware, async (req, res) => {
    try {
      const { propertyId } = req.query;
      let meters;
      
      if (propertyId) {
        // Check if user has access to this property
        const property = await storage.getProperty(parseInt(propertyId as string));
        
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
        
        // Check if user has permission to access this property
        if (req.user.role === "admin" || 
            (req.user.role === "owner" && property.ownerId === req.user.id) ||
            (req.user.role === "tenant" && await isTenantOfProperty(req.user.id, property.id))) {
          meters = await storage.listMeters(parseInt(propertyId as string));
        } else {
          return res.status(403).json({ message: "You don't have permission to access this property's meters" });
        }
      } else {
        // Get all meters the user has access to
        if (req.user.role === "admin") {
          meters = await storage.listMeters();
        } else {
          // Get properties first
          let properties: number[] = [];
          
          if (req.user.role === "owner") {
            const ownedProperties = await storage.listProperties(req.user.id);
            properties = ownedProperties.map(p => p.id);
          } else {
            // Tenant
            const tenancies = await storage.listPropertyTenants();
            properties = tenancies
              .filter(pt => pt.tenantId === req.user.id && pt.isActive)
              .map(pt => pt.propertyId);
          }
          
          // Get meters for these properties
          meters = [];
          for (const pId of properties) {
            const propertyMeters = await storage.listMeters(pId);
            meters = [...meters, ...propertyMeters];
          }
        }
      }
      
      res.json(meters);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch meters" });
    }
  });

  // Create a new meter
  app.post("/api/meters", ownerMiddleware, async (req, res) => {
    try {
      const meterData = insertMeterSchema.parse(req.body);
      
      // Check if property exists
      const property = await storage.getProperty(meterData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Check if user has permission
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to add meters to this property" });
      }
      
      const meter = await storage.createMeter(meterData);
      res.status(201).json(meter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid meter data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create meter" });
    }
  });

  // Delete a meter
  app.delete("/api/meters/:id", ownerMiddleware, async (req, res) => {
    try {
      const meterId = parseInt(req.params.id);
      const meter = await storage.getMeter(meterId);
      
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      // Check ownership through property
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this meter" });
      }
      
      await storage.deleteMeter(meterId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete meter" });
    }
  });

  // =============== READING ROUTES ===============
  
  // Get meter readings
  app.get("/api/readings", authMiddleware, async (req, res) => {
    try {
      const { meterId, limit } = req.query;
      
      if (!meterId) {
        return res.status(400).json({ message: "Meter ID is required" });
      }
      
      const meter = await storage.getMeter(parseInt(meterId as string));
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      // Check if user has access to this meter
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && 
          req.user.role !== "owner" && property.ownerId !== req.user.id &&
          !(await isTenantOfProperty(req.user.id, property.id))) {
        return res.status(403).json({ message: "You don't have permission to view these readings" });
      }
      
      const readings = await storage.listReadings(
        parseInt(meterId as string), 
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(readings);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  // Submit a new reading
  app.post("/api/readings", authMiddleware, async (req, res) => {
    try {
      const readingData = insertReadingSchema.parse(req.body);
      
      // Check if meter exists
      const meter = await storage.getMeter(readingData.meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      // Check if user has access to this meter
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && 
          !(req.user.role === "owner" && property.ownerId === req.user.id) &&
          !(await isTenantOfProperty(req.user.id, property.id))) {
        return res.status(403).json({ message: "You don't have permission to submit readings for this meter" });
      }
      
      // Add submitter info and set isIoT to false for manual submissions
      const reading = await storage.createReading({
        ...readingData,
        isIoT: false,
        submittedById: req.user.id
      });
      
      res.status(201).json(reading);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reading data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create reading" });
    }
  });

  // =============== CORRECTION REQUEST ROUTES ===============
  
  // Get correction requests
  app.get("/api/correction-requests", authMiddleware, async (req, res) => {
    try {
      const { status } = req.query;
      
      let requests = await storage.listCorrectionRequests(status as string);
      
      // Filter requests based on user role
      if (req.user.role !== "admin") {
        // For owners and tenants, only return requests they can see
        requests = await Promise.all(requests.map(async request => {
          const meter = await storage.getMeter(request.meterId);
          if (!meter) return null;
          
          const property = await storage.getProperty(meter.propertyId);
          if (!property) return null;
          
          if (req.user.role === "owner" && property.ownerId === req.user.id) {
            return request;
          } else if (req.user.role === "tenant" && await isTenantOfProperty(req.user.id, property.id)) {
            return request;
          } else if (request.requestedById === req.user.id) {
            return request;
          }
          
          return null;
        }));
        
        requests = requests.filter(r => r !== null) as typeof requests;
      }
      
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch correction requests" });
    }
  });

  // Create a correction request
  app.post("/api/correction-requests", authMiddleware, async (req, res) => {
    try {
      const requestData = insertCorrectionRequestSchema.parse(req.body);
      
      // Check if meter exists
      const meter = await storage.getMeter(requestData.meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      // Check if user has access to this meter
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && 
          !(req.user.role === "owner" && property.ownerId === req.user.id) &&
          !(await isTenantOfProperty(req.user.id, property.id))) {
        return res.status(403).json({ message: "You don't have permission to submit correction requests for this meter" });
      }
      
      // Add requestedById
      const request = await storage.createCorrectionRequest({
        ...requestData,
        requestedById: req.user.id
      });
      
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid correction request data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create correction request" });
    }
  });

  // Update correction request status (approve/reject)
  app.patch("/api/correction-requests/:id", ownerMiddleware, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const request = await storage.getCorrectionRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Correction request not found" });
      }
      
      // Check if user has permission to approve/reject
      const meter = await storage.getMeter(request.meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && !(req.user.role === "owner" && property.ownerId === req.user.id)) {
        return res.status(403).json({ message: "You don't have permission to update this correction request" });
      }
      
      // Update the request status
      const updatedRequest = await storage.updateCorrectionRequestStatus(requestId, status, req.user.id);
      
      // If approved, create a new reading
      if (status === "approved") {
        await storage.createReading({
          meterId: request.meterId,
          reading: request.requestedReading,
          isIoT: false,
          submittedById: req.user.id
        });
      }
      
      res.json(updatedRequest);
    } catch (err) {
      res.status(500).json({ message: "Failed to update correction request" });
    }
  });

  // =============== TENANT ROUTES ===============
  
  // Get tenants for a property
  app.get("/api/property-tenants", ownerMiddleware, async (req, res) => {
    try {
      const { propertyId } = req.query;
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const property = await storage.getProperty(parseInt(propertyId as string));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Check if user has permission
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view tenants for this property" });
      }
      
      const propertyTenants = await storage.listPropertyTenants(parseInt(propertyId as string));
      
      // Add tenant details
      const tenantDetails = await Promise.all(propertyTenants.map(async pt => {
        const tenant = await storage.getUser(pt.tenantId);
        return {
          ...pt,
          tenant: tenant ? {
            id: tenant.id,
            username: tenant.username,
            email: tenant.email,
            name: tenant.name,
            role: tenant.role
          } : null
        };
      }));
      
      res.json(tenantDetails);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Add a tenant to a property
  app.post("/api/property-tenants", ownerMiddleware, async (req, res) => {
    try {
      const tenantData = insertPropertyTenantSchema.parse(req.body);
      
      // Check if property exists
      const property = await storage.getProperty(tenantData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Check if user has permission
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to add tenants to this property" });
      }
      
      // Check if tenant exists and is a tenant
      const tenant = await storage.getUser(tenantData.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      if (tenant.role !== "tenant") {
        return res.status(400).json({ message: "User must have tenant role" });
      }
      
      // Check if tenant is already assigned to this property
      const existingTenants = await storage.listPropertyTenants(property.id);
      const alreadyAssigned = existingTenants.some(
        pt => pt.tenantId === tenant.id && pt.isActive
      );
      
      if (alreadyAssigned) {
        return res.status(400).json({ message: "Tenant is already assigned to this property" });
      }
      
      const propertyTenant = await storage.createPropertyTenant(tenantData);
      res.status(201).json(propertyTenant);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tenant data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to add tenant" });
    }
  });

  // Remove a tenant from a property
  app.delete("/api/property-tenants/:id", ownerMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const propertyTenant = await storage.getPropertyTenant(id);
      
      if (!propertyTenant) {
        return res.status(404).json({ message: "Tenant assignment not found" });
      }
      
      // Check if user has permission
      const property = await storage.getProperty(propertyTenant.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (req.user.role !== "admin" && property.ownerId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to remove tenants from this property" });
      }
      
      await storage.deletePropertyTenant(id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to remove tenant" });
    }
  });

  // Helper function to check if a user is a tenant of a property
  async function isTenantOfProperty(userId: number, propertyId: number): Promise<boolean> {
    const propertyTenants = await storage.listPropertyTenants(propertyId);
    return propertyTenants.some(pt => pt.tenantId === userId && pt.isActive);
  }

  const httpServer = createServer(app);
  return httpServer;
}
