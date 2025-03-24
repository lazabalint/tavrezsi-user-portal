import { pgTable, text, serial, integer, timestamp, boolean, foreignKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Create role enum for users
export const userRoleEnum = pgEnum('user_role', ['admin', 'owner', 'tenant']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('tenant'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Utility meter types enum
export const meterTypeEnum = pgEnum('meter_type', ['electricity', 'gas', 'water', 'other']);

// Meters table
export const meters = pgTable("meters", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  name: text("name").notNull(),
  type: meterTypeEnum("type").notNull(),
  unit: text("unit").notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastCertified: timestamp("last_certified"),
  nextCertification: timestamp("next_certification"),
});

// Meter readings table
export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  meterId: integer("meter_id").references(() => meters.id, { onDelete: 'cascade' }).notNull(),
  reading: integer("reading").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isIoT: boolean("is_iot").notNull().default(true),
  submittedById: integer("submitted_by_id").references(() => users.id),
});

// Correction requests table
export const correctionRequests = pgTable("correction_requests", {
  id: serial("id").primaryKey(),
  meterId: integer("meter_id").references(() => meters.id, { onDelete: 'cascade' }).notNull(),
  requestedReading: integer("requested_reading").notNull(),
  requestedById: integer("requested_by_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id").references(() => users.id),
});

// Property-tenant relationship table
export const propertyTenants = pgTable("property_tenants", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  tenantId: integer("tenant_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
});

// Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertMeterSchema = createInsertSchema(meters).omit({
  id: true,
  createdAt: true,
});

export const insertReadingSchema = createInsertSchema(readings).omit({
  id: true,
  timestamp: true,
});

export const insertCorrectionRequestSchema = createInsertSchema(correctionRequests).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  resolvedById: true,
  status: true,
});

export const insertPropertyTenantSchema = createInsertSchema(propertyTenants).omit({
  id: true,
  startDate: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Meter = typeof meters.$inferSelect;
export type InsertMeter = z.infer<typeof insertMeterSchema>;

export type Reading = typeof readings.$inferSelect;
export type InsertReading = z.infer<typeof insertReadingSchema>;

export type CorrectionRequest = typeof correctionRequests.$inferSelect;
export type InsertCorrectionRequest = z.infer<typeof insertCorrectionRequestSchema>;

export type PropertyTenant = typeof propertyTenants.$inferSelect;
export type InsertPropertyTenant = z.infer<typeof insertPropertyTenantSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
