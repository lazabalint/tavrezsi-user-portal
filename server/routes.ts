import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords, generatePasswordResetToken } from "./auth";
import { z } from "zod";
import { insertPropertySchema, insertMeterSchema, insertCorrectionRequestSchema, insertPropertyTenantSchema, insertReadingSchema, insertUserSchema, users } from "@shared/schema";
import { sendPasswordResetEmail, sendWelcomeEmail, sendTenantInviteEmail } from "./email";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import crypto from "crypto";

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
      
      // Hash the password before storing
      const hashedUserData = {
        ...userData,
        password: await hashPassword(userData.password)
      };
      
      const user = await storage.createUser(hashedUserData);
      
      // Küldünk jelszó-visszaállító emailt az új felhasználónak
      try {
        const token = await generatePasswordResetToken(user.id);
        await sendPasswordResetEmail(user, token);
        console.log(`Jelszó-visszaállító email elküldve: ${user.email}`);
      } catch (emailError) {
        console.error("Hiba történt a jelszó-visszaállító email küldése közben:", emailError);
        // Nem szakítjuk meg a folyamatot, ha az email küldés sikertelen
      }
      
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
  
  // Get all properties - with improved permission filtering
  app.get("/api/properties", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      
      console.log("Fetching properties, user role:", req.user.role, "user id:", req.user.id);
      
      let properties;
      
      if (req.user.role === "admin") {
        // Admin sees all properties
        properties = await storage.listProperties();
      } else if (req.user.role === "owner") {
        // Owner sees their properties
        properties = await storage.listProperties({ role: "owner", userId: req.user.id });
      } else if (req.user.role === "tenant") {
        // Tenant sees only their assigned properties
        const tenancies = await storage.listPropertyTenants();
        const propertyIds = tenancies
          .filter(pt => pt.userId === req.user!.id && pt.isActive)
          .map(pt => pt.propertyId);
        
        const allProperties = await storage.listProperties();
        properties = allProperties.filter(p => propertyIds.includes(p.id));
      }
      
      console.log("Properties fetched successfully:", properties);
      res.json(properties);
    } catch (err) {
      console.error("Error fetching properties:", err);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Create a new property - Only admin users
  app.post("/api/properties", adminMiddleware, async (req, res) => {
    try {
      console.log("Creating new property, request body:", req.body);
      const propertyData = insertPropertySchema.parse(req.body);
      console.log("Property data after validation:", propertyData);
      
      console.log("About to create property in database");
      const property = await storage.createProperty(propertyData);
      console.log("Property created successfully:", property);
      res.status(201).json(property);
    } catch (err) {
      console.error("Error creating property:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Delete a property - Only admin users
  app.delete("/api/properties/:id", adminMiddleware, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      await storage.deleteProperty(propertyId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // =============== METER ROUTES ===============
  
  // Get meters
  app.get("/api/meters", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let meters = await storage.listMeters();
      
      // Filter meters based on user role
      if (req.user.role === "admin") {
        // Admin sees all meters
      } else if (req.user.role === "owner") {
        // Owner sees meters in their properties
        const ownedProperties = await storage.listProperties({ role: "owner", userId: req.user.id });
        const propertyIds = ownedProperties.map(p => p.id);
        meters = meters.filter(m => propertyIds.includes(m.propertyId));
      } else if (req.user.role === "tenant") {
        // Tenant sees meters in their assigned properties
        const tenancies = await storage.listPropertyTenants();
        const propertyIds = tenancies
          .filter(pt => pt.userId === req.user!.id && pt.isActive)
          .map(pt => pt.propertyId);
        meters = meters.filter(m => propertyIds.includes(m.propertyId));
      }
      
      res.json(meters);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch meters" });
    }
  });

  // Create a new meter - Only admin users
  app.post("/api/meters", adminMiddleware, async (req, res) => {
    try {
      const meterData = insertMeterSchema.parse(req.body);
      
      // Check if property exists
      const property = await storage.getProperty(meterData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
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

  // Delete a meter - Only admin users
  app.delete("/api/meters/:id", adminMiddleware, async (req, res) => {
    try {
      const meterId = parseInt(req.params.id);
      const meter = await storage.getMeter(meterId);
      
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      
      // Check if property exists
      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      await storage.deleteMeter(meterId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete meter" });
    }
  });

  // =============== READING ROUTES ===============
  
  // Get readings
  app.get("/api/readings", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { meterId } = req.query;
      if (!meterId) {
        return res.status(400).json({ message: "Meter ID is required" });
      }

      const meter = await storage.getMeter(parseInt(meterId as string));
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }

      const property = await storage.getProperty(meter.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (req.user.role !== "admin" && 
          !(req.user.role === "owner" && property.ownerId === req.user.id) &&
          !(await isTenantOfProperty(req.user.id, property.id))) {
        return res.status(403).json({ message: "You don't have permission to view readings for this meter" });
      }

      const readings = await storage.listReadings(parseInt(meterId as string));
      res.json(readings);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  // Submit a new reading
  app.post("/api/readings", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

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
          !(req.user.role === "tenant" && await isTenantOfProperty(req.user.id, property.id))) {
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
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let requests = await storage.listCorrectionRequests();
      
      // Filter requests based on user role
      if (req.user.role === "admin") {
        // Admin sees all requests
      } else if (req.user.role === "owner") {
        // Owner sees requests for their properties
        const ownedProperties = await storage.listProperties({ role: "owner", userId: req.user.id });
        const propertyIds = ownedProperties.map(p => p.id);
        requests = requests.filter(async r => {
          const meter = await storage.getMeter(r.meterId);
          return meter && propertyIds.includes(meter.propertyId);
        });
      } else if (req.user.role === "tenant") {
        // Tenant sees their own requests
        requests = requests.filter(r => r.requestedById === req.user!.id);
      }

      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch correction requests" });
    }
  });

  // Submit a new correction request
  app.post("/api/correction-requests", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

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
          !(req.user.role === "tenant" && await isTenantOfProperty(req.user.id, property.id))) {
        return res.status(403).json({ message: "You don't have permission to submit correction requests for this meter" });
      }
      
      // Add submitter info
      const request = await storage.createCorrectionRequest({
        ...requestData,
        requestedById: req.user.id
      });
      
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create correction request" });
    }
  });

  // Update correction request status
  app.patch("/api/correction-requests/:id", authMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const request = await storage.getCorrectionRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: "Correction request not found" });
      }
      
      // Only admin can update status
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can update correction request status" });
      }
      
      const { status } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedRequest = await storage.updateCorrectionRequestStatus(id, status, req.user.id);
      
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update correction request" });
    }
  });

  // =============== TENANT ROUTES ===============
  
  // Get tenants for a property
  app.get("/api/property-tenants", ownerMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { propertyId } = req.query;
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const property = await storage.getProperty(parseInt(propertyId as string));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Check if user has permission
      if (req.user.role !== "admin" && property.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to view tenants for this property" });
      }
      
      const propertyTenants = await storage.listPropertyTenants(parseInt(propertyId as string));
      
      // Add tenant details
      const tenantDetails = await Promise.all(propertyTenants.map(async pt => {
        const tenant = await storage.getUser(pt.userId);
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

  // Add tenant to property
  app.post("/api/property-tenants", async (req, res) => {
    try {
      const { email, propertyId } = req.body;

      if (!email || !propertyId) {
        return res.status(400).json({ message: "Az email cím és az ingatlan azonosító megadása kötelező" });
      }

      // Ellenőrizzük, hogy létezik-e az ingatlan
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(400).json({ message: "Az ingatlan nem található" });
      }

      // Ellenőrizzük, hogy a felhasználónak van-e jogosultsága bérlőt hozzáadni
      if (req.user!.role !== 'admin' && property.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Nincs jogosultsága bérlőt hozzáadni ehhez az ingatlanhoz" });
      }

      // Ellenőrizzük, hogy létezik-e már felhasználó ezzel az email címmel
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Ha nem létezik, létrehozunk egy új felhasználót
        const tempPassword = crypto.randomBytes(8).toString('hex');
        user = await storage.createUser({
          email,
          username: email.split('@')[0],
          password: await hashPassword(tempPassword),
          name: email.split('@')[0],
          role: 'tenant',
          isActive: false
        });

        // Generálunk egy jelszó reset tokent
        const token = await generatePasswordResetToken(user.id);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 óra érvényes

        await storage.createPasswordResetToken({
          userId: user.id,
          token,
          expiresAt,
          isUsed: false
        });

        // Küldünk egy meghívó emailt
        try {
          await sendTenantInviteEmail(user, property, token);
        } catch (emailError) {
          console.error("Hiba a meghívó email küldése során:", emailError);
          return res.status(500).json({ message: "Hiba történt a meghívó email küldése során" });
        }
      } else {
        // Ha már létezik a felhasználó, ellenőrizzük, hogy van-e már aktív bérlői kapcsolata ehhez az ingatlanhoz
        const existingTenancy = await storage.getPropertyTenantByUserAndProperty(user.id, propertyId);
        
        if (existingTenancy) {
          if (existingTenancy.isActive) {
            return res.status(400).json({ message: "A felhasználó már bérlője ennek az ingatlannak" });
          } else {
            // Ha van inaktív bérlői kapcsolat, aktiváljuk újra
            await storage.updatePropertyTenant(existingTenancy.id, { isActive: true });
            
            // Generálunk egy új jelszó reset tokent
            const token = await generatePasswordResetToken(user.id);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 óra érvényes

            await storage.createPasswordResetToken({
              userId: user.id,
              token,
              expiresAt,
              isUsed: false
            });

            // Küldünk egy új meghívó emailt
            try {
              await sendTenantInviteEmail(user, property, token);
            } catch (emailError) {
              console.error("Hiba a meghívó email küldése során:", emailError);
              return res.status(500).json({ message: "Hiba történt a meghívó email küldése során" });
            }
          }
        }
      }

      // Létrehozzuk vagy frissítjük a bérlői kapcsolatot
      const propertyTenant = await storage.createPropertyTenant({
        propertyId,
        userId: user.id,
        isActive: false
      });

      return res.status(200).json({
        message: "A bérlő sikeresen hozzáadva",
        propertyTenant: {
          ...propertyTenant,
          tenant: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error("Hiba a bérlő hozzáadása során:", error);
      return res.status(500).json({ message: "Hiba történt a bérlő hozzáadása során" });
    }
  });

  // Remove a tenant from a property
  app.delete("/api/property-tenants/:id", ownerMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

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
      
      if (req.user.role !== "admin" && property.ownerId !== req.user!.id) {
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
    return propertyTenants.some(pt => pt.userId === userId && pt.isActive);
  }

  // =============== PASSWORD RESET ROUTES ===============

  // Request jelszó-visszaállítás
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Az email cím megadása kötelező" });
      }

      // Ellenőrizzük, hogy létezik-e a felhasználó ezzel az email címmel
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Biztonsági okokból ne adjunk információt arról, hogy létezik-e a felhasználó
        return res.status(200).json({ message: "Ha az email létezik a rendszerben, elküldtük a jelszó-visszaállító levelet" });
      }

      // Generálunk egy jelszó reset tokent
      const token = await generatePasswordResetToken(user.id);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 óra érvényes

      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
        isUsed: false
      });

      // Küldünk egy jelszó-visszaállító emailt
      try {
        await sendPasswordResetEmail(user, token);
        return res.status(200).json({ message: "Ha az email létezik a rendszerben, elküldtük a jelszó-visszaállító levelet" });
      } catch (error) {
        console.error("Hiba a jelszó-visszaállító email küldése során:", error);
        return res.status(500).json({ message: "Hiba történt a jelszó-visszaállító email küldése során" });
      }
    } catch (error) {
      console.error("Nem várt hiba a jelszó-visszaállítás kérése során:", error);
      return res.status(500).json({ message: "Hiba történt a jelszó-visszaállítás kérése során" });
    }
  });

  // Reset jelszó
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "A token és az új jelszó megadása kötelező" });
      }

      // Ellenőrizzük a tokent
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Érvénytelen vagy lejárt token" });
      }

      // Ellenőrizzük, hogy a token nem lejárt-e
      if (resetToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "A token lejárt" });
      }

      // Ellenőrizzük, hogy a token nem lett-e már használva
      if (resetToken.isUsed) {
        return res.status(400).json({ message: "A token már felhasznált" });
      }

      // Frissítjük a felhasználó jelszavát
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "Felhasználó nem található" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      try {
        // Token használtként megjelölése
        await storage.markPasswordResetTokenUsed(token);
        console.log("Token sikeresen megjelölve használtként");
      } catch (tokenError) {
        console.error("Hiba a token használtként jelölése során:", tokenError);
        // Nem állítjuk meg a folyamatot, mert a jelszó már frissítve lett
      }

      try {
        // Üdvözlő email küldése
        await sendWelcomeEmail(user);
        console.log("Üdvözlő email sikeresen elküldve");
      } catch (emailError) {
        console.error("Hiba az üdvözlő email küldése során:", emailError);
        // Nem állítjuk meg a folyamatot, mert a jelszó már frissítve lett
      }

      return res.status(200).json({ message: "A jelszó sikeresen frissítve" });
    } catch (error) {
      console.error("Nem várt hiba a jelszó visszaállítása során:", error);
      return res.status(500).json({ message: "Hiba történt a jelszó visszaállítása során" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
