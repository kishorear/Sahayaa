import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI provider types
export const AiProviderTypeEnum = z.enum([
  'openai',
  'gemini',
  'anthropic',
  'aws-bedrock',
  'bedrock', // Including legacy 'bedrock' type which maps to 'aws-bedrock' in the code
  'custom'
]);

// Document status types
export const DocumentStatusEnum = z.enum([
  'draft',
  'published',
  'archived'
]);

// Tenant table for multi-tenant support
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  apiKey: text("apiKey").notNull().unique(),
  adminId: integer("adminId").default(1), // Reference to the admin user for this tenant
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
  
  // MFA fields
  mfaEnabled: boolean("mfaEnabled").default(false),
  mfaSecret: text("mfaSecret"),
  mfaBackupCodes: json("mfaBackupCodes").default([]),
  
  // SSO fields
  ssoEnabled: boolean("ssoEnabled").default(false),
  ssoProvider: text("ssoProvider"), // "google", "microsoft", "saml", etc.
  ssoProviderId: text("ssoProviderId"), // External provider's user ID
  ssoProviderData: json("ssoProviderData").default({}),
  
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
    type: 'create_ticket' | 'resolve_ticket' | 'update_ticket' | 'suggest_ticket';
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

// SSO identity provider schema
export const identityProviders = pgTable("identity_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  type: text("type").notNull(), // "saml", "oauth2", "oidc"
  name: text("name").notNull(), // Display name for the provider
  enabled: boolean("enabled").default(true).notNull(),
  
  // SSO Provider configuration
  config: json("config").notNull(), // Provider-specific configuration
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertIdentityProviderSchema = createInsertSchema(identityProviders)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type IdentityProvider = typeof identityProviders.$inferSelect;
export type InsertIdentityProvider = z.infer<typeof insertIdentityProviderSchema>;

// Widget analytics schema for tracking chat widget usage
export const widgetAnalytics = pgTable("widget_analytics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  adminId: integer("adminId").notNull(), // The admin user who generated/downloaded the widget
  apiKey: text("apiKey").notNull(), // The unique API key assigned to the widget instance
  clientWebsite: text("clientWebsite"), // The website where the widget is installed
  clientInfo: text("clientInfo"), // User agent or other client information
  interactions: integer("interactions").default(0), // Count of user interactions
  messagesReceived: integer("messagesReceived").default(0), // Count of messages from users
  messagesSent: integer("messagesSent").default(0), // Count of responses sent
  ticketsCreated: integer("ticketsCreated").default(0), // Count of tickets created from this widget
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  lastClientIp: text("lastClientIp"), // IP address of the last client interaction
  metadata: json("metadata").default({}), // Additional metadata about the widget usage
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertWidgetAnalyticsSchema = createInsertSchema(widgetAnalytics)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type WidgetAnalytics = typeof widgetAnalytics.$inferSelect;
export type InsertWidgetAnalytics = z.infer<typeof insertWidgetAnalyticsSchema>;

// AI provider configurations
export const aiProviders = pgTable("ai_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  type: text("type").notNull(), // 'openai', 'gemini', 'anthropic', 'aws-bedrock', 'custom'
  name: text("name").notNull(), // Display name for the provider
  apiKey: text("apiKey"), // Optional API key (may use environment variables instead)
  baseUrl: text("baseUrl"), // Optional base URL for custom APIs
  model: text("model"), // Model name to use
  isPrimary: boolean("isPrimary").default(false), // Whether this is the primary provider
  useForChat: boolean("useForChat").default(true), // Whether to use for chat responses
  useForClassification: boolean("useForClassification").default(true), // Whether to use for ticket classification
  useForAutoResolve: boolean("useForAutoResolve").default(true), // Whether to use for auto-resolving tickets
  useForEmail: boolean("useForEmail").default(true), // Whether to use for email responses
  settings: json("settings").default({}), // Provider-specific settings
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertAiProviderSchema = createInsertSchema(aiProviders)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type AiProvider = typeof aiProviders.$inferSelect;
export type InsertAiProvider = z.infer<typeof insertAiProviderSchema>;

// Support document schema
export const supportDocuments = pgTable("support_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(1), // Using snake_case to match database column
  title: text("title").notNull(),
  content: text("content").notNull(), 
  summary: text("summary"), // A short summary of the document for quick reference
  category: text("category").notNull(), // Product category or feature area this document relates to
  tags: text("tags").array().default([]), // Tags for better searchability
  status: text("status").notNull().default("draft"), // draft, published, archived
  errorCodes: text("error_codes").array().default([]), // Specific error codes this document addresses
  keywords: text("keywords").array().default([]), // Important keywords for search matching
  viewCount: integer("view_count").default(0), // Analytics for document usage
  createdBy: integer("created_by").notNull(), // User ID of document creator
  lastEditedBy: integer("last_edited_by"), // User ID of last editor
  metadata: json("metadata").default({}), // Additional document metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"), // When the document was published
});

export const insertSupportDocumentSchema = createInsertSchema(supportDocuments)
  .omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });

export type SupportDocument = typeof supportDocuments.$inferSelect;
export type InsertSupportDocument = z.infer<typeof insertSupportDocumentSchema>;

// Document usage analytics schema
export const documentUsage = pgTable("document_usage", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  ticketId: integer("ticket_id"), // If used in a specific ticket
  aiRequestId: text("ai_request_id"), // Unique identifier for AI request
  queryText: text("query_text"), // The query that triggered this document use
  usageType: text("usage_type").notNull(), // 'chat', 'ticket', 'admin_preview', etc.
  relevanceScore: integer("relevance_score"), // How relevant the document was (1-100)
  aiModel: text("ai_model"), // Which AI model used the document
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata").default({}), // Additional usage metadata
});

export const insertDocumentUsageSchema = createInsertSchema(documentUsage)
  .omit({ id: true, timestamp: true });

export type DocumentUsage = typeof documentUsage.$inferSelect;
export type InsertDocumentUsage = z.infer<typeof insertDocumentUsageSchema>;
