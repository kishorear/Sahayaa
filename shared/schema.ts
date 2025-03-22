import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenant table for multi-tenant support
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  apiKey: text("apiKey").notNull().unique(),
  settings: json("settings").default({}).notNull(), // Tenant-specific settings
  branding: json("branding").default({
    primaryColor: '#4F46E5',
    logo: null,
    companyName: '',
    emailTemplate: 'default'
  }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Create a unique index on username + tenantId to allow same username in different tenants
    usernameUnique: uniqueIndex("username_tenant_unique").on(table.username, table.tenantId),
  };
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .pick({
    username: true,
    password: true,
    role: true,
    name: true,
    email: true,
    tenantId: true,
  });

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved
  category: text("category").notNull(), // authentication, billing, feature_request, etc.
  complexity: text("complexity").default("medium"), // simple, medium, complex
  assignedTo: text("assignedTo"), // role or specific user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  aiResolved: boolean("aiResolved").default(false),
  aiNotes: text("aiNotes"),
  // Integration fields
  externalIntegrations: json("externalIntegrations"), // {zendesk: {id, url}, jira: {id, key, url}}
  // Client metadata (for when tickets are created from external clients)
  clientMetadata: json("clientMetadata"),
});

export const insertTicketSchema = createInsertSchema(tickets)
  .omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticketId").notNull(),
  sender: text("sender").notNull(), // user, ai, support, engineering, etc.
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticketId").notNull(),
  messageId: integer("messageId"),
  type: text("type").notNull(), // screen_recording, image, file
  filename: text("filename").notNull(),
  contentType: text("contentType").notNull(),
  data: text("data").notNull(), // base64 encoded data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true, updatedAt: true });
  
export const insertAttachmentSchema = createInsertSchema(attachments)
  .omit({ id: true, createdAt: true });

// Type definitions
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// API response types
export type TicketWithMessages = Ticket & {
  messages: Message[];
  attachments?: Attachment[];
};

export type TicketSummary = {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: string;
  aiResolvedPercentage: string;
};

export type TicketCategoryDistribution = {
  category: string;
  count: number;
  percentage: number;
};

export type ChatbotResponse = {
  message: string;
  action?: {
    type: 'create_ticket' | 'resolve_ticket' | 'update_ticket';
    data: any;
  };
};

// Data sources schema
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  name: text("name").notNull(),
  type: text("type").notNull(), // "kb" (knowledge base), "url", "doc", "custom"
  description: text("description"),
  content: text("content"), // JSON string for KB entries, URL for web sources, etc.
  enabled: boolean("enabled").default(true).notNull(),
  priority: integer("priority").default(10).notNull(), // Lower values = higher priority
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
