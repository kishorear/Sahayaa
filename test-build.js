var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  AiProviderTypeEnum: () => AiProviderTypeEnum,
  ApiKeyPermissionEnum: () => ApiKeyPermissionEnum,
  DocumentStatusEnum: () => DocumentStatusEnum,
  agentResources: () => agentResources,
  aiProviderAudit: () => aiProviderAudit,
  aiProviders: () => aiProviders,
  attachments: () => attachments,
  dataSources: () => dataSources,
  documentUsage: () => documentUsage,
  identityProviders: () => identityProviders,
  insertAgentResourceSchema: () => insertAgentResourceSchema,
  insertAiProviderSchema: () => insertAiProviderSchema,
  insertAttachmentSchema: () => insertAttachmentSchema,
  insertDataSourceSchema: () => insertDataSourceSchema,
  insertDocumentUsageSchema: () => insertDocumentUsageSchema,
  insertIdentityProviderSchema: () => insertIdentityProviderSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertSupportDocumentSchema: () => insertSupportDocumentSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertTeamSchema: () => insertTeamSchema,
  insertTenantSchema: () => insertTenantSchema,
  insertTicketSchema: () => insertTicketSchema,
  insertUserSchema: () => insertUserSchema,
  insertWidgetAnalyticsSchema: () => insertWidgetAnalyticsSchema,
  insertWidgetApiKeySchema: () => insertWidgetApiKeySchema,
  messages: () => messages,
  supportDocuments: () => supportDocuments,
  teamMembers: () => teamMembers,
  teams: () => teams,
  tenants: () => tenants,
  tickets: () => tickets,
  updateProfileSchema: () => updateProfileSchema,
  users: () => users,
  widgetAnalytics: () => widgetAnalytics,
  widgetApiKeys: () => widgetApiKeys
});
import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var AiProviderTypeEnum, DocumentStatusEnum, ApiKeyPermissionEnum, tenants, insertTenantSchema, teams, insertTeamSchema, teamMembers, insertTeamMemberSchema, users, insertUserSchema, updateProfileSchema, tickets, insertTicketSchema, messages, attachments, insertMessageSchema, insertAttachmentSchema, dataSources, insertDataSourceSchema, identityProviders, insertIdentityProviderSchema, widgetAnalytics, insertWidgetAnalyticsSchema, widgetApiKeys, insertWidgetApiKeySchema, aiProviders, aiProviderAudit, insertAiProviderSchema, supportDocuments, insertSupportDocumentSchema, documentUsage, insertDocumentUsageSchema, agentResources, insertAgentResourceSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    AiProviderTypeEnum = z.enum([
      "openai",
      "gemini",
      "anthropic",
      "aws-bedrock",
      "bedrock",
      // Including legacy 'bedrock' type which maps to 'aws-bedrock' in the code
      // 'perplexity' removed
      "custom"
    ]);
    DocumentStatusEnum = z.enum([
      "draft",
      "published",
      "archived"
    ]);
    ApiKeyPermissionEnum = z.object({
      read: z.boolean().default(true),
      write: z.boolean().default(true),
      webhook: z.boolean().default(false)
    });
    tenants = pgTable("tenants", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      subdomain: text("subdomain").notNull().unique(),
      apiKey: text("apiKey").notNull().unique(),
      adminId: integer("adminId").default(1),
      // Reference to the admin user for this tenant
      settings: json("settings").default({}).notNull(),
      // Tenant-specific settings
      branding: json("branding").default({
        primaryColor: "#4F46E5",
        logo: null,
        companyName: "",
        emailTemplate: "default"
      }).notNull(),
      active: boolean("active").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
    teams = pgTable("teams", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull().default(1),
      // Default to tenant 1 for backward compatibility
      name: text("name").notNull(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    }, (table) => {
      return {
        // Create a unique index on team name + tenantId
        teamNameUnique: uniqueIndex("team_name_tenant_unique").on(table.name, table.tenantId)
      };
    });
    insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true });
    teamMembers = pgTable("team_members", {
      id: serial("id").primaryKey(),
      teamId: integer("teamId").notNull(),
      userId: integer("userId").notNull(),
      role: text("role").notNull().default("member"),
      // member, leader, admin
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    }, (table) => {
      return {
        // Create a unique index on userId + teamId to prevent duplicate memberships
        membershipUnique: uniqueIndex("membership_unique").on(table.userId, table.teamId)
      };
    });
    insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true, updatedAt: true });
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull().default(1),
      // Default to tenant 1 for backward compatibility
      teamId: integer("teamId"),
      // Reference to the team the user belongs to
      username: text("username").notNull(),
      password: text("password").notNull(),
      role: text("role").notNull().default("member"),
      // creator, administrator, support_engineer, user, member
      name: text("name"),
      email: text("email"),
      company: text("company"),
      // Company or organization name
      profilePicture: text("profilePicture"),
      // URL or path to profile picture
      // MFA fields
      mfaEnabled: boolean("mfaEnabled").default(false),
      mfaSecret: text("mfaSecret"),
      mfaBackupCodes: json("mfaBackupCodes").default([]),
      // SSO fields
      ssoEnabled: boolean("ssoEnabled").default(false),
      ssoProvider: text("ssoProvider"),
      // "google", "microsoft", "saml", etc.
      ssoProviderId: text("ssoProviderId"),
      // External provider's user ID
      ssoProviderData: json("ssoProviderData").default({}),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    }, (table) => {
      return {
        // Create a unique index on username + tenantId to allow same username in different tenants
        usernameUnique: uniqueIndex("username_tenant_unique").on(table.username, table.tenantId)
      };
    });
    insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true }).pick({
      username: true,
      password: true,
      role: true,
      name: true,
      email: true,
      company: true,
      profilePicture: true,
      tenantId: true,
      teamId: true
    });
    updateProfileSchema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters").optional(),
      email: z.string().email("Please enter a valid email").optional(),
      company: z.string().min(2, "Company name must be at least 2 characters").optional(),
      profilePicture: z.string().nullable().optional()
    });
    tickets = pgTable("tickets", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull().default(1),
      // Default to tenant 1 for backward compatibility
      teamId: integer("teamId"),
      // Reference to the team the ticket belongs to
      createdBy: integer("createdBy"),
      // Reference to the user who created the ticket
      title: text("title").notNull(),
      description: text("description").notNull(),
      status: text("status").notNull().default("new"),
      // new, in_progress, resolved
      category: text("category").notNull(),
      // authentication, billing, feature_request, etc.
      complexity: text("complexity").default("medium"),
      // simple, medium, complex
      assignedTo: text("assignedTo"),
      // role or specific user
      source: text("source").default("chat"),
      // chat, email, widget, api
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      resolvedAt: timestamp("resolvedAt"),
      aiResolved: boolean("aiResolved").default(false),
      aiNotes: text("aiNotes"),
      // Integration fields
      externalIntegrations: json("externalIntegrations"),
      // {zendesk: {id, url}, jira: {id, key, url}}
      // Client metadata (for when tickets are created from external clients)
      clientMetadata: json("clientMetadata")
    });
    insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
    messages = pgTable("messages", {
      id: serial("id").primaryKey(),
      ticketId: integer("ticketId").notNull(),
      sender: text("sender").notNull(),
      // user, ai, support, engineering, etc.
      content: text("content").notNull(),
      metadata: json("metadata"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    attachments = pgTable("attachments", {
      id: serial("id").primaryKey(),
      ticketId: integer("ticketId").notNull(),
      messageId: integer("messageId"),
      type: text("type").notNull(),
      // screen_recording, image, file
      filename: text("filename").notNull(),
      contentType: text("contentType").notNull(),
      data: text("data").notNull(),
      // base64 encoded data
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, updatedAt: true });
    insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
    dataSources = pgTable("data_sources", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull().default(1),
      // Default to tenant 1 for backward compatibility
      name: text("name").notNull(),
      type: text("type").notNull(),
      // "kb" (knowledge base), "url", "doc", "custom"
      description: text("description"),
      content: text("content"),
      // JSON string for KB entries, URL for web sources, etc.
      enabled: boolean("enabled").default(true).notNull(),
      priority: integer("priority").default(10).notNull(),
      // Lower values = higher priority
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertDataSourceSchema = createInsertSchema(dataSources).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    identityProviders = pgTable("identity_providers", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull(),
      type: text("type").notNull(),
      // "saml", "oauth2", "oidc"
      name: text("name").notNull(),
      // Display name for the provider
      enabled: boolean("enabled").default(true).notNull(),
      // SSO Provider configuration
      config: json("config").notNull(),
      // Provider-specific configuration
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    insertIdentityProviderSchema = createInsertSchema(identityProviders).omit({ id: true, createdAt: true, updatedAt: true });
    widgetAnalytics = pgTable("widget_analytics", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull(),
      adminId: integer("adminId").notNull(),
      // The admin user who generated/downloaded the widget
      apiKey: text("apiKey").notNull(),
      // The unique API key assigned to the widget instance
      clientWebsite: text("clientWebsite"),
      // The website where the widget is installed
      clientInfo: text("clientInfo"),
      // User agent or other client information
      interactions: integer("interactions").default(0),
      // Count of user interactions
      messagesReceived: integer("messagesReceived").default(0),
      // Count of messages from users
      messagesSent: integer("messagesSent").default(0),
      // Count of responses sent
      ticketsCreated: integer("ticketsCreated").default(0),
      // Count of tickets created from this widget
      lastActivity: timestamp("lastActivity").defaultNow().notNull(),
      lastClientIp: text("lastClientIp"),
      // IP address of the last client interaction
      metadata: json("metadata").default({}),
      // Additional metadata about the widget usage
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    insertWidgetAnalyticsSchema = createInsertSchema(widgetAnalytics).omit({ id: true, createdAt: true, updatedAt: true });
    widgetApiKeys = pgTable("widget_api_keys", {
      id: serial("id").primaryKey(),
      key: text("key").notNull().unique(),
      tenantId: integer("tenantId").notNull(),
      createdBy: integer("createdBy").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      lastUsed: timestamp("lastUsed"),
      expiresAt: timestamp("expiresAt"),
      domains: json("domains").$type().default([]),
      useCount: integer("useCount").default(0).notNull(),
      description: text("description"),
      permissions: json("permissions").$type().default({
        read: true,
        write: true,
        webhook: false
      }).notNull(),
      isRevoked: boolean("isRevoked").default(false).notNull()
    });
    insertWidgetApiKeySchema = createInsertSchema(widgetApiKeys).omit({ id: true, createdAt: true, useCount: true, lastUsed: true, isRevoked: true });
    aiProviders = pgTable("ai_providers", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenantId").notNull(),
      teamId: integer("teamId"),
      // Optional, if null, applies to all teams in tenant
      type: text("type").notNull(),
      // 'openai', 'anthropic', 'google', 'aws', 'azure', 'custom'
      name: text("name").notNull(),
      // Display name for the provider
      model: text("model").notNull(),
      // Model name to use, e.g., 'gpt-4', 'claude-3', etc.
      apiKey: text("apiKey"),
      // API key (stored securely)
      baseUrl: text("baseUrl"),
      // Base URL for API requests
      isPrimary: boolean("isPrimary").default(false),
      // Whether this is the primary provider
      isDefault: boolean("isDefault").default(false),
      // Whether this is the default provider
      enabled: boolean("enabled").default(true),
      // Whether this provider is enabled
      settings: json("settings").default({}),
      // Provider-specific settings
      useForClassification: boolean("useForClassification").default(true),
      // Use for ticket classification
      useForAutoResolve: boolean("useForAutoResolve").default(true),
      // Use for auto-resolving tickets
      useForChat: boolean("useForChat").default(true),
      // Use for chat responses
      useForEmail: boolean("useForEmail").default(true),
      // Use for email responses
      priority: integer("priority").default(50).notNull(),
      // Priority (1-100, higher = more priority)
      contextWindow: integer("contextWindow").default(8e3).notNull(),
      // Max context window size
      maxTokens: integer("maxTokens").default(1e3).notNull(),
      // Max output tokens
      temperature: integer("temperature").default(7).notNull(),
      // Temperature setting (0-10, divided by 10 in code)
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    aiProviderAudit = pgTable("ai_provider_audit", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      // User who performed the action
      tenantId: integer("tenant_id").notNull(),
      // Tenant context
      teamId: integer("team_id"),
      // Team context (optional)
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      // When the action occurred
      action: text("action").notNull(),
      // Action type (access, create, update, delete, etc.)
      providerId: integer("provider_id"),
      // Provider ID if applicable
      success: boolean("success").default(true),
      // Whether access was granted/action succeeded
      details: json("details")
      // Additional details about the action
    });
    insertAiProviderSchema = createInsertSchema(aiProviders).omit({ id: true, createdAt: true, updatedAt: true });
    supportDocuments = pgTable("support_documents", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").notNull().default(1),
      // Using snake_case to match database column
      title: text("title").notNull(),
      content: text("content").notNull(),
      summary: text("summary"),
      // A short summary of the document for quick reference
      category: text("category").notNull(),
      // Product category or feature area this document relates to
      tags: text("tags").array().default([]),
      // Tags for better searchability
      status: text("status").notNull().default("draft"),
      // draft, published, archived
      errorCodes: text("error_codes").array().default([]),
      // Specific error codes this document addresses
      keywords: text("keywords").array().default([]),
      // Important keywords for search matching
      viewCount: integer("view_count").default(0),
      // Analytics for document usage
      createdBy: integer("created_by").notNull(),
      // User ID of document creator
      lastEditedBy: integer("last_edited_by"),
      // User ID of last editor
      metadata: json("metadata").default({}),
      // Additional document metadata
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      publishedAt: timestamp("published_at")
      // When the document was published
    });
    insertSupportDocumentSchema = createInsertSchema(supportDocuments).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
    documentUsage = pgTable("document_usage", {
      id: serial("id").primaryKey(),
      documentId: integer("document_id").notNull(),
      ticketId: integer("ticket_id"),
      // If used in a specific ticket
      aiRequestId: text("ai_request_id"),
      // Unique identifier for AI request
      queryText: text("query_text"),
      // The query that triggered this document use
      usageType: text("usage_type").notNull(),
      // 'chat', 'ticket', 'admin_preview', etc.
      relevanceScore: integer("relevance_score"),
      // How relevant the document was (1-100)
      aiModel: text("ai_model"),
      // Which AI model used the document
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      metadata: json("metadata").default({})
      // Additional usage metadata
    });
    insertDocumentUsageSchema = createInsertSchema(documentUsage).omit({ id: true, timestamp: true });
    agentResources = pgTable("agent_resources", {
      id: serial("id").primaryKey(),
      agentType: text("agent_type").notNull(),
      // 'chat-preprocessor', 'instruction-lookup', 'ticket-formatter'
      filename: text("filename").notNull(),
      // Server-side filename (unique)
      originalName: text("original_name").notNull(),
      // Original filename as uploaded
      fileSize: integer("file_size").notNull(),
      // File size in bytes
      fileType: text("file_type").notNull(),
      // File extension (.txt, .pdf, etc.)
      filePath: text("file_path").notNull(),
      // Path to the stored file
      tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      uploadedBy: integer("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
      uploadDate: timestamp("upload_date").defaultNow().notNull(),
      metadata: json("metadata").default({})
      // Additional file metadata
    });
    insertAgentResourceSchema = createInsertSchema(agentResources).omit({ id: true, uploadDate: true });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  executeQuery: () => executeQuery,
  pool: () => pool,
  reconnectDb: () => reconnectDb,
  testDbConnection: () => testDbConnection
});
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
function createDbPool() {
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Increase connection timeout to handle network latency in production
    connectionTimeoutMillis: 1e4,
    // 10 seconds
    // Add idle timeout to clean up unused connections
    idleTimeoutMillis: 6e4,
    // 60 seconds
    // Limit connection pool size to prevent overwhelming the database
    max: 15,
    // Increased pool size for more concurrent connections
    // More tolerant query timeout
    statement_timeout: 2e4,
    // 20 seconds
    // Add keepalive settings to help with connection reliability
    keepalive: true,
    // Client will automatically try to reconnect up to 10 times
    max_retries: 10,
    // How long to wait between retries (ms)
    retry_interval: 3e3
  };
  console.log("Database connection config:", {
    connectionString: process.env.DATABASE_URL ? "[REDACTED]" : void 0,
    ssl: dbConfig.ssl ? "Enabled with rejectUnauthorized=false" : "Disabled",
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    max: dbConfig.max,
    statement_timeout: dbConfig.statement_timeout,
    keepalive: dbConfig.keepalive,
    max_retries: dbConfig.max_retries
  });
  const pool2 = new Pool(dbConfig);
  let isConnectionBroken = false;
  let reconnectTimer = null;
  const RECONNECT_DELAY = 5e3;
  const MAX_RECONNECT_ATTEMPTS = 100;
  let reconnectAttempts = 0;
  pool2.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    const isConnectionError = err && typeof err === "object" && (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.code === "57P01" || // terminating connection due to administrator command
    err.code === "08006" || // connection failure
    err.code === "08001" || // unable to connect
    err.code === "3D000" || // database does not exist
    err.code === "28P01" || // invalid password
    err.message && (err.message.includes("Connection terminated") || err.message.includes("timeout") || err.message.includes("connection") || err.message.includes("Connection refused")));
    if (isConnectionError) {
      console.error("Database connection error, continuing with fallback:", err.message);
      isConnectionBroken = true;
      if (!reconnectTimer && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Scheduling database reconnection attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms...`);
        reconnectTimer = setTimeout(async () => {
          reconnectAttempts++;
          console.log(`Attempting database reconnection #${reconnectAttempts}...`);
          try {
            const reconnected = await reconnectDb();
            if (reconnected) {
              console.log("Database reconnection successful!");
              isConnectionBroken = false;
              reconnectAttempts = 0;
              reconnectTimer = null;
            } else {
              console.error("Database reconnection failed.");
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimer = setTimeout(() => {
                  reconnectTimer = null;
                  pool2.emit("error", new Error("Trigger next reconnection attempt"));
                }, RECONNECT_DELAY * Math.min(5, reconnectAttempts));
              } else {
                console.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
              }
            }
          } catch (reconnectError) {
            console.error("Error during database reconnection:", reconnectError);
            reconnectTimer = null;
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              pool2.emit("error", new Error("Reconnection error, scheduling another attempt"));
            }
          }
        }, RECONNECT_DELAY);
      }
    }
  });
  const testConnection = async (retries = 5, initialDelay = 1e3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await pool2.query("SELECT NOW()");
        console.log("Database connection successful!", res.rows[0]);
        isConnectionBroken = false;
        return true;
      } catch (err) {
        const errorMessage = err && typeof err === "object" ? err.message : String(err);
        console.error(`Database connection attempt ${attempt}/${retries} failed:`, errorMessage);
        isConnectionBroken = true;
        if (attempt < retries) {
          const delay = initialDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
          console.log(`Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error("All database connection attempts failed. Continuing with fallback mechanisms.");
        }
      }
    }
    return false;
  };
  testConnection();
  pool2.isConnectionBroken = () => isConnectionBroken;
  return pool2;
}
async function testDbConnection(timeout = 5e3) {
  const testPromise = new Promise(async (resolve) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT NOW()");
        console.log("Database connection test successful:", result.rows[0]);
        if (typeof pool.isConnectionBroken === "function") {
          pool.isConnectionBroken = () => false;
        }
        resolve(true);
      } catch (queryError) {
        console.error("Database query test failed:", queryError);
        resolve(false);
      } finally {
        client.release();
      }
    } catch (connectionError) {
      console.error("Database connection acquisition failed:", connectionError);
      if (typeof pool.isConnectionBroken === "function") {
        pool.isConnectionBroken = () => true;
      }
      resolve(false);
    }
  });
  try {
    return await Promise.race([
      testPromise,
      new Promise((resolve) => setTimeout(() => {
        console.error(`Database connection test timed out after ${timeout}ms`);
        if (typeof pool.isConnectionBroken === "function") {
          pool.isConnectionBroken = () => true;
        }
        resolve(false);
      }, timeout))
    ]);
  } catch (error) {
    console.error("Unexpected error during database connection test:", error);
    return false;
  }
}
async function reconnectDb(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempting to reconnect to the database (attempt ${attempt}/${maxAttempts})...`);
      try {
        await Promise.race([
          pool.end(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Pool end timeout")), 3e3))
        ]);
        console.log("Successfully closed existing pool connections");
      } catch (endError) {
        console.warn("Error closing pool connections, creating new pool anyway:", endError);
      }
      const newPool = createDbPool();
      const testPromise = new Promise(async (resolve) => {
        try {
          const client = await newPool.connect();
          try {
            await client.query("SELECT 1");
            console.log("New database connection verified successfully");
            resolve(true);
          } finally {
            client.release();
          }
        } catch (testError) {
          console.error("Failed to test new database connection:", testError);
          resolve(false);
        }
      });
      const connectionSuccessful = await Promise.race([
        testPromise,
        new Promise((resolve) => setTimeout(() => {
          console.error("Database connection test timed out");
          resolve(false);
        }, 5e3))
      ]);
      if (connectionSuccessful) {
        Object.assign(pool, newPool);
        console.log("Database pool successfully reconnected and replaced");
        Object.assign(db, drizzle(pool, { schema: schema_exports }));
        console.log("Drizzle ORM instance updated with new pool");
        return true;
      } else {
        console.error(`Reconnection attempt ${attempt} failed - new pool could not connect`);
        try {
          await newPool.end();
        } catch (e) {
        }
      }
    } catch (error) {
      console.error(`Database reconnection attempt ${attempt} failed with error:`, error);
    }
    if (attempt < maxAttempts) {
      const delay = 1e3 * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before next reconnection attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error(`Failed to reconnect to the database after ${maxAttempts} attempts`);
  return false;
}
function sanitizeJsonFields(obj) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string" && // Look for indicators that this might be a JSON string
      (value.startsWith("{") && value.endsWith("}") || value.startsWith("[") && value.endsWith("]"))) {
        try {
          result[key] = JSON.parse(value);
          if (key === "settings" || key === "branding" || key === "metadata") {
            console.log(`${key} JSON string successfully parsed to object`);
          }
        } catch (e) {
          result[key] = value;
        }
      } else if (value !== null && typeof value === "object") {
        result[key] = sanitizeJsonFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
async function executeJsonRecovery(originalQueryFn, logPrefix) {
  try {
    console.log(`${logPrefix}: JSON recovery - attempting with raw SQL approach`);
    const result = await originalQueryFn();
    if (result !== null && typeof result === "object") {
      try {
        if (Array.isArray(result)) {
          return result.map((item) => sanitizeJsonFields(item));
        } else {
          return sanitizeJsonFields(result);
        }
      } catch (sanitizeError) {
        console.warn(`${logPrefix}: Error during JSON recovery sanitization:`, sanitizeError);
        return result;
      }
    }
    return result;
  } catch (error) {
    console.error(`${logPrefix}: JSON recovery attempt failed:`, error);
    return void 0;
  }
}
async function executeQuery(queryFn, fallbackFn, options = {}) {
  const {
    retries = 3,
    initialDelay = 500,
    timeoutMs = 1e4,
    logPrefix = "DB Query",
    enhancedJsonHandling = true
  } = options;
  if (typeof pool.isConnectionBroken === "function" && pool.isConnectionBroken() && fallbackFn) {
    console.log(`${logPrefix}: Using fallback function directly as DB connection is known to be broken`);
    return fallbackFn();
  }
  const safeQueryFn = enhancedJsonHandling ? async () => {
    try {
      const result = await queryFn();
      if (result !== null && typeof result === "object") {
        try {
          if (Array.isArray(result)) {
            return result.map((item) => sanitizeJsonFields(item));
          } else {
            return sanitizeJsonFields(result);
          }
        } catch (sanitizeError) {
          console.warn(`${logPrefix}: Error during JSON sanitization:`, sanitizeError);
          return result;
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  } : queryFn;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        safeQueryFn(),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`${logPrefix}: Query timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix}: Attempt ${attempt}/${retries} failed: ${errorMessage}`);
      if (error instanceof Error && (errorMessage.includes("JSON") || errorMessage.includes("json") || errorMessage.includes("circular") || errorMessage.includes("stringify") || errorMessage.includes("unexpected token"))) {
        console.error(`${logPrefix}: JSON handling error detected:`, errorMessage);
        if (error.stack) {
          console.error(`${logPrefix}: Error stack:`, error.stack);
        }
        if (enhancedJsonHandling && attempt === retries) {
          try {
            console.log(`${logPrefix}: Attempting JSON error recovery...`);
            if (typeof executeJsonRecovery === "function") {
              const recoveryResult = await executeJsonRecovery(queryFn, logPrefix);
              if (recoveryResult !== void 0) {
                console.log(`${logPrefix}: Successfully recovered from JSON error`);
                return recoveryResult;
              }
            }
          } catch (recoveryError) {
            console.error(
              `${logPrefix}: JSON error recovery failed:`,
              recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
            );
          }
        }
        try {
          if (typeof queryFn.toString === "function") {
            const fnString = queryFn.toString();
            console.log(`${logPrefix}: Query function:`, fnString.substring(0, 300) + (fnString.length > 300 ? "..." : ""));
          }
        } catch (debugError) {
        }
      }
      const isConnectionError = error instanceof Error && (errorMessage.includes("Connection") || errorMessage.includes("connection") || errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("pool is draining") || errorMessage.includes("database") || errorMessage.includes("DB") || errorMessage.includes("57P01") || // terminating connection due to administrator command
      errorMessage.includes("08006") || // connection failure
      errorMessage.includes("08001"));
      if (isConnectionError && attempt >= retries && fallbackFn) {
        console.log(`${logPrefix}: Database connection issue detected, switching to fallback function`);
        if (typeof pool.isConnectionBroken === "function") {
          pool.isConnectionBroken = () => true;
        }
        setTimeout(() => {
          console.log(`${logPrefix}: Scheduling background reconnection attempt`);
          reconnectDb().catch((e) => console.error("Background reconnection failed:", e));
        }, 1e3);
        return fallbackFn();
      }
      if (attempt < retries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`${logPrefix}: Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!fallbackFn) {
        throw error;
      }
    }
  }
  if (fallbackFn) {
    console.log(`${logPrefix}: All database query attempts failed, using fallback function`);
    return fallbackFn();
  }
  throw new Error(`${logPrefix}: All retries failed and no fallback provided`);
}
var Pool, isProduction, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pkg);
    isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_ENVIRONMENT === "production";
    console.log("Database connection setup - Environment:", isProduction ? "Production" : "Development");
    console.log("Database URL available:", !!process.env.DATABASE_URL);
    pool = createDbPool();
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/knowledgeBase.ts
var knowledgeBase_exports = {};
__export(knowledgeBase_exports, {
  findRelevantKnowledgeBaseEntries: () => findRelevantKnowledgeBaseEntries,
  knowledgeBase: () => knowledgeBase
});
function findRelevantKnowledgeBaseEntries(query) {
  const queryLower = query.toLowerCase();
  const scoredEntries = knowledgeBase.map((entry) => {
    if (entry.question.toLowerCase().includes(queryLower)) {
      return { entry, score: 100 };
    }
    let score = 0;
    for (const tag of entry.tags) {
      if (queryLower.includes(tag.toLowerCase())) {
        score += 10;
      }
    }
    const words = queryLower.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        if (entry.question.toLowerCase().includes(word)) {
          score += 5;
        }
        if (entry.category.toLowerCase().includes(word)) {
          score += 3;
        }
      }
    }
    return { entry, score };
  });
  scoredEntries.sort((a, b) => b.score - a.score);
  if (scoredEntries.length > 0 && scoredEntries[0].score > 15) {
    return scoredEntries[0].entry;
  }
  return void 0;
}
var knowledgeBase;
var init_knowledgeBase = __esm({
  "server/knowledgeBase.ts"() {
    "use strict";
    knowledgeBase = [
      {
        id: 1,
        question: "How do I reset my password?",
        category: "authentication",
        tags: ["password", "reset", "login", "forgot", "can't access"],
        solution: "To reset your password, click on the 'Forgot Password' link on the login page. Enter your email address and we'll send you a password reset link. The link will expire in 24 hours."
      },
      {
        id: 2,
        question: "I'm getting error code 403 when trying to access the admin dashboard",
        category: "technical_issue",
        tags: ["error", "403", "forbidden", "admin", "dashboard", "access denied"],
        solution: "Error 403 means you don't have permission to access this resource. Please verify that your account has admin privileges. If you're certain you should have access, your session may have expired - try logging out and back in."
      },
      {
        id: 3,
        question: "How do I update my billing information?",
        category: "billing",
        tags: ["billing", "payment", "update", "credit card", "payment method"],
        solution: "To update your billing information, go to Account Settings > Billing. Click 'Edit Payment Method' to update your credit card details. All changes are securely processed through our payment provider."
      },
      {
        id: 4,
        question: "The system is running very slowly for me",
        category: "technical_issue",
        tags: ["slow", "performance", "laggy", "unresponsive", "loading"],
        solution: "Performance issues can be caused by several factors. Try these steps: 1) Clear your browser cache and cookies, 2) Try a different browser, 3) Check your internet connection speed, 4) Disable browser extensions. If the problem persists, please provide details about your device and browser for further troubleshooting."
      },
      {
        id: 5,
        question: "Does your platform integrate with Salesforce?",
        category: "technical_issue",
        tags: ["integration", "salesforce", "connect", "sync", "crm"],
        solution: "Yes, we offer a full integration with Salesforce. You can connect your Salesforce account through Settings > Integrations > Salesforce. The integration allows two-way syncing of contacts, opportunities, and custom objects. For detailed setup instructions, please see our integration guide at https://help.example.com/salesforce-integration."
      },
      {
        id: 6,
        question: "How do I export my data?",
        category: "technical_issue",
        tags: ["export", "download", "data", "backup", "csv", "reports"],
        solution: "You can export your data from the Reports section. Select the data you want to export, click 'Export' and choose your preferred format (CSV, Excel, or PDF). For large data sets, the export will be processed in the background and you'll receive an email when it's ready to download."
      },
      {
        id: 7,
        question: "I was charged twice for my subscription",
        category: "billing",
        tags: ["double charge", "billing error", "refund", "subscription", "payment"],
        solution: "I apologize for the incorrect billing. I can see that there was indeed a duplicate charge on your account. I've initiated a refund for the duplicate charge, which should appear on your account within 3-5 business days. I've also added a note to your account to prevent this from happening again."
      },
      {
        id: 8,
        question: "How can I add team members to my account?",
        category: "account",
        tags: ["team", "users", "invite", "add user", "member", "seats"],
        solution: "To add team members, go to Settings > Team Members and click 'Invite New User'. Enter their email address and select their access level. They'll receive an invitation email with instructions to join your team. Note that additional users may affect your billing depending on your subscription plan."
      },
      {
        id: 9,
        question: "What security measures do you have in place to protect my data?",
        category: "technical_issue",
        tags: ["security", "data protection", "encryption", "privacy", "compliance"],
        solution: "We take security very seriously. Our platform uses industry-standard encryption (AES-256) for all data, both in transit and at rest. We maintain SOC 2 Type II compliance, regular penetration testing, and a comprehensive disaster recovery plan. All data centers are physically secured and monitored 24/7. For more details, please see our Security Whitepaper at https://help.example.com/security."
      },
      {
        id: 10,
        question: "Can I change my username?",
        category: "account",
        tags: ["username", "change", "profile", "account settings"],
        solution: "Currently, usernames cannot be changed directly. However, you can contact our support team with your requested username, and we can change it for you manually. Please note that this will affect your login credentials, but not your email address or any other account settings."
      },
      {
        id: 11,
        question: "How do I set up two-factor authentication?",
        category: "authentication",
        tags: ["2fa", "two-factor", "security", "mfa", "authentication"],
        solution: "To enable two-factor authentication, go to Account Settings > Security and click 'Enable 2FA'. You can choose between SMS verification or using an authenticator app like Google Authenticator or Authy. We recommend using an authenticator app for better security. Once enabled, you'll need both your password and a verification code to log in."
      },
      {
        id: 12,
        question: "I need to cancel my subscription",
        category: "billing",
        tags: ["cancel", "subscription", "stop billing", "downgrade"],
        solution: "You can cancel your subscription by going to Account Settings > Billing > Subscription and clicking 'Cancel Subscription'. You'll continue to have access until the end of your current billing period. If you're canceling due to an issue with our service, we'd appreciate if you could share your feedback so we can improve."
      },
      {
        id: 13,
        question: "Do you offer an API?",
        category: "technical_issue",
        tags: ["api", "integration", "developer", "custom", "connect"],
        solution: "Yes, we offer a comprehensive REST API that allows you to integrate our platform with your systems. Our API documentation is available at https://api.example.com/docs and includes authentication details, endpoints, and code examples in various languages. Enterprise plans include dedicated API support and higher rate limits."
      },
      {
        id: 14,
        question: "I'm getting a 'database connection error' message",
        category: "technical_issue",
        tags: ["error", "database", "connection", "failed", "outage"],
        solution: "A database connection error typically indicates a temporary issue with our services. Our team has been notified and is working on resolving it. Please try again in a few minutes. If the problem persists for more than 15 minutes, please check our status page at https://status.example.com for any known outages."
      },
      {
        id: 15,
        question: "How can I request a feature?",
        category: "feature_request",
        tags: ["feature", "suggestion", "request", "improvement", "new"],
        solution: "We love hearing feature suggestions from our users! You can submit feature requests through the 'Feedback' button in the bottom-right corner of the dashboard. Our product team reviews all requests, and popular features are added to our roadmap. You can also vote on existing feature requests to help us prioritize development."
      }
    ];
  }
});

// server/storage.ts
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { eq, and, desc, asc, sql } from "drizzle-orm";
function initializeStorage() {
  try {
    console.log("Attempting to initialize database storage...");
    return new DatabaseStorage();
  } catch (error) {
    console.error("Failed to initialize database storage:", error);
    console.log("Falling back to in-memory storage");
    return new MemStorage();
  }
}
var isProduction2, MemStorage, DatabaseStorage, StorageWrapper, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    isProduction2 = process.env.NODE_ENV === "production" || process.env.REPLIT_ENVIRONMENT === "production";
    MemStorage = class {
      tenants;
      teams;
      users;
      tickets;
      messages;
      attachments;
      dataSources;
      widgetAnalyticsData;
      aiProviders;
      supportDocuments;
      documentUsageData;
      widgetApiKeysData;
      agentResources;
      tenantIdCounter;
      teamIdCounter;
      userIdCounter;
      ticketIdCounter;
      messageIdCounter;
      attachmentIdCounter;
      dataSourceIdCounter;
      widgetAnalyticsIdCounter;
      aiProviderIdCounter;
      supportDocumentIdCounter;
      documentUsageIdCounter;
      widgetApiKeyIdCounter;
      agentResourceIdCounter;
      // Add caches for critical data in production
      userCache = /* @__PURE__ */ new Map();
      tenantCache = /* @__PURE__ */ new Map();
      tenantByApiKeyCache = /* @__PURE__ */ new Map();
      tenantBySubdomainCache = /* @__PURE__ */ new Map();
      teamCache = /* @__PURE__ */ new Map();
      ticketCache = /* @__PURE__ */ new Map();
      supportDocumentCache = /* @__PURE__ */ new Map();
      sessionStore;
      constructor() {
        this.tenants = /* @__PURE__ */ new Map();
        this.teams = /* @__PURE__ */ new Map();
        this.users = /* @__PURE__ */ new Map();
        this.tickets = /* @__PURE__ */ new Map();
        this.messages = /* @__PURE__ */ new Map();
        this.attachments = /* @__PURE__ */ new Map();
        this.dataSources = /* @__PURE__ */ new Map();
        this.widgetAnalyticsData = /* @__PURE__ */ new Map();
        this.aiProviders = /* @__PURE__ */ new Map();
        this.supportDocuments = /* @__PURE__ */ new Map();
        this.documentUsageData = /* @__PURE__ */ new Map();
        this.widgetApiKeysData = /* @__PURE__ */ new Map();
        this.agentResources = /* @__PURE__ */ new Map();
        this.tenantIdCounter = 1;
        this.teamIdCounter = 1;
        this.userIdCounter = 1;
        this.ticketIdCounter = 1;
        this.messageIdCounter = 1;
        this.attachmentIdCounter = 1;
        this.dataSourceIdCounter = 1;
        this.widgetAnalyticsIdCounter = 1;
        this.aiProviderIdCounter = 1;
        this.supportDocumentIdCounter = 1;
        this.documentUsageIdCounter = 1;
        this.widgetApiKeyIdCounter = 1;
        this.agentResourceIdCounter = 1;
        this.initSampleSupportDocuments();
        const MemoryStore = createMemoryStore(session);
        this.sessionStore = new MemoryStore({
          checkPeriod: 864e5
          // Prune expired entries every 24h
        });
        this.createTenant({
          name: "Default Tenant",
          subdomain: "default",
          apiKey: "default-api-key",
          active: true,
          settings: {
            emailEnabled: true,
            aiEnabled: true,
            webhookEnabled: false,
            autoResolveEnabled: true
          },
          branding: {
            primaryColor: "#4F46E5",
            logo: null,
            companyName: "Support AI",
            emailTemplate: "default"
          }
        });
        this.createUser({
          username: "admin",
          password: "admin123",
          email: "admin@example.com",
          role: "admin",
          name: "Admin User",
          tenantId: 1
          // Default tenant ID
        });
        this.initSampleTeams();
        this.initSampleTickets();
        this.initSampleDataSources();
        this.initSampleAiProviders();
        this.initSampleSupportDocuments();
      }
      async initSampleTeams() {
        const sampleTeams = [
          {
            name: "Support Team",
            description: "Handles general customer support inquiries and issues",
            tenantId: 1
          },
          {
            name: "Engineering Team",
            description: "Handles technical issues and feature implementations",
            tenantId: 1
          },
          {
            name: "Billing Team",
            description: "Handles billing and subscription related inquiries",
            tenantId: 1
          },
          {
            name: "Product Team",
            description: "Manages product roadmap and feature requests",
            tenantId: 1
          }
        ];
        for (const teamData of sampleTeams) {
          const id = this.teamIdCounter++;
          const now = /* @__PURE__ */ new Date();
          const newTeam = {
            ...teamData,
            id,
            createdAt: now,
            updatedAt: now
          };
          this.teams.set(id, newTeam);
          const cacheKey = `team:${id}`;
          this.teamCache.set(cacheKey, newTeam);
        }
      }
      async initSampleAiProviders() {
        await this.createAiProvider({
          name: "OpenAI GPT-4o",
          type: "openai",
          tenantId: 1,
          model: "gpt-4o",
          isPrimary: true,
          enabled: true,
          useForChat: true,
          useForClassification: true,
          useForAutoResolve: true,
          useForEmail: true,
          settings: {
            systemPrompt: "You are a helpful customer support assistant. Your goal is to resolve customer issues efficiently and professionally."
          }
        });
        await this.createAiProvider({
          name: "OpenAI GPT-3.5",
          type: "openai",
          tenantId: 1,
          model: "gpt-3.5-turbo",
          isPrimary: false,
          enabled: true,
          useForChat: true,
          useForClassification: false,
          useForAutoResolve: false,
          useForEmail: false,
          settings: {
            systemPrompt: "You are a helpful customer support assistant. Your goal is to resolve customer issues efficiently and professionally."
          }
        });
      }
      async initSampleSupportDocuments() {
        const sampleDocuments = [
          {
            title: "Getting Started Guide",
            content: "This guide will help you get started with our product. Follow these steps to set up your account and begin using the platform.",
            category: "guide",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.0",
              author: "Admin User",
              tags: ["onboarding", "introduction", "setup"],
              priority: 1
            }
          },
          {
            title: "API Documentation",
            content: "Our REST API provides programmatic access to our services. This document outlines all available endpoints, authentication methods, and example requests.",
            category: "technical",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "2.1",
              author: "Engineering Team",
              tags: ["api", "development", "integration"],
              priority: 2
            }
          },
          {
            title: "Password Reset Process",
            content: "If you've forgotten your password, you can reset it by clicking the 'Forgot Password' link on the login page. You'll receive an email with instructions to create a new password.",
            category: "faq",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.0",
              author: "Support Team",
              tags: ["password", "account", "security"],
              priority: 1
            }
          },
          {
            title: "Billing and Subscription FAQ",
            content: "Find answers to common questions about billing cycles, payment methods, upgrading or downgrading plans, and managing your subscription.",
            category: "faq",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.2",
              author: "Billing Department",
              tags: ["billing", "payments", "subscription"],
              priority: 2
            }
          },
          {
            title: "Security Best Practices",
            content: "Learn how to keep your account secure with strong passwords, two-factor authentication, and regular security audits.",
            category: "guide",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.1",
              author: "Security Team",
              tags: ["security", "2fa", "passwords"],
              priority: 3
            }
          },
          {
            title: "Advanced Feature Tutorial",
            content: "This advanced tutorial covers the more complex features of our platform, including automation rules, custom integrations, and advanced reporting.",
            category: "tutorial",
            status: "draft",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "0.8",
              author: "Product Team",
              tags: ["advanced", "tutorial", "features"],
              priority: 4
            }
          },
          {
            title: "Mobile App User Guide",
            content: "A comprehensive guide to using our mobile application on iOS and Android devices, including offline functionality and mobile-specific features.",
            category: "guide",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.0",
              author: "Mobile Development Team",
              tags: ["mobile", "ios", "android"],
              priority: 2
            }
          },
          {
            title: "Data Import/Export Guide",
            content: "Learn how to import your existing data into our platform and export data for backup or analysis purposes.",
            category: "technical",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.1",
              author: "Data Team",
              tags: ["data", "import", "export", "migration"],
              priority: 3
            }
          },
          {
            title: "Team Collaboration Features",
            content: "Discover how to effectively collaborate with your team using our platform's sharing, commenting, and permission features.",
            category: "tutorial",
            status: "published",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "1.0",
              author: "Product Team",
              tags: ["collaboration", "teams", "sharing"],
              priority: 2
            }
          },
          {
            title: "Upcoming Features Preview",
            content: "Get a sneak peek at the new features we're developing for our next major release, including enhanced reporting and AI-powered recommendations.",
            category: "announcement",
            status: "draft",
            tenantId: 1,
            createdBy: 1,
            // Admin user
            metadata: {
              version: "0.5",
              author: "Product Management",
              tags: ["roadmap", "preview", "upcoming"],
              priority: 5
            }
          }
        ];
        for (const documentData of sampleDocuments) {
          const id = this.supportDocumentIdCounter++;
          const now = /* @__PURE__ */ new Date();
          const newDocument = {
            ...documentData,
            id,
            createdAt: now,
            updatedAt: now,
            viewCount: 0,
            status: documentData.status || "draft"
          };
          this.supportDocuments.set(id, newDocument);
        }
      }
      async initSampleDataSources() {
        const { knowledgeBase: knowledgeBase2 } = await Promise.resolve().then(() => (init_knowledgeBase(), knowledgeBase_exports));
        await this.createDataSource({
          name: "Default Knowledge Base",
          type: "kb",
          description: "Built-in knowledge base with common support solutions",
          content: JSON.stringify(knowledgeBase2),
          enabled: true,
          priority: 1,
          tenantId: 1
          // Default tenant ID
        });
        await this.createDataSource({
          name: "Product Documentation",
          type: "url",
          description: "Official product documentation",
          content: "https://docs.example.com/api",
          enabled: true,
          priority: 2,
          tenantId: 1
          // Default tenant ID
        });
        await this.createDataSource({
          name: "FAQ Database",
          type: "custom",
          description: "Frequently asked questions and answers",
          content: JSON.stringify([
            { question: "What are the system requirements?", answer: "Our software requires Windows 10/macOS 10.15 or later, 8GB RAM, and 1GB free disk space." },
            { question: "How do I upgrade my subscription?", answer: "You can upgrade your subscription from the Account page. Click on 'Subscription' and select the new plan you want." },
            { question: "Is there a mobile app?", answer: "Yes, our mobile app is available on iOS and Android. You can download it from the App Store or Google Play." }
          ]),
          enabled: true,
          priority: 3,
          tenantId: 1
          // Default tenant ID
        });
      }
      async initSampleTickets() {
        const sampleTickets = [
          {
            title: "Login not working with Google account",
            description: "I tried to login with my Google account but keep getting an error message that says 'Authentication failed'.",
            category: "authentication",
            complexity: "medium",
            status: "open",
            assignedTo: "support"
          },
          {
            title: "Can't update my profile picture",
            description: "Whenever I try to upload a new profile picture, the system hangs and then gives me a timeout error.",
            category: "profile_management",
            complexity: "simple",
            status: "in_progress",
            assignedTo: "support"
          },
          {
            title: "Credit card payment failing",
            description: "I'm trying to upgrade to the premium plan but my credit card payment is being declined even though the card works elsewhere.",
            category: "billing",
            complexity: "medium",
            status: "open",
            assignedTo: "billing"
          },
          {
            title: "Feature request: Dark mode",
            description: "It would be great if you could add a dark mode option to reduce eye strain when using the app at night.",
            category: "feature_request",
            complexity: "complex",
            status: "open",
            assignedTo: "product"
          },
          {
            title: "API integration with Zapier not working",
            description: "I've set up a Zapier integration with your API but the webhook calls are failing with a 403 error.",
            category: "api_integration",
            complexity: "complex",
            status: "in_progress",
            assignedTo: "engineering"
          },
          {
            title: "How do I reset my password?",
            description: "I forgot my password and don't see a reset option on the login page.",
            category: "authentication",
            complexity: "simple",
            status: "resolved",
            assignedTo: "support",
            aiResolved: true
          },
          {
            title: "Mobile app crashing on startup",
            description: "After the latest update, the mobile app crashes immediately when I try to open it. I'm using an iPhone 12 with iOS 15.",
            category: "mobile_app",
            complexity: "complex",
            status: "open",
            assignedTo: "engineering"
          },
          {
            title: "Can't export my data in CSV format",
            description: "The CSV export feature isn't working. When I try to download my data, I get an empty file.",
            category: "data_management",
            complexity: "medium",
            status: "in_progress",
            assignedTo: "engineering"
          },
          {
            title: "Need help with custom report configuration",
            description: "I'm trying to create a custom report that shows user activity by region, but I'm not sure how to set up the filters correctly.",
            category: "reporting",
            complexity: "medium",
            status: "resolved",
            assignedTo: "support"
          },
          {
            title: "Website is slow to load dashboard",
            description: "The dashboard takes over 30 seconds to load completely. This started happening about a week ago.",
            category: "performance",
            complexity: "complex",
            status: "in_progress",
            assignedTo: "engineering"
          }
        ];
        for (const ticketData of sampleTickets) {
          const ticket = await this.createTicket({
            ...ticketData,
            status: ticketData.status || "new"
          });
          if (ticket.status === "resolved") {
            const resolvedDate = /* @__PURE__ */ new Date();
            resolvedDate.setHours(resolvedDate.getHours() - Math.floor(Math.random() * 72));
            await this.updateTicket(ticket.id, {
              resolvedAt: resolvedDate,
              status: "resolved",
              aiResolved: ticketData.aiResolved || false
            });
          }
          await this.createMessage({
            ticketId: ticket.id,
            sender: "user",
            content: ticket.description,
            metadata: null
          });
          if (ticket.complexity === "simple") {
            await this.createMessage({
              ticketId: ticket.id,
              sender: "ai",
              content: `Thank you for your message. ${ticket.status === "resolved" ? "I've found a solution to your issue. " + (ticket.category === "authentication" ? "You can reset your password by clicking on the 'Forgot Password' link below the login form. We'll send you an email with instructions." : "Please try refreshing the page and clearing your browser cache, then try again.") : "Our team is looking into this and will get back to you shortly."}`,
              metadata: { autoResponse: true }
            });
          }
        }
      }
      // Tenant operations
      async getTenantById(id) {
        const cacheKey = `tenant:${id}`;
        const cachedTenant = this.tenantCache.get(cacheKey);
        if (cachedTenant) {
          console.log(`Tenant cache hit for ID: ${id}`);
          return cachedTenant;
        }
        const tenant = this.tenants.get(id);
        if (tenant) {
          this.tenantCache.set(cacheKey, tenant);
          setTimeout(() => {
            this.tenantCache.delete(cacheKey);
          }, 30 * 60 * 1e3);
        }
        return tenant;
      }
      async getTenantByApiKey(apiKey) {
        const cachedTenant = this.tenantByApiKeyCache.get(apiKey);
        if (cachedTenant) {
          console.log(`Tenant cache hit for API key: ${apiKey.substring(0, 4)}****`);
          return cachedTenant;
        }
        const tenant = Array.from(this.tenants.values()).find(
          (tenant2) => tenant2.apiKey === apiKey
        );
        if (tenant) {
          this.tenantByApiKeyCache.set(apiKey, tenant);
          setTimeout(() => {
            this.tenantByApiKeyCache.delete(apiKey);
          }, 30 * 60 * 1e3);
        }
        return tenant;
      }
      async getTenantBySubdomain(subdomain) {
        const cachedTenant = this.tenantBySubdomainCache.get(subdomain);
        if (cachedTenant) {
          console.log(`Tenant cache hit for subdomain: ${subdomain}`);
          return cachedTenant;
        }
        const tenant = Array.from(this.tenants.values()).find(
          (tenant2) => tenant2.subdomain === subdomain
        );
        if (tenant) {
          this.tenantBySubdomainCache.set(subdomain, tenant);
          setTimeout(() => {
            this.tenantBySubdomainCache.delete(subdomain);
          }, 30 * 60 * 1e3);
        }
        return tenant;
      }
      async getAllTenants() {
        return Array.from(this.tenants.values());
      }
      async createTenant(insertTenant) {
        const id = this.tenantIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const tenant = {
          ...insertTenant,
          id,
          createdAt: now,
          updatedAt: now,
          active: insertTenant.active ?? true,
          settings: insertTenant.settings ?? {},
          branding: insertTenant.branding ?? {
            primaryColor: "#4F46E5",
            logo: null,
            companyName: "",
            emailTemplate: "default"
          }
        };
        this.tenants.set(id, tenant);
        return tenant;
      }
      async updateTenant(id, updates) {
        const tenant = this.tenants.get(id);
        if (!tenant) {
          throw new Error(`Tenant with id ${id} not found`);
        }
        const updatedTenant = {
          ...tenant,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.tenants.set(id, updatedTenant);
        this.tenantCache.delete(`tenant:${id}`);
        if (updates.apiKey && updates.apiKey !== tenant.apiKey) {
          this.tenantByApiKeyCache.delete(tenant.apiKey);
          this.tenantByApiKeyCache.delete(updates.apiKey);
        }
        if (updates.subdomain && updates.subdomain !== tenant.subdomain) {
          this.tenantBySubdomainCache.delete(tenant.subdomain);
          this.tenantBySubdomainCache.delete(updates.subdomain);
        }
        console.log(`Cache entries cleared for tenant ID: ${id}`);
        return updatedTenant;
      }
      // Team operations
      async getTeamById(id, tenantId) {
        const cacheKey = `team:${id}`;
        const cachedTeam = this.teamCache.get(cacheKey);
        if (cachedTeam) {
          console.log(`Team cache hit for ID: ${id}`);
          if (tenantId && cachedTeam.tenantId !== tenantId) {
            return void 0;
          }
          return cachedTeam;
        }
        const team = this.teams.get(id);
        if (team && tenantId && team.tenantId !== tenantId) {
          return void 0;
        }
        if (team) {
          this.teamCache.set(cacheKey, team);
          setTimeout(() => {
            this.teamCache.delete(cacheKey);
          }, 30 * 60 * 1e3);
        }
        return team;
      }
      async getTeamByName(name, tenantId) {
        const teams2 = Array.from(this.teams.values());
        return teams2.find((team) => {
          const nameMatches = team.name === name;
          const tenantMatches = tenantId ? team.tenantId === tenantId : true;
          return nameMatches && tenantMatches;
        });
      }
      async getTeamsByTenantId(tenantId) {
        const teams2 = Array.from(this.teams.values());
        return teams2.filter((team) => team.tenantId === tenantId);
      }
      async createTeam(team) {
        const id = this.teamIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const newTeam = {
          ...team,
          id,
          createdAt: now,
          updatedAt: now
        };
        this.teams.set(id, newTeam);
        const cacheKey = `team:${id}`;
        this.teamCache.set(cacheKey, newTeam);
        return newTeam;
      }
      async updateTeam(id, updates, tenantId) {
        const team = await this.getTeamById(id, tenantId);
        if (!team) {
          throw new Error(`Team with id ${id} not found${tenantId ? ` in tenant ${tenantId}` : ""}`);
        }
        const updatedTeam = {
          ...team,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.teams.set(id, updatedTeam);
        const cacheKey = `team:${id}`;
        this.teamCache.set(cacheKey, updatedTeam);
        return updatedTeam;
      }
      async deleteTeam(id, tenantId) {
        const team = await this.getTeamById(id, tenantId);
        if (!team) {
          return false;
        }
        const result = this.teams.delete(id);
        const cacheKey = `team:${id}`;
        this.teamCache.delete(cacheKey);
        return result;
      }
      async getTeamMembers(teamId, tenantId) {
        const team = await this.getTeamById(teamId, tenantId);
        if (!team) {
          return [];
        }
        const users2 = Array.from(this.users.values());
        return users2.filter((user) => user.teamId === teamId);
      }
      async getTicketsByTeamId(teamId, tenantId) {
        if (tenantId) {
          const team = await this.getTeamById(teamId, tenantId);
          if (!team) {
            return [];
          }
        }
        const tickets2 = Array.from(this.tickets.values());
        if (tenantId) {
          return tickets2.filter((ticket) => ticket.teamId === teamId && ticket.tenantId === tenantId);
        } else {
          return tickets2.filter((ticket) => ticket.teamId === teamId);
        }
      }
      // User operations
      async getUser(id) {
        const cacheKey = `user:${id}`;
        const cachedUser = this.userCache.get(cacheKey);
        if (cachedUser) {
          console.log(`User cache hit for ID: ${id}`);
          return cachedUser;
        }
        const user = this.users.get(id);
        if (user) {
          this.userCache.set(cacheKey, user);
          setTimeout(() => {
            this.userCache.delete(cacheKey);
          }, 60 * 60 * 1e3);
        }
        return user;
      }
      async getUserByUsername(username, tenantId) {
        const cacheKey = tenantId ? `${username}:${tenantId}` : username;
        const cachedUser = this.userCache.get(cacheKey);
        if (cachedUser) {
          console.log(`User cache hit for username: ${username}`);
          return cachedUser;
        }
        let user;
        if (tenantId) {
          user = Array.from(this.users.values()).find(
            (user2) => user2.username === username && user2.tenantId === tenantId
          );
        } else {
          user = Array.from(this.users.values()).find(
            (user2) => user2.username === username
          );
        }
        if (user) {
          this.userCache.set(cacheKey, user);
          setTimeout(() => {
            this.userCache.delete(cacheKey);
          }, 60 * 60 * 1e3);
        }
        return user;
      }
      async getUsersByTenantId(tenantId) {
        return Array.from(this.users.values()).filter(
          (user) => user.tenantId === tenantId
        );
      }
      async createUser(insertUser) {
        const id = this.userIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const user = {
          ...insertUser,
          id,
          role: insertUser.role || "user",
          name: insertUser.name || null,
          email: insertUser.email || null,
          tenantId: insertUser.tenantId || 1,
          // Default to tenant ID 1 if not specified
          // MFA fields
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
          // SSO fields
          ssoEnabled: false,
          ssoProvider: null,
          ssoProviderId: null,
          ssoProviderData: {},
          createdAt: now,
          updatedAt: now
        };
        this.users.set(id, user);
        return user;
      }
      async updateUser(id, updates) {
        const user = this.users.get(id);
        if (!user) {
          throw new Error(`User with id ${id} not found`);
        }
        const updatedUser = {
          ...user,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.users.set(id, updatedUser);
        this.userCache.delete(`user:${id}`);
        if (updates.username && updates.username !== user.username) {
          const oldCacheKey = user.tenantId ? `${user.username}:${user.tenantId}` : user.username;
          this.userCache.delete(oldCacheKey);
          const newCacheKey = user.tenantId ? `${updates.username}:${user.tenantId}` : updates.username;
          this.userCache.delete(newCacheKey);
        }
        console.log(`Cache entries cleared for user ID: ${id}`);
        return updatedUser;
      }
      async deleteUser(id) {
        const user = this.users.get(id);
        if (!user) {
          throw new Error(`User with id ${id} not found`);
        }
        this.users.delete(id);
        this.userCache.delete(`user:${id}`);
        if (user.username) {
          const cacheKey = user.tenantId ? `${user.username}:${user.tenantId}` : user.username;
          this.userCache.delete(cacheKey);
        }
        console.log(`User with ID ${id} has been deleted`);
      }
      async getUserBySsoId(provider, providerId, tenantId) {
        return Array.from(this.users.values()).find(
          (user) => user.ssoProvider === provider && user.ssoProviderId === providerId && (!tenantId || user.tenantId === tenantId)
        );
      }
      // Identity Provider operations
      identityProviders = /* @__PURE__ */ new Map();
      identityProviderIdCounter = 1;
      async getIdentityProviders(tenantId) {
        return Array.from(this.identityProviders.values()).filter(
          (provider) => provider.tenantId === tenantId
        );
      }
      async getIdentityProviderById(id, tenantId) {
        const provider = this.identityProviders.get(id);
        if (tenantId && provider && provider.tenantId !== tenantId) {
          return void 0;
        }
        return provider;
      }
      async createIdentityProvider(insertProvider) {
        const id = this.identityProviderIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const provider = {
          ...insertProvider,
          id,
          createdAt: now,
          updatedAt: now,
          enabled: insertProvider.enabled ?? true
          // Ensure enabled is not undefined
        };
        this.identityProviders.set(id, provider);
        return provider;
      }
      async updateIdentityProvider(id, updates, tenantId) {
        const provider = this.identityProviders.get(id);
        if (!provider) {
          throw new Error(`Identity provider with id ${id} not found`);
        }
        if (tenantId && provider.tenantId !== tenantId) {
          throw new Error(`Identity provider with id ${id} does not belong to tenant ${tenantId}`);
        }
        const updatedProvider = {
          ...provider,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.identityProviders.set(id, updatedProvider);
        return updatedProvider;
      }
      async deleteIdentityProvider(id, tenantId) {
        const provider = this.identityProviders.get(id);
        if (!provider) {
          return false;
        }
        if (tenantId && provider.tenantId !== tenantId) {
          return false;
        }
        return this.identityProviders.delete(id);
      }
      // Ticket operations
      async getAllTickets(tenantId) {
        if (tenantId) {
          return Array.from(this.tickets.values()).filter((ticket) => ticket.tenantId === tenantId);
        }
        return Array.from(this.tickets.values());
      }
      async getTicketById(id, tenantId) {
        const cacheKey = tenantId ? `ticket:${id}:${tenantId}` : `ticket:${id}`;
        const cachedTicket = this.ticketCache.get(cacheKey);
        if (cachedTicket) {
          console.log(`Ticket cache hit for ID: ${id}`);
          return cachedTicket;
        }
        const ticket = this.tickets.get(id);
        if (tenantId && ticket && ticket.tenantId !== tenantId) {
          return void 0;
        }
        if (ticket) {
          this.ticketCache.set(cacheKey, ticket);
          setTimeout(() => {
            this.ticketCache.delete(cacheKey);
          }, 15 * 60 * 1e3);
        }
        return ticket;
      }
      async createTicket(insertTicket) {
        const id = this.ticketIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const ticket = {
          ...insertTicket,
          id,
          tenantId: insertTicket.tenantId || 1,
          // Default to tenant ID 1 if not specified
          status: insertTicket.status || "new",
          aiResolved: insertTicket.aiResolved || false,
          complexity: insertTicket.complexity || "medium",
          assignedTo: insertTicket.assignedTo || null,
          aiNotes: insertTicket.aiNotes || null,
          createdAt: now,
          updatedAt: now,
          resolvedAt: null
        };
        this.tickets.set(id, ticket);
        const cacheKey = `ticket:${id}`;
        const tenantCacheKey = `ticket:${id}:${ticket.tenantId}`;
        this.ticketCache.set(cacheKey, ticket);
        this.ticketCache.set(tenantCacheKey, ticket);
        setTimeout(() => {
          this.ticketCache.delete(cacheKey);
          this.ticketCache.delete(tenantCacheKey);
        }, 15 * 60 * 1e3);
        return ticket;
      }
      async updateTicket(id, updates, tenantId) {
        const ticket = this.tickets.get(id);
        if (!ticket) {
          throw new Error(`Ticket with id ${id} not found`);
        }
        if (tenantId && ticket.tenantId !== tenantId) {
          throw new Error(`Ticket with id ${id} does not belong to tenant ${tenantId}`);
        }
        const updatedTicket = {
          ...ticket,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.tickets.set(id, updatedTicket);
        this.ticketCache.delete(`ticket:${id}`);
        if (tenantId) {
          this.ticketCache.delete(`ticket:${id}:${tenantId}`);
        }
        if (ticket.tenantId) {
          this.ticketCache.delete(`ticket:${id}:${ticket.tenantId}`);
        }
        console.log(`Cache entries cleared for ticket ID: ${id}`);
        return updatedTicket;
      }
      // Message operations
      // Create a cache for messages by ticket ID
      messagesByTicketCache = /* @__PURE__ */ new Map();
      async getMessagesByTicketId(ticketId) {
        if (this.messagesByTicketCache.has(ticketId)) {
          console.log(`Message cache hit for ticket ID: ${ticketId}`);
          return this.messagesByTicketCache.get(ticketId) || [];
        }
        const messages2 = Array.from(this.messages.values()).filter((message) => message.ticketId === ticketId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.messagesByTicketCache.set(ticketId, messages2);
        setTimeout(() => {
          this.messagesByTicketCache.delete(ticketId);
        }, 5 * 60 * 1e3);
        return messages2;
      }
      async createMessage(insertMessage) {
        const id = this.messageIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const message = {
          ...insertMessage,
          id,
          metadata: insertMessage.metadata || null,
          createdAt: now,
          updatedAt: now
        };
        this.messages.set(id, message);
        const ticketId = message.ticketId;
        if (this.messagesByTicketCache.has(ticketId)) {
          const cachedMessages = this.messagesByTicketCache.get(ticketId) || [];
          cachedMessages.push(message);
          cachedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          this.messagesByTicketCache.set(ticketId, cachedMessages);
          console.log(`Message cache updated for ticket ID: ${ticketId}`);
        }
        this.ticketCache.delete(`ticket:${ticketId}`);
        this.ticketCache.delete(`ticket:${ticketId}:${message.tenantId}`);
        return message;
      }
      // Attachment operations
      async getAttachmentsByTicketId(ticketId) {
        return Array.from(this.attachments.values()).filter((attachment) => attachment.ticketId === ticketId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      async getAttachmentById(id) {
        return this.attachments.get(id);
      }
      async createAttachment(insertAttachment) {
        const id = this.attachmentIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const attachment = {
          ...insertAttachment,
          id,
          createdAt: now
        };
        this.attachments.set(id, attachment);
        return attachment;
      }
      // Data source operations
      async getAllDataSources(tenantId) {
        if (tenantId) {
          return Array.from(this.dataSources.values()).filter((source) => source.tenantId === tenantId).sort((a, b) => a.priority - b.priority);
        }
        return Array.from(this.dataSources.values()).sort((a, b) => a.priority - b.priority);
      }
      async getEnabledDataSources(tenantId) {
        let sources = Array.from(this.dataSources.values()).filter((source) => source.enabled);
        if (tenantId) {
          sources = sources.filter((source) => source.tenantId === tenantId);
        }
        return sources.sort((a, b) => a.priority - b.priority);
      }
      async getDataSourceById(id, tenantId) {
        const dataSource = this.dataSources.get(id);
        if (tenantId && dataSource && dataSource.tenantId !== tenantId) {
          return void 0;
        }
        return dataSource;
      }
      async createDataSource(insertDataSource) {
        const id = this.dataSourceIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const dataSource = {
          ...insertDataSource,
          id,
          description: insertDataSource.description || null,
          content: insertDataSource.content || null,
          enabled: insertDataSource.enabled ?? true,
          priority: insertDataSource.priority ?? 10,
          tenantId: insertDataSource.tenantId || 1,
          // Default to tenant ID 1 if not specified
          createdAt: now,
          updatedAt: now
        };
        this.dataSources.set(id, dataSource);
        return dataSource;
      }
      async updateDataSource(id, updates, tenantId) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
          throw new Error(`Data source with id ${id} not found`);
        }
        if (tenantId && dataSource.tenantId !== tenantId) {
          throw new Error(`Data source with id ${id} does not belong to tenant ${tenantId}`);
        }
        const updatedDataSource = {
          ...dataSource,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.dataSources.set(id, updatedDataSource);
        return updatedDataSource;
      }
      async deleteDataSource(id, tenantId) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
          return false;
        }
        if (tenantId && dataSource.tenantId !== tenantId) {
          throw new Error(`Data source with id ${id} does not belong to tenant ${tenantId}`);
        }
        return this.dataSources.delete(id);
      }
      // AI provider operations
      async getAiProviders(tenantId, teamId) {
        const providers = Array.from(this.aiProviders.values()).filter(
          (provider) => provider.tenantId === tenantId
        );
        if (teamId !== void 0) {
          return providers.filter(
            (provider) => provider.teamId === teamId || provider.teamId === null
          );
        }
        return providers;
      }
      async getAiProviderById(id, tenantId) {
        const provider = this.aiProviders.get(id);
        if (tenantId && provider && provider.tenantId !== tenantId) {
          return void 0;
        }
        return provider;
      }
      async getAiProvidersByType(type, tenantId) {
        return Array.from(this.aiProviders.values()).filter(
          (provider) => provider.type === type && provider.tenantId === tenantId
        );
      }
      async getPrimaryAiProvider(tenantId) {
        return Array.from(this.aiProviders.values()).find(
          (provider) => provider.tenantId === tenantId && provider.isPrimary === true && provider.enabled === true
        );
      }
      async createAiProvider(provider) {
        const id = this.aiProviderIdCounter++;
        const now = /* @__PURE__ */ new Date();
        if (provider.isPrimary) {
          for (const existingProvider of this.aiProviders.values()) {
            if (existingProvider.tenantId === provider.tenantId && existingProvider.isPrimary) {
              existingProvider.isPrimary = false;
              this.aiProviders.set(existingProvider.id, existingProvider);
            }
          }
        }
        const aiProvider = {
          ...provider,
          id,
          createdAt: now,
          updatedAt: now,
          enabled: provider.enabled ?? true,
          isPrimary: provider.isPrimary ?? false,
          useForChat: provider.useForChat ?? true,
          useForClassification: provider.useForClassification ?? true,
          useForAutoResolve: provider.useForAutoResolve ?? true,
          useForEmail: provider.useForEmail ?? true,
          settings: provider.settings ?? {}
        };
        this.aiProviders.set(id, aiProvider);
        return aiProvider;
      }
      async updateAiProvider(id, updates, tenantId) {
        const provider = this.aiProviders.get(id);
        if (!provider) {
          throw new Error(`AI provider with id ${id} not found`);
        }
        if (tenantId && provider.tenantId !== tenantId) {
          throw new Error(`AI provider with id ${id} does not belong to tenant ${tenantId}`);
        }
        if (updates.isPrimary) {
          for (const existingProvider of this.aiProviders.values()) {
            if (existingProvider.id !== id && existingProvider.tenantId === provider.tenantId && existingProvider.isPrimary) {
              existingProvider.isPrimary = false;
              this.aiProviders.set(existingProvider.id, existingProvider);
            }
          }
        }
        const updatedProvider = {
          ...provider,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.aiProviders.set(id, updatedProvider);
        return updatedProvider;
      }
      async deleteAiProvider(id, tenantId) {
        const provider = this.aiProviders.get(id);
        if (!provider) {
          return false;
        }
        if (tenantId && provider.tenantId !== tenantId) {
          return false;
        }
        return this.aiProviders.delete(id);
      }
      // Widget analytics operations
      async getWidgetAnalyticsByApiKey(apiKey) {
        return Array.from(this.widgetAnalyticsData.values()).find(
          (analytics) => analytics.apiKey === apiKey
        );
      }
      async getWidgetAnalyticsByAdminId(adminId, tenantId) {
        return Array.from(this.widgetAnalyticsData.values()).filter(
          (analytics) => analytics.adminId === adminId && (!tenantId || analytics.tenantId === tenantId)
        );
      }
      async getAllWidgetAnalytics(tenantId) {
        return Array.from(this.widgetAnalyticsData.values()).filter((analytics) => {
          const analyticsAny = analytics;
          const analyticsWithSnakeCase = "tenant_id" in analyticsAny ? analyticsAny.tenant_id : analyticsAny.tenantId;
          return !tenantId || analyticsWithSnakeCase === tenantId;
        }).map((analytics) => {
          const result = { ...analytics };
          const analyticsAny = analytics;
          if ("tenant_id" in analyticsAny) {
            result.tenantId = analyticsAny.tenant_id;
          }
          if ("admin_id" in analyticsAny) {
            result.adminId = analyticsAny.admin_id;
          }
          if ("client_website" in analyticsAny) {
            result.clientWebsite = analyticsAny.client_website;
          }
          if ("client_info" in analyticsAny) {
            result.clientInfo = analyticsAny.client_info;
          }
          if ("messages_received" in analyticsAny) {
            result.messagesReceived = analyticsAny.messages_received;
          }
          if ("messages_sent" in analyticsAny) {
            result.messagesSent = analyticsAny.messages_sent;
          }
          if ("tickets_created" in analyticsAny) {
            result.ticketsCreated = analyticsAny.tickets_created;
          }
          if ("last_activity" in analyticsAny) {
            result.lastActivity = analyticsAny.last_activity;
          }
          if ("last_client_ip" in analyticsAny) {
            result.lastClientIp = analyticsAny.last_client_ip;
          }
          if ("created_at" in analyticsAny) {
            result.createdAt = analyticsAny.created_at;
          }
          if ("updated_at" in analyticsAny) {
            result.updatedAt = analyticsAny.updated_at;
          }
          return result;
        });
      }
      async recordWidgetInteraction(interaction) {
        try {
          const analytics = Array.from(this.widgetAnalyticsData.values()).find((a) => a.tenantId === interaction.tenantId);
          if (analytics) {
            if (interaction.messageType === "user") {
              analytics.messagesReceived = (analytics.messagesReceived || 0) + 1;
            } else {
              analytics.messagesSent = (analytics.messagesSent || 0) + 1;
            }
            analytics.interactions = (analytics.interactions || 0) + 1;
            analytics.lastActivity = /* @__PURE__ */ new Date();
            const metadata = analytics.metadata || {};
            if (!metadata.interactions) {
              metadata.interactions = [];
            }
            if (metadata.interactions.length >= 100) {
              metadata.interactions.shift();
            }
            metadata.interactions.push({
              type: interaction.messageType,
              timestamp: interaction.timestamp,
              url: interaction.url || "unknown",
              metadata: interaction.metadata || {}
            });
            analytics.metadata = metadata;
            this.widgetAnalyticsData.set(analytics.id, analytics);
          }
        } catch (error) {
          console.error("Error recording widget interaction:", error);
        }
      }
      async createWidgetAnalytics(insertAnalytics) {
        const id = this.widgetAnalyticsIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const analytics = {
          ...insertAnalytics,
          id,
          interactions: insertAnalytics.interactions || 0,
          messagesReceived: insertAnalytics.messagesReceived || 0,
          messagesSent: insertAnalytics.messagesSent || 0,
          ticketsCreated: insertAnalytics.ticketsCreated || 0,
          lastActivity: insertAnalytics.lastActivity || now,
          metadata: insertAnalytics.metadata || {},
          createdAt: now,
          updatedAt: now
        };
        this.widgetAnalyticsData.set(id, analytics);
        return analytics;
      }
      async updateWidgetAnalytics(id, updates) {
        const analytics = this.widgetAnalyticsData.get(id);
        if (!analytics) {
          throw new Error(`Widget analytics with id ${id} not found`);
        }
        const updatedAnalytics = {
          ...analytics,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.widgetAnalyticsData.set(id, updatedAnalytics);
        return updatedAnalytics;
      }
      // Support document operations
      async getAllSupportDocuments(tenantId) {
        let documents = Array.from(this.supportDocuments.values());
        if (tenantId) {
          documents = documents.filter((doc) => doc.tenantId === tenantId);
        }
        return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }
      async getSupportDocumentById(id, tenantId) {
        const cacheKey = `document:${id}`;
        const cachedDocument = this.supportDocumentCache.get(cacheKey);
        if (cachedDocument) {
          console.log(`Document cache hit for ID: ${id}`);
          if (tenantId && cachedDocument.tenantId !== tenantId) {
            return void 0;
          }
          return cachedDocument;
        }
        const document = this.supportDocuments.get(id);
        if (document && (!tenantId || document.tenantId === tenantId)) {
          this.supportDocumentCache.set(cacheKey, document);
          setTimeout(() => {
            this.supportDocumentCache.delete(cacheKey);
          }, 10 * 60 * 1e3);
          return document;
        }
        return void 0;
      }
      async getSupportDocumentsByCategory(category, tenantId) {
        let documents = Array.from(this.supportDocuments.values());
        documents = documents.filter(
          (doc) => doc.category === category && (!tenantId || doc.tenantId === tenantId)
        );
        return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }
      async getSupportDocumentsByStatus(status, tenantId) {
        let documents = Array.from(this.supportDocuments.values());
        documents = documents.filter(
          (doc) => doc.status === status && (!tenantId || doc.tenantId === tenantId)
        );
        return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }
      async searchSupportDocuments(query, tenantId) {
        if (!query) {
          return this.getAllSupportDocuments(tenantId);
        }
        const lowercaseQuery = query.toLowerCase();
        let documents = Array.from(this.supportDocuments.values());
        if (tenantId) {
          documents = documents.filter((doc) => doc.tenantId === tenantId);
        }
        documents = documents.filter(
          (doc) => doc.title.toLowerCase().includes(lowercaseQuery) || doc.content.toLowerCase().includes(lowercaseQuery) || doc.category.toLowerCase().includes(lowercaseQuery) || // Check tags in metadata if they exist
          doc.metadata && doc.metadata.tags && Array.isArray(doc.metadata.tags) && doc.metadata.tags.some(
            (tag) => tag.toLowerCase().includes(lowercaseQuery)
          )
        );
        return documents.sort((a, b) => {
          const priorityDiff = (a.priority || 0) - (b.priority || 0);
          if (priorityDiff !== 0) return priorityDiff;
          return (b.viewCount || 0) - (a.viewCount || 0);
        });
      }
      async createSupportDocument(document) {
        const id = this.supportDocumentIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const newDocument = {
          ...document,
          id,
          createdAt: now,
          updatedAt: now,
          viewCount: 0,
          status: document.status || "draft"
        };
        this.supportDocuments.set(id, newDocument);
        return newDocument;
      }
      async updateSupportDocument(id, updates, tenantId) {
        const document = this.supportDocuments.get(id);
        if (!document) {
          throw new Error(`Support document with id ${id} not found`);
        }
        if (tenantId && document.tenantId !== tenantId) {
          throw new Error(`Support document with id ${id} not found in tenant ${tenantId}`);
        }
        const updatedDocument = {
          ...document,
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.supportDocuments.set(id, updatedDocument);
        this.supportDocumentCache.delete(`document:${id}`);
        return updatedDocument;
      }
      async deleteSupportDocument(id, tenantId) {
        const document = this.supportDocuments.get(id);
        if (!document) {
          return false;
        }
        if (tenantId && document.tenantId !== tenantId) {
          return false;
        }
        const result = this.supportDocuments.delete(id);
        this.supportDocumentCache.delete(`document:${id}`);
        return result;
      }
      async incrementDocumentViewCount(id) {
        const document = this.supportDocuments.get(id);
        if (!document) {
          throw new Error(`Support document with id ${id} not found`);
        }
        const updatedDocument = {
          ...document,
          viewCount: (document.viewCount || 0) + 1,
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.supportDocuments.set(id, updatedDocument);
        const cacheKey = `document:${id}`;
        if (this.supportDocumentCache.has(cacheKey)) {
          this.supportDocumentCache.set(cacheKey, updatedDocument);
        }
        await this.logDocumentUsage({
          documentId: id,
          tenantId: document.tenantId,
          timestamp: /* @__PURE__ */ new Date(),
          userId: null,
          context: "view",
          metadata: null
        });
      }
      // Widget API Key methods
      async getApiKeyById(id) {
        return this.widgetApiKeysData.get(id);
      }
      async getApiKeyByValue(key) {
        for (const apiKey of this.widgetApiKeysData.values()) {
          if (apiKey.key === key) {
            return apiKey;
          }
        }
        return void 0;
      }
      async getApiKeysByTenant(tenantId) {
        const results = [];
        for (const apiKey of this.widgetApiKeysData.values()) {
          if (apiKey.tenantId === tenantId) {
            results.push(apiKey);
          }
        }
        return results;
      }
      async createApiKey(apiKey) {
        const id = this.widgetApiKeyIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const newApiKey = {
          id,
          createdAt: now,
          ...apiKey,
          isRevoked: false
        };
        this.widgetApiKeysData.set(id, newApiKey);
        return newApiKey;
      }
      async updateApiKey(id, updates) {
        const existingApiKey = await this.getApiKeyById(id);
        if (!existingApiKey) {
          throw new Error(`API key with ID ${id} not found`);
        }
        const updatedApiKey = { ...existingApiKey, ...updates };
        this.widgetApiKeysData.set(id, updatedApiKey);
        return updatedApiKey;
      }
      async updateApiKeyUsage(id) {
        const apiKey = await this.getApiKeyById(id);
        if (apiKey) {
          const updatedApiKey = {
            ...apiKey,
            lastUsed: /* @__PURE__ */ new Date(),
            useCount: (apiKey.useCount || 0) + 1
          };
          this.widgetApiKeysData.set(id, updatedApiKey);
        }
      }
      async deleteApiKey(id) {
        return this.widgetApiKeysData.delete(id);
      }
      // Document usage operations
      async logDocumentUsage(usage) {
        const id = this.documentUsageIdCounter++;
        const now = /* @__PURE__ */ new Date();
        const newUsage = {
          ...usage,
          id,
          createdAt: now
        };
        this.documentUsageData.set(id, newUsage);
        return newUsage;
      }
      async getDocumentUsageById(id) {
        return this.documentUsageData.get(id);
      }
      async getDocumentUsageByDocumentId(documentId) {
        const usages = Array.from(this.documentUsageData.values());
        return usages.filter((usage) => usage.documentId === documentId);
      }
      async getDocumentUsageAnalytics(startDate, endDate, tenantId) {
        let usages = Array.from(this.documentUsageData.values());
        usages = usages.filter(
          (usage) => usage.timestamp >= startDate && usage.timestamp <= endDate
        );
        if (tenantId) {
          usages = usages.filter((usage) => usage.tenantId === tenantId);
        }
        const viewsByDocument = /* @__PURE__ */ new Map();
        const viewsByCategory = /* @__PURE__ */ new Map();
        const viewsByDay = /* @__PURE__ */ new Map();
        for (const usage of usages) {
          const docViews = viewsByDocument.get(usage.documentId) || 0;
          viewsByDocument.set(usage.documentId, docViews + 1);
          const document = await this.getSupportDocumentById(usage.documentId);
          if (document) {
            const categoryViews = viewsByCategory.get(document.category) || 0;
            viewsByCategory.set(document.category, categoryViews + 1);
          }
          const day = usage.timestamp.toISOString().split("T")[0];
          const dayViews = viewsByDay.get(day) || 0;
          viewsByDay.set(day, dayViews + 1);
        }
        return {
          totalViews: usages.length,
          viewsByDocument: Object.fromEntries(viewsByDocument),
          viewsByCategory: Object.fromEntries(viewsByCategory),
          viewsByDay: Object.fromEntries(viewsByDay),
          timeframe: {
            start: startDate,
            end: endDate
          }
        };
      }
      // Agent resource operations
      async getAgentResources(agentType, tenantId) {
        const resources = Array.from(this.agentResources.values()).filter(
          (resource) => resource.agentType === agentType && resource.tenantId === tenantId
        );
        return resources;
      }
      async createAgentResource(resourceData) {
        const id = this.agentResourceIdCounter++;
        const resource = {
          id,
          ...resourceData,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        this.agentResources.set(id, resource);
        return resource;
      }
      async deleteAgentResource(id, tenantId) {
        const resource = this.agentResources.get(id);
        if (resource && resource.tenantId === tenantId) {
          this.agentResources.delete(id);
          return true;
        }
        return false;
      }
    };
    DatabaseStorage = class {
      sessionStore;
      memoryStore;
      postgreStore;
      useMemoryFallback = false;
      reconnectInterval = null;
      reconnectAttempts = 0;
      MAX_RECONNECT_ATTEMPTS = 10;
      // Add memory caches for critical resources
      userCache = /* @__PURE__ */ new Map();
      userByUsernameCache = /* @__PURE__ */ new Map();
      teamCache = /* @__PURE__ */ new Map();
      tenantCache = /* @__PURE__ */ new Map();
      tenantByApiKeyCache = /* @__PURE__ */ new Map();
      /**
       * Helper function to conditionally include tenant ID in database queries
       * Used for implementing cross-tenant access for creator users
       * 
       * @param tableName The table object for which we're creating a condition
       * @param tenantId The tenant ID to filter by (if needed)
       * @param isCreatorUser Whether the current user is a creator with cross-tenant access
       * @returns SQL condition to include in WHERE clause, or undefined to skip tenant filtering
       */
      getTenantCondition(tableName, tenantId, isCreatorUser = false) {
        if (isCreatorUser) {
          console.log(`Creator role detected - bypassing tenant filter for cross-tenant access`);
          return void 0;
        }
        if (tenantId !== void 0) {
          return eq(tableName.tenantId, tenantId);
        }
        return void 0;
      }
      tenantBySubdomainCache = /* @__PURE__ */ new Map();
      ticketCache = /* @__PURE__ */ new Map();
      // Helper method to clear all cached data for a user by ID
      clearUserFromCache(userId) {
        const cachedUser = this.userCache.get(userId);
        this.userCache.delete(userId);
        if (cachedUser) {
          const usernameKey = cachedUser.tenantId ? `${cachedUser.username}:${cachedUser.tenantId}` : cachedUser.username;
          this.userByUsernameCache.delete(usernameKey);
        }
        console.log(`Cache entries cleared for user ID: ${userId}`);
      }
      // Helper method to clear all cached data for a tenant by ID
      clearTenantFromCache(tenantId) {
        const cachedTenant = this.tenantCache.get(tenantId);
        this.tenantCache.delete(tenantId);
        if (cachedTenant) {
          if (cachedTenant.apiKey) {
            this.tenantByApiKeyCache.delete(cachedTenant.apiKey);
          }
          if (cachedTenant.subdomain) {
            this.tenantBySubdomainCache.delete(cachedTenant.subdomain);
          }
        }
        console.log(`Cache entries cleared for tenant ID: ${tenantId}`);
      }
      // Helper method to clear all cached data for a team by ID
      clearTeamFromCache(teamId) {
        this.teamCache.delete(teamId);
        console.log(`Cache entries cleared for team ID: ${teamId}`);
      }
      // Default fallback user for admin account (used as last resort during severe database failures)
      FALLBACK_ADMIN_USER = {
        id: 1,
        tenantId: 1,
        username: "admin",
        password: "admin123",
        // This is hashed in a real implementation
        role: "admin",
        name: "Admin User",
        email: "admin@example.com",
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {},
        createdAt: /* @__PURE__ */ new Date("2023-01-01"),
        updatedAt: /* @__PURE__ */ new Date("2023-01-01")
      };
      constructor() {
        this.setupMemoryStore("Initialization");
        this.memoryStore = this.sessionStore;
        try {
          console.log("Setting up PostgreSQL session store - Environment:", isProduction2 ? "Production" : "Development");
          if (process.env.DATABASE_URL) {
            try {
              const PostgresStore = connectPg(session);
              const postgresStoreOptions = {
                pool,
                tableName: "session",
                createTableIfMissing: true,
                // More aggressive timeouts for production
                ttl: 86400,
                // 24 hours in seconds
                disableTouch: false,
                // Enhanced error logging with more context
                errorLog: (err) => {
                  console.error("PostgreSQL session store error:", err);
                  const isConnectionError = err && typeof err === "object" && (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.code === "57P01" || // terminating connection due to administrator command
                  err.code === "08006" || // connection failure
                  err.code === "08001" || // unable to connect
                  err.message && (err.message.includes("Connection terminated") || err.message.includes("timeout")));
                  if (isConnectionError && !this.useMemoryFallback) {
                    console.log("Database connection error detected, switching to memory store temporarily");
                    this.useMemoryFallback = true;
                    this.sessionStore = this.memoryStore;
                    this.startReconnectAttempts();
                  }
                }
              };
              this.postgreStore = new PostgresStore(postgresStoreOptions);
              this.sessionStore = this.postgreStore;
              console.log("PostgreSQL session store initialized successfully");
              this.testSessionStore();
            } catch (dbError) {
              console.error("Failed to initialize PostgreSQL session store:", dbError);
              this.useMemoryFallback = true;
            }
          } else {
            console.log("No DATABASE_URL provided, using memory session store");
            this.useMemoryFallback = true;
          }
        } catch (error) {
          console.error("Critical error during storage initialization:", error);
          this.useMemoryFallback = true;
        }
        setInterval(() => this.checkDatabaseHealth(), 3e4);
      }
      // Helper method to test the session store connection
      async testSessionStore() {
        try {
          const testSessionId = `test-${Date.now()}`;
          await new Promise((resolve, reject) => {
            if (this.postgreStore) {
              this.postgreStore.set(testSessionId, { test: true }, (err) => {
                if (err) {
                  reject(err);
                } else {
                  this.postgreStore.get(testSessionId, (err2, session3) => {
                    if (err2) {
                      reject(err2);
                    } else if (!session3 || !session3.test) {
                      reject(new Error("Test session not found or invalid"));
                    } else {
                      this.postgreStore.destroy(testSessionId, () => {
                        resolve();
                      });
                    }
                  });
                }
              });
            } else {
              reject(new Error("PostgreSQL store not initialized"));
            }
          });
          console.log("Session store connection test successful");
          if (this.useMemoryFallback && this.postgreStore) {
            console.log("Switching back to PostgreSQL session store after successful test");
            this.useMemoryFallback = false;
            this.sessionStore = this.postgreStore;
            this.reconnectAttempts = 0;
            if (this.reconnectInterval) {
              clearInterval(this.reconnectInterval);
              this.reconnectInterval = null;
            }
          }
        } catch (error) {
          console.error("Session store connection test failed:", error);
          if (!this.useMemoryFallback) {
            console.log("Switching to memory store fallback after failed connection test");
            this.useMemoryFallback = true;
            this.sessionStore = this.memoryStore;
            this.startReconnectAttempts();
          }
        }
      }
      // Start periodic reconnection attempts
      startReconnectAttempts() {
        if (this.reconnectInterval) return;
        this.reconnectAttempts = 0;
        this.reconnectInterval = setInterval(() => {
          this.reconnectAttempts++;
          console.log(`PostgreSQL reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
          this.testSessionStore();
          if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS || !this.useMemoryFallback) {
            if (this.reconnectInterval) {
              clearInterval(this.reconnectInterval);
              this.reconnectInterval = null;
            }
          }
        }, 5e3);
      }
      // Periodic health check
      async checkDatabaseHealth() {
        if (process.env.DATABASE_URL && this.useMemoryFallback) {
          console.log("Running periodic database health check");
          await this.testSessionStore();
        }
      }
      // Helper method to set up memory session store
      setupMemoryStore(reason) {
        const MemoryStore = createMemoryStore(session);
        this.sessionStore = new MemoryStore({
          checkPeriod: 864e5
          // 24 hours
        });
        console.log(`Memory session store initialized as fallback. Reason: ${reason}`);
      }
      // AI provider operations
      async getAiProviders(tenantId, teamId) {
        if (teamId !== void 0) {
          return await db.select().from(aiProviders).where(
            and(
              eq(aiProviders.tenantId, tenantId),
              or(
                eq(aiProviders.teamId, teamId),
                isNull(aiProviders.teamId)
              )
            )
          );
        } else {
          return await db.select().from(aiProviders).where(eq(aiProviders.tenantId, tenantId));
        }
      }
      async getAiProviderById(id, tenantId) {
        if (tenantId) {
          const results = await db.select().from(aiProviders).where(
            and(eq(aiProviders.id, id), eq(aiProviders.tenantId, tenantId))
          );
          return results[0];
        } else {
          const results = await db.select().from(aiProviders).where(eq(aiProviders.id, id));
          return results[0];
        }
      }
      async getAiProvidersByType(type, tenantId) {
        return await db.select().from(aiProviders).where(
          and(eq(aiProviders.type, type), eq(aiProviders.tenantId, tenantId))
        );
      }
      async getPrimaryAiProvider(tenantId) {
        const results = await db.select().from(aiProviders).where(
          and(
            eq(aiProviders.tenantId, tenantId),
            eq(aiProviders.isPrimary, true),
            eq(aiProviders.enabled, true)
          )
        );
        return results[0];
      }
      async createAiProvider(provider) {
        if (provider.isPrimary) {
          await db.update(aiProviders).set({ isPrimary: false }).where(
            and(
              eq(aiProviders.tenantId, provider.tenantId),
              eq(aiProviders.isPrimary, true)
            )
          );
        }
        const [result] = await db.insert(aiProviders).values(provider).returning();
        return result;
      }
      async updateAiProvider(id, updates, tenantId) {
        const provider = await this.getAiProviderById(id);
        if (!provider) {
          throw new Error(`AI provider with id ${id} not found`);
        }
        if (tenantId && provider.tenantId !== tenantId) {
          throw new Error(`AI provider with id ${id} does not belong to tenant ${tenantId}`);
        }
        try {
          if (updates.isPrimary === true) {
            console.log(`Updating provider ${id} to be primary`);
            await db.transaction(async (tx) => {
              await tx.update(aiProviders).set({ isPrimary: false }).where(
                and(
                  eq(aiProviders.tenantId, provider.tenantId),
                  eq(aiProviders.isPrimary, true)
                )
              );
              await tx.update(aiProviders).set({
                ...updates,
                isPrimary: true,
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq(aiProviders.id, id));
            });
            const [updated] = await db.select().from(aiProviders).where(eq(aiProviders.id, id));
            return updated;
          } else {
            const [updated] = await db.update(aiProviders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(
              tenantId ? and(eq(aiProviders.id, id), eq(aiProviders.tenantId, tenantId)) : eq(aiProviders.id, id)
            ).returning();
            if (!updated) {
              throw new Error(`AI provider with id ${id} not found`);
            }
            return updated;
          }
        } catch (error) {
          console.error(`Error in updateAiProvider():`, error);
          throw error;
        }
      }
      async deleteAiProvider(id, tenantId) {
        const deleteResult = await db.delete(aiProviders).where(
          tenantId ? and(eq(aiProviders.id, id), eq(aiProviders.tenantId, tenantId)) : eq(aiProviders.id, id)
        );
        return (deleteResult.count ?? 0) > 0;
      }
      // Tenant operations with caching
      async getTenantById(id) {
        if (this.tenantCache.has(id)) {
          console.log(`Tenant cache hit for ID: ${id}`);
          return this.tenantCache.get(id);
        }
        return executeQuery(
          async () => {
            try {
              console.log(`[DEBUG] getTenantById(${id}): Executing database query`);
              const result = await db.execute(
                sql`SELECT * FROM tenants WHERE id = ${id}`
              );
              if (result.rows.length === 0) {
                console.log(`[DEBUG] getTenantById(${id}): No tenant found`);
                return void 0;
              }
              const tenantData = result.rows[0];
              let settings = tenantData.settings;
              let branding = tenantData.branding;
              try {
                if (typeof settings === "string") {
                  console.log(`[DEBUG] getTenantById(${id}): Parsing settings from string`);
                  settings = JSON.parse(settings);
                } else if (settings === null || settings === void 0) {
                  console.log(`[DEBUG] getTenantById(${id}): No settings found, using empty object`);
                  settings = {};
                }
              } catch (settingsError) {
                console.error(`[ERROR] getTenantById(${id}): Error parsing settings:`, settingsError);
                settings = {};
              }
              try {
                if (typeof branding === "string") {
                  console.log(`[DEBUG] getTenantById(${id}): Parsing branding from string`);
                  branding = JSON.parse(branding);
                } else if (branding === null || branding === void 0) {
                  console.log(`[DEBUG] getTenantById(${id}): No branding found, using default`);
                  branding = {
                    primaryColor: "#4F46E5",
                    logo: null,
                    companyName: "",
                    emailTemplate: "default"
                  };
                }
              } catch (brandingError) {
                console.error(`[ERROR] getTenantById(${id}): Error parsing branding:`, brandingError);
                branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
              const tenant = {
                id: tenantData.id,
                name: tenantData.name,
                subdomain: tenantData.subdomain,
                apiKey: tenantData.apiKey || tenantData.apikey,
                settings,
                branding,
                active: tenantData.active === void 0 ? true : !!tenantData.active,
                createdAt: tenantData.createdAt || tenantData.createdat,
                updatedAt: tenantData.updatedAt || tenantData.updatedat
              };
              console.log(`[DEBUG] getTenantById(${id}): Tenant found:`, {
                id: tenant.id,
                name: tenant.name,
                hasSettings: tenant.settings !== void 0 && tenant.settings !== null,
                settingsType: tenant.settings ? typeof tenant.settings : "null/undefined",
                settingsKeys: tenant.settings && typeof tenant.settings === "object" ? Object.keys(tenant.settings) : [],
                hasBranding: tenant.branding !== void 0 && tenant.branding !== null,
                brandingType: tenant.branding ? typeof tenant.branding : "null/undefined"
              });
              this.tenantCache.set(id, tenant);
              if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
              if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
              return tenant;
            } catch (error) {
              console.error(`[ERROR] getTenantById(${id}): Database error:`, error);
              throw error;
            }
          },
          // No fallback for tenant operations
          void 0,
          {
            retries: 3,
            // Increased retries
            initialDelay: 100,
            timeoutMs: 5e3,
            // Increased timeout
            logPrefix: `getTenantById(${id})`
          }
        );
      }
      async getTenantByApiKey(apiKey) {
        if (this.tenantByApiKeyCache.has(apiKey)) {
          console.log(`Tenant cache hit for API key: ${apiKey}`);
          return this.tenantByApiKeyCache.get(apiKey);
        }
        return executeQuery(
          async () => {
            try {
              console.log(`[DEBUG] getTenantByApiKey: Executing database query`);
              const result = await db.execute(
                sql`SELECT * FROM tenants WHERE "apiKey" = ${apiKey}`
              );
              if (result.rows.length === 0) {
                console.log(`[DEBUG] getTenantByApiKey: No tenant found for API key`);
                return void 0;
              }
              const tenantData = result.rows[0];
              let settings = tenantData.settings;
              let branding = tenantData.branding;
              try {
                if (typeof settings === "string") {
                  console.log(`[DEBUG] getTenantByApiKey: Parsing settings from string`);
                  settings = JSON.parse(settings);
                } else if (settings === null || settings === void 0) {
                  console.log(`[DEBUG] getTenantByApiKey: No settings found, using empty object`);
                  settings = {};
                }
              } catch (settingsError) {
                console.error(`[ERROR] getTenantByApiKey: Error parsing settings:`, settingsError);
                settings = {};
              }
              try {
                if (typeof branding === "string") {
                  console.log(`[DEBUG] getTenantByApiKey: Parsing branding from string`);
                  branding = JSON.parse(branding);
                } else if (branding === null || branding === void 0) {
                  console.log(`[DEBUG] getTenantByApiKey: No branding found, using default`);
                  branding = {
                    primaryColor: "#4F46E5",
                    logo: null,
                    companyName: "",
                    emailTemplate: "default"
                  };
                }
              } catch (brandingError) {
                console.error(`[ERROR] getTenantByApiKey: Error parsing branding:`, brandingError);
                branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
              const tenant = {
                id: tenantData.id,
                name: tenantData.name,
                subdomain: tenantData.subdomain,
                apiKey: tenantData.apiKey || tenantData.apikey,
                settings,
                branding,
                active: tenantData.active === void 0 ? true : !!tenantData.active,
                createdAt: tenantData.createdAt || tenantData.createdat,
                updatedAt: tenantData.updatedAt || tenantData.updatedat
              };
              console.log(`[DEBUG] getTenantByApiKey: Tenant found:`, {
                id: tenant.id,
                name: tenant.name,
                hasSettings: tenant.settings !== void 0 && tenant.settings !== null
              });
              this.tenantCache.set(tenant.id, tenant);
              this.tenantByApiKeyCache.set(apiKey, tenant);
              if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
              return tenant;
            } catch (error) {
              console.error(`[ERROR] getTenantByApiKey: Database error:`, error);
              throw error;
            }
          },
          // No fallback for tenant operations
          void 0,
          {
            retries: 3,
            initialDelay: 100,
            timeoutMs: 5e3,
            logPrefix: `getTenantByApiKey(${apiKey})`
          }
        );
      }
      async getTenantBySubdomain(subdomain) {
        if (this.tenantBySubdomainCache.has(subdomain)) {
          console.log(`Tenant cache hit for subdomain: ${subdomain}`);
          return this.tenantBySubdomainCache.get(subdomain);
        }
        return executeQuery(
          async () => {
            try {
              console.log(`[DEBUG] getTenantBySubdomain: Executing database query`);
              const result = await db.execute(
                sql`SELECT * FROM tenants WHERE subdomain = ${subdomain}`
              );
              if (result.rows.length === 0) {
                console.log(`[DEBUG] getTenantBySubdomain: No tenant found for subdomain`);
                return void 0;
              }
              const tenantData = result.rows[0];
              let settings = tenantData.settings;
              let branding = tenantData.branding;
              try {
                if (typeof settings === "string") {
                  console.log(`[DEBUG] getTenantBySubdomain: Parsing settings from string`);
                  settings = JSON.parse(settings);
                } else if (settings === null || settings === void 0) {
                  console.log(`[DEBUG] getTenantBySubdomain: No settings found, using empty object`);
                  settings = {};
                }
              } catch (settingsError) {
                console.error(`[ERROR] getTenantBySubdomain: Error parsing settings:`, settingsError);
                settings = {};
              }
              try {
                if (typeof branding === "string") {
                  console.log(`[DEBUG] getTenantBySubdomain: Parsing branding from string`);
                  branding = JSON.parse(branding);
                } else if (branding === null || branding === void 0) {
                  console.log(`[DEBUG] getTenantBySubdomain: No branding found, using default`);
                  branding = {
                    primaryColor: "#4F46E5",
                    logo: null,
                    companyName: "",
                    emailTemplate: "default"
                  };
                }
              } catch (brandingError) {
                console.error(`[ERROR] getTenantBySubdomain: Error parsing branding:`, brandingError);
                branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
              const tenant = {
                id: tenantData.id,
                name: tenantData.name,
                subdomain: tenantData.subdomain,
                apiKey: tenantData.apiKey || tenantData.apikey,
                settings,
                branding,
                active: tenantData.active === void 0 ? true : !!tenantData.active,
                createdAt: tenantData.createdAt || tenantData.createdat,
                updatedAt: tenantData.updatedAt || tenantData.updatedat
              };
              console.log(`[DEBUG] getTenantBySubdomain: Tenant found:`, {
                id: tenant.id,
                name: tenant.name,
                hasSettings: tenant.settings !== void 0 && tenant.settings !== null
              });
              this.tenantCache.set(tenant.id, tenant);
              if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
              this.tenantBySubdomainCache.set(subdomain, tenant);
              return tenant;
            } catch (error) {
              console.error(`[ERROR] getTenantBySubdomain: Database error:`, error);
              throw error;
            }
          },
          // No fallback for tenant operations
          void 0,
          {
            retries: 3,
            initialDelay: 100,
            timeoutMs: 5e3,
            logPrefix: `getTenantBySubdomain(${subdomain})`
          }
        );
      }
      async getAllTenants() {
        try {
          console.log("[DEBUG] getAllTenants: Executing database query");
          const result = await db.execute(
            sql`SELECT * FROM tenants ORDER BY name ASC`
          );
          if (!result.rows || result.rows.length === 0) {
            console.log("[DEBUG] getAllTenants: No tenants found");
            return [];
          }
          const tenants2 = result.rows.map((tenantData) => {
            let settings = tenantData.settings;
            let branding = tenantData.branding;
            try {
              if (typeof settings === "string") {
                settings = JSON.parse(settings);
              } else if (settings === null || settings === void 0) {
                settings = {};
              }
            } catch (settingsError) {
              console.error(`[ERROR] getAllTenants: Error parsing settings for tenant ${tenantData.id}:`, settingsError);
              settings = {};
            }
            try {
              if (typeof branding === "string") {
                branding = JSON.parse(branding);
              } else if (branding === null || branding === void 0) {
                branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
            } catch (brandingError) {
              console.error(`[ERROR] getAllTenants: Error parsing branding for tenant ${tenantData.id}:`, brandingError);
              branding = {
                primaryColor: "#4F46E5",
                logo: null,
                companyName: "",
                emailTemplate: "default"
              };
            }
            const tenant = {
              id: tenantData.id,
              name: tenantData.name,
              subdomain: tenantData.subdomain,
              apiKey: tenantData.apiKey || tenantData.apikey,
              settings,
              branding,
              active: tenantData.active === void 0 ? true : !!tenantData.active,
              createdAt: tenantData.createdAt || tenantData.createdat,
              updatedAt: tenantData.updatedAt || tenantData.updatedat
            };
            this.tenantCache.set(tenant.id, tenant);
            if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
            if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
            return tenant;
          });
          console.log(`[DEBUG] getAllTenants: Found ${tenants2.length} tenants`);
          return tenants2;
        } catch (error) {
          console.error("[ERROR] getAllTenants: Database error:", error);
          return [];
        }
      }
      async createTenant(insertTenant) {
        try {
          console.log("[DEBUG] createTenant: Processing tenant data before insertion");
          let processedTenant = { ...insertTenant };
          if (insertTenant.settings !== void 0) {
            if (typeof insertTenant.settings === "string") {
              try {
                console.log(`[DEBUG] createTenant: Parsing settings from string`);
                const parsed = JSON.parse(insertTenant.settings);
                processedTenant.settings = parsed;
              } catch (parseError) {
                console.error(`[ERROR] createTenant: Failed to parse settings string:`, parseError);
                processedTenant.settings = {};
              }
            } else if (typeof insertTenant.settings === "object" && insertTenant.settings !== null) {
              try {
                console.log(`[DEBUG] createTenant: Validating settings object can be serialized`);
                JSON.parse(JSON.stringify(insertTenant.settings));
              } catch (stringifyError) {
                console.error(`[ERROR] createTenant: Failed to stringify settings object:`, stringifyError);
                processedTenant.settings = {};
              }
            }
          } else {
            processedTenant.settings = {};
          }
          if (insertTenant.branding !== void 0) {
            if (typeof insertTenant.branding === "string") {
              try {
                console.log(`[DEBUG] createTenant: Parsing branding from string`);
                const parsed = JSON.parse(insertTenant.branding);
                processedTenant.branding = parsed;
              } catch (parseError) {
                console.error(`[ERROR] createTenant: Failed to parse branding string:`, parseError);
                processedTenant.branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
            } else if (typeof insertTenant.branding === "object" && insertTenant.branding !== null) {
              try {
                console.log(`[DEBUG] createTenant: Validating branding object can be serialized`);
                JSON.parse(JSON.stringify(insertTenant.branding));
              } catch (stringifyError) {
                console.error(`[ERROR] createTenant: Failed to stringify branding object:`, stringifyError);
                processedTenant.branding = {
                  primaryColor: "#4F46E5",
                  logo: null,
                  companyName: "",
                  emailTemplate: "default"
                };
              }
            }
          } else {
            processedTenant.branding = {
              primaryColor: "#4F46E5",
              logo: null,
              companyName: "",
              emailTemplate: "default"
            };
          }
          console.log("[DEBUG] createTenant: Executing database insert");
          const [tenant] = await db.insert(tenants).values(processedTenant).returning();
          console.log(`[DEBUG] createTenant: Created tenant with ID ${tenant.id}`);
          this.tenantCache.set(tenant.id, tenant);
          if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
          if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
          return tenant;
        } catch (error) {
          console.error("[ERROR] createTenant: Failed to create tenant:", error);
          throw error;
        }
      }
      async updateTenant(id, updates) {
        try {
          console.log(`[DEBUG] updateTenant(${id}) called with updates:`, {
            hasSettings: updates.settings !== void 0,
            settingsType: updates.settings ? typeof updates.settings : "undefined",
            updateKeys: Object.keys(updates)
          });
          let processedUpdates = { ...updates };
          if (updates.settings !== void 0) {
            if (typeof updates.settings === "string") {
              try {
                console.log(`[DEBUG] Parsing settings from string in updateTenant`);
                const parsed = JSON.parse(updates.settings);
                processedUpdates.settings = parsed;
              } catch (parseError) {
                console.error(`[ERROR] Failed to parse settings string in updateTenant:`, parseError);
                throw new Error(`Invalid JSON in settings: ${parseError.message}`);
              }
            } else if (typeof updates.settings === "object" && updates.settings !== null) {
              try {
                console.log(`[DEBUG] Validating settings object can be serialized`);
                JSON.parse(JSON.stringify(updates.settings));
              } catch (stringifyError) {
                console.error(`[ERROR] Failed to stringify settings object:`, stringifyError);
                throw new Error(`Cannot serialize settings object: ${stringifyError.message}`);
              }
            }
          }
          this.tenantCache.delete(id);
          const result = await executeQuery(
            async () => {
              const [updated2] = await db.update(tenants).set({ ...processedUpdates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tenants.id, id)).returning();
              return [updated2];
            },
            void 0,
            {
              retries: 3,
              initialDelay: 100,
              timeoutMs: 5e3,
              logPrefix: `updateTenant(${id})`
            }
          );
          const updated = result[0];
          if (!updated) {
            throw new Error(`Tenant with ID ${id} not found`);
          }
          console.log(`[DEBUG] Tenant ${id} successfully updated`);
          return updated;
        } catch (error) {
          console.error(`[ERROR] Failed to update tenant ${id}:`, error);
          throw error;
        }
      }
      // Team operations with caching
      async getTeamById(id, tenantId) {
        if (this.teamCache.has(id)) {
          console.log(`Team cache hit for ID: ${id}`);
          return this.teamCache.get(id);
        }
        return executeQuery(
          async () => {
            try {
              const baseQuery = db.select().from(teams).where(eq(teams.id, id));
              const results = tenantId ? await baseQuery.where(eq(teams.tenantId, tenantId)) : await baseQuery;
              const team = results[0];
              if (team) {
                this.teamCache.set(id, team);
              }
              return team;
            } catch (error) {
              console.error(`Error fetching team with ID ${id}:`, error);
              throw error;
            }
          },
          // No fallback for team operations
          void 0,
          {
            retries: 2,
            initialDelay: 100,
            timeoutMs: 3e3,
            logPrefix: `getTeamById(${id})`
          }
        );
      }
      async getTeamByName(name, tenantId) {
        return executeQuery(
          async () => {
            try {
              const baseQuery = db.select().from(teams).where(eq(teams.name, name));
              const results = tenantId ? await baseQuery.where(eq(teams.tenantId, tenantId)) : await baseQuery;
              const team = results[0];
              if (team) {
                this.teamCache.set(team.id, team);
              }
              return team;
            } catch (error) {
              console.error(`Error fetching team by name ${name}:`, error);
              throw error;
            }
          },
          void 0,
          {
            retries: 2,
            initialDelay: 100,
            timeoutMs: 3e3,
            logPrefix: `getTeamByName(${name})`
          }
        );
      }
      async getTeamsByTenantId(tenantId) {
        return executeQuery(
          async () => {
            try {
              const results = await db.select().from(teams).where(eq(teams.tenantId, tenantId));
              results.forEach((team) => {
                this.teamCache.set(team.id, team);
              });
              return results;
            } catch (error) {
              console.error(`Error fetching teams for tenant ${tenantId}:`, error);
              throw error;
            }
          },
          // Return empty array as fallback
          [],
          {
            retries: 2,
            initialDelay: 100,
            timeoutMs: 3e3,
            logPrefix: `getTeamsByTenantId(${tenantId})`
          }
        );
      }
      async createTeam(team) {
        try {
          const [created] = await db.insert(teams).values(team).returning();
          this.teamCache.set(created.id, created);
          return created;
        } catch (error) {
          console.error(`Error in createTeam():`, error);
          throw error;
        }
      }
      async updateTeam(id, updates, tenantId) {
        try {
          const query = db.update(teams).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() });
          if (tenantId) {
            const [updated] = await query.where(and(eq(teams.id, id), eq(teams.tenantId, tenantId))).returning();
            if (!updated) {
              throw new Error(`Team with ID ${id} not found in tenant ${tenantId}`);
            }
            this.clearTeamFromCache(id);
            this.teamCache.set(updated.id, updated);
            return updated;
          } else {
            const [updated] = await query.where(eq(teams.id, id)).returning();
            if (!updated) {
              throw new Error(`Team with ID ${id} not found`);
            }
            this.clearTeamFromCache(id);
            this.teamCache.set(updated.id, updated);
            return updated;
          }
        } catch (error) {
          console.error(`Error in updateTeam(${id}):`, error);
          throw error;
        }
      }
      async deleteTeam(id, tenantId) {
        try {
          const query = db.delete(teams);
          if (tenantId) {
            const result = await query.where(
              and(eq(teams.id, id), eq(teams.tenantId, tenantId))
            );
            this.clearTeamFromCache(id);
            return true;
          } else {
            const result = await query.where(eq(teams.id, id));
            this.clearTeamFromCache(id);
            return true;
          }
        } catch (error) {
          console.error(`Error in deleteTeam(${id}):`, error);
          return false;
        }
      }
      async getTeamMembers(teamId, tenantId) {
        try {
          const team = await this.getTeamById(teamId, tenantId);
          if (!team) {
            return [];
          }
          const results = await db.select().from(users).where(eq(users.teamId, teamId));
          return results;
        } catch (error) {
          console.error(`Error in getTeamMembers(${teamId}):`, error);
          return [];
        }
      }
      async getTicketsByTeamId(teamId, tenantId) {
        try {
          const baseQuery = db.select().from(tickets).where(eq(tickets.teamId, teamId));
          const results = tenantId ? await baseQuery.where(eq(tickets.tenantId, tenantId)) : await baseQuery;
          return results;
        } catch (error) {
          console.error(`Error in getTicketsByTeamId(${teamId}):`, error);
          return [];
        }
      }
      // User operations
      async getUser(id) {
        if (this.userCache.has(id)) {
          console.log(`User cache hit for ID: ${id}`);
          return this.userCache.get(id);
        }
        if (id === 1) {
          console.log("Special handling for admin user lookup by ID");
          return executeQuery(
            async () => {
              try {
                const result = await db.execute(
                  sql`SELECT * FROM users WHERE id = ${id}`
                );
                if (result.rows.length === 0) {
                  console.log(`No user found for ID: ${id}`);
                  return void 0;
                }
                const user = result.rows[0];
                const standardizedUser = {
                  id: user.id,
                  tenantId: user.tenantid || user.tenantId,
                  username: user.username,
                  password: user.password,
                  role: user.role,
                  name: user.name,
                  email: user.email,
                  profilePicture: user.profilepicture || user.profilePicture,
                  mfaEnabled: user.mfaenabled || false,
                  mfaSecret: user.mfasecret || null,
                  mfaBackupCodes: user.mfabackupcodes || [],
                  ssoEnabled: user.ssoenabled || false,
                  ssoProvider: user.ssoprovider || null,
                  ssoProviderId: user.ssoproviderid || null,
                  ssoProviderData: user.ssoproviderdata || {},
                  createdAt: user.createdat || user.createdAt,
                  updatedAt: user.updatedat || user.updatedAt
                };
                this.userCache.set(id, standardizedUser);
                if (standardizedUser.username) {
                  const cacheKey = standardizedUser.tenantId ? `${standardizedUser.username}:${standardizedUser.tenantId}` : standardizedUser.username;
                  this.userByUsernameCache.set(cacheKey, standardizedUser);
                }
                return standardizedUser;
              } catch (error) {
                console.error(`Error fetching user with ID ${id}:`, error);
                if (id === 1) {
                  console.warn("Using fallback admin user due to database error");
                  return this.FALLBACK_ADMIN_USER;
                }
                throw error;
              }
            },
            // Fallback for admin user
            () => {
              if (id === 1) {
                console.warn("Database unavailable - Using fallback admin user");
                return Promise.resolve(this.FALLBACK_ADMIN_USER);
              }
              return Promise.resolve(void 0);
            },
            {
              retries: 3,
              initialDelay: 100,
              timeoutMs: 5e3,
              logPrefix: `getUser(${id})`
            }
          );
        }
        return executeQuery(
          async () => {
            try {
              const result = await db.execute(
                sql`SELECT * FROM users WHERE id = ${id}`
              );
              if (result.rows.length === 0) {
                console.log(`No user found for ID: ${id}`);
                return void 0;
              }
              const user = result.rows[0];
              const standardizedUser = {
                id: user.id,
                tenantId: user.tenantid || user.tenantId,
                username: user.username,
                password: user.password,
                role: user.role,
                name: user.name,
                email: user.email,
                profilePicture: user.profilepicture || user.profilePicture,
                mfaEnabled: user.mfaenabled || false,
                mfaSecret: user.mfasecret || null,
                mfaBackupCodes: user.mfabackupcodes || [],
                ssoEnabled: user.ssoenabled || false,
                ssoProvider: user.ssoprovider || null,
                ssoProviderId: user.ssoproviderid || null,
                ssoProviderData: user.ssoproviderdata || {},
                createdAt: user.createdat || user.createdAt,
                updatedAt: user.updatedat || user.updatedAt
              };
              this.userCache.set(id, standardizedUser);
              if (standardizedUser.username) {
                const cacheKey = standardizedUser.tenantId ? `${standardizedUser.username}:${standardizedUser.tenantId}` : standardizedUser.username;
                this.userByUsernameCache.set(cacheKey, standardizedUser);
              }
              return standardizedUser;
            } catch (error) {
              console.error(`Error fetching user with ID ${id}:`, error);
              throw error;
            }
          },
          void 0,
          // No fallback for non-admin users
          {
            retries: 3,
            initialDelay: 100,
            timeoutMs: 5e3,
            logPrefix: `getUser(${id})`
          }
        );
      }
      async getUserByUsername(username, tenantId) {
        const cacheKey = tenantId ? `${username}:${tenantId}` : username;
        if (this.userByUsernameCache.has(cacheKey)) {
          console.log(`User cache hit for username: ${username}`);
          return this.userByUsernameCache.get(cacheKey);
        }
        if (username === "admin" && (!tenantId || tenantId === 1)) {
          console.log("Special handling for admin user lookup");
          return await executeQuery(
            async () => {
              try {
                let query;
                if (tenantId) {
                  query = sql`SELECT * FROM users WHERE username = ${username} AND "tenantId" = ${tenantId}`;
                } else {
                  query = sql`SELECT * FROM users WHERE username = ${username}`;
                }
                console.log(`Executing getUserByUsername for: ${username}${tenantId ? ` in tenant ${tenantId}` : ""}`);
                const result = await db.execute(query);
                if (result.rows.length === 0) {
                  return void 0;
                }
                const user = result.rows[0];
                const standardizedUser = {
                  id: user.id,
                  tenantId: user.tenantid || user.tenantId,
                  username: user.username,
                  password: user.password,
                  role: user.role,
                  name: user.name,
                  email: user.email,
                  profilePicture: user.profilepicture || user.profilePicture,
                  mfaEnabled: user.mfaenabled || false,
                  mfaSecret: user.mfasecret || null,
                  mfaBackupCodes: user.mfabackupcodes || [],
                  ssoEnabled: user.ssoenabled || false,
                  ssoProvider: user.ssoprovider || null,
                  ssoProviderId: user.ssoproviderid || null,
                  ssoProviderData: user.ssoproviderdata || {},
                  createdAt: user.createdat || user.createdAt,
                  updatedAt: user.updatedat || user.updatedAt
                };
                this.userByUsernameCache.set(cacheKey, standardizedUser);
                this.userCache.set(standardizedUser.id, standardizedUser);
                return standardizedUser;
              } catch (error) {
                console.error(`Error fetching user by username '${username}':`, error);
                if (username === "admin" && (!tenantId || tenantId === 1)) {
                  console.warn("Using fallback admin user due to database error");
                  return this.FALLBACK_ADMIN_USER;
                }
                throw error;
              }
            },
            // Use fallback for admin user when database is unavailable
            () => {
              console.warn("Database unavailable. Using fallback admin user");
              return Promise.resolve(this.FALLBACK_ADMIN_USER);
            },
            {
              retries: 3,
              initialDelay: 100,
              timeoutMs: 5e3,
              logPrefix: `getUserByUsername(${username})`
            }
          );
        }
        return executeQuery(
          async () => {
            try {
              let query;
              if (tenantId) {
                query = sql`SELECT * FROM users WHERE username = ${username} AND "tenantId" = ${tenantId}`;
              } else {
                query = sql`SELECT * FROM users WHERE username = ${username}`;
              }
              const result = await db.execute(query);
              if (result.rows.length === 0) {
                return void 0;
              }
              const user = result.rows[0];
              const standardizedUser = {
                id: user.id,
                tenantId: user.tenantid || user.tenantId,
                username: user.username,
                password: user.password,
                role: user.role,
                name: user.name,
                email: user.email,
                profilePicture: user.profilepicture || user.profilePicture,
                mfaEnabled: user.mfaenabled || false,
                mfaSecret: user.mfasecret || null,
                mfaBackupCodes: user.mfabackupcodes || [],
                ssoEnabled: user.ssoenabled || false,
                ssoProvider: user.ssoprovider || null,
                ssoProviderId: user.ssoproviderid || null,
                ssoProviderData: user.ssoproviderdata || {},
                createdAt: user.createdat || user.createdAt,
                updatedAt: user.updatedat || user.updatedAt
              };
              this.userByUsernameCache.set(cacheKey, standardizedUser);
              this.userCache.set(standardizedUser.id, standardizedUser);
              return standardizedUser;
            } catch (error) {
              console.error(`Error in getUserByUsername for ${username}:`, error);
              throw error;
            }
          },
          void 0,
          // No fallback for regular users
          {
            retries: 3,
            initialDelay: 100,
            timeoutMs: 5e3,
            logPrefix: `getUserByUsername(${username})`
          }
        );
      }
      async getUsersByTenantId(tenantId) {
        try {
          const result = await db.execute(sql`
        SELECT * FROM users WHERE "tenantId" = ${tenantId}
      `);
          if (!result.rows || result.rows.length === 0) {
            return [];
          }
          return result.rows.map((row) => ({
            id: row.id,
            tenantId: row.tenantid,
            username: row.username,
            password: row.password,
            role: row.role,
            name: row.name,
            email: row.email,
            profilePicture: row.profilepicture || row.profilePicture,
            mfaEnabled: row.mfaenabled || false,
            mfaSecret: row.mfasecret || null,
            mfaBackupCodes: row.mfabackupcodes || [],
            ssoEnabled: row.ssoenabled || false,
            ssoProvider: row.ssoprovider || null,
            ssoProviderId: row.ssoproviderid || null,
            ssoProviderData: row.ssoproviderdata || {},
            createdAt: row.createdat,
            updatedAt: row.updatedat
          }));
        } catch (error) {
          console.error("Error fetching users by tenant ID:", error);
          throw error;
        }
      }
      async createUser(insertUser) {
        try {
          const result = await db.execute(sql`
        INSERT INTO users (
          username, password, role, name, email, "tenantId", 
          mfaenabled, mfabackupcodes, ssoenabled, ssoproviderdata
        ) 
        VALUES (
          ${insertUser.username},
          ${insertUser.password},
          ${insertUser.role || "user"},
          ${insertUser.name || null},
          ${insertUser.email || null},
          ${insertUser.tenantId || 1},
          ${false}, 
          ${"[]"}, 
          ${false}, 
          ${"{}"}
        )
        RETURNING *
      `);
          if (!result.rows || result.rows.length === 0) {
            throw new Error("Failed to create user");
          }
          const rawUser = result.rows[0];
          const user = {
            id: rawUser.id,
            tenantId: rawUser.tenantid || 1,
            username: rawUser.username,
            password: rawUser.password,
            role: rawUser.role,
            name: rawUser.name,
            email: rawUser.email,
            profilePicture: rawUser.profilepicture || rawUser.profilePicture,
            mfaEnabled: rawUser.mfaenabled || false,
            mfaSecret: rawUser.mfasecret || null,
            mfaBackupCodes: rawUser.mfabackupcodes || [],
            ssoEnabled: rawUser.ssoenabled || false,
            ssoProvider: rawUser.ssoprovider || null,
            ssoProviderId: rawUser.ssoproviderid || null,
            ssoProviderData: rawUser.ssoproviderdata || {},
            createdAt: rawUser.createdat,
            updatedAt: rawUser.updatedat
          };
          try {
            this.userCache.set(user.id, user);
            const usernameKey = user.tenantId ? `${user.username}:${user.tenantId}` : user.username;
            this.userByUsernameCache.set(usernameKey, user);
            console.log(`New user ${user.username} (ID: ${user.id}) added to cache`);
          } catch (cacheError) {
            console.error(`Failed to add new user to cache:`, cacheError);
          }
          return user;
        } catch (error) {
          console.error("Error creating user:", error);
          throw error;
        }
      }
      async updateUser(id, updates) {
        try {
          const updateFields = [];
          if (updates.mfaEnabled !== void 0) {
            updateFields.push(sql`mfaenabled = ${updates.mfaEnabled}`);
          }
          if (updates.mfaSecret !== void 0) {
            updateFields.push(sql`mfasecret = ${updates.mfaSecret}`);
          }
          if (updates.mfaBackupCodes !== void 0) {
            updateFields.push(sql`mfabackupcodes = ${JSON.stringify(updates.mfaBackupCodes)}`);
          }
          if (updates.ssoEnabled !== void 0) {
            updateFields.push(sql`ssoenabled = ${updates.ssoEnabled}`);
          }
          if (updates.ssoProvider !== void 0) {
            updateFields.push(sql`ssoprovider = ${updates.ssoProvider}`);
          }
          if (updates.ssoProviderId !== void 0) {
            updateFields.push(sql`ssoproviderid = ${updates.ssoProviderId}`);
          }
          if (updates.ssoProviderData !== void 0) {
            updateFields.push(sql`ssoproviderdata = ${JSON.stringify(updates.ssoProviderData)}`);
          }
          if (updates.username !== void 0) {
            updateFields.push(sql`username = ${updates.username}`);
          }
          if (updates.password !== void 0) {
            updateFields.push(sql`password = ${updates.password}`);
          }
          if (updates.role !== void 0) {
            updateFields.push(sql`role = ${updates.role}`);
          }
          if (updates.name !== void 0) {
            updateFields.push(sql`name = ${updates.name}`);
          }
          if (updates.email !== void 0) {
            updateFields.push(sql`email = ${updates.email}`);
          }
          if (updates.profilePicture !== void 0) {
            updateFields.push(sql`"profilePicture" = ${updates.profilePicture}`);
          }
          if (updates.tenantId !== void 0) {
            updateFields.push(sql`"tenantId" = ${updates.tenantId}`);
          }
          updateFields.push(sql`"updatedAt" = ${/* @__PURE__ */ new Date()}`);
          if (updateFields.length === 0) {
            const existingUserResult = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
            if (existingUserResult.rows.length === 0) {
              throw new Error(`User with ID ${id} not found`);
            }
            const user = existingUserResult.rows[0];
            return {
              id: user.id,
              tenantId: user.tenantid || user.tenantId,
              username: user.username,
              password: user.password,
              role: user.role,
              name: user.name,
              email: user.email,
              profilePicture: user.profilepicture || user.profilePicture,
              mfaEnabled: user.mfaenabled || false,
              mfaSecret: user.mfasecret || null,
              mfaBackupCodes: user.mfabackupcodes || [],
              ssoEnabled: user.ssoenabled || false,
              ssoProvider: user.ssoprovider || null,
              ssoProviderId: user.ssoproviderid || null,
              ssoProviderData: user.ssoproviderdata || {},
              createdAt: user.createdat || user.createdAt,
              updatedAt: user.updatedat || user.updatedAt
            };
          }
          const setClause = sql.join(updateFields, sql`, `);
          const query = sql`UPDATE users SET ${setClause} WHERE id = ${id} RETURNING *`;
          const result = await db.execute(query);
          if (result.rows.length === 0) {
            throw new Error(`User with ID ${id} not found`);
          }
          const updated = result.rows[0];
          try {
            this.clearUserFromCache(id);
            console.log(`Cache cleared for updated user with ID: ${id}`);
          } catch (cacheError) {
            console.error(`Failed to clear cache for user ${id}:`, cacheError);
          }
          return {
            id: updated.id,
            tenantId: updated.tenantid || updated.tenantId,
            username: updated.username,
            password: updated.password,
            role: updated.role,
            name: updated.name,
            email: updated.email,
            profilePicture: updated.profilepicture || updated.profilePicture,
            mfaEnabled: updated.mfaenabled || false,
            mfaSecret: updated.mfasecret || null,
            mfaBackupCodes: updated.mfabackupcodes || [],
            ssoEnabled: updated.ssoenabled || false,
            ssoProvider: updated.ssoprovider || null,
            ssoProviderId: updated.ssoproviderid || null,
            ssoProviderData: updated.ssoproviderdata || {},
            createdAt: updated.createdat || updated.createdAt,
            updatedAt: updated.updatedat || updated.updatedAt
          };
        } catch (error) {
          console.error("Error updating user:", error);
          throw error;
        }
      }
      async deleteUser(id) {
        try {
          const existingUserResult = await db.execute(sql`
        SELECT * FROM users WHERE id = ${id}
      `);
          if (!existingUserResult.rows || existingUserResult.rows.length === 0) {
            throw new Error(`User with id ${id} not found`);
          }
          const existingUser = existingUserResult.rows[0];
          await db.execute(sql`
        DELETE FROM users WHERE id = ${id}
      `);
          try {
            this.userCache.delete(id);
            if (existingUser.username) {
              const tenantId = existingUser.tenantid || existingUser.tenantId;
              const usernameKey = tenantId ? `${existingUser.username}:${tenantId}` : existingUser.username;
              this.userByUsernameCache.delete(usernameKey);
            }
            console.log(`User with ID ${id} has been deleted and removed from cache`);
          } catch (cacheError) {
            console.error(`Failed to clear cache for deleted user ${id}:`, cacheError);
          }
        } catch (error) {
          console.error("Error deleting user:", error);
          throw error;
        }
      }
      async getUserBySsoId(provider, providerId, tenantId) {
        try {
          let query;
          if (tenantId) {
            query = sql`
          SELECT * FROM users 
          WHERE ssoprovider = ${provider} 
          AND ssoproviderid = ${providerId} 
          AND "tenantId" = ${tenantId}
        `;
          } else {
            query = sql`
          SELECT * FROM users 
          WHERE ssoprovider = ${provider} 
          AND ssoproviderid = ${providerId}
        `;
          }
          const result = await db.execute(query);
          if (result.rows.length === 0) {
            return void 0;
          }
          const user = result.rows[0];
          return {
            id: user.id,
            tenantId: user.tenantid || user.tenantId,
            username: user.username,
            password: user.password,
            role: user.role,
            name: user.name,
            email: user.email,
            profilePicture: user.profilepicture || user.profilePicture,
            mfaEnabled: user.mfaenabled || false,
            mfaSecret: user.mfasecret || null,
            mfaBackupCodes: user.mfabackupcodes || [],
            ssoEnabled: user.ssoenabled || false,
            ssoProvider: user.ssoprovider || null,
            ssoProviderId: user.ssoproviderid || null,
            ssoProviderData: user.ssoproviderdata || {},
            createdAt: user.createdat || user.createdAt,
            updatedAt: user.updatedat || user.updatedAt
          };
        } catch (error) {
          console.error("Error fetching user by SSO ID:", error);
          throw error;
        }
      }
      // Identity Provider operations
      async getIdentityProviders(tenantId) {
        try {
          const result = await db.execute(
            sql`SELECT * FROM identity_providers WHERE "tenantid" = ${tenantId} ORDER BY name ASC`
          );
          if (!result.rows || result.rows.length === 0) {
            return [];
          }
          return result.rows.map((provider) => ({
            id: provider.id,
            name: provider.name,
            type: provider.type,
            enabled: provider.enabled ?? true,
            config: provider.config,
            tenantId: provider.tenantid || provider.tenantId,
            createdAt: provider.createdat || provider.createdAt,
            updatedAt: provider.updatedat || provider.updatedAt
          }));
        } catch (error) {
          console.error("Error fetching identity providers:", error);
          return [];
        }
      }
      async getIdentityProviderById(id, tenantId) {
        try {
          let query;
          if (tenantId) {
            query = sql`SELECT * FROM identity_providers WHERE id = ${id} AND "tenantid" = ${tenantId}`;
          } else {
            query = sql`SELECT * FROM identity_providers WHERE id = ${id}`;
          }
          const result = await db.execute(query);
          if (!result.rows || result.rows.length === 0) {
            return void 0;
          }
          const provider = result.rows[0];
          return {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            enabled: provider.enabled ?? true,
            config: provider.config,
            tenantId: provider.tenantid || provider.tenantId,
            createdAt: provider.createdat || provider.createdAt,
            updatedAt: provider.updatedat || provider.updatedAt
          };
        } catch (error) {
          console.error("Error fetching identity provider by ID:", error);
          return void 0;
        }
      }
      async createIdentityProvider(provider) {
        try {
          const providerWithDefaults = {
            ...provider,
            enabled: provider.enabled === void 0 ? true : provider.enabled
          };
          const result = await db.execute(
            sql`INSERT INTO identity_providers ("tenantid", name, type, enabled, config, "createdat", "updatedat")
            VALUES (${providerWithDefaults.tenantId}, ${providerWithDefaults.name}, ${providerWithDefaults.type}, 
                   ${providerWithDefaults.enabled}, ${providerWithDefaults.config}, NOW(), NOW())
            RETURNING *`
          );
          if (!result.rows || result.rows.length === 0) {
            throw new Error("Failed to create identity provider");
          }
          const newProvider = result.rows[0];
          return {
            id: newProvider.id,
            name: newProvider.name,
            type: newProvider.type,
            enabled: newProvider.enabled ?? true,
            config: newProvider.config,
            tenantId: newProvider.tenantid || newProvider.tenantId,
            createdAt: newProvider.createdat || newProvider.createdAt,
            updatedAt: newProvider.updatedat || newProvider.updatedAt
          };
        } catch (error) {
          console.error("Error creating identity provider:", error);
          throw error;
        }
      }
      async updateIdentityProvider(id, updates, tenantId) {
        try {
          const updateFields = [];
          if (updates.name !== void 0) {
            updateFields.push(sql`name = ${updates.name}`);
          }
          if (updates.type !== void 0) {
            updateFields.push(sql`type = ${updates.type}`);
          }
          if (updates.enabled !== void 0) {
            updateFields.push(sql`enabled = ${updates.enabled}`);
          }
          if (updates.config !== void 0) {
            updateFields.push(sql`config = ${updates.config}`);
          }
          updateFields.push(sql`"updatedat" = ${/* @__PURE__ */ new Date()}`);
          const setClause = sql.join(updateFields, sql`, `);
          let query;
          if (tenantId) {
            query = sql`UPDATE identity_providers SET ${setClause} WHERE id = ${id} AND "tenantid" = ${tenantId} RETURNING *`;
          } else {
            query = sql`UPDATE identity_providers SET ${setClause} WHERE id = ${id} RETURNING *`;
          }
          const result = await db.execute(query);
          if (!result.rows || result.rows.length === 0) {
            throw new Error(`Identity provider with ID ${id} not found`);
          }
          const provider = result.rows[0];
          return {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            enabled: provider.enabled ?? true,
            config: provider.config,
            tenantId: provider.tenantid || provider.tenantId,
            createdAt: provider.createdat || provider.createdAt,
            updatedAt: provider.updatedat || provider.updatedAt
          };
        } catch (error) {
          console.error("Error updating identity provider:", error);
          throw error;
        }
      }
      async deleteIdentityProvider(id, tenantId) {
        try {
          let query;
          if (tenantId) {
            query = sql`DELETE FROM identity_providers WHERE id = ${id} AND "tenantid" = ${tenantId}`;
          } else {
            query = sql`DELETE FROM identity_providers WHERE id = ${id}`;
          }
          const result = await db.execute(query);
          const rowCount = result.rowCount || 0;
          return rowCount > 0;
        } catch (error) {
          console.error("Error deleting identity provider:", error);
          return false;
        }
      }
      // Ticket operations
      async getAllTickets(tenantId) {
        if (tenantId) {
          return await db.select().from(tickets).where(eq(tickets.tenantId, tenantId)).orderBy(desc(tickets.createdAt));
        }
        return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
      }
      async getTicketById(id, tenantId) {
        if (tenantId) {
          const results2 = await db.select().from(tickets).where(and(
            eq(tickets.id, id),
            eq(tickets.tenantId, tenantId)
          ));
          return results2[0];
        }
        const results = await db.select().from(tickets).where(eq(tickets.id, id));
        return results[0];
      }
      async createTicket(insertTicket) {
        const [ticket] = await db.insert(tickets).values(insertTicket).returning();
        return ticket;
      }
      async updateTicket(id, updates, tenantId) {
        let condition;
        if (tenantId) {
          condition = and(
            eq(tickets.id, id),
            eq(tickets.tenantId, tenantId)
          );
        } else {
          condition = eq(tickets.id, id);
        }
        const [updatedTicket] = await db.update(tickets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(condition).returning();
        if (!updatedTicket) {
          if (tenantId) {
            throw new Error(`Ticket with id ${id} not found for tenant ${tenantId}`);
          } else {
            throw new Error(`Ticket with id ${id} not found`);
          }
        }
        return updatedTicket;
      }
      // Message operations
      async getMessagesByTicketId(ticketId) {
        return await db.select().from(messages).where(eq(messages.ticketId, ticketId)).orderBy(asc(messages.createdAt));
      }
      async createMessage(insertMessage) {
        const [message] = await db.insert(messages).values(insertMessage).returning();
        return message;
      }
      // Attachment operations
      async getAttachmentsByTicketId(ticketId) {
        return await db.select().from(attachments).where(eq(attachments.ticketId, ticketId)).orderBy(asc(attachments.createdAt));
      }
      async getAttachmentById(id) {
        const results = await db.select().from(attachments).where(eq(attachments.id, id));
        return results[0];
      }
      async createAttachment(insertAttachment) {
        const [attachment] = await db.insert(attachments).values(insertAttachment).returning();
        return attachment;
      }
      // Data source operations
      async getAllDataSources(tenantId) {
        if (tenantId) {
          return await db.select().from(dataSources).where(eq(dataSources.tenantId, tenantId)).orderBy(asc(dataSources.priority));
        }
        return await db.select().from(dataSources).orderBy(asc(dataSources.priority));
      }
      async getEnabledDataSources(tenantId) {
        if (tenantId) {
          return await db.select().from(dataSources).where(and(
            eq(dataSources.enabled, true),
            eq(dataSources.tenantId, tenantId)
          )).orderBy(asc(dataSources.priority));
        } else {
          return await db.select().from(dataSources).where(eq(dataSources.enabled, true)).orderBy(asc(dataSources.priority));
        }
      }
      async getDataSourceById(id, tenantId) {
        if (tenantId) {
          const results2 = await db.select().from(dataSources).where(and(
            eq(dataSources.id, id),
            eq(dataSources.tenantId, tenantId)
          ));
          return results2[0];
        }
        const results = await db.select().from(dataSources).where(eq(dataSources.id, id));
        return results[0];
      }
      async createDataSource(insertDataSource) {
        const dataSourceWithDefaults = {
          ...insertDataSource,
          enabled: insertDataSource.enabled === void 0 ? true : insertDataSource.enabled
        };
        const [dataSource] = await db.insert(dataSources).values(dataSourceWithDefaults).returning();
        return dataSource;
      }
      async updateDataSource(id, updates, tenantId) {
        let result;
        if (tenantId) {
          result = await db.update(dataSources).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(and(
            eq(dataSources.id, id),
            eq(dataSources.tenantId, tenantId)
          )).returning();
        } else {
          result = await db.update(dataSources).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(dataSources.id, id)).returning();
        }
        const updatedDataSource = result[0];
        if (!updatedDataSource) {
          if (tenantId) {
            throw new Error(`Data source with id ${id} not found for tenant ${tenantId}`);
          } else {
            throw new Error(`Data source with id ${id} not found`);
          }
        }
        return updatedDataSource;
      }
      async deleteDataSource(id, tenantId) {
        let result;
        if (tenantId) {
          result = await db.delete(dataSources).where(and(
            eq(dataSources.id, id),
            eq(dataSources.tenantId, tenantId)
          ));
        } else {
          result = await db.delete(dataSources).where(eq(dataSources.id, id));
        }
        return !!result;
      }
      // Widget analytics operations
      async getWidgetAnalyticsByApiKey(apiKey) {
        const results = await db.select().from(widgetAnalytics).where(eq(widgetAnalytics.apiKey, apiKey));
        return results[0];
      }
      async getWidgetAnalyticsByAdminId(adminId, tenantId) {
        if (tenantId) {
          return await db.select().from(widgetAnalytics).where(and(
            eq(widgetAnalytics.adminId, adminId),
            eq(widgetAnalytics.tenantId, tenantId)
          ));
        } else {
          return await db.select().from(widgetAnalytics).where(eq(widgetAnalytics.adminId, adminId));
        }
      }
      async getAllWidgetAnalytics(tenantId) {
        try {
          let result;
          if (tenantId) {
            result = await db.execute(
              `SELECT * FROM widget_analytics WHERE tenant_id = $1`,
              [tenantId]
            );
          } else {
            result = await db.execute(
              `SELECT * FROM widget_analytics`
            );
          }
          if (!result || !Array.isArray(result.rows)) {
            console.warn("Unexpected result format from widget_analytics query:", result);
            return [];
          }
          return result.rows.map((row) => {
            if (row.metadata && typeof row.metadata === "string") {
              try {
                row.metadata = JSON.parse(row.metadata);
              } catch (e) {
                console.warn("Failed to parse metadata JSON:", e);
              }
            }
            return row;
          });
        } catch (error) {
          console.error("Failed to get all widget analytics:", error);
          return [];
        }
      }
      async recordWidgetInteraction(interaction) {
        try {
          const results = await db.execute(
            `SELECT * FROM widget_analytics WHERE tenant_id = $1 LIMIT 1`,
            [interaction.tenantId]
          );
          if (!results || !Array.isArray(results.rows) || results.rows.length === 0) {
            console.warn(`No widget analytics found for tenant ${interaction.tenantId}`);
            return;
          }
          const analytics = results.rows[0];
          let metadata = {};
          if (analytics.metadata) {
            if (typeof analytics.metadata === "string") {
              try {
                metadata = JSON.parse(analytics.metadata);
              } catch (e) {
                console.warn("Failed to parse metadata JSON:", e);
              }
            } else {
              metadata = analytics.metadata;
            }
          }
          if (!metadata.interactions) {
            metadata.interactions = [];
          }
          if (metadata.interactions.length >= 100) {
            metadata.interactions.shift();
          }
          metadata.interactions.push({
            type: interaction.messageType,
            timestamp: interaction.timestamp,
            url: interaction.url || "unknown",
            metadata: interaction.metadata || {}
          });
          let messagesReceived = analytics.messages_received || 0;
          let messagesSent = analytics.messages_sent || 0;
          let interactions = analytics.interactions || 0;
          if (interaction.messageType === "user") {
            messagesReceived += 1;
          } else {
            messagesSent += 1;
          }
          interactions += 1;
          await db.execute(
            `UPDATE widget_analytics 
         SET messages_received = $1, 
             messages_sent = $2, 
             interactions = $3, 
             last_activity = $4, 
             metadata = $5
         WHERE tenant_id = $6`,
            [
              messagesReceived,
              messagesSent,
              interactions,
              /* @__PURE__ */ new Date(),
              JSON.stringify(metadata),
              interaction.tenantId
            ]
          );
        } catch (error) {
          console.error("Error recording widget interaction:", error);
        }
      }
      async createWidgetAnalytics(insertAnalytics) {
        const analyticsToInsert = {
          ...insertAnalytics,
          clientWebsite: insertAnalytics.clientWebsite || null,
          interactions: insertAnalytics.interactions || 0,
          messagesReceived: insertAnalytics.messagesReceived || 0,
          messagesSent: insertAnalytics.messagesSent || 0,
          ticketsCreated: insertAnalytics.ticketsCreated || 0,
          metadata: insertAnalytics.metadata || {},
          lastActivity: insertAnalytics.lastActivity || /* @__PURE__ */ new Date(),
          lastClientIp: insertAnalytics.lastClientIp || null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const [analytics] = await db.insert(widgetAnalytics).values(analyticsToInsert).returning();
        return analytics;
      }
      async updateWidgetAnalytics(id, updates) {
        const [updated] = await db.update(widgetAnalytics).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(widgetAnalytics.id, id)).returning();
        if (!updated) {
          throw new Error(`Widget analytics with ID ${id} not found`);
        }
        return updated;
      }
      // Widget API Key operations
      async getApiKeyById(id) {
        const results = await db.select().from(widgetApiKeys).where(and(
          eq(widgetApiKeys.id, id),
          eq(widgetApiKeys.isRevoked, false)
        ));
        return results[0];
      }
      async getApiKeyByValue(key) {
        const results = await db.select().from(widgetApiKeys).where(and(
          eq(widgetApiKeys.key, key),
          eq(widgetApiKeys.isRevoked, false)
        ));
        return results[0];
      }
      async getApiKeysByTenant(tenantId) {
        return await db.select().from(widgetApiKeys).where(and(
          eq(widgetApiKeys.tenantId, tenantId),
          eq(widgetApiKeys.isRevoked, false)
        )).orderBy(desc(widgetApiKeys.createdAt));
      }
      async createApiKey(apiKey) {
        const [result] = await db.insert(widgetApiKeys).values(apiKey).returning();
        return result;
      }
      async updateApiKey(id, updates) {
        const [updated] = await db.update(widgetApiKeys).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(widgetApiKeys.id, id)).returning();
        if (!updated) {
          throw new Error(`Widget API key with ID ${id} not found`);
        }
        return updated;
      }
      async updateApiKeyUsage(id) {
        await db.update(widgetApiKeys).set({
          lastUsed: /* @__PURE__ */ new Date(),
          useCount: sql`${widgetApiKeys.useCount} + 1`
        }).where(eq(widgetApiKeys.id, id));
      }
      async deleteApiKey(id) {
        try {
          const [result] = await db.update(widgetApiKeys).set({
            isRevoked: true,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(widgetApiKeys.id, id)).returning({ id: widgetApiKeys.id });
          return !!result;
        } catch (error) {
          console.error(`Error while revoking API key ${id}:`, error);
          return false;
        }
      }
      // Support document operations
      async getAllSupportDocuments(tenantId) {
        try {
          let query = db.select().from(supportDocuments);
          if (tenantId) {
            query = query.where(eq(supportDocuments.tenantId, tenantId));
          }
          const documents = await query.orderBy(desc(supportDocuments.createdAt));
          return documents;
        } catch (error) {
          console.error("Error in getAllSupportDocuments():", error);
          throw error;
        }
      }
      async getSupportDocumentById(id, tenantId) {
        let conditions = [eq(supportDocuments.id, id)];
        if (tenantId) {
          conditions.push(eq(supportDocuments.tenantId, tenantId));
        }
        const [document] = await db.select().from(supportDocuments).where(and(...conditions));
        return document;
      }
      async getSupportDocumentsByCategory(category, tenantId) {
        let conditions = [eq(supportDocuments.category, category)];
        if (tenantId) {
          conditions.push(eq(supportDocuments.tenantId, tenantId));
        }
        const documents = await db.select().from(supportDocuments).where(and(...conditions));
        return documents;
      }
      async getSupportDocumentsByStatus(status, tenantId) {
        let conditions = [eq(supportDocuments.status, status)];
        if (tenantId) {
          conditions.push(eq(supportDocuments.tenantId, tenantId));
        }
        const documents = await db.select().from(supportDocuments).where(and(...conditions));
        return documents;
      }
      async searchSupportDocuments(query, tenantId) {
        if (!query) {
          return this.getAllSupportDocuments(tenantId);
        }
        const lowercaseQuery = `%${query.toLowerCase()}%`;
        let searchCondition = sql`LOWER(${supportDocuments.title}) LIKE ${lowercaseQuery} OR 
                               LOWER(${supportDocuments.content}) LIKE ${lowercaseQuery} OR 
                               LOWER(${supportDocuments.category}) LIKE ${lowercaseQuery}`;
        if (tenantId) {
          const documents = await db.select().from(supportDocuments).where(
            sql`(${searchCondition}) AND ${supportDocuments.tenantId} = ${tenantId}`
          ).orderBy(desc(supportDocuments.viewCount), desc(supportDocuments.createdAt));
          return documents;
        } else {
          const documents = await db.select().from(supportDocuments).where(searchCondition).orderBy(desc(supportDocuments.viewCount), desc(supportDocuments.createdAt));
          return documents;
        }
      }
      async createSupportDocument(document) {
        const now = /* @__PURE__ */ new Date();
        const [newDocument] = await db.insert(supportDocuments).values({
          ...document,
          createdAt: now,
          updatedAt: now,
          publishedAt: document.status === "published" ? now : null,
          viewCount: 0,
          status: document.status || "draft"
        }).returning();
        return newDocument;
      }
      async updateSupportDocument(id, updates, tenantId) {
        let conditions = [eq(supportDocuments.id, id)];
        if (tenantId) {
          conditions.push(eq(supportDocuments.tenantId, tenantId));
        }
        const updatesWithMetadata = {
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (updates.status === "published") {
          updatesWithMetadata.publishedAt = updatesWithMetadata.publishedAt || /* @__PURE__ */ new Date();
        }
        const [updated] = await db.update(supportDocuments).set(updatesWithMetadata).where(and(...conditions)).returning();
        if (!updated) {
          if (tenantId) {
            throw new Error(`Support document with id ${id} not found in tenant ${tenantId}`);
          } else {
            throw new Error(`Support document with id ${id} not found`);
          }
        }
        return updated;
      }
      async deleteSupportDocument(id, tenantId) {
        let conditions = [eq(supportDocuments.id, id)];
        if (tenantId) {
          conditions.push(eq(supportDocuments.tenantId, tenantId));
        }
        const result = await db.delete(supportDocuments).where(and(...conditions));
        return result.rowCount ? result.rowCount > 0 : false;
      }
      async incrementDocumentViewCount(id) {
        const [document] = await db.select().from(supportDocuments).where(eq(supportDocuments.id, id));
        if (!document) {
          throw new Error(`Support document with id ${id} not found`);
        }
        await db.update(supportDocuments).set({
          viewCount: (document.viewCount || 0) + 1,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(supportDocuments.id, id));
        await this.logDocumentUsage({
          documentId: id,
          usageType: "view",
          // Add any optional fields you need
          metadata: {}
        });
      }
      // Document usage operations
      async logDocumentUsage(usage) {
        const now = /* @__PURE__ */ new Date();
        const usageWithDefaults = {
          ...usage,
          // Make sure any required fields have defaults
          metadata: usage.metadata || {}
        };
        const [newUsage] = await db.insert(documentUsage).values(usageWithDefaults).returning();
        return newUsage;
      }
      async getDocumentUsageById(id) {
        const [usage] = await db.select().from(documentUsage).where(eq(documentUsage.id, id));
        return usage;
      }
      async getDocumentUsageByDocumentId(documentId) {
        const usages = await db.select().from(documentUsage).where(eq(documentUsage.documentId, documentId)).orderBy(desc(documentUsage.timestamp));
        return usages;
      }
      async getDocumentUsageAnalytics(startDate, endDate, tenantId) {
        let query = db.select().from(documentUsage).where(
          sql`${documentUsage.timestamp} >= ${startDate} AND ${documentUsage.timestamp} <= ${endDate}`
        );
        const usages = await query;
        let documentQuery = db.select().from(supportDocuments);
        if (tenantId) {
          documentQuery = documentQuery.where(eq(supportDocuments.tenantId, tenantId));
        }
        const documents = await documentQuery;
        const documentMap = new Map(documents.map((doc) => [doc.id, doc]));
        const filteredUsages = tenantId ? usages.filter((usage) => {
          const doc = documentMap.get(usage.documentId);
          return doc && doc.tenantId === tenantId;
        }) : usages;
        const viewsByDocument = /* @__PURE__ */ new Map();
        const viewsByCategory = /* @__PURE__ */ new Map();
        const viewsByDay = /* @__PURE__ */ new Map();
        for (const usage of filteredUsages) {
          const docViews = viewsByDocument.get(usage.documentId) || 0;
          viewsByDocument.set(usage.documentId, docViews + 1);
          const document = documentMap.get(usage.documentId);
          if (document) {
            const categoryViews = viewsByCategory.get(document.category) || 0;
            viewsByCategory.set(document.category, categoryViews + 1);
          }
          const day = usage.timestamp.toISOString().split("T")[0];
          const dayViews = viewsByDay.get(day) || 0;
          viewsByDay.set(day, dayViews + 1);
        }
        return {
          totalViews: filteredUsages.length,
          viewsByDocument: Object.fromEntries(viewsByDocument),
          viewsByCategory: Object.fromEntries(viewsByCategory),
          viewsByDay: Object.fromEntries(viewsByDay),
          timeframe: {
            start: startDate,
            end: endDate
          }
        };
      }
      // Agent resource operations - simple in-memory implementation for now
      async getAgentResources(agentType, tenantId) {
        return [];
      }
      async createAgentResource(resourceData) {
        return {
          id: Math.floor(Math.random() * 1e6),
          ...resourceData,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      async deleteAgentResource(id, tenantId) {
        return true;
      }
    };
    StorageWrapper = class {
      storageImpl;
      sessionStore;
      constructor() {
        try {
          this.storageImpl = initializeStorage();
          this.sessionStore = this.storageImpl.sessionStore;
          console.log("Storage initialized successfully");
        } catch (error) {
          console.error("Error during storage initialization:", error);
          console.log("Using in-memory storage as last resort fallback");
          this.storageImpl = new MemStorage();
          this.sessionStore = this.storageImpl.sessionStore;
        }
      }
      // Tenant operations
      async getTenantById(id) {
        try {
          return await this.storageImpl.getTenantById(id);
        } catch (error) {
          console.error(`Error in getTenantById(${id}):`, error);
          throw error;
        }
      }
      async getTenantByApiKey(apiKey) {
        try {
          return await this.storageImpl.getTenantByApiKey(apiKey);
        } catch (error) {
          console.error(`Error in getTenantByApiKey:`, error);
          throw error;
        }
      }
      async getTenantBySubdomain(subdomain) {
        try {
          return await this.storageImpl.getTenantBySubdomain(subdomain);
        } catch (error) {
          console.error(`Error in getTenantBySubdomain(${subdomain}):`, error);
          throw error;
        }
      }
      async getAllTenants() {
        try {
          return await this.storageImpl.getAllTenants();
        } catch (error) {
          console.error(`Error in getAllTenants():`, error);
          throw error;
        }
      }
      async createTenant(tenant) {
        try {
          return await this.storageImpl.createTenant(tenant);
        } catch (error) {
          console.error(`Error in createTenant():`, error);
          throw error;
        }
      }
      async updateTenant(id, updates) {
        try {
          return await this.storageImpl.updateTenant(id, updates);
        } catch (error) {
          console.error(`Error in updateTenant(${id}):`, error);
          throw error;
        }
      }
      // Team operations
      async getTeamById(id, tenantId) {
        try {
          return await this.storageImpl.getTeamById(id, tenantId);
        } catch (error) {
          console.error(`Error in getTeamById(${id}):`, error);
          throw error;
        }
      }
      async getTeamByName(name, tenantId) {
        try {
          return await this.storageImpl.getTeamByName(name, tenantId);
        } catch (error) {
          console.error(`Error in getTeamByName(${name}):`, error);
          throw error;
        }
      }
      async getTeamsByTenantId(tenantId) {
        try {
          return await this.storageImpl.getTeamsByTenantId(tenantId);
        } catch (error) {
          console.error(`Error in getTeamsByTenantId(${tenantId}):`, error);
          throw error;
        }
      }
      async createTeam(team) {
        try {
          return await this.storageImpl.createTeam(team);
        } catch (error) {
          console.error(`Error in createTeam():`, error);
          throw error;
        }
      }
      async updateTeam(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateTeam(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateTeam(${id}):`, error);
          throw error;
        }
      }
      async deleteTeam(id, tenantId) {
        try {
          return await this.storageImpl.deleteTeam(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteTeam(${id}):`, error);
          throw error;
        }
      }
      async getTeamMembers(teamId, tenantId) {
        try {
          return await this.storageImpl.getTeamMembers(teamId, tenantId);
        } catch (error) {
          console.error(`Error in getTeamMembers(${teamId}):`, error);
          throw error;
        }
      }
      async getTicketsByTeamId(teamId, tenantId) {
        try {
          return await this.storageImpl.getTicketsByTeamId(teamId, tenantId);
        } catch (error) {
          console.error(`Error in getTicketsByTeamId(${teamId}):`, error);
          throw error;
        }
      }
      // User operations
      async getUser(id) {
        try {
          return await this.storageImpl.getUser(id);
        } catch (error) {
          console.error(`Error in getUser(${id}):`, error);
          throw error;
        }
      }
      async getUserByUsername(username, tenantId) {
        try {
          return await this.storageImpl.getUserByUsername(username, tenantId);
        } catch (error) {
          console.error(`Error in getUserByUsername(${username}):`, error);
          throw error;
        }
      }
      async getUsersByTenantId(tenantId) {
        try {
          return await this.storageImpl.getUsersByTenantId(tenantId);
        } catch (error) {
          console.error(`Error in getUsersByTenantId(${tenantId}):`, error);
          throw error;
        }
      }
      async deleteUser(id) {
        try {
          return await this.storageImpl.deleteUser(id);
        } catch (error) {
          console.error(`Error in deleteUser(${id}):`, error);
          throw error;
        }
      }
      async createUser(user) {
        try {
          return await this.storageImpl.createUser(user);
        } catch (error) {
          console.error(`Error in createUser():`, error);
          throw error;
        }
      }
      async updateUser(id, updates) {
        try {
          return await this.storageImpl.updateUser(id, updates);
        } catch (error) {
          console.error(`Error in updateUser(${id}):`, error);
          throw error;
        }
      }
      async getUserBySsoId(provider, providerId, tenantId) {
        try {
          return await this.storageImpl.getUserBySsoId(provider, providerId, tenantId);
        } catch (error) {
          console.error(`Error in getUserBySsoId():`, error);
          throw error;
        }
      }
      // Identity provider operations
      async getIdentityProviders(tenantId) {
        try {
          return await this.storageImpl.getIdentityProviders(tenantId);
        } catch (error) {
          console.error(`Error in getIdentityProviders():`, error);
          throw error;
        }
      }
      async getIdentityProviderById(id, tenantId) {
        try {
          return await this.storageImpl.getIdentityProviderById(id, tenantId);
        } catch (error) {
          console.error(`Error in getIdentityProviderById():`, error);
          throw error;
        }
      }
      async createIdentityProvider(provider) {
        try {
          return await this.storageImpl.createIdentityProvider(provider);
        } catch (error) {
          console.error(`Error in createIdentityProvider():`, error);
          throw error;
        }
      }
      async updateIdentityProvider(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateIdentityProvider(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateIdentityProvider():`, error);
          throw error;
        }
      }
      async deleteIdentityProvider(id, tenantId) {
        try {
          return await this.storageImpl.deleteIdentityProvider(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteIdentityProvider():`, error);
          throw error;
        }
      }
      // Ticket operations  
      async getAllTickets(tenantId) {
        try {
          return await this.storageImpl.getAllTickets(tenantId);
        } catch (error) {
          console.error(`Error in getAllTickets():`, error);
          throw error;
        }
      }
      async getTicketById(id, tenantId) {
        try {
          return await this.storageImpl.getTicketById(id, tenantId);
        } catch (error) {
          console.error(`Error in getTicketById():`, error);
          throw error;
        }
      }
      async createTicket(ticket) {
        try {
          return await this.storageImpl.createTicket(ticket);
        } catch (error) {
          console.error(`Error in createTicket():`, error);
          throw error;
        }
      }
      async updateTicket(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateTicket(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateTicket():`, error);
          throw error;
        }
      }
      // Message operations
      async getMessagesByTicketId(ticketId) {
        try {
          return await this.storageImpl.getMessagesByTicketId(ticketId);
        } catch (error) {
          console.error(`Error in getMessagesByTicketId():`, error);
          throw error;
        }
      }
      async createMessage(message) {
        try {
          return await this.storageImpl.createMessage(message);
        } catch (error) {
          console.error(`Error in createMessage():`, error);
          throw error;
        }
      }
      // Attachment operations
      async getAttachmentsByTicketId(ticketId) {
        try {
          return await this.storageImpl.getAttachmentsByTicketId(ticketId);
        } catch (error) {
          console.error(`Error in getAttachmentsByTicketId():`, error);
          throw error;
        }
      }
      async getAttachmentById(id) {
        try {
          return await this.storageImpl.getAttachmentById(id);
        } catch (error) {
          console.error(`Error in getAttachmentById():`, error);
          throw error;
        }
      }
      async createAttachment(attachment) {
        try {
          return await this.storageImpl.createAttachment(attachment);
        } catch (error) {
          console.error(`Error in createAttachment():`, error);
          throw error;
        }
      }
      // Data source operations
      async getAllDataSources(tenantId) {
        try {
          return await this.storageImpl.getAllDataSources(tenantId);
        } catch (error) {
          console.error(`Error in getAllDataSources():`, error);
          throw error;
        }
      }
      async getEnabledDataSources(tenantId) {
        try {
          return await this.storageImpl.getEnabledDataSources(tenantId);
        } catch (error) {
          console.error(`Error in getEnabledDataSources():`, error);
          throw error;
        }
      }
      async getDataSourceById(id, tenantId) {
        try {
          return await this.storageImpl.getDataSourceById(id, tenantId);
        } catch (error) {
          console.error(`Error in getDataSourceById():`, error);
          throw error;
        }
      }
      async createDataSource(dataSource) {
        try {
          return await this.storageImpl.createDataSource(dataSource);
        } catch (error) {
          console.error(`Error in createDataSource():`, error);
          throw error;
        }
      }
      async updateDataSource(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateDataSource(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateDataSource():`, error);
          throw error;
        }
      }
      async deleteDataSource(id, tenantId) {
        try {
          return await this.storageImpl.deleteDataSource(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteDataSource():`, error);
          throw error;
        }
      }
      // AI provider operations
      async getAiProviders(tenantId, teamId) {
        try {
          return await this.storageImpl.getAiProviders(tenantId, teamId);
        } catch (error) {
          console.error(`Error in getAiProviders():`, error);
          throw error;
        }
      }
      async getAiProviderById(id, tenantId) {
        try {
          return await this.storageImpl.getAiProviderById(id, tenantId);
        } catch (error) {
          console.error(`Error in getAiProviderById():`, error);
          throw error;
        }
      }
      async getAiProvidersByType(type, tenantId) {
        try {
          return await this.storageImpl.getAiProvidersByType(type, tenantId);
        } catch (error) {
          console.error(`Error in getAiProvidersByType():`, error);
          throw error;
        }
      }
      async getPrimaryAiProvider(tenantId) {
        try {
          return await this.storageImpl.getPrimaryAiProvider(tenantId);
        } catch (error) {
          console.error(`Error in getPrimaryAiProvider():`, error);
          throw error;
        }
      }
      async createAiProvider(provider) {
        try {
          return await this.storageImpl.createAiProvider(provider);
        } catch (error) {
          console.error(`Error in createAiProvider():`, error);
          throw error;
        }
      }
      async updateAiProvider(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateAiProvider(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateAiProvider():`, error);
          throw error;
        }
      }
      async deleteAiProvider(id, tenantId) {
        try {
          return await this.storageImpl.deleteAiProvider(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteAiProvider():`, error);
          throw error;
        }
      }
      // Widget analytics operations
      async getWidgetAnalyticsByApiKey(apiKey) {
        try {
          return await this.storageImpl.getWidgetAnalyticsByApiKey(apiKey);
        } catch (error) {
          console.error(`Error in getWidgetAnalyticsByApiKey():`, error);
          throw error;
        }
      }
      async getWidgetAnalyticsByAdminId(adminId, tenantId) {
        try {
          return await this.storageImpl.getWidgetAnalyticsByAdminId(adminId, tenantId);
        } catch (error) {
          console.error(`Error in getWidgetAnalyticsByAdminId():`, error);
          throw error;
        }
      }
      async getAllWidgetAnalytics(tenantId) {
        try {
          const analytics = await this.storageImpl.getAllWidgetAnalytics(tenantId);
          if (!analytics) {
            console.warn("getAllWidgetAnalytics() returned null or undefined, returning empty array");
            return [];
          }
          return analytics;
        } catch (error) {
          console.error(`Error in getAllWidgetAnalytics():`, error);
          return [];
        }
      }
      async recordWidgetInteraction(interaction) {
        try {
          await this.storageImpl.recordWidgetInteraction(interaction);
        } catch (error) {
          console.error(`Error in recordWidgetInteraction():`, error);
        }
      }
      async createWidgetAnalytics(analytics) {
        try {
          return await this.storageImpl.createWidgetAnalytics(analytics);
        } catch (error) {
          console.error(`Error in createWidgetAnalytics():`, error);
          throw error;
        }
      }
      async updateWidgetAnalytics(id, updates) {
        try {
          return await this.storageImpl.updateWidgetAnalytics(id, updates);
        } catch (error) {
          console.error(`Error in updateWidgetAnalytics():`, error);
          throw error;
        }
      }
      // Support document operations
      async getAllSupportDocuments(tenantId) {
        try {
          return await this.storageImpl.getAllSupportDocuments(tenantId);
        } catch (error) {
          console.error(`Error in getAllSupportDocuments():`, error);
          throw error;
        }
      }
      async getSupportDocumentById(id, tenantId) {
        try {
          return await this.storageImpl.getSupportDocumentById(id, tenantId);
        } catch (error) {
          console.error(`Error in getSupportDocumentById():`, error);
          throw error;
        }
      }
      async getSupportDocumentsByCategory(category, tenantId) {
        try {
          return await this.storageImpl.getSupportDocumentsByCategory(category, tenantId);
        } catch (error) {
          console.error(`Error in getSupportDocumentsByCategory():`, error);
          throw error;
        }
      }
      async getSupportDocumentsByStatus(status, tenantId) {
        try {
          return await this.storageImpl.getSupportDocumentsByStatus(status, tenantId);
        } catch (error) {
          console.error(`Error in getSupportDocumentsByStatus():`, error);
          throw error;
        }
      }
      async searchSupportDocuments(query, tenantId) {
        try {
          return await this.storageImpl.searchSupportDocuments(query, tenantId);
        } catch (error) {
          console.error(`Error in searchSupportDocuments():`, error);
          throw error;
        }
      }
      async createSupportDocument(document) {
        try {
          return await this.storageImpl.createSupportDocument(document);
        } catch (error) {
          console.error(`Error in createSupportDocument():`, error);
          throw error;
        }
      }
      async updateSupportDocument(id, updates, tenantId) {
        try {
          return await this.storageImpl.updateSupportDocument(id, updates, tenantId);
        } catch (error) {
          console.error(`Error in updateSupportDocument():`, error);
          throw error;
        }
      }
      async deleteSupportDocument(id, tenantId) {
        try {
          return await this.storageImpl.deleteSupportDocument(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteSupportDocument():`, error);
          throw error;
        }
      }
      // Document usage operations
      async logDocumentUsage(usage) {
        try {
          return await this.storageImpl.logDocumentUsage(usage);
        } catch (error) {
          console.error(`Error in logDocumentUsage():`, error);
          throw error;
        }
      }
      async getDocumentUsageById(id) {
        try {
          return await this.storageImpl.getDocumentUsageById(id);
        } catch (error) {
          console.error(`Error in getDocumentUsageById():`, error);
          throw error;
        }
      }
      async getDocumentUsageByDocumentId(documentId) {
        try {
          return await this.storageImpl.getDocumentUsageByDocumentId(documentId);
        } catch (error) {
          console.error(`Error in getDocumentUsageByDocumentId():`, error);
          throw error;
        }
      }
      async getDocumentUsageAnalytics(startDate, endDate, tenantId) {
        try {
          return await this.storageImpl.getDocumentUsageAnalytics(startDate, endDate, tenantId);
        } catch (error) {
          console.error(`Error in getDocumentUsageAnalytics():`, error);
          throw error;
        }
      }
      async incrementDocumentViewCount(id) {
        try {
          return await this.storageImpl.incrementDocumentViewCount(id);
        } catch (error) {
          console.error(`Error in incrementDocumentViewCount(${id}):`, error);
          throw error;
        }
      }
      // Widget API Key operations
      async getApiKeyById(id) {
        try {
          return await this.storageImpl.getApiKeyById(id);
        } catch (error) {
          console.error(`Error in getApiKeyById(${id}):`, error);
          throw error;
        }
      }
      async getApiKeyByValue(key) {
        try {
          return await this.storageImpl.getApiKeyByValue(key);
        } catch (error) {
          console.error(`Error in getApiKeyByValue():`, error);
          throw error;
        }
      }
      async getApiKeysByTenant(tenantId) {
        try {
          return await this.storageImpl.getApiKeysByTenant(tenantId);
        } catch (error) {
          console.error(`Error in getApiKeysByTenant(${tenantId}):`, error);
          return [];
        }
      }
      async createApiKey(apiKey) {
        try {
          return await this.storageImpl.createApiKey(apiKey);
        } catch (error) {
          console.error(`Error in createApiKey():`, error);
          throw error;
        }
      }
      async updateApiKey(id, updates) {
        try {
          return await this.storageImpl.updateApiKey(id, updates);
        } catch (error) {
          console.error(`Error in updateApiKey(${id}):`, error);
          throw error;
        }
      }
      async updateApiKeyUsage(id) {
        try {
          return await this.storageImpl.updateApiKeyUsage(id);
        } catch (error) {
          console.error(`Error in updateApiKeyUsage(${id}):`, error);
        }
      }
      async deleteApiKey(id) {
        try {
          return await this.storageImpl.deleteApiKey(id);
        } catch (error) {
          console.error(`Error in deleteApiKey(${id}):`, error);
          return false;
        }
      }
      // Agent Resources operations - for agent-specific file uploads with strict isolation
      async getAgentResources(agentType, tenantId) {
        try {
          return await this.storageImpl.getAgentResources(agentType, tenantId);
        } catch (error) {
          console.error(`Error in getAgentResources(${agentType}, ${tenantId}):`, error);
          return [];
        }
      }
      async getAgentResource(id, tenantId) {
        try {
          return await this.storageImpl.getAgentResource(id, tenantId);
        } catch (error) {
          console.error(`Error in getAgentResource(${id}, ${tenantId}):`, error);
          return void 0;
        }
      }
      async createAgentResource(data) {
        try {
          return await this.storageImpl.createAgentResource(data);
        } catch (error) {
          console.error("Error in createAgentResource:", error);
          throw error;
        }
      }
      async deleteAgentResource(id, tenantId) {
        try {
          return await this.storageImpl.deleteAgentResource(id, tenantId);
        } catch (error) {
          console.error(`Error in deleteAgentResource(${id}, ${tenantId}):`, error);
          return false;
        }
      }
      async getAgentResourcesByType(agentType) {
        try {
          return await this.storageImpl.getAgentResourcesByType(agentType);
        } catch (error) {
          console.error(`Error in getAgentResourcesByType(${agentType}):`, error);
          return [];
        }
      }
    };
    storage = new StorageWrapper();
  }
});

// server/openai-service.ts
import OpenAI from "openai";
function identifyComponent(text2) {
  const lowerText = text2.toLowerCase();
  if (/login|password|auth|sign[- ]in|account access/i.test(lowerText)) {
    return "Authentication";
  }
  if (/payment|billing|charge|invoice|subscription|credit card/i.test(lowerText)) {
    return "Billing";
  }
  if (/data|database|record|entry|lost|missing/i.test(lowerText)) {
    return "Database";
  }
  if (/ui|interface|button|screen|display|page|website/i.test(lowerText)) {
    return "User Interface";
  }
  if (/api|request|endpoint|integration|service/i.test(lowerText)) {
    return "API";
  }
  if (/error|bug|crash|fail|broken|not working/i.test(lowerText)) {
    return "System Error";
  }
  if (/slow|performance|timeout|delay/i.test(lowerText)) {
    return "Performance";
  }
  if (/install|setup|configure|deployment/i.test(lowerText)) {
    return "Installation";
  }
  if (/report|analytics|stats|numbers|metric/i.test(lowerText)) {
    return "Reporting";
  }
  if (/admin|permission|access|role|privilege/i.test(lowerText)) {
    return "Administration";
  }
  return "Support";
}
async function classifyTicketWithAI(title, description, knowledgeContext = "") {
  try {
    let prompt = `
    You are an AI support ticket classifier that accurately categorizes customer issues. 
    Based on the following ticket information, classify the ticket according to these criteria:
    
    1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
    
    2. Complexity (one of: simple, medium, complex) based on these guidelines:
       - "simple": Straightforward issues with clear solutions, minimal technical knowledge needed, can be solved quickly
       - "medium": Issues requiring some investigation, moderate technical knowledge, or multiple steps to resolve
       - "complex": Complicated issues requiring in-depth technical analysis, code changes, database work, or specialist knowledge
    
    3. Department to assign to (one of: support, engineering, product, billing)
    
    4. Whether the ticket can be automatically resolved (true or false)
    
    5. Notes for additional context (optional)
    
    Make sure to carefully assess the complexity based on the technical nature of the problem, not just the length of the description.
    
    Ticket Title: ${title}
    Ticket Description: ${description}
    `;
    if (knowledgeContext) {
      prompt += `
Relevant Knowledge Base Information:
${knowledgeContext}`;
    }
    prompt += `
    Respond with JSON only in this format:
    {
      "category": "category_name",
      "complexity": "complexity_level",
      "assignedTo": "department_name",
      "canAutoResolve": boolean,
      "aiNotes": "additional context" 
    }
    `;
    const response2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const content = response2.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    if (!result.category || !result.complexity || !result.assignedTo) {
      console.warn("OpenAI returned incomplete classification, adding missing fields");
      result.category = result.category || "other";
      result.complexity = result.complexity || "medium";
      result.assignedTo = result.assignedTo || "support";
      result.canAutoResolve = !!result.canAutoResolve;
      result.aiNotes = result.aiNotes || "This ticket has been automatically classified";
    }
    return result;
  } catch (error) {
    console.error("Error calling OpenAI for ticket classification:", error);
    const text2 = (title + " " + description).toLowerCase();
    let complexity = "medium";
    if (text2.includes("critical") || text2.includes("urgent") || text2.includes("security") || text2.includes("breach") || text2.includes("production down") || text2.includes("data loss") || text2.includes("server crash")) {
      complexity = "complex";
    } else if ((text2.includes("how to") || text2.includes("where is") || text2.includes("guide") || text2.includes("documentation") || text2.includes("password reset")) && text2.length < 200) {
      complexity = "simple";
    }
    return {
      category: "other",
      complexity,
      assignedTo: "support",
      canAutoResolve: false,
      aiNotes: "This ticket has been automatically classified based on content analysis. The system has determined the complexity to be " + complexity + "."
    };
  }
}
async function attemptAutoResolveWithAI(title, description, previousMessages = [], knowledgeContext = "") {
  try {
    let systemContent = `You are an AI support assistant for a SaaS product. 
        Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
        If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
        If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
        `;
    if (knowledgeContext) {
      systemContent += `

${knowledgeContext}`;
    }
    const messages2 = [
      {
        role: "system",
        content: systemContent
      },
      ...previousMessages,
      {
        role: "user",
        content: `Title: ${title}
Description: ${description}`
      }
    ];
    const response2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages2,
      temperature: 0.7,
      max_tokens: 800
    });
    const responseText = response2.choices[0].message.content || "";
    const resolved = responseText.includes("[ISSUE RESOLVED]");
    const cleanResponse = responseText.replace("[ISSUE RESOLVED]", "").replace("[REQUIRES HUMAN]", "").trim();
    return { resolved, response: cleanResponse };
  } catch (error) {
    console.error("Error calling OpenAI for ticket resolution:", error);
    return {
      resolved: false,
      response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
    };
  }
}
async function generateChatResponseWithAI(ticketContext, messageHistory, userMessage, knowledgeContext = "") {
  try {
    let systemContent = `You are a support assistant helping quality analysts and software testers with ticket "${ticketContext.title}" in the "${ticketContext.category}" category.
      Ticket #${ticketContext.id}: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      
      Format your responses for maximum readability:
      - Use bullet points for lists of steps or actions
      - Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
      - Break complex information into clear paragraphs
      - Highlight important information or warnings
      
      Key Guidelines:
      - User is a QA analyst/tester who found this issue
      - Provide quick workarounds or information gathering steps only
      - Keep recommendations simple and non-technical
      - Don't provide code solutions or technical implementations
      - Focus on ticket resolution rather than complex troubleshooting
      
      Provide helpful, non-technical guidance based on this ticket context. If you can provide a simple workaround, indicate this clearly.
      If the issue requires developer intervention, make that clear as well.`;
    if (knowledgeContext) {
      systemContent += `

${knowledgeContext}`;
    }
    const systemMessage = {
      role: "system",
      content: systemContent
    };
    const messages2 = [
      systemMessage,
      ...messageHistory,
      { role: "user", content: userMessage }
    ];
    const response2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages2,
      temperature: 0.7,
      max_tokens: 800
    });
    return response2.choices[0].message.content || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Error calling OpenAI for chat response:", error);
    return "I apologize, but I'm experiencing difficulties processing your request right now. Let me connect you with a support representative who can assist you further.";
  }
}
async function generateTicketTitleWithAI(messages2) {
  const MAX_ATTEMPTS = 2;
  const API_TIMEOUT = 15e3;
  const startTime = Date.now();
  console.log(`Generating ticket title with OpenAI... (Messages: ${messages2.length})`);
  const systemPrompt = `
  You are an AI specialist focused exclusively on creating concise, accurate technical support ticket titles.
  
  CRITICAL INSTRUCTIONS:
  1. Analyze the conversation to identify the primary technical issue or request
  2. Focus on ERROR CODES, specific components, or technical terms mentioned
  3. Titles MUST follow the format: "[System/Component]: [Specific Technical Issue]"
  4. ALWAYS include error codes when present (e.g., "Error 404", "API Error", "Database Exception")
  
  MANDATORY TITLE STRUCTURE:
  - First part: The system, component, or area affected (Dashboard, API, Login System, Database, etc.)
  - Second part: The specific technical issue or request (after the colon)
  - Example good titles:
     * "Login System: Password Reset Emails Not Delivered"
     * "Payment API: Error 403 During Transaction Processing"
     * "Database: Connection Timeout During High Traffic"
     * "User Dashboard: Data Visualization Not Rendering"
     * "Mobile App: Crash on Profile Image Upload"
  
  FORMAT REQUIREMENTS:
  - Length: 5-10 words maximum
  - Always include a colon separating the component from the issue
  - Capitalize first letter of each significant word
  - No quotation marks, no ending punctuation, no generic terms like "issue with"
  
  You MUST ONLY return the title text itself, nothing else. No explanations, no quotation marks.
  `;
  try {
    const nonSystemMessages = messages2.filter((msg) => msg.role !== "system");
    if (nonSystemMessages.length === 0) {
      console.log("No messages provided for title generation, returning default title");
      return "Support Request";
    }
    let userContent = nonSystemMessages.filter((msg) => msg.role === "user").map((msg) => msg.content).join(" ");
    if (userContent.length < 50 && nonSystemMessages.length > 1) {
      userContent += " " + nonSystemMessages.filter((msg) => msg.role === "assistant").map((msg) => msg.content).join(" ");
    }
    const errorPattern = /error|exception|fail|timeout|crash|bug|not working|isn't working|doesn't work/i;
    const hasErrorTerms = errorPattern.test(userContent);
    let finalInstruction = "Generate a concise, descriptive ticket title for this conversation.";
    if (hasErrorTerms) {
      finalInstruction = "Generate a specific error-focused title that precisely identifies the technical issue.";
    } else if (userContent.includes("feature") || userContent.includes("add") || userContent.includes("improve")) {
      finalInstruction = "Generate a title that clearly describes this feature request or enhancement.";
    } else if (userContent.includes("how") || userContent.includes("what") || userContent.includes("why")) {
      finalInstruction = "Generate a title that frames this inquiry or question in a clear, searchable format.";
    }
    const completionMessages = [
      { role: "system", content: systemPrompt },
      ...nonSystemMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: finalInstruction }
    ];
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI title generation timed out after ${API_TIMEOUT}ms`)), API_TIMEOUT);
    });
    let lastError = null;
    let bestTitle = "Support Request";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`Title generation attempt ${attempt}/${MAX_ATTEMPTS}`);
        const completionPromise = openai.chat.completions.create({
          model: "gpt-4o",
          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: completionMessages,
          temperature: attempt === 1 ? 0.2 : 0.4,
          // Start with low temperature, increase slightly on retry
          max_tokens: 50,
          // Limit tokens to encourage concise titles
          top_p: 0.8,
          // More deterministic responses
          frequency_penalty: 0.5
          // Discourage repetitive language
        });
        const completion = await Promise.race([completionPromise, timeoutPromise]);
        let generatedTitle = completion.choices[0].message.content?.trim() || "";
        generatedTitle = generatedTitle.replace(/^["'`]|["'`]$/g, "").replace(/^Title:?\s*/i, "").replace(/[\n\r]+/g, " ").trim();
        const hasColon = generatedTitle.includes(":");
        const basicValidation = generatedTitle && generatedTitle.length >= 5 && generatedTitle.length <= 100 && generatedTitle !== "Support Request" && !/^\s*issue|problem|request|inquiry\s*$/i.test(generatedTitle);
        if (basicValidation && hasColon) {
          console.log(`Successfully generated title on attempt ${attempt}: "${generatedTitle}"`);
          const duration = Date.now() - startTime;
          console.log(`Title generation completed in ${duration}ms`);
          return generatedTitle;
        } else if (basicValidation && !hasColon) {
          console.log(`Title missing colon, attempting to fix: "${generatedTitle}"`);
          const components = [
            "System",
            "Application",
            "UI",
            "API",
            "Database",
            "Login",
            "Dashboard",
            "User Interface",
            "Backend",
            "Account",
            "Performance",
            "Security"
          ];
          const lcTitle = generatedTitle.toLowerCase();
          let component = "";
          if (lcTitle.includes("login") || lcTitle.includes("password") || lcTitle.includes("auth")) {
            component = "Authentication";
          } else if (lcTitle.includes("data") || lcTitle.includes("database") || lcTitle.includes("query")) {
            component = "Database";
          } else if (lcTitle.includes("ui") || lcTitle.includes("interface") || lcTitle.includes("display")) {
            component = "User Interface";
          } else if (lcTitle.includes("api") || lcTitle.includes("endpoint") || lcTitle.includes("request")) {
            component = "API";
          } else if (lcTitle.includes("error") || lcTitle.includes("crash") || lcTitle.includes("bug")) {
            component = "System Error";
          } else {
            component = "Support";
          }
          const fixedTitle = `${component}: ${generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1)}`;
          console.log(`Fixed title: "${fixedTitle}"`);
          const duration = Date.now() - startTime;
          console.log(`Title generation completed in ${duration}ms`);
          return fixedTitle;
        } else {
          console.warn(`Generated title failed validation: "${generatedTitle}"`);
          if (generatedTitle && generatedTitle.length > 0 && generatedTitle !== "Support Request") {
            bestTitle = generatedTitle;
          }
        }
      } catch (attemptError) {
        const errorMessage = attemptError instanceof Error ? attemptError.message : String(attemptError);
        console.error(`Title generation attempt ${attempt} failed: ${errorMessage}`);
        lastError = attemptError;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (bestTitle !== "Support Request") {
      console.log(`Using best available title from attempts: "${bestTitle}"`);
      return bestTitle;
    }
    throw lastError || new Error("Failed to generate an acceptable title");
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Title generation failed after ${duration}ms:`, error);
    try {
      const userMessages = messages2.filter((msg) => msg.role === "user");
      if (userMessages.length === 0) {
        return "Support Request";
      }
      const firstMessage = userMessages[0].content.trim();
      const lastMessage = userMessages[userMessages.length - 1].content.trim();
      const allUserContent = userMessages.map((m) => m.content).join(" ");
      const errorCodeMatch = allUserContent.match(/(\b[45]\d{2}\b|error code:?\s*([a-z0-9_-]+))/i);
      if (errorCodeMatch) {
        return `System Error: ${errorCodeMatch[0]} Issue`;
      }
      if (/password|login|sign[- ]in|account access|authentication/i.test(allUserContent)) {
        return "Authentication: Account Access Issue";
      }
      if (/payment|billing|charge|invoice|subscription|credit card/i.test(allUserContent)) {
        return "Billing: Payment Processing Issue";
      }
      if (/install|setup|configuration|getting started/i.test(allUserContent)) {
        return "Configuration: Setup Assistance";
      }
      if (/bug|error|crash|not working|fails?|failed|broken/i.test(allUserContent)) {
        const brokenMatch = allUserContent.match(/(\w+(?:\s+\w+){0,4})\s+(?:is|are|not working|broken|fails)/i);
        if (brokenMatch) {
          return `Technical Issue: ${brokenMatch[1]} Problem`;
        }
        return "System Error: Technical Malfunction";
      }
      if (/feature request|enhancement|suggestion|would be nice/i.test(allUserContent)) {
        return "Feature Request: New Functionality";
      }
      if (/how (?:do|can|to)|where is|what is/i.test(allUserContent)) {
        return "Documentation: Usage Instructions";
      }
      if (firstMessage.length > 5 && firstMessage.length < 60) {
        const wordLimit = 10;
        const firstMessageWords = firstMessage.split(/\s+/).slice(0, wordLimit);
        const component = identifyComponent(firstMessage);
        const processedTitle = firstMessageWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
        return `${component}: ${processedTitle}`;
      }
      if (firstMessage !== lastMessage && firstMessage.length < 30 && lastMessage.length < 30) {
        return `Support: ${firstMessage.split(/\s+/).slice(0, 4).join(" ")} - ${lastMessage.split(/\s+/).slice(0, 4).join(" ")}`;
      }
      return `Support: ${firstMessage.split(/\s+/).slice(0, 8).join(" ")}`;
    } catch (fallbackError) {
      console.error("Error generating fallback title:", fallbackError);
      return "Technical Support Request";
    }
  }
}
var openai;
var init_openai_service = __esm({
  "server/openai-service.ts"() {
    "use strict";
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
});

// server/data-source-service.ts
async function getKnowledgeForQuery(query, tenantId) {
  try {
    const dataSources2 = await storage.getEnabledDataSources(tenantId);
    if (!dataSources2.length) {
      console.log(`No enabled data sources found for knowledge retrieval${tenantId ? ` (tenant: ${tenantId})` : ""}`);
      return "";
    }
    console.log(`Processing ${dataSources2.length} data sources for query: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"${tenantId ? ` (tenant: ${tenantId})` : ""}`);
    const knowledgePromises = dataSources2.map(
      (dataSource) => processDataSource(dataSource, query).catch((err) => {
        console.error(`Error processing data source "${dataSource.name}":`, err);
        return "";
      })
    );
    const knowledgeResults = await Promise.all(knowledgePromises);
    const nonEmptyResults = knowledgeResults.filter(Boolean).length;
    console.log(`Retrieved knowledge from ${nonEmptyResults} out of ${dataSources2.length} data sources${tenantId ? ` for tenant ${tenantId}` : ""}`);
    const combinedKnowledge = knowledgeResults.filter(Boolean).join("\n\n");
    return combinedKnowledge;
  } catch (error) {
    console.error(`Error fetching knowledge${tenantId ? ` for tenant ${tenantId}` : ""}:`, error);
    return "";
  }
}
async function processDataSource(dataSource, query) {
  try {
    const normalizedQuery = query.toLowerCase();
    switch (dataSource.type) {
      case "kb":
        return processKnowledgeBase(dataSource, normalizedQuery);
      case "url":
        return processUrl(dataSource, normalizedQuery);
      case "custom":
        return processCustomData(dataSource, normalizedQuery);
      default:
        console.warn(`Unknown data source type: ${dataSource.type}`);
        return "";
    }
  } catch (error) {
    console.error(`Error processing data source ${dataSource.name}:`, error);
    return "";
  }
}
function processKnowledgeBase(dataSource, query) {
  if (!dataSource.content) {
    return "";
  }
  try {
    const knowledgeBase2 = JSON.parse(dataSource.content);
    if (!Array.isArray(knowledgeBase2)) {
      console.warn(`Knowledge base "${dataSource.name}" is not an array`);
      return "";
    }
    console.log(`Processing knowledge base "${dataSource.name}" with ${knowledgeBase2.length} entries`);
    const keywords = query.split(/\s+/).map((word) => word.toLowerCase().replace(/[^\w\s]/g, "")).filter((word) => word.length > 3);
    if (keywords.length === 0) {
      console.log(`No significant keywords found in query: "${query}"`);
      return "";
    }
    const initialScoredEntries = knowledgeBase2.map((entry) => {
      const entryText = `${entry.question} ${entry.category} ${entry.tags?.join(" ") || ""}`.toLowerCase();
      let score = 0;
      let matchedKeywords = 0;
      keywords.forEach((keyword) => {
        if (entryText.includes(keyword)) {
          score += 1;
          matchedKeywords += 1;
          if (entry.question.toLowerCase().includes(keyword)) {
            score += 0.5;
          }
          if (entry.category?.toLowerCase() === keyword) {
            score += 1;
          }
          if (entry.tags?.some((tag) => tag.toLowerCase() === keyword)) {
            score += 0.5;
          }
        }
      });
      return matchedKeywords > 0 ? { entry, score } : null;
    }).filter(Boolean);
    const nonNullScoredEntries = initialScoredEntries.filter((item) => item !== null);
    nonNullScoredEntries.sort((a, b) => b.score - a.score);
    const topEntries = nonNullScoredEntries.slice(0, 3);
    if (topEntries.length === 0) {
      console.log(`No relevant entries found in "${dataSource.name}" for query: "${query}"`);
      return "";
    }
    console.log(`Found ${topEntries.length} relevant entries in "${dataSource.name}"`);
    return `Relevant knowledge from ${dataSource.name}:

` + topEntries.map((item) => {
      if (item === null) return "";
      return `Question: ${item.entry.question}
Solution: ${item.entry.solution}`;
    }).filter(Boolean).join("\n\n");
  } catch (error) {
    console.error(`Error parsing knowledge base for ${dataSource.name}:`, error);
    return "";
  }
}
async function processUrl(dataSource, query) {
  if (!dataSource.content) {
    return "";
  }
  return `Knowledge source: ${dataSource.name} (URL: ${dataSource.content})`;
}
function processCustomData(dataSource, query) {
  if (!dataSource.content) {
    return "";
  }
  try {
    const customData = JSON.parse(dataSource.content);
    if (Array.isArray(customData)) {
      console.log(`Processing custom data source "${dataSource.name}" with ${customData.length} entries`);
      const keywords = query.split(/\s+/).map((word) => word.toLowerCase().replace(/[^\w\s]/g, "")).filter((word) => word.length > 3);
      if (keywords.length === 0) {
        console.log(`No significant keywords found in query: "${query}"`);
        return "";
      }
      const initialScoredItems = customData.map((item) => {
        const itemText = `${item.question || ""} ${item.answer || ""}`.toLowerCase();
        let score = 0;
        let matchedKeywords = 0;
        keywords.forEach((keyword) => {
          if (itemText.includes(keyword)) {
            score += 1;
            matchedKeywords += 1;
            if ((item.question || "").toLowerCase().includes(keyword)) {
              score += 0.5;
            }
          }
        });
        return matchedKeywords > 0 ? { item, score } : null;
      }).filter(Boolean);
      const nonNullScoredItems = initialScoredItems.filter((item) => item !== null);
      nonNullScoredItems.sort((a, b) => b.score - a.score);
      const topItems = nonNullScoredItems.slice(0, 3);
      if (topItems.length === 0) {
        console.log(`No relevant items found in "${dataSource.name}" for query: "${query}"`);
        return "";
      }
      console.log(`Found ${topItems.length} relevant items in "${dataSource.name}"`);
      return `Relevant information from ${dataSource.name}:

` + topItems.map((scored) => {
        if (scored === null) return "";
        return `Q: ${scored.item.question || ""}
A: ${scored.item.answer || ""}`;
      }).filter(Boolean).join("\n\n");
    } else {
      console.log(`Custom data source "${dataSource.name}" contains non-array data`);
      return `Knowledge from ${dataSource.name}: ${JSON.stringify(customData).slice(0, 200)}${JSON.stringify(customData).length > 200 ? "..." : ""}`;
    }
  } catch (error) {
    console.log(`Custom data source "${dataSource.name}" contains non-JSON data, treating as plain text`);
    return `Information from ${dataSource.name}: ${dataSource.content.slice(0, 200)}${dataSource.content.length > 200 ? "..." : ""}`;
  }
}
async function buildAIContext(query, tenantId) {
  const knowledge = await getKnowledgeForQuery(query, tenantId);
  if (!knowledge) {
    return "";
  }
  return `The following information may be relevant to the user's query:

${knowledge}

Use the above information to provide an accurate and helpful response to the user's query.`;
}
var init_data_source_service = __esm({
  "server/data-source-service.ts"() {
    "use strict";
    init_storage();
  }
});

// server/ai/agents/chat-preprocessor-agent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
var ChatPreprocessorAgent;
var init_chat_preprocessor_agent = __esm({
  "server/ai/agents/chat-preprocessor-agent.ts"() {
    "use strict";
    ChatPreprocessorAgent = class {
      geminiClient = null;
      sessionMemory = /* @__PURE__ */ new Map();
      constructor() {
        this.initializeGemini();
      }
      /**
       * Initialize Gemini API client
       */
      initializeGemini() {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
          this.geminiClient = new GoogleGenerativeAI(apiKey);
        } else {
          console.warn("Chat Preprocessor: No Gemini API key found, using fallback methods");
        }
      }
      /**
       * Main preprocessing method
       */
      async preprocess(message, sessionId, context) {
        console.log(`Chat Preprocessor: Processing message for session ${sessionId}`);
        const normalizedPrompt = await this.normalizeText(message);
        const { maskedText, piiPlaceholders } = this.detectAndMaskPII(normalizedPrompt);
        const urgency = await this.determineUrgency(maskedText);
        const sentiment = await this.analyzeSentiment(maskedText);
        const sessionContext = {
          normalized_prompt: maskedText,
          urgency,
          masked_pii: piiPlaceholders,
          sentiment,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.storeSessionContext(sessionId, sessionContext);
        const result = {
          normalized_prompt: maskedText,
          urgency,
          sentiment,
          masked_pii: piiPlaceholders,
          original_message: message,
          session_id: sessionId
        };
        console.log(`Chat Preprocessor: Completed processing - Urgency: ${urgency}, Sentiment: ${sentiment}, PII masked: ${piiPlaceholders.length}`);
        return result;
      }
      /**
       * Normalize text using Gemini API or fallback methods
       */
      async normalizeText(message) {
        if (this.geminiClient) {
          try {
            const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
            const prompt = `Normalize this message by removing filler words, correcting grammar, and standardizing formatting while preserving the core meaning and intent:

"${message}"

Return only the normalized text without any explanations or quotes.`;
            const result = await model.generateContent(prompt);
            const response2 = await result.response;
            const normalizedText = response2.text().trim();
            return normalizedText || this.fallbackNormalization(message);
          } catch (error) {
            console.error("Chat Preprocessor: Gemini normalization failed:", error);
            return this.fallbackNormalization(message);
          }
        } else {
          return this.fallbackNormalization(message);
        }
      }
      /**
       * Fallback text normalization without API
       */
      fallbackNormalization(message) {
        let normalized = message.trim();
        normalized = normalized.replace(/[!]{2,}/g, "!");
        normalized = normalized.replace(/[?]{2,}/g, "?");
        normalized = normalized.replace(/[.]{3,}/g, "...");
        const fillerWords = ["um", "uh", "like", "you know", "basically", "actually", "literally"];
        const fillerPattern = new RegExp(`\\b(${fillerWords.join("|")})\\b`, "gi");
        normalized = normalized.replace(fillerPattern, "");
        normalized = normalized.replace(/\bpls\b/gi, "please");
        normalized = normalized.replace(/\bu\b/gi, "you");
        normalized = normalized.replace(/\br\b/gi, "are");
        normalized = normalized.replace(/\bur\b/gi, "your");
        normalized = normalized.replace(/\basap\b/gi, "as soon as possible");
        normalized = normalized.replace(/\s+/g, " ").trim();
        normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        return normalized;
      }
      /**
       * Determine urgency using Gemini API or fallback analysis
       */
      async determineUrgency(message) {
        if (this.geminiClient) {
          try {
            const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
            const prompt = `Classify the urgency level of this support message. Consider both explicit urgency indicators and the actual impact described.

Message: "${message}"

Options: CRITICAL, HIGH, MEDIUM, LOW

Guidelines:
- CRITICAL: System down, security breach, data loss, blocking multiple users
- HIGH: Individual user blocked from critical functions, urgent deadline
- MEDIUM: Important feature not working, moderate impact
- LOW: General questions, feature requests, minor issues

Return only the urgency level (CRITICAL, HIGH, MEDIUM, or LOW).`;
            const result = await model.generateContent(prompt);
            const response2 = await result.response;
            const urgencyText = response2.text().trim().toUpperCase();
            const validUrgencies = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
            if (validUrgencies.includes(urgencyText)) {
              return urgencyText;
            }
            return this.fallbackUrgencyAnalysis(message);
          } catch (error) {
            console.error("Chat Preprocessor: Gemini urgency analysis failed:", error);
            return this.fallbackUrgencyAnalysis(message);
          }
        } else {
          return this.fallbackUrgencyAnalysis(message);
        }
      }
      /**
       * Fallback urgency analysis using keyword patterns
       */
      fallbackUrgencyAnalysis(message) {
        const lowerMessage = message.toLowerCase();
        const criticalPatterns = [
          /system.*down/i,
          /server.*down/i,
          /security.*breach/i,
          /data.*lost/i,
          /can't.*access.*anything/i,
          /everything.*broken/i,
          /emergency/i,
          /critical.*error/i,
          /production.*down/i
        ];
        const highPatterns = [
          /urgent/i,
          /asap/i,
          /immediately/i,
          /can't.*work/i,
          /blocked/i,
          /deadline/i,
          /important.*meeting/i,
          /client.*waiting/i,
          /error.*500/i,
          /can't.*login/i,
          /access.*denied/i
        ];
        const lowPatterns = [
          /question/i,
          /how.*do.*i/i,
          /feature.*request/i,
          /suggestion/i,
          /when.*will/i,
          /is.*it.*possible/i,
          /wondering/i,
          /curious/i
        ];
        if (criticalPatterns.some((pattern) => pattern.test(lowerMessage))) {
          return "CRITICAL";
        }
        if (highPatterns.some((pattern) => pattern.test(lowerMessage))) {
          return "HIGH";
        }
        if (lowPatterns.some((pattern) => pattern.test(lowerMessage))) {
          return "LOW";
        }
        return "MEDIUM";
      }
      /**
       * Analyze sentiment using Gemini API or fallback analysis
       */
      async analyzeSentiment(message) {
        if (this.geminiClient) {
          try {
            const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
            const prompt = `Analyze the sentiment of this message:

"${message}"

Return only one word: positive, neutral, or negative`;
            const result = await model.generateContent(prompt);
            const response2 = await result.response;
            const sentimentText = response2.text().trim().toLowerCase();
            const validSentiments = ["positive", "neutral", "negative"];
            if (validSentiments.includes(sentimentText)) {
              return sentimentText;
            }
            return this.fallbackSentimentAnalysis(message);
          } catch (error) {
            console.error("Chat Preprocessor: Gemini sentiment analysis failed:", error);
            return this.fallbackSentimentAnalysis(message);
          }
        } else {
          return this.fallbackSentimentAnalysis(message);
        }
      }
      /**
       * Fallback sentiment analysis using keyword patterns
       */
      fallbackSentimentAnalysis(message) {
        const lowerMessage = message.toLowerCase();
        const positivePatterns = [
          /thanks?/i,
          /appreciate/i,
          /great/i,
          /awesome/i,
          /perfect/i,
          /excellent/i,
          /love/i,
          /happy/i,
          /pleased/i
        ];
        const negativePatterns = [
          /frustrated/i,
          /angry/i,
          /terrible/i,
          /awful/i,
          /hate/i,
          /broken/i,
          /useless/i,
          /disappointed/i,
          /annoyed/i,
          /ridiculous/i,
          /unacceptable/i
        ];
        if (positivePatterns.some((pattern) => pattern.test(lowerMessage))) {
          return "positive";
        }
        if (negativePatterns.some((pattern) => pattern.test(lowerMessage))) {
          return "negative";
        }
        return "neutral";
      }
      /**
       * Detect and mask PII in text
       */
      detectAndMaskPII(text2) {
        let maskedText = text2;
        const piiPlaceholders = [];
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        const emails = text2.match(emailPattern);
        if (emails) {
          emails.forEach((email, index) => {
            const placeholder = `[REDACTED_EMAIL_${index + 1}]`;
            maskedText = maskedText.replace(email, placeholder);
            piiPlaceholders.push(`${placeholder}=${email}`);
          });
        }
        const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
        const phones = text2.match(phonePattern);
        if (phones) {
          phones.forEach((phone, index) => {
            const placeholder = `[REDACTED_PHONE_${index + 1}]`;
            maskedText = maskedText.replace(phone, placeholder);
            piiPlaceholders.push(`${placeholder}=${phone}`);
          });
        }
        const ssnPattern = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g;
        const ssns = text2.match(ssnPattern);
        if (ssns) {
          ssns.forEach((ssn, index) => {
            const placeholder = `[REDACTED_SSN_${index + 1}]`;
            maskedText = maskedText.replace(ssn, placeholder);
            piiPlaceholders.push(`${placeholder}=${ssn}`);
          });
        }
        const ccPattern = /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g;
        const creditCards = text2.match(ccPattern);
        if (creditCards) {
          creditCards.forEach((cc, index) => {
            const placeholder = `[REDACTED_CARD_${index + 1}]`;
            maskedText = maskedText.replace(cc, placeholder);
            piiPlaceholders.push(`${placeholder}=${cc}`);
          });
        }
        return { maskedText, piiPlaceholders };
      }
      /**
       * Store session context in memory
       */
      storeSessionContext(sessionId, context) {
        this.sessionMemory.set(sessionId, context);
        if (this.sessionMemory.size > 1e3) {
          const oldestKey = this.sessionMemory.keys().next().value;
          this.sessionMemory.delete(oldestKey);
        }
      }
      /**
       * Retrieve session context
       */
      getSessionContext(sessionId) {
        return this.sessionMemory.get(sessionId) || null;
      }
      /**
       * Check if agent is available
       */
      isAvailable() {
        return true;
      }
      /**
       * Get agent status and configuration
       */
      getStatus() {
        return {
          name: "ChatPreprocessorAgent",
          available: this.isAvailable(),
          geminiConfigured: !!this.geminiClient,
          sessionCount: this.sessionMemory.size,
          capabilities: [
            "text_normalization",
            "urgency_classification",
            "sentiment_analysis",
            "pii_detection",
            "session_management"
          ]
        };
      }
    };
  }
});

// services/redis_memory_service.ts
var RedisMemoryService, redisMemory;
var init_redis_memory_service = __esm({
  "services/redis_memory_service.ts"() {
    "use strict";
    RedisMemoryService = class {
      memory = /* @__PURE__ */ new Map();
      /**
       * Store session data for an agent workflow
       */
      async setSessionData(sessionId, data) {
        const existing = this.memory.get(sessionId) || {};
        const updated = {
          ...existing,
          ...data,
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          created_at: existing.created_at || (/* @__PURE__ */ new Date()).toISOString()
        };
        this.memory.set(sessionId, updated);
        console.log(`RedisMemory: Updated session ${sessionId} with keys: ${Object.keys(data).join(", ")}`);
      }
      /**
       * Get session data for an agent workflow
       */
      async getSessionData(sessionId) {
        const data = this.memory.get(sessionId);
        if (data) {
          console.log(`RedisMemory: Retrieved session ${sessionId} with keys: ${Object.keys(data).join(", ")}`);
        }
        return data || null;
      }
      /**
       * Update specific field in session data
       */
      async updateSessionField(sessionId, field, value) {
        const existing = this.memory.get(sessionId) || {};
        existing[field] = value;
        existing.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        this.memory.set(sessionId, existing);
        console.log(`RedisMemory: Updated ${field} for session ${sessionId}`);
      }
      /**
       * Clear session data
       */
      async clearSession(sessionId) {
        this.memory.delete(sessionId);
        console.log(`RedisMemory: Cleared session ${sessionId}`);
      }
      /**
       * Get all active sessions (for debugging)
       */
      async getActiveSessions() {
        return Array.from(this.memory.keys());
      }
    };
    redisMemory = new RedisMemoryService();
  }
});

// server/ai/agents/ticket-lookup-agent.ts
import axios from "axios";
var TicketLookupAgent, ticketLookupAgent;
var init_ticket_lookup_agent = __esm({
  "server/ai/agents/ticket-lookup-agent.ts"() {
    "use strict";
    init_redis_memory_service();
    TicketLookupAgent = class {
      mcpServiceUrl = "http://localhost:8000";
      constructor() {
        console.log("TicketLookupAgent: Initialized for MCP FastAPI service");
      }
      /**
       * Main lookup method - searches MCP FastAPI for similar tickets
       */
      async lookupSimilarTickets(input) {
        const startTime = Date.now();
        try {
          console.log(`TicketLookupAgent: Looking up similar tickets for: "${input.normalizedPrompt}"`);
          const sessionData = await redisMemory.getSessionData(input.sessionId);
          const response2 = await axios.post(`${this.mcpServiceUrl}/tickets/similar/`, {
            query: input.normalizedPrompt,
            tenant_id: input.tenantId || 1,
            top_k: input.topK || 3,
            urgency: input.urgency,
            sentiment: input.sentiment
          }, {
            timeout: 1e4,
            headers: {
              "Content-Type": "application/json"
            }
          });
          const results = response2.data;
          const tickets2 = results.similar_tickets?.map((ticket) => ({
            ticket_id: ticket.id || ticket.ticket_id,
            similarity_score: ticket.similarity_score || ticket.score || 0,
            resolution_excerpt: ticket.resolution_excerpt || ticket.resolution?.substring(0, 200) + "..." || "No resolution available",
            title: ticket.title || "Untitled",
            category: ticket.category || "General",
            status: ticket.status || "Unknown",
            metadata: ticket.metadata || {}
          })) || [];
          await redisMemory.updateSessionField(input.sessionId, "ticket_hits", tickets2);
          const processingTime = Date.now() - startTime;
          console.log(`TicketLookupAgent: Found ${tickets2.length} similar tickets via MCP FastAPI in ${processingTime}ms`);
          return {
            success: true,
            tickets: tickets2,
            searchQuery: input.normalizedPrompt,
            totalFound: tickets2.length,
            searchMethod: "mcp_fastapi",
            processing_time_ms: processingTime
          };
        } catch (error) {
          const processingTime = Date.now() - startTime;
          console.error("TicketLookupAgent: MCP FastAPI lookup failed:", error.message);
          return {
            success: false,
            tickets: [],
            searchQuery: input.normalizedPrompt,
            totalFound: 0,
            searchMethod: "mcp_fastapi",
            processing_time_ms: processingTime,
            error: `MCP FastAPI service unavailable: ${error.message}`
          };
        }
      }
      /**
       * Get ticket details by ID from MCP FastAPI
       */
      async getTicketById(ticketId, tenantId = 1) {
        try {
          const response2 = await axios.get(`${this.mcpServiceUrl}/tickets/${ticketId}`, {
            params: { tenant_id: tenantId },
            timeout: 5e3
          });
          return response2.data;
        } catch (error) {
          console.error(`TicketLookupAgent: Failed to get ticket ${ticketId}:`, error.message);
          return null;
        }
      }
      /**
       * Status check for the agent
       */
      async getStatus() {
        try {
          const response2 = await axios.get(`${this.mcpServiceUrl}/health`, { timeout: 2e3 });
          return {
            name: "TicketLookupAgent",
            available: true,
            mcp_fastapi_connected: response2.status === 200,
            ticket_count: response2.data?.ticket_count || 0,
            capabilities: ["mcp_fastapi_search", "redis_memory", "ticket_similarity"],
            service_url: this.mcpServiceUrl
          };
        } catch (error) {
          return {
            name: "TicketLookupAgent",
            available: false,
            mcp_fastapi_connected: false,
            ticket_count: 0,
            capabilities: ["redis_memory"],
            service_url: this.mcpServiceUrl,
            error: "MCP FastAPI service not available - THIS IS REQUIRED"
          };
        }
      }
    };
    ticketLookupAgent = new TicketLookupAgent();
  }
});

// server/ai/agents/ticket-formatter-agent.ts
import { GoogleGenerativeAI as GoogleGenerativeAI2 } from "@google/generative-ai";
var TicketFormatterAgent;
var init_ticket_formatter_agent = __esm({
  "server/ai/agents/ticket-formatter-agent.ts"() {
    "use strict";
    TicketFormatterAgent = class {
      genAI = null;
      defaultTemplate;
      templates;
      constructor() {
        this.initializeGoogleAI();
        this.initializeTemplates();
      }
      initializeGoogleAI() {
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (googleApiKey) {
          this.genAI = new GoogleGenerativeAI2(googleApiKey);
          console.log("TicketFormatterAgent: Google AI initialized for template processing");
        } else {
          console.warn("TicketFormatterAgent: GOOGLE_API_KEY not available");
        }
      }
      initializeTemplates() {
        this.defaultTemplate = `Ticket #{id} \u2022 {subject}

Dear {customer_name},

We have reviewed your request and are pleased to provide you with a solution. Below are the steps to resolve your issue:

{steps}

{additional_notes}

If you need further assistance or have any questions, please don't hesitate to reply to this email or contact our support team.

Thank you for choosing our services.

Best regards,
Support Team`;
        this.templates = {
          "standard": this.defaultTemplate,
          "urgent": `URGENT - Ticket #{id} \u2022 {subject}

Dear {customer_name},

We understand the urgency of your request and have prioritized your case. Please follow these immediate steps:

{steps}

{additional_notes}

Our team is monitoring this ticket closely. If these steps don't resolve the issue, please contact us immediately.

Urgent Support Team`,
          "billing": `Ticket #{id} \u2022 Billing: {subject}

Dear {customer_name},

Thank you for contacting our billing department. We have reviewed your account and provided the following resolution:

{steps}

{additional_notes}

For any billing-related questions, please contact our billing team directly.

Best regards,
Billing Support Team`,
          "technical": `Ticket #{id} \u2022 Technical Support: {subject}

Dear {customer_name},

Our technical team has analyzed your issue. Please follow these technical steps:

{steps}

{additional_notes}

If you encounter any difficulties during these steps, please provide the error messages and we'll assist further.

Technical Support Team`,
          "simple": `Ticket #{id}

Hello {customer_name},

Here's how to resolve your issue:

{steps}

{additional_notes}

Thanks,
Support Team`
        };
      }
      selectTemplate(input) {
        if (input.urgency === "CRITICAL" || input.urgency === "HIGH") {
          return this.templates["urgent"];
        }
        if (input.category === "billing") {
          return this.templates["billing"];
        }
        if (input.category === "technical") {
          return this.templates["technical"];
        }
        return this.templates["standard"];
      }
      formatSteps(steps) {
        if (steps.includes("1.") || steps.includes("\u2022") || steps.includes("-")) {
          return steps;
        }
        const stepArray = steps.split(/[.\n]/).filter((step) => step.trim().length > 0);
        if (stepArray.length <= 1) {
          return steps;
        }
        return stepArray.map((step, index) => `${index + 1}. ${step.trim()}`).join("\n");
      }
      async enhanceWithAI(template, input) {
        if (!this.genAI) {
          return this.applyBasicTemplate(template, input);
        }
        try {
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Please enhance this customer support ticket template while maintaining professionalism:

Template: ${template}

Input Data:
- Ticket ID: ${input.id}
- Subject: ${input.subject}
- Steps: ${input.steps}
- Category: ${input.category || "general"}
- Urgency: ${input.urgency || "normal"}
- Customer Name: ${input.customer_name || "Customer"}

Requirements:
1. Keep the professional tone
2. Ensure all placeholder values are properly substituted
3. Format the steps clearly
4. Make the language helpful and reassuring
5. Keep it concise but complete

Return only the final formatted ticket content.`;
          const result = await model.generateContent(prompt);
          const response2 = await result.response;
          return response2.text().trim();
        } catch (error) {
          console.error("TicketFormatterAgent: AI enhancement failed, using basic template:", error);
          return this.applyBasicTemplate(template, input);
        }
      }
      applyBasicTemplate(template, input) {
        let formatted = template;
        formatted = formatted.replace(/{id}/g, input.id.toString());
        formatted = formatted.replace(/{subject}/g, input.subject);
        formatted = formatted.replace(/{steps}/g, this.formatSteps(input.steps));
        formatted = formatted.replace(/{customer_name}/g, input.customer_name || "Customer");
        formatted = formatted.replace(/{additional_notes}/g, input.additional_notes || "");
        formatted = formatted.replace(/\n\s*\n\s*\n/g, "\n\n");
        return formatted.trim();
      }
      async formatTicket(input) {
        const startTime = Date.now();
        console.log(`TicketFormatterAgent: Formatting ticket #${input.id} - ${input.subject.substring(0, 30)}...`);
        try {
          const template = this.selectTemplate(input);
          const templateName = this.getTemplateName(template);
          console.log(`TicketFormatterAgent: Using ${templateName} template`);
          const formattedTicket = await this.enhanceWithAI(template, input);
          const processingTime = Date.now() - startTime;
          console.log(`TicketFormatterAgent: Completed formatting in ${processingTime}ms`);
          return {
            success: true,
            formatted_ticket: formattedTicket,
            ticket_id: input.id,
            subject: input.subject,
            template_used: templateName,
            processing_time_ms: processingTime
          };
        } catch (error) {
          const processingTime = Date.now() - startTime;
          console.error("TicketFormatterAgent: Formatting failed:", error);
          return {
            success: false,
            formatted_ticket: "",
            ticket_id: input.id,
            subject: input.subject,
            template_used: "error",
            processing_time_ms: processingTime,
            error: error instanceof Error ? error.message : "Unknown formatting error"
          };
        }
      }
      getTemplateName(template) {
        for (const [name, tmpl] of Object.entries(this.templates)) {
          if (tmpl === template) {
            return name;
          }
        }
        return "custom";
      }
      getStatus() {
        return {
          name: "TicketFormatterAgent",
          available: true,
          google_ai_configured: this.genAI !== null,
          template_formats: Object.keys(this.templates),
          capabilities: [
            "Professional ticket formatting",
            "Multi-template support",
            "AI-enhanced content generation",
            "Step formatting and organization",
            "Context-aware template selection"
          ]
        };
      }
      getAvailableTemplates() {
        return Object.keys(this.templates);
      }
      async testFormatting() {
        const testInput = {
          id: 12345,
          subject: "VPN connectivity issue",
          steps: "1. Restart your router\n2. Reinstall the VPN client\n3. Update VPN server address to vpn.example.com",
          category: "technical",
          urgency: "MEDIUM",
          customer_name: "John Smith",
          additional_notes: "This issue has been escalated from Level 1 support."
        };
        return await this.formatTicket(testInput);
      }
    };
  }
});

// server/ai/agents/instruction-lookup-agent.ts
import { GoogleGenerativeAI as GoogleGenerativeAI3 } from "@google/generative-ai";
import axios2 from "axios";
var InstructionLookupAgent, instructionLookupAgent;
var init_instruction_lookup_agent = __esm({
  "server/ai/agents/instruction-lookup-agent.ts"() {
    "use strict";
    init_redis_memory_service();
    InstructionLookupAgent = class {
      genAI = null;
      chromaServiceUrl = "http://localhost:8000";
      constructor() {
        this.initializeGemini();
      }
      initializeGemini() {
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (googleApiKey) {
          this.genAI = new GoogleGenerativeAI3(googleApiKey);
          console.log("InstructionLookupAgent: Google AI initialized for ChromaDB embeddings");
        } else {
          console.warn("InstructionLookupAgent: GOOGLE_API_KEY not available");
        }
      }
      /**
       * Main lookup method - searches ChromaDB for relevant instructions
       */
      async lookupInstructions(input) {
        const startTime = Date.now();
        try {
          console.log(`InstructionLookupAgent: Looking up instructions for: "${input.normalizedPrompt}"`);
          await redisMemory.setSessionData(input.sessionId, {
            normalized_prompt: input.normalizedPrompt,
            urgency: input.urgency,
            sentiment: input.sentiment
          });
          const response2 = await axios2.post("http://localhost:3001/api/chromadb/search-instructions", {
            query: input.normalizedPrompt,
            top_k: input.topK || 3,
            collection: "instruction_texts"
          }, {
            timeout: 1e4,
            headers: {
              "Content-Type": "application/json"
            }
          });
          const results = response2.data;
          const instructions = results.results?.map((result) => ({
            filename: result.metadata?.filename || "Unknown",
            text_excerpt: result.text?.substring(0, 200) + "..." || "No content",
            score: result.score || 0,
            metadata: result.metadata || {}
          })) || [];
          await redisMemory.updateSessionField(input.sessionId, "instruction_hits", instructions);
          const processingTime = Date.now() - startTime;
          console.log(`InstructionLookupAgent: Found ${instructions.length} instructions via ChromaDB in ${processingTime}ms`);
          return {
            success: true,
            instructions,
            searchQuery: input.normalizedPrompt,
            totalFound: instructions.length,
            searchMethod: "chromadb",
            processing_time_ms: processingTime
          };
        } catch (error) {
          const processingTime = Date.now() - startTime;
          console.error("InstructionLookupAgent: ChromaDB lookup failed:", error.message);
          return this.fallbackToLocalChromaDB(input, processingTime);
        }
      }
      /**
       * Fallback to direct Python ChromaDB service
       */
      async fallbackToLocalChromaDB(input, baseProcessingTime) {
        try {
          const response2 = await axios2.post("http://localhost:8001/chromadb/instructions/search", {
            query: input.normalizedPrompt,
            top_k: input.topK || 3
          }, {
            timeout: 5e3
          });
          const results = response2.data;
          const instructions = results.instructions?.map((inst) => ({
            filename: inst.filename || "instruction.txt",
            text_excerpt: inst.text_excerpt || inst.text?.substring(0, 200) + "..." || "No content",
            score: inst.score || 0,
            metadata: inst.metadata || {}
          })) || [];
          await redisMemory.updateSessionField(input.sessionId, "instruction_hits", instructions);
          const totalProcessingTime = baseProcessingTime + (Date.now() - Date.now());
          console.log(`InstructionLookupAgent: Fallback found ${instructions.length} instructions`);
          return {
            success: true,
            instructions,
            searchQuery: input.normalizedPrompt,
            totalFound: instructions.length,
            searchMethod: "chromadb",
            processing_time_ms: totalProcessingTime
          };
        } catch (fallbackError) {
          console.error("InstructionLookupAgent: All ChromaDB methods failed:", fallbackError.message);
          return {
            success: false,
            instructions: [],
            searchQuery: input.normalizedPrompt,
            totalFound: 0,
            searchMethod: "chromadb",
            processing_time_ms: baseProcessingTime + 50,
            error: "ChromaDB service unavailable"
          };
        }
      }
      /**
       * Status check for the agent
       */
      async getStatus() {
        try {
          const response2 = await axios2.get("http://localhost:3001/api/chromadb/status", { timeout: 2e3 });
          return {
            name: "InstructionLookupAgent",
            available: true,
            chromadb_connected: response2.status === 200,
            google_ai_configured: this.genAI !== null,
            instruction_count: response2.data?.instruction_texts?.count || 0,
            capabilities: ["chromadb_search", "redis_memory", "gemini_embeddings"]
          };
        } catch (error) {
          return {
            name: "InstructionLookupAgent",
            available: false,
            chromadb_connected: false,
            google_ai_configured: this.genAI !== null,
            instruction_count: 0,
            capabilities: ["redis_memory"],
            error: "ChromaDB service not available"
          };
        }
      }
    };
    instructionLookupAgent = new InstructionLookupAgent();
  }
});

// server/ai/agents/support-team-orchestrator.ts
import { GoogleGenerativeAI as GoogleGenerativeAI4 } from "@google/generative-ai";
var SupportTeamOrchestrator, supportTeamOrchestrator;
var init_support_team_orchestrator = __esm({
  "server/ai/agents/support-team-orchestrator.ts"() {
    "use strict";
    init_chat_preprocessor_agent();
    init_instruction_lookup_agent();
    init_ticket_lookup_agent();
    init_ticket_formatter_agent();
    SupportTeamOrchestrator = class {
      genAI = null;
      preprocessorAgent;
      instructionLookupAgent;
      ticketLookupAgent;
      formatterAgent;
      constructor() {
        this.initializeGoogleAI();
        this.initializeSubAgents();
      }
      initializeGoogleAI() {
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (googleApiKey) {
          this.genAI = new GoogleGenerativeAI4(googleApiKey);
          console.log("SupportTeamOrchestrator: Google AI initialized for solution generation");
        } else {
          console.warn("SupportTeamOrchestrator: GOOGLE_API_KEY not available");
        }
      }
      initializeSubAgents() {
        this.preprocessorAgent = new ChatPreprocessorAgent();
        this.instructionLookupAgent = new InstructionLookupAgent();
        this.ticketLookupAgent = new TicketLookupAgent();
        this.formatterAgent = new TicketFormatterAgent();
        console.log("SupportTeamOrchestrator: All sub-agents initialized");
      }
      /**
       * Main workflow method (legacy) - redirects to processUserMessage
       */
      async processUserRequest(input) {
        return await this.processUserMessage(input);
      }
      /**
       * Updated workflow method - processes user message through all five agent stages
       */
      async processUserMessage(input) {
        const startTime = Date.now();
        const sessionId = input.session_id || `session_${Date.now()}`;
        console.log(`SupportTeamOrchestrator: Starting workflow for session ${sessionId}`);
        console.log(`SupportTeamOrchestrator: User message: "${input.user_message.substring(0, 50)}..."`);
        try {
          const processingSteps = {};
          console.log("SupportTeamOrchestrator: Step 1 - Running ChatProcessorAgent");
          const preprocessResult = await this.preprocessorAgent.processMessage({
            userMessage: input.user_message,
            sessionId,
            userContext: input.user_context
          });
          if (!preprocessResult.success) {
            throw new Error(`Preprocessing failed: ${preprocessResult.error}`);
          }
          processingSteps.preprocessing = preprocessResult;
          console.log("SupportTeamOrchestrator: Step 2 - Running InstructionLookupAgent");
          const instructionResult = await this.instructionLookupAgent.lookupInstructions({
            normalizedPrompt: preprocessResult.normalizedPrompt,
            urgency: preprocessResult.urgency,
            sentiment: preprocessResult.sentiment,
            sessionId,
            topK: 3
          });
          processingSteps.instruction_lookup = instructionResult;
          console.log("SupportTeamOrchestrator: Step 3 - Running TicketLookupAgent");
          const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets({
            normalizedPrompt: preprocessResult.normalizedPrompt,
            urgency: preprocessResult.urgency,
            sentiment: preprocessResult.sentiment,
            sessionId,
            tenantId: input.tenant_id || 1,
            topK: 3
          });
          processingSteps.ticket_lookup = ticketResult;
          console.log("SupportTeamOrchestrator: Step 4 - Generating solution steps");
          const solutionResult = await this.generateSolutionSteps(
            preprocessResult.normalizedPrompt,
            instructionResult.instructions || [],
            ticketResult.tickets || [],
            preprocessResult.urgency
          );
          processingSteps.solution_generation = {
            success: true,
            steps: solutionResult.steps,
            confidence_score: solutionResult.confidence,
            processing_time_ms: Date.now() - startTime
          };
          console.log("SupportTeamOrchestrator: Step 5 - Running TicketFormatterAgent");
          const ticketId = Math.floor(Math.random() * 9e4) + 1e4;
          const subject = this.extractSubject(input.user_message);
          const formatResult = await this.formatterAgent.formatTicket({
            id: ticketId,
            subject,
            steps: solutionResult.steps.join("\n"),
            category: solutionResult.category,
            urgency: preprocessResult.urgency,
            customer_name: "Customer",
            additional_notes: `Confidence: ${(solutionResult.confidence * 100).toFixed(1)}%`
          });
          if (!formatResult.success) {
            throw new Error(`Formatting failed: ${formatResult.error}`);
          }
          processingSteps.formatting = formatResult;
          const totalTime = Date.now() - startTime;
          console.log(`SupportTeamOrchestrator: Workflow completed successfully in ${totalTime}ms`);
          console.log(`SupportTeamOrchestrator: Generated ticket #${ticketId} with ${solutionResult.confidence * 100}% confidence`);
          return {
            success: true,
            ticket_id: ticketId,
            formatted_ticket: formatResult.formatted_ticket,
            processing_steps: processingSteps,
            total_processing_time_ms: totalTime,
            confidence_score: solutionResult.confidence
          };
        } catch (error) {
          const totalTime = Date.now() - startTime;
          console.error("SupportTeamOrchestrator: Workflow failed:", error);
          return {
            success: false,
            ticket_id: 0,
            formatted_ticket: "",
            processing_steps: {
              preprocessing: {},
              instruction_lookup: {},
              ticket_lookup: {},
              solution_generation: {},
              formatting: {}
            },
            total_processing_time_ms: totalTime,
            confidence_score: 0,
            error: error instanceof Error ? error.message : "Unknown orchestration error"
          };
        }
      }
      extractSubject(userMessage) {
        const words = userMessage.split(" ").filter((word) => word.length > 0);
        const stopWords = ["i", "am", "is", "are", "the", "a", "an", "and", "or", "but"];
        const meaningfulWords = words.filter(
          (word) => !stopWords.includes(word.toLowerCase()) && word.length > 2
        );
        const subjectWords = meaningfulWords.slice(0, 4);
        return subjectWords.join(" ") || words.slice(0, 5).join(" ");
      }
      async generateSolutionSteps(processedMessage, instructions, similarTickets, urgency) {
        if (!this.genAI) {
          return this.generateFallbackSolution(instructions, similarTickets);
        }
        try {
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          let instructionContext = "";
          if (instructions.length > 0) {
            instructionContext = "\n\nRELEVANT SUPPORT INSTRUCTIONS:\n" + instructions.map(
              (inst, idx) => `${idx + 1}. From ${inst.filename || "Support Guide"} (Score: ${inst.score?.toFixed(2) || "N/A"}):
${inst.text}`
            ).join("\n\n");
          }
          let historicalContext = "";
          if (similarTickets.length > 0) {
            historicalContext = "\n\nSIMILAR PAST RESOLUTIONS:\n" + similarTickets.map(
              (ticket, idx) => `${idx + 1}. Ticket #${ticket.ticket_id} (Similarity: ${ticket.similarity_score?.toFixed(2) || "N/A"}):
${ticket.resolution_excerpt || ticket.title || "No resolution available"}`
            ).join("\n\n");
          }
          const prompt = `You are a support specialist helping quality analysts and software testers who have discovered issues. Based on the user's issue and available context, provide practical, non-technical recommendations.

USER ISSUE: ${processedMessage}

${instructionContext}

${historicalContext}

FORMAT YOUR RESPONSE FOR MAXIMUM READABILITY:
- Use numbered lists for sequential steps (Step 1:, Step 2:, etc.)
- Use bullet points for lists of options or requirements
- Break complex information into clear paragraphs
- Highlight important warnings or notes

REQUIREMENTS FOR QA/TESTER AUDIENCE:
1. User is a QA analyst/tester who found this issue
2. Provide simple, non-technical workarounds or information gathering steps
3. Don't provide code solutions or technical implementations
4. Keep recommendations practical and easy to follow
5. Focus on ticket resolution rather than complex troubleshooting
6. Use the context above to inform your recommendations
7. If no simple workaround exists, recommend escalation to development team

Please provide practical, non-technical resolution steps suitable for QA analysts:`;
          const result = await model.generateContent(prompt);
          const response2 = await result.response;
          const stepsText = response2.text().trim();
          const steps = stepsText.split("\n").filter((line) => line.trim().length > 0);
          let confidence = 0.5;
          if (instructions.length > 0) confidence += 0.2;
          if (similarTickets.length > 0) confidence += 0.2;
          if (instructions.length > 1 && similarTickets.length > 1) confidence += 0.1;
          const category = this.categorizeMessage(processedMessage);
          return { steps, confidence: Math.min(confidence, 1), category };
        } catch (error) {
          console.error("SupportTeamOrchestrator: AI solution generation failed:", error);
          return this.generateFallbackSolution(instructions, similarTickets);
        }
      }
      generateFallbackSolution(instructions, similarTickets) {
        let steps = "Based on similar issues, here are the recommended steps:\n\n";
        if (similarTickets.length > 0) {
          const bestTicket = similarTickets[0];
          steps += `1. Review the resolution from similar case #${bestTicket.ticket_id}:
   ${bestTicket.resolution || bestTicket.title || "Contact support for specific guidance"}

`;
        }
        if (instructions.length > 0) {
          steps += "2. Refer to the relevant support documentation for detailed guidance\n\n";
        }
        steps += "3. If the issue persists, please contact our support team with:\n";
        steps += "   - Details of steps already attempted\n";
        steps += "   - Any error messages encountered\n";
        steps += "   - Your system configuration details";
        return {
          steps: steps.split("\n").filter((line) => line.trim().length > 0),
          confidence: similarTickets.length > 0 ? 0.6 : 0.4,
          category: "General"
        };
      }
      async processUserMessage(input) {
        const startTime = Date.now();
        const sessionId = input.session_id || `session_${Date.now()}`;
        console.log(`SupportTeamOrchestrator: Starting workflow for session ${sessionId}`);
        console.log(`SupportTeamOrchestrator: User message: "${input.user_message.substring(0, 50)}..."`);
        try {
          const processingSteps = {};
          console.log("SupportTeamOrchestrator: Step 1 - Running ChatProcessorAgent");
          const preprocessResult = await this.preprocessorAgent.processMessage({
            userMessage: input.user_message,
            sessionId,
            userContext: input.user_context
          });
          if (!preprocessResult.success) {
            throw new Error(`Preprocessing failed: ${preprocessResult.error}`);
          }
          processingSteps.preprocessing = preprocessResult;
          console.log("SupportTeamOrchestrator: Step 2 - Running InstructionLookupAgent");
          const instructionResult = await this.instructionLookupAgent.lookupInstructions({
            normalizedPrompt: preprocessResult.normalizedPrompt,
            urgency: preprocessResult.urgency,
            sentiment: preprocessResult.sentiment,
            sessionId,
            topK: 3
          });
          processingSteps.instruction_lookup = instructionResult;
          console.log("SupportTeamOrchestrator: Step 3 - Running TicketLookupAgent");
          const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets({
            normalizedPrompt: preprocessResult.normalizedPrompt,
            urgency: preprocessResult.urgency,
            sentiment: preprocessResult.sentiment,
            sessionId,
            tenantId: input.tenant_id || 1,
            topK: 3
          });
          processingSteps.ticket_lookup = ticketResult;
          console.log("SupportTeamOrchestrator: Step 4 - Generating solution steps");
          const solutionResult = await this.generateSolutionSteps(
            preprocessResult.normalizedPrompt,
            instructionResult.instructions || [],
            ticketResult.tickets || [],
            preprocessResult.urgency
          );
          processingSteps.solution_generation = {
            success: true,
            steps: solutionResult.steps,
            confidence_score: solutionResult.confidence,
            processing_time_ms: Date.now() - startTime
          };
          console.log("SupportTeamOrchestrator: Step 5 - Running TicketFormatterAgent");
          const ticketId = Math.floor(Math.random() * 9e4) + 1e4;
          const subject = this.extractSubject(input.user_message);
          const formatResult = await this.formatterAgent.formatTicket({
            id: ticketId,
            subject,
            steps: solutionResult.steps.join("\n"),
            category: solutionResult.category,
            urgency: preprocessResult.urgency,
            customer_name: "Customer",
            additional_notes: `Confidence: ${(solutionResult.confidence * 100).toFixed(1)}%`
          });
          if (!formatResult.success) {
            throw new Error(`Formatting failed: ${formatResult.error}`);
          }
          processingSteps.formatting = formatResult;
          const totalTime = Date.now() - startTime;
          console.log(`SupportTeamOrchestrator: Workflow completed successfully in ${totalTime}ms`);
          console.log(`SupportTeamOrchestrator: Generated ticket #${ticketId} with ${solutionResult.confidence * 100}% confidence`);
          return {
            success: true,
            ticket_id: ticketId,
            formatted_ticket: formatResult.formatted_ticket,
            processing_steps: processingSteps,
            total_processing_time_ms: totalTime,
            confidence_score: solutionResult.confidence
          };
        } catch (error) {
          const totalTime = Date.now() - startTime;
          console.error("SupportTeamOrchestrator: Workflow failed:", error);
          return {
            success: false,
            ticket_id: 0,
            formatted_ticket: "",
            processing_steps: {
              preprocessing: {},
              instruction_lookup: {},
              ticket_lookup: {},
              solution_generation: {},
              formatting: {}
            },
            total_processing_time_ms: totalTime,
            confidence_score: 0,
            error: error instanceof Error ? error.message : "Unknown orchestration error"
          };
        }
      }
      categorizeMessage(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("billing") || lowerMessage.includes("payment") || lowerMessage.includes("invoice")) {
          return "billing";
        }
        if (lowerMessage.includes("vpn") || lowerMessage.includes("connection") || lowerMessage.includes("network")) {
          return "technical";
        }
        if (lowerMessage.includes("account") || lowerMessage.includes("login") || lowerMessage.includes("password")) {
          return "account";
        }
        return "general";
      }
      getStatus() {
        return {
          name: "SupportTeamOrchestrator",
          available: true,
          sub_agents_status: {
            preprocessor: true,
            instruction_lookup: true,
            ticket_lookup: true,
            formatter: true
          },
          llm_configured: this.genAI !== null,
          capabilities: [
            "Complete workflow orchestration",
            "Multi-agent coordination",
            "Session memory management",
            "Context-aware solution generation",
            "Professional ticket formatting",
            "Error handling and recovery"
          ]
        };
      }
      clearSession(sessionId) {
        console.log(`SupportTeamOrchestrator: Session ${sessionId} cleared (delegated to RedisMemory)`);
      }
      async testWorkflow() {
        const testInput = {
          user_message: "I need help with VPN connectivity issues, my credentials aren't working and it's urgent",
          session_id: `test_${Date.now()}`,
          user_context: {
            url: "https://example.com/support",
            title: "Support Request",
            userAgent: "Test Browser"
          },
          tenant_id: 1,
          user_id: "test_user"
        };
        return await this.processUserMessage(testInput);
      }
    };
    supportTeamOrchestrator = new SupportTeamOrchestrator();
  }
});

// server/ai/agent-service.ts
import axios3 from "axios";
var AgentService, agentService, agent_service_default;
var init_agent_service = __esm({
  "server/ai/agent-service.ts"() {
    "use strict";
    init_chat_preprocessor_agent();
    init_ticket_lookup_agent();
    init_ticket_formatter_agent();
    init_support_team_orchestrator();
    AgentService = class {
      baseUrl;
      timeout;
      preprocessorAgent;
      ticketLookupAgent;
      ticketFormatterAgent;
      orchestrator;
      constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.timeout = config.timeout || 3e4;
        this.preprocessorAgent = new ChatPreprocessorAgent();
        this.ticketLookupAgent = new TicketLookupAgent();
        this.ticketFormatterAgent = new TicketFormatterAgent();
        this.orchestrator = new SupportTeamOrchestrator();
      }
      /**
       * Main workflow endpoint - processes user message and returns complete ticket
       */
      async processWorkflow(request) {
        try {
          console.log("AgentService: Processing workflow request:", request.user_message?.substring(0, 50) + "...");
          const orchestratorInput = {
            user_message: request.user_message,
            session_id: `${request.user_id || "anon"}_${Date.now()}`,
            user_context: request.user_context,
            tenant_id: request.tenant_id,
            user_id: request.user_id
          };
          const result = await this.orchestrator.processUserMessage(orchestratorInput);
          if (result.success) {
            const steps = this.extractStepsFromTicket(result.formatted_ticket);
            return {
              success: true,
              ticket_id: result.ticket_id,
              ticket_title: this.extractTitleFromTicket(result.formatted_ticket),
              status: "resolved",
              category: result.processing_steps.preprocessing?.category || "general",
              urgency: result.processing_steps.preprocessing?.urgency_level || "medium",
              resolution_steps: steps,
              resolution_steps_count: steps.length,
              confidence_score: result.confidence_score,
              processing_time_ms: result.total_processing_time_ms,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              source: "support_team_orchestrator"
            };
          } else {
            return {
              success: false,
              ticket_title: "Processing failed",
              status: "error",
              category: "system",
              urgency: "medium",
              resolution_steps: ["Unable to process request: " + (result.error || "Unknown error")],
              resolution_steps_count: 1,
              confidence_score: 0,
              processing_time_ms: result.total_processing_time_ms,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              source: "support_team_orchestrator",
              error: result.error
            };
          }
        } catch (error) {
          console.error("AgentService: Workflow processing failed:", error);
          return {
            success: false,
            ticket_title: "Error processing request",
            status: "error",
            category: "system",
            urgency: "medium",
            resolution_steps: ["An error occurred while processing the request"],
            resolution_steps_count: 1,
            confidence_score: 0,
            processing_time_ms: 0,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            source: "agent_service_error",
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      extractStepsFromTicket(formattedTicket) {
        const lines = formattedTicket.split("\n");
        const steps = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (/^\d+\.\s/.test(trimmed) || /^•\s/.test(trimmed) || /^-\s/.test(trimmed)) {
            const step = trimmed.replace(/^\d+\.\s/, "").replace(/^[•-]\s/, "").trim();
            if (step.length > 0) {
              steps.push(step);
            }
          }
        }
        if (steps.length === 0) {
          steps.push("Please review the detailed instructions provided in your ticket");
        }
        return steps;
      }
      extractTitleFromTicket(formattedTicket) {
        const lines = formattedTicket.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.includes("Ticket #") && trimmed.includes("\u2022")) {
            const titlePart = trimmed.split("\u2022")[1]?.trim();
            if (titlePart) {
              return titlePart;
            }
          }
        }
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 5 && !trimmed.toLowerCase().includes("dear customer")) {
            return trimmed.substring(0, 50);
          }
        }
        return "Support Request";
      }
      /**
       * Classify a ticket (replacement for direct OpenAI classifyTicket calls)
       */
      async classifyTicket(request) {
        try {
          console.log(`Agent Service: Classifying ticket - ${request.title.substring(0, 30)}...`);
          const response2 = await axios3.post(
            `${this.baseUrl}/classify`,
            request,
            {
              timeout: this.timeout,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
          console.log(`Agent Service: Classification result - Category: ${response2.data.category}, Complexity: ${response2.data.complexity}`);
          return response2.data;
        } catch (error) {
          console.error("Agent Service: Classification failed:", error);
          const fallbackClassification = {
            category: "other",
            complexity: "medium",
            assignedTo: "support",
            canAutoResolve: false,
            aiNotes: "Classification failed - assigned to support team for manual review"
          };
          if (axios3.isAxiosError(error) && error.code !== "ECONNREFUSED") {
            console.log("Agent Service: Using fallback classification due to service error");
            return fallbackClassification;
          }
          throw new Error("Agent service is not available for ticket classification");
        }
      }
      /**
       * Attempt to auto-resolve a ticket (replacement for direct OpenAI attemptAutoResolve calls)
       */
      async attemptAutoResolve(request) {
        try {
          console.log(`Agent Service: Attempting auto-resolve for - ${request.title.substring(0, 30)}...`);
          const response2 = await axios3.post(
            `${this.baseUrl}/auto-resolve`,
            request,
            {
              timeout: this.timeout,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
          console.log(`Agent Service: Auto-resolve result - Resolved: ${response2.data.resolved}`);
          return response2.data;
        } catch (error) {
          console.error("Agent Service: Auto-resolve failed:", error);
          const fallbackResponse = {
            resolved: false,
            response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
          };
          if (axios3.isAxiosError(error) && error.code !== "ECONNREFUSED") {
            console.log("Agent Service: Using fallback response due to service error");
            return fallbackResponse;
          }
          throw new Error("Agent service is not available for auto-resolution");
        }
      }
      /**
       * Generate a chat response (replacement for direct OpenAI generateChatResponse calls)
       */
      async generateChatResponse(request) {
        try {
          console.log(`Agent Service: Generating chat response for message: ${request.userMessage.substring(0, 30)}...`);
          const response2 = await axios3.post(
            `${this.baseUrl}/chat-response`,
            request,
            {
              timeout: this.timeout,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
          console.log(`Agent Service: Chat response generated successfully`);
          return response2.data;
        } catch (error) {
          console.error("Agent Service: Chat response generation failed:", error);
          const fallbackResponse = "I understand your question. Let me connect you with a support representative who can provide the best assistance for your specific needs.";
          if (axios3.isAxiosError(error) && error.code !== "ECONNREFUSED") {
            console.log("Agent Service: Using fallback chat response due to service error");
            return fallbackResponse;
          }
          throw new Error("Agent service is not available for chat response generation");
        }
      }
      /**
       * Check if the agent service is available
       */
      async healthCheck() {
        try {
          const response2 = await axios3.get(
            `${this.baseUrl}/health`,
            { timeout: 5e3 }
          );
          return response2.status === 200;
        } catch (error) {
          console.warn("Agent Service: Health check failed:", error);
          return false;
        }
      }
      /**
       * Get service status information
       */
      async getServiceStatus() {
        try {
          const response2 = await axios3.get(
            `${this.baseUrl}/health`,
            { timeout: 5e3 }
          );
          return response2.data;
        } catch (error) {
          console.error("Agent Service: Status check failed:", error);
          return {
            status: "unavailable",
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      /**
       * Check if agent service is available (required method)
       */
      isAvailable() {
        return this.preprocessorAgent.isAvailable();
      }
      /**
       * Preprocess message using Chat Preprocessor Agent
       */
      async preprocessMessage(message, sessionId, context) {
        return await this.preprocessorAgent.preprocess(message, sessionId, context);
      }
      /**
       * Lookup similar tickets using TicketLookupAgent
       */
      async lookupSimilarTickets(query, topK = 3) {
        return await this.ticketLookupAgent.lookupSimilarTickets(query, topK);
      }
      /**
       * Get ticket lookup agent status
       */
      getTicketLookupStatus() {
        return this.ticketLookupAgent.getStatus();
      }
      /**
       * Format ticket using TicketFormatterAgent
       */
      async formatTicket(input) {
        return await this.ticketFormatterAgent.formatTicket(input);
      }
      /**
       * Get ticket formatter agent status
       */
      getTicketFormatterStatus() {
        return this.ticketFormatterAgent.getStatus();
      }
      /**
       * Get preprocessor agent status
       */
      getPreprocessorStatus() {
        return this.preprocessorAgent.getStatus();
      }
    };
    agentService = new AgentService({
      baseUrl: process.env.AGENT_SERVICE_URL || "http://localhost:8001"
    });
    agent_service_default = agentService;
  }
});

// server/ai/providers/OpenAIProvider.ts
import OpenAI2 from "openai";
var OpenAIProvider;
var init_OpenAIProvider = __esm({
  "server/ai/providers/OpenAIProvider.ts"() {
    "use strict";
    init_agent_service();
    OpenAIProvider = class {
      name = "openai";
      client;
      model;
      constructor(config) {
        this.client = new OpenAI2({
          apiKey: config.apiKey || process.env.OPENAI_API_KEY
        });
        this.model = config.model || "gpt-4o";
        console.log(`OpenAI provider initialized with model: ${this.model}`);
      }
      async generateChatResponse(messages2, context, systemPrompt) {
        try {
          const lastUserMessage = messages2.filter((m) => m.role === "user").pop();
          if (lastUserMessage) {
            console.log(`Using agent service for chat response: ${lastUserMessage.content.substring(0, 30)}...`);
            try {
              const result = await agent_service_default.generateChatResponse({
                ticketContext: {
                  id: 0,
                  // Default for chat context
                  title: "Chat Session",
                  description: lastUserMessage.content,
                  category: "general"
                },
                messageHistory: messages2,
                userMessage: lastUserMessage.content,
                knowledgeContext: context
              });
              console.log(`Agent service chat response generated successfully`);
              return result;
            } catch (agentError) {
              console.warn("Agent service unavailable for chat, falling back to direct OpenAI:", agentError);
            }
          }
          let systemContent = systemPrompt || `You are a support assistant helping quality analysts and software testers who have discovered issues. Your primary goal is to gather information for ticket creation and provide quick, non-technical recommendations.

Format your responses for maximum readability:
- Use bullet points for lists of steps or actions  
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information

Key Guidelines:
- Users are QA analysts/testers who found issues
- Provide quick workarounds or information gathering steps only
- Keep recommendations simple and non-technical
- Don't provide code solutions or technical implementations
- Focus on ticket creation rather than complex troubleshooting
- Offer to create support tickets early in conversations

Provide helpful, non-technical guidance that leads to ticket creation.`;
          if (context) {
            systemContent += `

${context}`;
          }
          const apiMessages = [
            { role: "system", content: systemContent },
            ...messages2.map((m) => ({
              role: m.role,
              content: m.content
            }))
          ];
          console.log(`Fallback: Using OpenAI model: ${this.model} for chat response`);
          const response2 = await this.client.chat.completions.create({
            model: this.model,
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 500,
            stream: false
          });
          return response2.choices[0].message.content || "I couldn't generate a response at this time.";
        } catch (error) {
          console.error("Both agent service and OpenAI chat response failed:", error);
          return "I apologize, but I'm experiencing difficulties processing your request right now. A support representative will assist you shortly.";
        }
      }
      async classifyTicket(title, description, context) {
        try {
          console.log(`Using agent service for ticket classification: ${title.substring(0, 30)}...`);
          const result = await agent_service_default.classifyTicket({
            title,
            description,
            context
          });
          console.log(`Agent service classification result - Category: ${result.category}, Complexity: ${result.complexity}`);
          return result;
        } catch (agentError) {
          console.warn("Agent service unavailable, falling back to direct OpenAI:", agentError);
          try {
            let prompt = `
        You are an AI support ticket classifier. Based on the following ticket information, 
        classify the ticket according to these criteria:
        
        1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
        2. Complexity (one of: simple, medium, complex)
        3. Department to assign to (one of: support, engineering, product, billing)
        4. Whether the ticket can be automatically resolved (true or false)
        5. Notes for additional context (optional)
        
        Ticket Title: ${title}
        Ticket Description: ${description}
        `;
            if (context) {
              prompt += `
Relevant Knowledge Base Information:
${context}`;
            }
            prompt += `
        Respond with JSON only in this format:
        {
          "category": "category_name",
          "complexity": "complexity_level",
          "assignedTo": "department_name",
          "canAutoResolve": boolean,
          "aiNotes": "additional context" 
        }
        `;
            console.log(`Fallback: Using OpenAI model: ${this.model} for ticket classification`);
            const response2 = await this.client.chat.completions.create({
              model: this.model,
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" }
            });
            const content = response2.choices[0].message.content || "{}";
            const jsonRegex = /\{[\s\S]*\}/;
            const match = content.match(jsonRegex);
            const jsonContent = match ? match[0] : content;
            let result;
            try {
              result = JSON.parse(jsonContent);
            } catch (parseError) {
              const cleanedContent = jsonContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/\\(?!["\\/bfnrt])/g, "\\\\");
              result = JSON.parse(cleanedContent);
            }
            return {
              category: result.category || "other",
              complexity: result.complexity === "simple" || result.complexity === "medium" || result.complexity === "complex" ? result.complexity : "medium",
              assignedTo: result.assignedTo || "support",
              canAutoResolve: !!result.canAutoResolve,
              aiNotes: result.aiNotes || "This ticket has been automatically classified"
            };
          } catch (openaiError) {
            console.error("Both agent service and OpenAI classification failed:", openaiError);
            return {
              category: "other",
              complexity: "medium",
              assignedTo: "support",
              canAutoResolve: false,
              aiNotes: "This ticket requires support team attention"
            };
          }
        }
      }
      async attemptAutoResolve(title, description, previousMessages, context) {
        try {
          console.log(`Using agent service for auto-resolve: ${title.substring(0, 30)}...`);
          const result = await agent_service_default.attemptAutoResolve({
            title,
            description,
            previousMessages,
            context
          });
          console.log(`Agent service auto-resolve result - Resolved: ${result.resolved}`);
          return result;
        } catch (agentError) {
          console.warn("Agent service unavailable, falling back to direct OpenAI:", agentError);
          try {
            let systemContent = `You are an AI support assistant for a SaaS product. 
            Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
            If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
            If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
            `;
            if (context) {
              systemContent += `

${context}`;
            }
            const messages2 = [
              { role: "system", content: systemContent },
              ...(previousMessages || []).map((m) => ({
                role: m.role,
                content: m.content
              })),
              { role: "user", content: `Title: ${title}
Description: ${description}` }
            ];
            console.log(`Fallback: Using OpenAI model: ${this.model} for auto-resolve`);
            const response2 = await this.client.chat.completions.create({
              model: this.model,
              messages: messages2,
              temperature: 0.7,
              max_tokens: 800
            });
            const responseText = response2.choices[0].message.content || "";
            const resolved = responseText.includes("[ISSUE RESOLVED]");
            const cleanResponse = responseText.replace("[ISSUE RESOLVED]", "").replace("[REQUIRES HUMAN]", "").trim();
            return { resolved, response: cleanResponse };
          } catch (openaiError) {
            console.error("Both agent service and OpenAI auto-resolve failed:", openaiError);
            return {
              resolved: false,
              response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
            };
          }
        }
      }
      async generateTicketTitle(messages2, context) {
        try {
          const userMessages = messages2.filter((m) => m.role === "user");
          if (userMessages.length === 0) {
            return "Support Request";
          }
          const prompt = [
            {
              role: "system",
              content: "You are a support ticket assistant. Based on the conversation, generate a concise, specific title (maximum 60 characters) that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned. The title should help support agents quickly understand the issue."
            },
            ...messages2.filter((m) => m.role === "user" || m.role === "assistant").slice(-5).map((msg) => ({
              role: msg.role,
              content: msg.content
            }))
          ];
          if (context) {
            prompt.unshift({
              role: "system",
              content: `Additional context: ${context}`
            });
          }
          const response2 = await this.client.chat.completions.create({
            model: this.model,
            messages: prompt,
            temperature: 0.3,
            max_tokens: 60
          });
          let title = response2.choices[0].message.content?.trim() || "Support Request";
          if (title.length > 60) {
            title = title.substring(0, 57) + "...";
          }
          return title;
        } catch (error) {
          console.error("Error generating ticket title with OpenAI:", error);
          const firstUserMessage = messages2.find((m) => m.role === "user");
          if (firstUserMessage) {
            const firstSentence = firstUserMessage.content.split(/[.!?]/)[0];
            return firstSentence.length > 60 ? firstSentence.substring(0, 57) + "..." : firstSentence;
          }
          return "Support Request";
        }
      }
      async summarizeConversation(messages2, context) {
        try {
          let systemMessage = messages2.find((m) => m.role === "system");
          let conversationMessages = systemMessage ? messages2.filter((m) => m.role !== "system") : messages2;
          let promptContent = `
      Please provide a detailed and comprehensive summary of this support conversation.
      
      Include:
      - The main issue or request from the user
      - Key information exchanged during the conversation
      - Any solutions attempted or provided
      - Technical details mentioned
      - Current status (resolved or needs further action)
      - Next steps or follow-up items
      
      Your summary should be thorough while still being well-structured.
      Use proper paragraphs and organize information logically.
      Don't omit important details and don't impose any word count restrictions.
      
      ${conversationMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Detailed summary:
      `;
          const apiMessages = [];
          if (context) {
            apiMessages.push({
              role: "system",
              content: `Use the following information to help you understand the context of the conversation: ${context}`
            });
          } else if (systemMessage) {
            apiMessages.push({
              role: "system",
              content: `Use the following information to help you understand the context of the conversation: ${systemMessage.content}`
            });
          }
          apiMessages.push({ role: "user", content: promptContent });
          const response2 = await this.client.chat.completions.create({
            model: this.model,
            messages: apiMessages,
            temperature: 0.3,
            max_tokens: 1e3
            // Increased to allow for more detailed summaries
          });
          return response2.choices[0].message.content || "Summary unavailable";
        } catch (error) {
          console.error("Error calling OpenAI for conversation summarization:", error);
          const userMessages = messages2.filter((m) => m.role === "user");
          return `This conversation includes ${userMessages.length} messages from the user and requires support team review.`;
        }
      }
      async isAvailable() {
        if (!this.client.apiKey || typeof this.client.apiKey !== "string" || this.client.apiKey.trim() === "") {
          console.warn("OpenAI provider cannot be available: No API key provided");
          return false;
        }
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("OpenAI availability check timed out after 5000ms")), 5e3);
          });
          const apiPromise = this.client.models.list();
          await Promise.race([apiPromise, timeoutPromise]);
          console.log("OpenAI provider is available");
          return true;
        } catch (error) {
          if (error instanceof Error) {
            console.error(`OpenAI provider is not available: ${error.message}`);
          } else {
            console.error("OpenAI provider is not available: Unknown error");
          }
          return false;
        }
      }
    };
  }
});

// server/ai/providers/GeminiProvider.ts
import { GoogleGenerativeAI as GoogleGenerativeAI5, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
var GeminiProvider;
var init_GeminiProvider = __esm({
  "server/ai/providers/GeminiProvider.ts"() {
    "use strict";
    GeminiProvider = class {
      name = "gemini";
      client;
      model;
      constructor(config) {
        if (!config.apiKey) {
          throw new Error("Gemini API key is required");
        }
        this.client = new GoogleGenerativeAI5(config.apiKey);
        this.model = config.model || "gemini-1.5-flash";
        console.log(`Gemini provider initialized with model: ${this.model}`);
      }
      async generateChatResponse(messages2, context, systemPrompt) {
        try {
          const generativeModel = this.client.getGenerativeModel({
            model: this.model,
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              }
            ]
          });
          if (messages2.length === 1 && messages2[0].role === "user") {
            const prompt2 = this.buildSystemPrompt(systemPrompt, context) + "\n\nUser: " + messages2[0].content;
            const result2 = await generativeModel.generateContent(prompt2);
            return result2.response.text();
          }
          const conversationHistory = this.formatMessagesForGemini(messages2.slice(0, -1));
          const lastMessage = messages2[messages2.length - 1].content;
          let prompt = this.buildSystemPrompt(systemPrompt, context);
          if (conversationHistory.length > 0) {
            prompt += "\n\nConversation History:\n";
            conversationHistory.forEach((msg) => {
              const role = msg.role === "model" ? "Assistant" : "User";
              prompt += `${role}: ${msg.parts[0].text}
`;
            });
          }
          prompt += `
User: ${lastMessage}
Assistant:`;
          const result = await generativeModel.generateContent(prompt);
          return result.response.text();
        } catch (error) {
          console.error("Error calling Gemini for chat response:", error);
          throw new Error("Failed to generate chat response with Gemini");
        }
      }
      async classifyTicket(title, description, context) {
        try {
          const generativeModel = this.client.getGenerativeModel({ model: this.model });
          let prompt = `
      You are an AI support ticket classifier. Based on the following ticket information, 
      classify the ticket according to these criteria:
      
      1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. Complexity (one of: simple, medium, complex)
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      `;
          if (context) {
            prompt += `
Relevant Knowledge Base Information:
${context}`;
          }
          prompt += `
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;
          const result = await generativeModel.generateContent(prompt);
          const response2 = result.response;
          const text2 = response2.text().trim();
          try {
            const jsonMatch = text2.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : text2;
            return JSON.parse(jsonString);
          } catch (parseError) {
            console.error("Error parsing Gemini response:", parseError);
            throw new Error("Failed to parse ticket classification from Gemini response");
          }
        } catch (error) {
          console.error("Error calling Gemini for ticket classification:", error);
          throw new Error("Failed to classify ticket with Gemini");
        }
      }
      async attemptAutoResolve(title, description, previousMessages, context) {
        try {
          const generativeModel = this.client.getGenerativeModel({ model: this.model });
          let systemPrompt = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.`;
          if (context) {
            systemPrompt += `

Use this information to help with resolution:
${context}`;
          }
          const chat = generativeModel.startChat({
            history: previousMessages ? this.formatMessagesForGemini(previousMessages) : [],
            systemInstruction: systemPrompt
          });
          const result = await chat.sendMessage(`Title: ${title}
Description: ${description}`);
          const responseText = result.response.text();
          const resolved = responseText.includes("[ISSUE RESOLVED]");
          const cleanResponse = responseText.replace("[ISSUE RESOLVED]", "").replace("[REQUIRES HUMAN]", "").trim();
          return { resolved, response: cleanResponse };
        } catch (error) {
          console.error("Error calling Gemini for ticket resolution:", error);
          throw new Error("Failed to auto-resolve ticket with Gemini");
        }
      }
      async summarizeConversation(messages2, context) {
        try {
          const generativeModel = this.client.getGenerativeModel({ model: this.model });
          const conversationMessages = messages2.filter((m) => m.role !== "system");
          let promptContent = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Provide a clear, professional summary:
      `;
          if (context) {
            promptContent = `Use the following information to help you understand the context of the conversation:
${context}

${promptContent}`;
          }
          const result = await generativeModel.generateContent(promptContent);
          const response2 = result.response;
          return response2.text();
        } catch (error) {
          console.error("Error calling Gemini for conversation summarization:", error);
          throw new Error("Failed to summarize conversation with Gemini");
        }
      }
      async generateTicketTitle(messages2, context) {
        try {
          const generativeModel = this.client.getGenerativeModel({ model: this.model });
          const userMessages = messages2.filter((m) => m.role === "user");
          if (userMessages.length === 0) {
            return "Support Request";
          }
          let promptContent = `
      Based on the following conversation, generate a concise, specific title (maximum 60 characters) 
      that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned.
      The title should help support agents quickly understand the issue.
      
      ${messages2.slice(-5).map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Generate a clear, specific title:
      `;
          if (context) {
            promptContent = `Use the following information for additional context:
${context}

${promptContent}`;
          }
          const result = await generativeModel.generateContent(promptContent);
          const response2 = result.response;
          let title = response2.text().trim();
          if (title.length > 60) {
            title = title.substring(0, 57) + "...";
          }
          return title;
        } catch (error) {
          console.error("Error calling Gemini for ticket title generation:", error);
          return "Support Request";
        }
      }
      async isAvailable() {
        try {
          const generativeModel = this.client.getGenerativeModel({ model: this.model });
          await generativeModel.generateContent("Hello");
          return true;
        } catch (error) {
          console.error("Gemini provider is not available:", error);
          return false;
        }
      }
      /**
       * Helper function to build system prompt with context
       */
      buildSystemPrompt(systemPrompt, context) {
        let fullPrompt = systemPrompt || `You are a support assistant helping quality analysts and software testers who have discovered issues. Your primary goal is to gather information for ticket creation and provide quick, non-technical recommendations.

Format your responses for maximum readability:
- Use bullet points for lists of steps or actions
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information

Key Guidelines:
- Users are QA analysts/testers who found issues
- Provide quick workarounds or information gathering steps only
- Keep recommendations simple and non-technical
- Don't provide code solutions or technical implementations
- Focus on ticket creation rather than complex troubleshooting
- Offer to create support tickets early in conversations

Provide helpful, non-technical guidance that leads to ticket creation.`;
        if (context) {
          fullPrompt += `

Use the following information to help with your responses:
${context}`;
        }
        return fullPrompt;
      }
      /**
       * Helper function to convert message format for Gemini
       */
      formatMessagesForGemini(messages2) {
        const filtered = messages2.filter((message) => message.role !== "system");
        if (filtered.length > 0 && filtered[0].role === "assistant") {
          const firstUserIndex = filtered.findIndex((msg) => msg.role === "user");
          if (firstUserIndex > 0) {
            filtered.splice(0, firstUserIndex);
          } else if (firstUserIndex === -1) {
            return [];
          }
        }
        return filtered.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }]
        }));
      }
    };
  }
});

// server/ai/providers/AnthropicProvider.ts
import Anthropic from "@anthropic-ai/sdk";
var AnthropicProvider;
var init_AnthropicProvider = __esm({
  "server/ai/providers/AnthropicProvider.ts"() {
    "use strict";
    AnthropicProvider = class {
      name = "anthropic";
      client;
      model;
      constructor(config) {
        this.client = new Anthropic({
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || ""
        });
        this.model = config.model || "claude-3-opus-20240229";
        console.log(`Anthropic provider initialized with model: ${this.model}`);
      }
      async generateChatResponse(messages2, context, systemPrompt) {
        try {
          let system = systemPrompt || `You are an AI support assistant for a SaaS product. Provide helpful, concise responses.`;
          if (context) {
            system += `

${context}`;
          }
          const anthropicMessages = this.formatMessagesForAnthropic(messages2);
          const response2 = await this.client.messages.create({
            model: this.model,
            system,
            messages: anthropicMessages,
            max_tokens: 1024
          });
          if (response2.content[0]) {
            const contentBlock = response2.content[0];
            if (contentBlock.type === "text" && contentBlock.text) {
              return contentBlock.text;
            }
          }
          return "Response content unavailable";
        } catch (error) {
          console.error("Error calling Anthropic for chat response:", error);
          return "I apologize, but I'm experiencing difficulties processing your request right now. A support representative will assist you shortly.";
        }
      }
      async classifyTicket(title, description, context) {
        try {
          let system = "You are an AI support ticket classifier.";
          if (context) {
            system += `

Use this information to help with classification:
${context}`;
          }
          let prompt = `
      Based on the following ticket information, 
      classify the ticket according to these criteria:
      
      1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. Complexity (one of: simple, medium, complex)
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;
          const response2 = await this.client.messages.create({
            model: this.model,
            system,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024
          });
          let content = "";
          if (response2.content[0]) {
            const contentBlock = response2.content[0];
            if (contentBlock.type === "text" && contentBlock.text) {
              content = contentBlock.text;
            }
          }
          try {
            const jsonRegex = /\{[\s\S]*\}/;
            const match = content.match(jsonRegex);
            const jsonContent = match ? match[0] : content;
            let result;
            try {
              result = JSON.parse(jsonContent);
            } catch (initialParseError) {
              const cleanedContent = jsonContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/\\(?!["\\/bfnrt])/g, "\\\\");
              console.warn("Initial JSON parse failed, trying with cleaned content");
              result = JSON.parse(cleanedContent);
            }
            if (!result || typeof result !== "object") {
              throw new Error("Parsed result is not an object");
            }
            const validatedResult = {
              category: result.category || "other",
              complexity: result.complexity === "simple" || result.complexity === "medium" || result.complexity === "complex" ? result.complexity : "medium",
              assignedTo: result.assignedTo || "support",
              canAutoResolve: !!result.canAutoResolve,
              aiNotes: result.aiNotes || "This ticket has been automatically classified"
            };
            if (!result.category || !result.complexity || !result.assignedTo) {
              console.warn("Anthropic returned incomplete classification, added missing fields");
            }
            return validatedResult;
          } catch (jsonError) {
            console.error("Failed to parse JSON response from Anthropic:", jsonError);
            console.log("Raw response content:", content);
            throw jsonError;
          }
        } catch (error) {
          console.error("Error calling Anthropic for ticket classification:", error);
          return {
            category: "other",
            complexity: "medium",
            assignedTo: "support",
            canAutoResolve: false,
            aiNotes: "This ticket requires support team attention"
          };
        }
      }
      async attemptAutoResolve(title, description, previousMessages, context) {
        try {
          let system = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
          `;
          if (context) {
            system += `

Use this information to help with resolution:
${context}`;
          }
          const anthropicMessages = previousMessages ? this.formatMessagesForAnthropic(previousMessages) : [];
          anthropicMessages.push({
            role: "user",
            content: `Title: ${title}
Description: ${description}`
          });
          const response2 = await this.client.messages.create({
            model: this.model,
            system,
            messages: anthropicMessages,
            max_tokens: 1024
          });
          let responseText = "";
          if (response2.content[0]) {
            const contentBlock = response2.content[0];
            if (contentBlock.type === "text" && contentBlock.text) {
              responseText = contentBlock.text;
            }
          }
          const resolved = responseText.includes("[ISSUE RESOLVED]");
          const cleanResponse = responseText.replace("[ISSUE RESOLVED]", "").replace("[REQUIRES HUMAN]", "").trim();
          return { resolved, response: cleanResponse };
        } catch (error) {
          console.error("Error calling Anthropic for ticket resolution:", error);
          return {
            resolved: false,
            response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
          };
        }
      }
      async summarizeConversation(messages2, context) {
        try {
          let system = "You are an AI assistant that summarizes support conversations.";
          if (context) {
            system += `

Use this information to help understand the context of the conversation:
${context}`;
          }
          const conversationMessages = messages2.filter((m) => m.role !== "system");
          let prompt = `
      Please provide a detailed and comprehensive summary of this support conversation.
      
      Include:
      - The main issue or request from the user
      - Key information exchanged during the conversation
      - Any solutions attempted or provided
      - Technical details mentioned
      - Current status (resolved or needs further action)
      - Next steps or follow-up items
      
      Your summary should be thorough while still being well-structured.
      Use proper paragraphs and organize information logically.
      Don't omit important details and don't impose any word count restrictions.
      
      ${conversationMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Detailed summary:
      `;
          const response2 = await this.client.messages.create({
            model: this.model,
            system,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3e3
            // Increased to allow for more detailed summaries
          });
          if (response2.content[0]) {
            const contentBlock = response2.content[0];
            if (contentBlock.type === "text" && contentBlock.text) {
              return contentBlock.text;
            }
          }
          return "Response content unavailable";
        } catch (error) {
          console.error("Error calling Anthropic for conversation summarization:", error);
          const userMessages = messages2.filter((m) => m.role === "user");
          return `This conversation includes ${userMessages.length} messages from the user and requires support team review.`;
        }
      }
      async generateTicketTitle(messages2, context) {
        try {
          const userMessages = messages2.filter((m) => m.role === "user");
          if (userMessages.length === 0) {
            return "Support Request";
          }
          let system = "You are an AI assistant that generates concise ticket titles for support requests.";
          if (context) {
            system += `

Use this information to help understand the context of the conversation:
${context}`;
          }
          let prompt = `
      You are an AI assistant tasked with creating a descriptive title for a support ticket.
      Analyze the conversation and create a specific title that clearly identifies the issue.
      
      Guidelines for creating the title:
      1. Focus on the core problem (error codes, specific failure points)
      2. Be specific rather than generic (e.g., "Login 500 Error" instead of "Login Problem")
      3. Include error codes if present (e.g., "404", "500", "INVALID_TOKEN")
      4. Create a title of appropriate length that captures the key aspects of the issue
      5. Do not use placeholders or generic titles like "Support Request" or "Help Needed"
      
      ${messages2.slice(-5).map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Generate a clear, specific title:
      `;
          const response2 = await this.client.messages.create({
            model: this.model,
            system,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150
          });
          let title = "Support Request";
          if (response2.content[0]) {
            const contentBlock = response2.content[0];
            if (contentBlock.type === "text" && contentBlock.text) {
              title = contentBlock.text.trim();
              if (title.length > 60) {
                title = title.substring(0, 57) + "...";
              }
            }
          }
          return title;
        } catch (error) {
          console.error("Error calling Anthropic for ticket title generation:", error);
          return "Support Request";
        }
      }
      async isAvailable() {
        if (!this.client.apiKey || this.client.apiKey.trim() === "") {
          console.warn("Anthropic provider cannot be available: No API key provided");
          return false;
        }
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Anthropic availability check timed out after 5000ms")), 5e3);
          });
          const apiPromise = this.client.messages.create({
            model: this.model,
            system: "You are a helpful assistant.",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
            // Minimal tokens for faster response
          });
          await Promise.race([apiPromise, timeoutPromise]);
          console.log("Anthropic provider is available");
          return true;
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Anthropic provider is not available: ${error.message}`);
          } else {
            console.error("Anthropic provider is not available: Unknown error");
          }
          return false;
        }
      }
      /**
       * Helper function to convert message format for Anthropic
       */
      formatMessagesForAnthropic(messages2) {
        return messages2.filter((message) => message.role !== "system").map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content
        }));
      }
    };
  }
});

// server/ai/providers/BedrockProvider.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
var BedrockProvider;
var init_BedrockProvider = __esm({
  "server/ai/providers/BedrockProvider.ts"() {
    "use strict";
    BedrockProvider = class {
      name = "aws-bedrock";
      client;
      model;
      region;
      constructor(config) {
        this.region = config.settings?.region || "us-east-1";
        this.client = new BedrockRuntimeClient({
          region: this.region,
          credentials: {
            accessKeyId: config.settings?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: config.settings?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || ""
          }
        });
        this.model = config.model || "anthropic.claude-3-sonnet-20240229";
        console.log(`AWS Bedrock provider initialized with model: ${this.model} in region ${this.region}`);
      }
      async generateChatResponse(messages2, context, systemPrompt) {
        try {
          const formattedBody = this.formatRequestBody(
            this.model,
            messages2,
            context,
            systemPrompt
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          const response2 = await this.client.send(command);
          const responseText = await this.parseResponseBody(response2);
          return responseText;
        } catch (error) {
          console.error("Error calling AWS Bedrock for chat response:", error);
          throw new Error("Failed to generate chat response with AWS Bedrock");
        }
      }
      async classifyTicket(title, description, context) {
        try {
          let prompt = `
      You are an AI support ticket classifier. Based on the following ticket information, 
      classify the ticket according to these criteria:
      
      1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. Complexity (one of: simple, medium, complex)
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      `;
          if (context) {
            prompt += `
Relevant Knowledge Base Information:
${context}`;
          }
          prompt += `
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;
          const systemPrompt = "You are an AI support ticket classifier.";
          const formattedBody = this.formatRequestBody(
            this.model,
            [{ role: "user", content: prompt }],
            context,
            systemPrompt
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          const response2 = await this.client.send(command);
          const responseText = await this.parseResponseBody(response2);
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : responseText;
          return JSON.parse(jsonString);
        } catch (error) {
          console.error("Error calling AWS Bedrock for ticket classification:", error);
          throw new Error("Failed to classify ticket with AWS Bedrock");
        }
      }
      async attemptAutoResolve(title, description, previousMessages, context) {
        try {
          let systemPrompt = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.`;
          const messages2 = [
            ...previousMessages || [],
            {
              role: "user",
              content: `Title: ${title}
Description: ${description}`
            }
          ];
          const formattedBody = this.formatRequestBody(
            this.model,
            messages2,
            context,
            systemPrompt
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          const response2 = await this.client.send(command);
          const responseText = await this.parseResponseBody(response2);
          const resolved = responseText.includes("[ISSUE RESOLVED]");
          const cleanResponse = responseText.replace("[ISSUE RESOLVED]", "").replace("[REQUIRES HUMAN]", "").trim();
          return { resolved, response: cleanResponse };
        } catch (error) {
          console.error("Error calling AWS Bedrock for ticket resolution:", error);
          throw new Error("Failed to auto-resolve ticket with AWS Bedrock");
        }
      }
      async summarizeConversation(messages2, context) {
        try {
          const conversationMessages = messages2.filter((m) => m.role !== "system");
          let prompt = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Provide a clear, professional summary:
      `;
          let systemPrompt = "You are an AI assistant that summarizes support conversations.";
          if (context) {
            systemPrompt += `

Use this information to help understand the context of the conversation:
${context}`;
          }
          const formattedBody = this.formatRequestBody(
            this.model,
            [{ role: "user", content: prompt }],
            context,
            systemPrompt
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          const response2 = await this.client.send(command);
          const responseText = await this.parseResponseBody(response2);
          return responseText;
        } catch (error) {
          console.error("Error calling AWS Bedrock for conversation summarization:", error);
          throw new Error("Failed to summarize conversation with AWS Bedrock");
        }
      }
      async generateTicketTitle(messages2, context) {
        try {
          const userMessages = messages2.filter((m) => m.role === "user");
          if (userMessages.length === 0) {
            return "Support Request";
          }
          let prompt = `
      Based on the following conversation, generate a concise, specific title (maximum 60 characters) 
      that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned.
      The title should help support agents quickly understand the issue.
      
      ${messages2.slice(-5).map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")}
      
      Generate a clear, specific title:
      `;
          let systemPrompt = "You are an AI assistant that generates concise ticket titles for support requests.";
          if (context) {
            systemPrompt += `

Use this information to help understand the context of the conversation:
${context}`;
          }
          const formattedBody = this.formatRequestBody(
            this.model,
            [{ role: "user", content: prompt }],
            context,
            systemPrompt
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          const response2 = await this.client.send(command);
          const responseText = await this.parseResponseBody(response2);
          let title = responseText.trim();
          if (title.length > 60) {
            title = title.substring(0, 57) + "...";
          }
          return title;
        } catch (error) {
          console.error("Error calling AWS Bedrock for ticket title generation:", error);
          return "Support Request";
        }
      }
      async isAvailable() {
        try {
          const formattedBody = this.formatRequestBody(
            this.model,
            [{ role: "user", content: "Hello" }],
            void 0,
            "You are a helpful assistant."
          );
          const command = new InvokeModelCommand({
            modelId: this.model,
            body: Buffer.from(JSON.stringify(formattedBody)),
            contentType: "application/json",
            accept: "application/json"
          });
          await this.client.send(command);
          return true;
        } catch (error) {
          console.error("AWS Bedrock provider is not available:", error);
          return false;
        }
      }
      /**
       * Format request body based on model type
       */
      formatRequestBody(modelId, messages2, context, systemPrompt) {
        if (modelId.startsWith("anthropic.claude")) {
          const anthropicMessages = messages2.filter((message) => message.role !== "system").map((message) => ({
            role: message.role === "user" ? "user" : "assistant",
            content: [{ type: "text", text: message.content }]
          }));
          return {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1024,
            temperature: 0.7,
            system: systemPrompt || "",
            messages: anthropicMessages
          };
        } else if (modelId.startsWith("amazon.titan")) {
          let prompt = "";
          if (systemPrompt) {
            prompt += `<system>${systemPrompt}</system>

`;
          }
          for (const message of messages2) {
            const role = message.role === "assistant" ? "bot" : "user";
            prompt += `<${role}>${message.content}</${role}>
`;
          }
          return {
            inputText: prompt,
            textGenerationConfig: {
              maxTokenCount: 1024,
              temperature: 0.7,
              topP: 0.9
            }
          };
        } else if (modelId.startsWith("cohere")) {
          const chatHistory = messages2.map((message) => ({
            role: message.role === "assistant" ? "CHATBOT" : "USER",
            message: message.content
          }));
          return {
            message: messages2[messages2.length - 1].content,
            chat_history: chatHistory.slice(0, -1),
            temperature: 0.7,
            max_tokens: 1024,
            system: systemPrompt || ""
          };
        } else {
          const anthropicMessages = messages2.filter((message) => message.role !== "system").map((message) => ({
            role: message.role === "user" ? "user" : "assistant",
            content: [{ type: "text", text: message.content }]
          }));
          return {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1024,
            temperature: 0.7,
            system: systemPrompt || "",
            messages: anthropicMessages
          };
        }
      }
      /**
       * Parse response body based on model type
       */
      async parseResponseBody(response2) {
        try {
          const responseBody = Buffer.from(response2.body).toString("utf8");
          const parsedResponse = JSON.parse(responseBody);
          if (this.model.startsWith("anthropic.claude")) {
            return parsedResponse.content?.[0]?.text || "";
          } else if (this.model.startsWith("amazon.titan")) {
            return parsedResponse.results?.[0]?.outputText || "";
          } else if (this.model.startsWith("cohere")) {
            return parsedResponse.text || "";
          } else {
            return JSON.stringify(parsedResponse);
          }
        } catch (error) {
          console.error("Error parsing Bedrock response:", error);
          throw new Error("Failed to parse AWS Bedrock response");
        }
      }
    };
  }
});

// server/ai/providers/CustomProvider.ts
import axios4 from "axios";
var CustomProvider;
var init_CustomProvider = __esm({
  "server/ai/providers/CustomProvider.ts"() {
    "use strict";
    CustomProvider = class {
      name = "custom";
      baseUrl;
      apiKey;
      headers;
      constructor(config) {
        this.baseUrl = config.baseUrl || "";
        if (!this.baseUrl) {
          throw new Error("Custom AI provider requires a baseUrl");
        }
        this.baseUrl = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
        this.apiKey = config.apiKey;
        this.headers = {
          "Content-Type": "application/json"
        };
        if (this.apiKey) {
          this.headers["Authorization"] = `Bearer ${this.apiKey}`;
        }
        if (config.settings?.headers) {
          this.headers = { ...this.headers, ...config.settings.headers };
        }
        console.log(`Custom AI provider initialized with endpoint: ${this.baseUrl}`);
      }
      async generateChatResponse(messages2, context, systemPrompt) {
        try {
          const response2 = await axios4.post(
            `${this.baseUrl}/chat`,
            {
              messages: messages2,
              context,
              systemPrompt
            },
            { headers: this.headers }
          );
          if (!response2.data || typeof response2.data.response !== "string") {
            throw new Error("Invalid response format from custom AI provider");
          }
          return response2.data.response;
        } catch (error) {
          console.error("Error calling custom AI provider for chat response:", error);
          throw new Error(`Failed to generate chat response with custom AI provider: ${error.message}`);
        }
      }
      async classifyTicket(title, description, context) {
        try {
          const response2 = await axios4.post(
            `${this.baseUrl}/classify`,
            {
              title,
              description,
              context
            },
            { headers: this.headers }
          );
          const result = response2.data;
          if (!result || !result.category || !result.complexity || !result.assignedTo || typeof result.canAutoResolve !== "boolean") {
            throw new Error("Invalid classification response from custom AI provider");
          }
          return result;
        } catch (error) {
          console.error("Error calling custom AI provider for ticket classification:", error);
          throw new Error(`Failed to classify ticket with custom AI provider: ${error.message}`);
        }
      }
      async attemptAutoResolve(title, description, previousMessages, context) {
        try {
          const response2 = await axios4.post(
            `${this.baseUrl}/resolve`,
            {
              title,
              description,
              previousMessages,
              context
            },
            { headers: this.headers }
          );
          const result = response2.data;
          if (!result || typeof result.resolved !== "boolean" || typeof result.response !== "string") {
            throw new Error("Invalid auto-resolve response from custom AI provider");
          }
          return result;
        } catch (error) {
          console.error("Error calling custom AI provider for ticket resolution:", error);
          throw new Error(`Failed to auto-resolve ticket with custom AI provider: ${error.message}`);
        }
      }
      async summarizeConversation(messages2, context) {
        try {
          const response2 = await axios4.post(
            `${this.baseUrl}/summarize`,
            {
              messages: messages2,
              context
            },
            { headers: this.headers }
          );
          if (!response2.data || typeof response2.data.summary !== "string") {
            throw new Error("Invalid summarization response from custom AI provider");
          }
          return response2.data.summary;
        } catch (error) {
          console.error("Error calling custom AI provider for conversation summarization:", error);
          throw new Error(`Failed to summarize conversation with custom AI provider: ${error.message}`);
        }
      }
      async generateTicketTitle(messages2, context) {
        try {
          const response2 = await axios4.post(
            `${this.baseUrl}/generate-title`,
            {
              messages: messages2,
              context
            },
            { headers: this.headers }
          );
          if (!response2.data || typeof response2.data.title !== "string") {
            throw new Error("Invalid title generation response from custom AI provider");
          }
          let title = response2.data.title.trim();
          if (title.length > 60) {
            title = title.substring(0, 57) + "...";
          }
          return title;
        } catch (error) {
          console.error("Error calling custom AI provider for title generation:", error);
          return "Support Request";
        }
      }
      async isAvailable() {
        try {
          const response2 = await axios4.get(
            `${this.baseUrl}/health`,
            { headers: this.headers, timeout: 5e3 }
          );
          return response2.status === 200;
        } catch (error) {
          console.error("Custom AI provider is not available:", error);
          return false;
        }
      }
    };
  }
});

// server/ai/providers/index.ts
function convertDbProviderToConfig(provider) {
  const validTypes = ["openai", "gemini", "anthropic", "aws-bedrock", "bedrock", "custom"];
  let mappedType = provider.type;
  if (mappedType === "bedrock") {
    mappedType = "aws-bedrock";
  }
  const providerType = validTypes.includes(mappedType) ? mappedType : "custom";
  return {
    type: providerType,
    apiKey: provider.apiKey || void 0,
    baseUrl: provider.baseUrl || void 0,
    model: provider.model || void 0,
    settings: provider.settings,
    isPrimary: Boolean(provider.isPrimary),
    useForClassification: Boolean(provider.useForClassification),
    useForAutoResolve: Boolean(provider.useForAutoResolve),
    useForChat: Boolean(provider.useForChat),
    useForEmail: Boolean(provider.useForEmail)
  };
}
var AIProviderFactory;
var init_providers = __esm({
  "server/ai/providers/index.ts"() {
    "use strict";
    init_OpenAIProvider();
    init_GeminiProvider();
    init_AnthropicProvider();
    init_BedrockProvider();
    init_CustomProvider();
    AIProviderFactory = class {
      static providers = /* @__PURE__ */ new Map();
      static configs = /* @__PURE__ */ new Map();
      /**
       * Get all configurations for a tenant
       * 
       * @param tenantId Tenant ID
       * @returns Array of provider configurations
       */
      static getProviderConfigs(tenantId) {
        return this.configs.get(tenantId) || [];
      }
      /**
       * Set provider configurations for a tenant
       * 
       * @param tenantId Tenant ID
       * @param configs Array of provider configurations
       */
      static setProviderConfigs(tenantId, configs) {
        this.configs.set(tenantId, configs);
        const tenantPrefix = `${tenantId}:`;
        Array.from(this.providers.keys()).forEach((key) => {
          if (key.startsWith(tenantPrefix)) {
            this.providers.delete(key);
          }
        });
      }
      /**
       * Add a provider configuration for a tenant
       * 
       * @param tenantId Tenant ID
       * @param config Provider configuration
       */
      static addProviderConfig(tenantId, config) {
        const configs = this.getProviderConfigs(tenantId);
        configs.push(config);
        this.setProviderConfigs(tenantId, configs);
      }
      /**
       * Remove a provider configuration for a tenant
       * 
       * @param tenantId Tenant ID
       * @param type Provider type to remove
       * @returns Boolean indicating if removal was successful
       */
      static removeProviderConfig(tenantId, type) {
        const configs = this.getProviderConfigs(tenantId);
        const initialLength = configs.length;
        const updatedConfigs = configs.filter((config) => config.type !== type);
        this.setProviderConfigs(tenantId, updatedConfigs);
        return updatedConfigs.length < initialLength;
      }
      /**
       * Create a provider instance based on configuration
       * 
       * @param config Provider configuration
       * @returns AI provider implementation
       */
      static createProvider(config) {
        switch (config.type) {
          case "openai":
            return new OpenAIProvider(config);
          case "gemini":
            return new GeminiProvider(config);
          case "anthropic":
            return new AnthropicProvider(config);
          case "aws-bedrock":
            return new BedrockProvider(config);
          case "custom":
            return new CustomProvider(config);
          // Note: Perplexity provider has been removed
          default:
            console.warn(`Provider type not found: ${config.type}, falling back to CustomProvider`);
            return new CustomProvider(config);
        }
      }
      /**
       * Get a specific AI provider for a tenant
       * 
       * @param tenantId Tenant ID
       * @param type Provider type
       * @returns AI provider instance
       */
      static getProvider(tenantId, type) {
        const key = `${tenantId}:${type}`;
        if (this.providers.has(key)) {
          return this.providers.get(key) || null;
        }
        const configs = this.getProviderConfigs(tenantId);
        const config = configs.find((c) => c.type === type);
        if (!config) {
          return null;
        }
        try {
          const provider = this.createProvider(config);
          this.providers.set(key, provider);
          return provider;
        } catch (error) {
          console.error(`Failed to create provider ${type} for tenant ${tenantId}:`, error);
          return null;
        }
      }
      /**
       * Get the primary provider for a tenant
       * 
       * @param tenantId Tenant ID
       * @returns Primary AI provider or null if none configured
       */
      static getPrimaryProvider(tenantId) {
        const configs = this.getProviderConfigs(tenantId);
        const primaryConfig = configs.find((c) => c.isPrimary);
        if (primaryConfig) {
          return this.getProvider(tenantId, primaryConfig.type);
        }
        const openaiConfig = configs.find((c) => c.type === "openai");
        if (openaiConfig) {
          return this.getProvider(tenantId, "openai");
        }
        if (configs.length > 0) {
          return this.getProvider(tenantId, configs[0].type);
        }
        console.warn(`No AI provider configured for tenant ${tenantId}`);
        return null;
      }
      /**
       * Get a provider for a specific operation (chat, classification, auto-resolve)
       * 
       * @param tenantId Tenant ID
       * @param operation Operation type ('chat', 'classification', 'autoResolve', 'email')
       * @returns AI provider for the operation or primary provider
       */
      static getProviderForOperation(tenantId, operation) {
        const configs = this.getProviderConfigs(tenantId);
        const configProperty = this.mapOperationToConfigProperty(operation);
        const specificConfig = configs.find((c) => c[configProperty] === true);
        if (specificConfig) {
          return this.getProvider(tenantId, specificConfig.type);
        }
        return this.getPrimaryProvider(tenantId);
      }
      /**
       * Map operation type to config property name
       */
      static mapOperationToConfigProperty(operation) {
        switch (operation) {
          case "chat":
            return "useForChat";
          case "classification":
            return "useForClassification";
          case "autoResolve":
            return "useForAutoResolve";
          case "email":
            return "useForEmail";
          default:
            return "isPrimary";
        }
      }
      /**
       * Initialize all providers and ensure they're available
       * 
       * @param tenantId Tenant ID
       * @returns Object mapping provider types to availability status
       */
      static async checkAllProviders(tenantId) {
        const configs = this.getProviderConfigs(tenantId);
        const results = {};
        for (const config of configs) {
          try {
            const provider = this.getProvider(tenantId, config.type);
            if (provider) {
              results[config.type] = await provider.isAvailable();
            } else {
              results[config.type] = false;
            }
          } catch (error) {
            console.error(`Error checking provider ${config.type}:`, error);
            results[config.type] = false;
          }
        }
        return results;
      }
      /**
       * Clear all cached providers
       */
      static clearProviders() {
        this.providers.clear();
      }
      /**
       * Get a provider instance from database model
       * 
       * @param provider Database provider model
       * @returns AI provider instance
       */
      static getInstance(provider) {
        const config = convertDbProviderToConfig(provider);
        try {
          return this.createProvider(config);
        } catch (error) {
          console.error(`Failed to create provider ${provider.type} (ID: ${provider.id}):`, error);
          return new CustomProvider({
            type: "custom",
            model: provider.model || "unknown",
            settings: provider.settings
          });
        }
      }
      /**
       * Load AI provider configurations from database
       * 
       * @param tenantId Tenant ID to load providers for
       * @param providers Array of provider configurations from database
       */
      static loadProvidersFromDatabase(tenantId, providers) {
        if (!providers || providers.length === 0) {
          console.log(`No AI providers found in database for tenant ${tenantId}`);
          return;
        }
        const configs = providers.filter((p) => p.enabled).map(convertDbProviderToConfig);
        console.log(`Loaded ${configs.length} AI providers from database for tenant ${tenantId}`);
        this.setProviderConfigs(tenantId, configs);
      }
    };
  }
});

// server/model-context-protocol.ts
var model_context_protocol_exports = {};
__export(model_context_protocol_exports, {
  enhanceModelContextWithDocuments: () => enhanceModelContextWithDocuments,
  getContextForQuery: () => getContextForQuery,
  getContextSystemPrompt: () => getContextSystemPrompt
});
function calculateRelevanceScore(query, document) {
  const normalizedQuery = query.toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 3);
  const documentText = [
    document.title,
    document.content,
    document.summary || "",
    ...document.tags || [],
    ...document.errorCodes || [],
    ...document.keywords || []
  ].join(" ").toLowerCase();
  let matchCount = 0;
  for (const word of queryWords) {
    if (documentText.includes(word)) {
      matchCount++;
    }
  }
  const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  return score;
}
async function getContextForQuery(query, options = {}) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    console.warn("MCP: Empty or invalid query provided to getContextForQuery");
    return "";
  }
  const opts = { ...DEFAULT_OPTIONS, ...options };
  console.log(`MCP: Getting context for query "${query.substring(0, 30)}${query.length > 30 ? "..." : ""}"${opts.tenantId ? ` for tenant ${opts.tenantId}` : ""}`);
  try {
    const documents = await storage.getAllSupportDocuments(opts.tenantId);
    if (!documents || documents.length === 0) {
      console.log(`MCP: No documents found${opts.tenantId ? ` for tenant ${opts.tenantId}` : ""}`);
      return "";
    }
    console.log(`MCP: Retrieved ${documents.length} total documents, applying filters...`);
    const filteredDocuments = documents.filter((doc) => {
      try {
        if (!doc || !doc.title || !doc.content) {
          console.warn(`MCP: Skipping invalid document (id: ${doc?.id || "unknown"})`);
          return false;
        }
        if (!opts.includeDrafts && doc.status !== "published") {
          return false;
        }
        if (opts.categoryFilter && opts.categoryFilter.length > 0) {
          if (!doc.category || !opts.categoryFilter.includes(doc.category)) {
            return false;
          }
        }
        if (opts.tagFilter && opts.tagFilter.length > 0 && doc.tags) {
          const hasMatchingTag = doc.tags.some(
            (tag) => opts.tagFilter?.includes(tag)
          );
          if (!hasMatchingTag) {
            return false;
          }
        }
        return true;
      } catch (filterError) {
        console.error(`MCP: Error filtering document ${doc?.id || "unknown"}:`, filterError);
        return false;
      }
    });
    console.log(`MCP: After filtering, ${filteredDocuments.length} documents remain`);
    if (filteredDocuments.length === 0) {
      return "";
    }
    const scoredDocuments = [];
    for (const doc of filteredDocuments) {
      try {
        const score = calculateRelevanceScore(query, doc);
        scoredDocuments.push({ document: doc, score });
      } catch (scoringError) {
        console.error(`MCP: Error scoring document ${doc.id}:`, scoringError);
      }
    }
    const relevantDocuments = scoredDocuments.filter((item) => item.score >= (opts.minScore || 0)).sort((a, b) => b.score - a.score).slice(0, opts.maxDocuments || 5);
    console.log(`MCP: Found ${relevantDocuments.length} relevant documents above threshold score`);
    if (relevantDocuments.length === 0) {
      return "";
    }
    let contextString = "### RELEVANT DOCUMENTS ###\n\n";
    relevantDocuments.forEach((item, index) => {
      try {
        const doc = item.document;
        contextString += `DOCUMENT ${index + 1} [relevance: ${Math.round(item.score * 100)}%]:
`;
        contextString += `Title: ${doc.title || "Untitled"}
`;
        if (doc.summary) {
          contextString += `Summary: ${doc.summary}
`;
        }
        if (doc.category) {
          contextString += `Category: ${doc.category}
`;
        }
        if (doc.errorCodes && doc.errorCodes.length > 0) {
          contextString += `Error Codes: ${doc.errorCodes.join(", ")}
`;
        }
        if (doc.tags && doc.tags.length > 0) {
          contextString += `Tags: ${doc.tags.join(", ")}
`;
        }
        contextString += `Content:
${doc.content || "No content available"}

`;
      } catch (formattingError) {
        console.error(`MCP: Error formatting document for context:`, formattingError);
      }
    });
    contextString += "### END OF DOCUMENTS ###\n\n";
    if (contextString.length > 1e4) {
      console.warn(`MCP: Context very large (${contextString.length} chars), truncating...`);
      contextString = contextString.substring(0, 1e4) + "...\n\n### END OF DOCUMENTS (TRUNCATED) ###\n\n";
    }
    return contextString;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`MCP: Error retrieving context for query: ${errorMessage}`, error);
    return "";
  }
}
function getContextSystemPrompt() {
  return `You are a helpful support assistant. When responding to user inquiries, refer to the relevant documents provided in your context, if available.
  
If the RELEVANT DOCUMENTS section exists in your context:
1. Prioritize this information over your general knowledge
2. Cite specific documents when providing solutions
3. If multiple documents are relevant, synthesize the information
4. If the documents don't address the specific question, acknowledge this and provide your best answer
  
Always be helpful, clear, and concise in your responses. Avoid mentioning technical details about how you retrieve or process the documents.`;
}
async function enhanceModelContextWithDocuments(userQuery, systemPrompt, tenantId) {
  if (!userQuery || typeof userQuery !== "string") {
    console.warn("MCP: Invalid or empty user query provided");
    return { enhancedPrompt: systemPrompt, documents: "" };
  }
  if (!systemPrompt || typeof systemPrompt !== "string") {
    console.warn("MCP: Invalid or empty system prompt provided");
    systemPrompt = "You are a helpful support assistant.";
  }
  try {
    console.log(`MCP: Searching for documents relevant to query "${userQuery.substring(0, 50)}${userQuery.length > 50 ? "..." : ""}"${tenantId ? ` for tenant ${tenantId}` : ""}`);
    const startTime = Date.now();
    const documentContext = await getContextForQuery(userQuery, {
      tenantId,
      maxDocuments: 5,
      // Limit to 5 most relevant docs
      minScore: 0.4
      // Increased relevance threshold for better results
    });
    const duration = Date.now() - startTime;
    if (documentContext && documentContext.trim().length > 0) {
      console.log(`MCP: Found relevant documents (${documentContext.length} chars) in ${duration}ms${tenantId ? ` for tenant ${tenantId}` : ""}`);
    } else {
      console.log(`MCP: No relevant documents found in ${duration}ms${tenantId ? ` for tenant ${tenantId}` : ""}`);
    }
    const enhancedPrompt = documentContext ? `${systemPrompt}

${getContextSystemPrompt()}` : systemPrompt;
    return {
      enhancedPrompt,
      documents: documentContext
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`MCP: Error enhancing context with documents: ${errorMessage}`, error);
    return {
      enhancedPrompt: systemPrompt,
      documents: ""
    };
  }
}
var DEFAULT_OPTIONS;
var init_model_context_protocol = __esm({
  "server/model-context-protocol.ts"() {
    "use strict";
    init_storage();
    DEFAULT_OPTIONS = {
      maxDocuments: 5,
      minScore: 0.3,
      includeDrafts: false
    };
  }
});

// server/ai.ts
async function shouldUseAIProvider(tenantId) {
  if (!tenantId) return false;
  const provider = AIProviderFactory.getProviderForOperation(tenantId, "chat");
  return provider !== null;
}
async function classifyTicket(title, description, tenantId) {
  if (await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI) {
    try {
      const combinedText = `${title} ${description}`;
      let knowledgeContext = "";
      try {
        knowledgeContext = await buildAIContext(combinedText, tenantId);
        if (knowledgeContext) {
          console.log(`Using knowledge context for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? "..." : ""}"${tenantId ? ` (tenant: ${tenantId})` : ""}`);
        } else {
          console.log(`No relevant knowledge context found for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? "..." : ""}"${tenantId ? ` (tenant: ${tenantId})` : ""}`);
        }
      } catch (contextError) {
        console.error("Error building AI context, will proceed without context:", contextError);
      }
      const maxRetries = 3;
      let lastError = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1e3;
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} for AI classification with ${backoffMs}ms backoff...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
          const result = await classifyTicketWithAI(title, description, knowledgeContext);
          if (!result.aiNotes || result.aiNotes.trim() === "") {
            console.warn("AI classification returned empty aiNotes, adding default notes");
            result.aiNotes = "This ticket has been automatically classified by the AI system.";
          }
          console.log(`Successfully classified ticket with AI on attempt ${attempt + 1}, aiNotes length: ${result.aiNotes?.length || 0}`);
          return result;
        } catch (error) {
          const retryError = error;
          lastError = retryError;
          console.error(`AI classification attempt ${attempt + 1} failed:`, retryError);
          if (retryError && retryError.message && (retryError.message.includes("timeout") || retryError.message.includes("network") || retryError.message.includes("connection") || retryError.message.includes("ECONNRESET"))) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to local implementation`);
            break;
          }
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at AI classification failed, falling back to local method`);
            break;
          }
        }
      }
      console.error("AI classification failed after all retries, falling back to local:", lastError);
    } catch (error) {
      console.error("AI classification failed, falling back to local:", error);
    }
  }
  const text2 = (title + " " + description).toLowerCase();
  const wordCount = text2.split(/\s+/).length;
  let category = "other";
  let complexity = "medium";
  let assignedTo = "support";
  let canAutoResolve = false;
  let aiNotes = "";
  const hasComplexTerms = /database|server|infrastructure|outage|security|breach|urgent|critical|production|down|broken|data loss|performance|slow/i.test(text2);
  const hasTechnicalTerms = /api|endpoint|code|function|error|exception|bug|crash|server|database|query|authentication|token|backend|frontend|interface/i.test(text2);
  const hasSimpleTerms = /reset password|how to|where is|can't find|looking for|documentation|guide|tutorial|help me|simple question/i.test(text2);
  if (hasComplexTerms || hasTechnicalTerms && wordCount > 100) {
    complexity = "complex";
  } else if (hasSimpleTerms && wordCount < 75) {
    complexity = "simple";
  }
  if (text2.includes("login") || text2.includes("password") || text2.includes("sign in") || text2.includes("account access")) {
    category = "authentication";
    aiNotes = "User is experiencing authentication issues";
    if (text2.includes("forgot password") || text2.includes("reset password")) {
      complexity = "simple";
      canAutoResolve = true;
      aiNotes += ". This appears to be a password reset request which can be handled through automated flows.";
    } else {
      complexity = "medium";
    }
  } else if (text2.includes("payment") || text2.includes("charge") || text2.includes("invoice") || text2.includes("bill") || text2.includes("subscription")) {
    category = "billing";
    aiNotes = "User has a billing-related inquiry";
    if (text2.includes("refund") || text2.includes("dispute") || text2.includes("cancel")) {
      complexity = "complex";
      assignedTo = "support";
      aiNotes += ". This involves a refund or cancellation request requiring manual review.";
    } else {
      complexity = "medium";
    }
  } else if (text2.includes("feature") || text2.includes("suggestion") || text2.includes("improvement") || text2.includes("add") || text2.includes("enhance")) {
    category = "feature_request";
    complexity = "medium";
    assignedTo = "engineering";
    aiNotes = "User is requesting a new feature or enhancement";
  } else if (text2.includes("guide") || text2.includes("manual") || text2.includes("help") || text2.includes("documentation") || text2.includes("how to")) {
    category = "documentation";
    complexity = "simple";
    aiNotes = "User is requesting information or guidance";
    canAutoResolve = true;
  } else if (text2.includes("error") || text2.includes("bug") || text2.includes("crash") || text2.includes("not working") || text2.includes("issue")) {
    category = "technical_issue";
    aiNotes = "User is experiencing a technical problem";
    if (text2.includes("data loss") || text2.includes("critical") || text2.includes("urgent") || text2.includes("production")) {
      complexity = "complex";
      assignedTo = "engineering";
      aiNotes += ". This appears to be a critical issue requiring engineering attention.";
    } else {
      complexity = "medium";
    }
  } else if (text2.includes("profile") || text2.includes("settings") || text2.includes("account") || text2.includes("update details")) {
    category = "account";
    complexity = "simple";
    aiNotes = "User is requesting account management assistance";
    canAutoResolve = true;
  }
  return {
    category,
    complexity,
    assignedTo,
    canAutoResolve,
    aiNotes
  };
}
async function attemptAutoResolve(title, description, previousMessages = [], tenantId) {
  if (await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI) {
    try {
      const combinedText = `${title} ${description}`;
      let knowledgeContext = "";
      try {
        knowledgeContext = await buildAIContext(combinedText, tenantId);
        if (knowledgeContext) {
          console.log(`Using knowledge context for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? "..." : ""}"${tenantId ? ` (tenant: ${tenantId})` : ""}`);
        } else {
          console.log(`No relevant knowledge context found for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? "..." : ""}"${tenantId ? ` (tenant: ${tenantId})` : ""}`);
        }
      } catch (contextError) {
        console.error("Error building AI context for auto-resolve, will proceed without context:", contextError);
      }
      const maxRetries = 3;
      let lastError = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1e3;
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} for AI auto-resolve with ${backoffMs}ms backoff...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
          const result = await attemptAutoResolveWithAI(title, description, previousMessages, knowledgeContext);
          console.log(`Successfully attempted auto-resolve with AI on attempt ${attempt + 1}, resolved: ${result.resolved}`);
          return result;
        } catch (error) {
          const retryError = error;
          lastError = retryError;
          console.error(`AI auto-resolve attempt ${attempt + 1} failed:`, retryError);
          if (retryError && retryError.message && (retryError.message.includes("timeout") || retryError.message.includes("network") || retryError.message.includes("connection") || retryError.message.includes("ECONNRESET"))) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to local implementation`);
            break;
          }
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at AI auto-resolve failed, falling back to local method`);
            break;
          }
        }
      }
      console.error("AI auto-resolve failed after all retries, falling back to local:", lastError);
    } catch (error) {
      console.error("AI auto-resolve failed, falling back to local:", error);
    }
  }
  const text2 = (title + " " + description).toLowerCase();
  let resolved = false;
  let response2 = "";
  const knowledgeBaseEntry = findRelevantKnowledgeBaseEntries(text2);
  if (knowledgeBaseEntry) {
    response2 = knowledgeBaseEntry.solution;
    if (knowledgeBaseEntry.category === "authentication" && (knowledgeBaseEntry.question.toLowerCase().includes("reset") || knowledgeBaseEntry.question.toLowerCase().includes("forgot"))) {
      resolved = true;
      response2 += " Is there anything else I can help you with? This issue is now resolved.";
    } else if (knowledgeBaseEntry.category === "account" && knowledgeBaseEntry.question.toLowerCase().includes("how")) {
      resolved = true;
      response2 += " Is there anything specific about your account you need help with? This issue is now resolved.";
    } else if (knowledgeBaseEntry.category === "documentation") {
      resolved = true;
      response2 += " Is there anything specific within the documentation you're looking for? This issue is now resolved.";
    } else if (knowledgeBaseEntry.category === "feature_request") {
      resolved = true;
      response2 += " Is there anything else I can help you with today? This issue is now resolved.";
    } else if (knowledgeBaseEntry.category === "technical_issue" && !knowledgeBaseEntry.question.toLowerCase().includes("error")) {
      resolved = true;
      response2 += " Does this information help solve your problem? This issue is now resolved.";
    } else {
      resolved = false;
      response2 += " I've provided some initial information, but a support specialist will follow up with you for more detailed assistance.";
    }
  } else {
    if (text2.includes("reset password") || text2.includes("forgot password")) {
      resolved = true;
      response2 = "I can help you reset your password. Please check your email for a password reset link I've just sent. If you don't receive it within the next few minutes, please check your spam folder. The link will be valid for 24 hours. Is there anything else I can help you with? This issue is now resolved.";
    } else if (text2.includes("how to") && text2.includes("account")) {
      resolved = true;
      response2 = "Here's a guide on how to manage your account settings:\n\n1. Log in to your account\n2. Click on the profile icon in the top right corner\n3. Select 'Account Settings' from the dropdown menu\n4. Here you can update your personal information, notification preferences, and privacy settings\n\nI've also sent you an email with our comprehensive account management guide. Is there anything specific about your account you need help with? This issue is now resolved.";
    } else if (text2.includes("login") && !text2.includes("reset") && !text2.includes("forgot")) {
      resolved = false;
      response2 = "I understand you're having trouble logging in. Could you please provide more details about the issue you're experiencing? Are you seeing any specific error messages? This would help us troubleshoot more effectively. This issue requires additional information to resolve.";
    } else if (text2.includes("documentation") || text2.includes("guide") || text2.includes("how to")) {
      resolved = true;
      response2 = "I've found some documentation that should help with your question. You can find our complete user guide at our Help Center: https://help.example.com/guide\n\nSpecifically, the section on '" + (text2.includes("account") ? "Account Management" : "Getting Started") + "' should address your question. Is there anything specific within the documentation you're looking for? This issue is now resolved.";
    } else if (text2.includes("feature request") || text2.includes("suggestion")) {
      resolved = true;
      response2 = "Thank you for your feature suggestion. I've recorded your request and forwarded it to our product team for consideration. We really appreciate user feedback as it helps us improve our product. While I can't promise when or if this specific feature will be implemented, please know that your input is valuable. Is there anything else I can help you with today? This issue is now resolved.";
    } else if (text2.includes("billing") && (text2.includes("question") || text2.includes("information"))) {
      resolved = false;
      response2 = "I understand you have a billing question. To better assist you, can you please provide your account details and the specific information you're looking for? For security reasons, our billing team will need to verify your account. This issue requires human intervention to properly address your billing concern.";
    } else {
      resolved = false;
      response2 = "Thank you for contacting us. Based on your message, I'll need to escalate this to our support team for further assistance. A support representative will review your ticket and get back to you as soon as possible. This issue requires human intervention.";
    }
  }
  return { resolved, response: response2 };
}
async function generateChatResponse(ticketContext, messageHistory, userMessage) {
  console.log(`Generating chat response for ticket #${ticketContext.id}, category: ${ticketContext.category}${ticketContext.tenantId ? `, tenant: ${ticketContext.tenantId}` : ""}`);
  const startTime = Date.now();
  let usedProvider = false;
  try {
    const canUseProvider = await shouldUseAIProvider(ticketContext.tenantId);
    usedProvider = canUseProvider || FALLBACK_TO_OPENAI;
    if (usedProvider) {
      const baseSystemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
        Ticket #${ticketContext.id}: "${ticketContext.title}"
        Original description: "${ticketContext.description}"
        
        Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
        If you need more information or the issue requires human intervention, make that clear as well.`;
      let enhancedPrompt = baseSystemPrompt;
      let documents = "";
      let knowledgeContext = "";
      try {
        console.log(`Attempting to enhance prompt with MCP for ticket #${ticketContext.id}`);
        const mcpResult = await enhanceModelContextWithDocuments(
          userMessage,
          baseSystemPrompt,
          ticketContext.tenantId
        );
        enhancedPrompt = mcpResult.enhancedPrompt;
        documents = mcpResult.documents || "";
        if (documents && documents.trim().length > 0) {
          console.log(`Successfully obtained MCP document context (${documents.length} chars) for ticket #${ticketContext.id}`);
        } else {
          console.log(`MCP returned no documents for ticket #${ticketContext.id}, will try alternative context sources`);
        }
      } catch (mcpError) {
        if (mcpError instanceof Error) {
          console.error(`MCP enhancement failed for ticket #${ticketContext.id}: ${mcpError.message}`);
        } else {
          console.error(`MCP enhancement failed for ticket #${ticketContext.id} with non-Error object:`, mcpError);
        }
      }
      if (!documents || documents.trim().length === 0) {
        try {
          console.log(`Attempting to build context from data sources for ticket #${ticketContext.id}`);
          knowledgeContext = await buildAIContext(userMessage, ticketContext.tenantId);
          if (knowledgeContext && knowledgeContext.trim().length > 0) {
            console.log(`Successfully obtained data source context (${knowledgeContext.length} chars) for ticket #${ticketContext.id}`);
          } else {
            console.log(`Data sources returned no context for ticket #${ticketContext.id}, will proceed with basic conversation`);
          }
        } catch (contextError) {
          if (contextError instanceof Error) {
            console.error(`Data source context generation failed for ticket #${ticketContext.id}: ${contextError.message}`);
          } else {
            console.error(`Data source context generation failed for ticket #${ticketContext.id} with non-Error object:`, contextError);
          }
        }
      }
      let responseFromAI = "";
      const maxRetries = 3;
      let lastError = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1e3;
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} for chat response generation with ${backoffMs}ms backoff...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
          if (documents && documents.trim().length > 0) {
            console.log(`Using MCP documents for AI response generation for ticket #${ticketContext.id} (attempt ${attempt + 1})`);
            const systemMessage = {
              role: "system",
              content: enhancedPrompt
            };
            const filteredMessageHistory = messageHistory.filter((msg) => msg.role !== "system");
            const enhancedMessageHistory = [systemMessage, ...filteredMessageHistory];
            responseFromAI = await generateChatResponseWithAI(ticketContext, enhancedMessageHistory, userMessage, documents);
          } else if (knowledgeContext && knowledgeContext.trim().length > 0) {
            console.log(`Using data source knowledge for AI response generation for ticket #${ticketContext.id} (attempt ${attempt + 1})`);
            responseFromAI = await generateChatResponseWithAI(ticketContext, messageHistory, userMessage, knowledgeContext);
          } else {
            console.log(`No context available, using basic conversation for ticket #${ticketContext.id} (attempt ${attempt + 1})`);
            responseFromAI = await generateChatResponseWithAI(ticketContext, messageHistory, userMessage, "");
          }
          console.log(`Successfully generated chat response on attempt ${attempt + 1}`);
          break;
        } catch (error) {
          const retryError = error;
          lastError = retryError;
          console.error(`Chat response generation attempt ${attempt + 1} failed:`, retryError);
          if (retryError && retryError.message && (retryError.message.includes("timeout") || retryError.message.includes("network") || retryError.message.includes("connection") || retryError.message.includes("ECONNRESET"))) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to simpler response`);
            break;
          }
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at generating chat response failed`);
            responseFromAI = `I apologize, but I'm having trouble accessing the knowledge base at the moment. Let me provide a basic response: I'll help you with your issue regarding ${ticketContext.category}. Could you provide more details about your specific problem?`;
            break;
          }
        }
      }
      if (!responseFromAI) {
        console.warn(`No AI response was generated for ticket #${ticketContext.id}, using default`);
        responseFromAI = `I understand your question about ${ticketContext.category}. Let me assist you with that. Could you please provide some more details about what you're trying to accomplish?`;
      }
      const duration = Date.now() - startTime;
      console.log(`Generated AI response for ticket #${ticketContext.id} in ${duration}ms`);
      return responseFromAI;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Critical error in AI chat response for ticket #${ticketContext.id}: ${errorMessage}`, error);
    usedProvider = false;
  }
  if (!usedProvider) {
    console.log(`Using fallback local implementation for ticket #${ticketContext.id}`);
  }
  const text2 = userMessage.toLowerCase();
  const category = ticketContext.category.toLowerCase();
  if (text2.includes("thank you") || text2.includes("thanks")) {
    return "You're welcome! Is there anything else I can help you with today?";
  }
  if (text2.includes("yes") && text2.length < 10) {
    return "Great! Please let me know what other questions you have, and I'll do my best to assist you.";
  }
  if (text2.includes("no") && text2.length < 10) {
    return "Alright! If you need any further assistance in the future, don't hesitate to reach out. Have a great day!";
  }
  const knowledgeBaseEntry = findRelevantKnowledgeBaseEntries(userMessage);
  if (knowledgeBaseEntry) {
    return knowledgeBaseEntry.solution;
  }
  switch (category) {
    case "authentication":
      if (text2.includes("password") || text2.includes("reset")) {
        return "I can help you reset your password. I've sent a password reset link to your registered email address. The link will expire in 24 hours. Please let me know if you don't receive the email within the next few minutes.";
      } else if (text2.includes("login") || text2.includes("sign in")) {
        return "If you're having trouble logging in, please try the following steps:\n\n1. Ensure caps lock is turned off\n2. Clear your browser cookies and cache\n3. Try using a different browser\n4. If you still can't log in, I can help you reset your password";
      } else if (text2.includes("two-factor") || text2.includes("2fa")) {
        return "Two-factor authentication provides an extra layer of security for your account. To enable it, go to Account Settings > Security and click 'Enable 2FA'. You can choose between SMS verification or using an authenticator app like Google Authenticator or Authy.";
      }
      break;
    case "billing":
      if (text2.includes("refund") || text2.includes("money back")) {
        return "I understand you're requesting a refund. I'll need to transfer your ticket to our billing department who can better assist with this request. They typically respond within 1-2 business days. Is there any specific information about the refund you'd like me to include in the ticket?";
      } else if (text2.includes("invoice") || text2.includes("receipt")) {
        return "You can download all your invoices and receipts from the Billing section in your account settings. If you're having trouble locating a specific invoice, please provide the approximate date or transaction amount, and I can help you find it.";
      } else if (text2.includes("update") || text2.includes("change") || text2.includes("edit")) {
        return "To update your billing information, go to Account Settings > Billing. Click 'Edit Payment Method' to update your credit card details. All changes are securely processed through our payment provider.";
      }
      break;
    case "technical_issue":
      if (text2.includes("error")) {
        return "I'm sorry you're experiencing this error. To help us troubleshoot, could you please provide the following information:\n\n1. What were you doing when the error occurred?\n2. Are you able to reproduce the error consistently?\n3. What device and browser are you using?\n\nThis information will help our technical team resolve the issue more quickly.";
      } else if (text2.includes("bug") || text2.includes("not working")) {
        return "I apologize for the inconvenience. Our engineering team will need to look into this issue. I've escalated your ticket with the details you've provided. In the meantime, is there a workaround you've tried that might help other users experiencing similar issues?";
      } else if (text2.includes("slow") || text2.includes("performance")) {
        return "Performance issues can be caused by several factors. Try these steps:\n\n1. Clear your browser cache and cookies\n2. Try a different browser\n3. Check your internet connection speed\n4. Disable browser extensions\n\nIf the problem persists, please provide details about your device and browser for further troubleshooting.";
      } else if (text2.includes("integration") || text2.includes("connect") || text2.includes("api")) {
        return "We offer various integration options including a comprehensive REST API. Our API documentation is available at https://api.example.com/docs with authentication details, endpoints, and code examples. Is there a specific system you're trying to integrate with?";
      }
      break;
    case "feature_request":
      return "Thank you for your feedback! We're always looking to improve our product based on user suggestions. I've forwarded your feature request to our product team for consideration. While I can't promise when or if this feature will be implemented, we truly appreciate your input. Would you like to be notified if we add this feature in the future?";
    case "documentation":
      return "Our documentation team works hard to keep our guides up-to-date. You can find comprehensive information on this topic in our knowledge base at https://help.example.com. Is there something specific about the documentation that you're finding unclear or that you'd like more information on?";
    case "account":
      if (text2.includes("delete") || text2.includes("remove")) {
        return "I understand you're looking to delete your account. Before proceeding, please be aware that this action is permanent and all your data will be removed. If you're sure you want to continue, please confirm, and I'll guide you through the account deletion process.";
      } else if (text2.includes("update") || text2.includes("change")) {
        return "You can update your account information from your Account Settings page. After logging in, click on your profile picture in the top-right corner and select 'Account Settings'. From there, you can modify your personal information, notification preferences, and privacy settings. Let me know if you have trouble finding any specific setting.";
      } else if (text2.includes("team") || text2.includes("add user") || text2.includes("invite")) {
        return "To add team members, go to Settings > Team Members and click 'Invite New User'. Enter their email address and select their access level. They'll receive an invitation email with instructions to join your team. Note that additional users may affect your billing depending on your subscription plan.";
      }
      break;
  }
  if (ticketContext.description.toLowerCase().includes("api") && text2.includes("document")) {
    return "You can find our API documentation at https://api.example.com/docs which includes authentication details, endpoints, and code examples in various languages. Is there a specific aspect of the API you need help with?";
  }
  if (ticketContext.description.toLowerCase().includes("export") && (text2.includes("how") || text2.includes("where"))) {
    return "To export your data, go to the Reports section. Select the data you want to export, click 'Export' and choose your preferred format (CSV, Excel, or PDF). For large data sets, the export will be processed in the background and you'll receive an email when it's ready to download.";
  }
  return "Thank you for providing that information. I've updated your ticket with these details. A member of our support team will review this and get back to you soon. Is there anything else you'd like to add to your ticket in the meantime?";
}
async function generateTicketTitle(messages2, tenantId) {
  const startTime = Date.now();
  console.log(`Generating ticket title for ${messages2.length} messages${tenantId ? ` for tenant ${tenantId}` : ""}`);
  if (!messages2 || !Array.isArray(messages2) || messages2.length === 0) {
    console.log("No messages provided for title generation, returning default title");
    return "Support Request";
  }
  let allUserMessages = messages2.filter((m) => m.role === "user");
  if (allUserMessages.length === 0) {
    console.log("No user messages found, returning default title");
    return "Support Request";
  }
  let titleGenMethod = "fallback";
  let aiTitle = null;
  try {
    const useAI = await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI;
    if (useAI) {
      const allText = messages2.map((m) => m.content).join(" ");
      const baseSystemPrompt = `
      You are an AI assistant specialized in creating concise, descriptive titles for support tickets.
      
      INSTRUCTIONS:
      Analyze the conversation carefully and extract the CORE issue or request.
      Create a title that clearly identifies the specific problem, feature request, or inquiry.
      
      TITLE REQUIREMENTS:
      1. Length: 5-10 words (absolute maximum 15 words)
      2. Structure: [Problem Area]: [Specific Issue] format (e.g., "Login System: Password Reset Email Not Arriving")
      3. Specificity: Include exact error codes, component names, or feature references (e.g., "API Error 403: Invalid Authentication Token")
      4. Clarity: Anyone reading the title should immediately understand what the ticket is about
      5. Objectivity: Focus on technical facts, not subjective assessments
      
      FORMAT RULES:
      - Use proper capitalization for the first letter of each significant word
      - Never use quotation marks or other formatting characters in the title
      - Do not include punctuation at the end of the title
      - Do not start with generic terms like "Issue with" or "Problem regarding"
      
      Return ONLY the title text with NO additional explanations, quotation marks, or formatting.
      `;
      let mcpSuccessful = false;
      let enhancedPrompt = baseSystemPrompt;
      let documents = "";
      try {
        console.log("Attempting to enhance title generation with MCP documents");
        const mcpResult = await enhanceModelContextWithDocuments(
          allText,
          baseSystemPrompt,
          tenantId
        );
        enhancedPrompt = mcpResult.enhancedPrompt || baseSystemPrompt;
        documents = mcpResult.documents || "";
        if (documents && documents.trim().length > 0) {
          console.log(`Found relevant MCP documents (${documents.length} chars) for title generation`);
          mcpSuccessful = true;
        }
      } catch (mcpError) {
        if (mcpError instanceof Error) {
          console.error(`MCP enhancement failed for title generation: ${mcpError.message}`);
        } else {
          console.error("MCP enhancement failed for title generation with non-Error object:", mcpError);
        }
      }
      if (mcpSuccessful) {
        try {
          const systemMessage = {
            role: "system",
            content: enhancedPrompt
          };
          const userAndAssistantMessages = messages2.filter((msg) => msg.role !== "system");
          const enhancedMessages = [systemMessage, ...userAndAssistantMessages];
          console.log("Generating ticket title with MCP context...");
          aiTitle = await generateTicketTitleWithAI(enhancedMessages);
          if (aiTitle && aiTitle.length > 5 && aiTitle !== "Support Request" && !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
            console.log(`Successfully generated ticket title with MCP: "${aiTitle}"`);
            titleGenMethod = "mcp";
            const duration = Date.now() - startTime;
            console.log(`Title generation (MCP) completed in ${duration}ms`);
            return aiTitle;
          } else {
            console.warn(`MCP approach returned low-quality title: "${aiTitle}", trying data source context...`);
            aiTitle = null;
          }
        } catch (mcpTitleError) {
          console.error("Error generating title with MCP context:", mcpTitleError);
        }
      }
      let dataSourceSuccessful = false;
      let knowledgeContext = "";
      try {
        console.log("Attempting to build data source context for title generation");
        knowledgeContext = await buildAIContext(allText, tenantId);
        if (knowledgeContext && knowledgeContext.trim().length > 0) {
          console.log(`Found relevant data source context (${knowledgeContext.length} chars) for title generation`);
          dataSourceSuccessful = true;
        } else {
          console.log("No relevant data source context found for title generation");
        }
      } catch (contextError) {
        if (contextError instanceof Error) {
          console.error(`Data source context generation failed: ${contextError.message}`);
        } else {
          console.error("Data source context generation failed with non-Error object:", contextError);
        }
      }
      if (dataSourceSuccessful) {
        try {
          const systemMessage = {
            role: "system",
            content: `${baseSystemPrompt}

Here is relevant context for this conversation:
${knowledgeContext}`
          };
          const userAndAssistantMessages = messages2.filter((msg) => msg.role !== "system");
          const contextMessages = [systemMessage, ...userAndAssistantMessages];
          console.log("Generating ticket title with data source context...");
          aiTitle = await generateTicketTitleWithAI(contextMessages);
          if (aiTitle && aiTitle.length > 5 && aiTitle !== "Support Request" && !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
            console.log(`Successfully generated ticket title with data source context: "${aiTitle}"`);
            titleGenMethod = "data_source";
            const duration = Date.now() - startTime;
            console.log(`Title generation (data source) completed in ${duration}ms`);
            return aiTitle;
          } else {
            console.warn(`Data source approach returned low-quality title: "${aiTitle}", trying basic context...`);
            aiTitle = null;
          }
        } catch (dataSourceTitleError) {
          console.error("Error generating title with data source context:", dataSourceTitleError);
        }
      }
      try {
        const systemMessage = {
          role: "system",
          content: baseSystemPrompt
        };
        const userAndAssistantMessages = messages2.filter((msg) => msg.role !== "system");
        console.log("Generating ticket title with basic context...");
        aiTitle = await generateTicketTitleWithAI([systemMessage, ...userAndAssistantMessages]);
        if (aiTitle && aiTitle.length > 5 && aiTitle !== "Support Request" && !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
          console.log(`Successfully generated ticket title with basic context: "${aiTitle}"`);
          titleGenMethod = "basic";
          const duration = Date.now() - startTime;
          console.log(`Title generation (basic) completed in ${duration}ms`);
          return aiTitle;
        } else {
          console.warn(`Basic approach returned low-quality title: "${aiTitle}", falling back to local implementation...`);
        }
      } catch (basicTitleError) {
        console.error("Error generating title with basic context:", basicTitleError);
      }
    } else {
      console.log("No AI provider available for ticket title generation, using local implementation");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Critical error in title generation flow: ${errorMessage}`, error);
  }
  if (aiTitle && aiTitle !== "Support Request") {
    console.log(`Using best available title: "${aiTitle}" (method: ${titleGenMethod})`);
    return aiTitle;
  }
  console.log("Using enhanced local fallback mechanism for title generation");
  function identifyComponent2(text2) {
    const lowerText = text2.toLowerCase();
    if (/login|password|auth|sign[- ]in|account access/i.test(lowerText)) {
      return "Authentication";
    }
    if (/payment|billing|charge|invoice|subscription|credit card/i.test(lowerText)) {
      return "Billing";
    }
    if (/data|database|record|entry|lost|missing/i.test(lowerText)) {
      return "Database";
    }
    if (/ui|interface|button|screen|display|page|website/i.test(lowerText)) {
      return "User Interface";
    }
    if (/api|request|endpoint|integration|service/i.test(lowerText)) {
      return "API";
    }
    if (/error|bug|crash|fail|broken|not working/i.test(lowerText)) {
      return "System Error";
    }
    if (/slow|performance|timeout|delay/i.test(lowerText)) {
      return "Performance";
    }
    if (/install|setup|configure|deployment/i.test(lowerText)) {
      return "Installation";
    }
    if (/report|analytics|stats|numbers|metric/i.test(lowerText)) {
      return "Reporting";
    }
    if (/admin|permission|access|role|privilege/i.test(lowerText)) {
      return "Administration";
    }
    return "Support";
  }
  const allUserText = allUserMessages.map((m) => m.content).join(" ");
  const firstMessage = allUserMessages[0].content;
  const lastMessage = allUserMessages[allUserMessages.length - 1].content;
  const errorCodeMatch = allUserText.match(/(\b[45]\d{2}\b|error code:?\s*([a-z0-9_-]+))/i);
  if (errorCodeMatch) {
    return `System Error: ${errorCodeMatch[0]} Issue`;
  }
  if (/password|login|sign[- ]in|account access|authentication/i.test(allUserText)) {
    return "Authentication: Account Access Issue";
  }
  if (/payment|billing|charge|invoice|subscription|credit card/i.test(allUserText)) {
    return "Billing: Payment Processing Issue";
  }
  if (/install|setup|configuration|getting started/i.test(allUserText)) {
    return "Installation: Setup Assistance";
  }
  if (/bug|error|crash|not working|fails?|failed|broken/i.test(allUserText)) {
    const brokenMatch = allUserText.match(/(\w+(?:\s+\w+){0,4})\s+(?:is|are|not working|broken|fails)/i);
    if (brokenMatch) {
      return `Technical Issue: ${brokenMatch[1]} Problem`;
    }
    return "System Error: Technical Malfunction";
  }
  if (/feature request|enhancement|suggestion|would be nice/i.test(allUserText)) {
    return "Feature Request: New Functionality";
  }
  if (/how (?:do|can|to)|where is|what is/i.test(allUserText)) {
    return "Documentation: Usage Instructions";
  }
  if (firstMessage.length > 5 && firstMessage.length < 60) {
    const firstSentence = firstMessage.split(/[.!?]/)[0].trim();
    if (firstSentence && firstSentence.length > 8) {
      const wordLimit = 8;
      const component2 = identifyComponent2(firstSentence);
      const words = firstSentence.split(/\s+/).slice(0, wordLimit);
      const processedTitle = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
      return `${component2}: ${processedTitle}`;
    }
  }
  if (lastMessage.length > 5 && lastMessage.length < 60) {
    const lastSentence = lastMessage.split(/[.!?]/)[0].trim();
    if (lastSentence && lastSentence.length > 8) {
      const wordLimit = 8;
      const component2 = identifyComponent2(lastSentence);
      const words = lastSentence.split(/\s+/).slice(0, wordLimit);
      const processedTitle = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
      return `${component2}: ${processedTitle}`;
    }
  }
  if (firstMessage !== lastMessage && firstMessage.length < 30 && lastMessage.length < 30) {
    const component2 = identifyComponent2(firstMessage + " " + lastMessage);
    return `${component2}: ${firstMessage.substring(0, 20).trim()} - ${lastMessage.substring(0, 20).trim()}`;
  }
  const mostValuableMessage = lastMessage.length > firstMessage.length ? lastMessage : firstMessage;
  const component = identifyComponent2(mostValuableMessage);
  return `${component}: ${mostValuableMessage.length > 40 ? mostValuableMessage.substring(0, 37) + "..." : mostValuableMessage}`;
}
var FALLBACK_TO_OPENAI;
var init_ai = __esm({
  "server/ai.ts"() {
    "use strict";
    init_knowledgeBase();
    init_openai_service();
    init_data_source_service();
    init_providers();
    init_model_context_protocol();
    FALLBACK_TO_OPENAI = process.env.NODE_ENV === "development" && typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.startsWith("sk-");
    console.log(FALLBACK_TO_OPENAI ? "OpenAI fallback available for development" : "Strict tenant-scoped AI providers enforced");
  }
});

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename, __dirname, vite_config_default;
var init_vite_config = __esm({
  async "vite.config.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    vite_config_default = defineConfig({
      plugins: [
        react(),
        runtimeErrorOverlay(),
        themePlugin(),
        ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
          await import("@replit/vite-plugin-cartographer").then(
            (m) => m.cartographer()
          )
        ] : []
      ],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "client", "src"),
          "@shared": path.resolve(__dirname, "shared")
        }
      },
      root: path.resolve(__dirname, "client"),
      build: {
        outDir: path.resolve(__dirname, "dist/public"),
        emptyOutDir: true
      }
    });
  }
});

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}
var __filename2, __dirname2, viteLogger;
var init_vite = __esm({
  async "server/vite.ts"() {
    "use strict";
    await init_vite_config();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname2(__filename2);
    viteLogger = createLogger();
  }
});

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  EmailService: () => EmailService,
  emailEvents: () => emailEvents,
  getEmailService: () => getEmailService,
  setupEmailService: () => setupEmailService
});
import nodemailer from "nodemailer";
import * as IMAP from "imap";
import { simpleParser } from "mailparser";
import { EventEmitter } from "events";
function setupEmailService(config) {
  if (!config.smtp || !config.smtp.auth || !config.smtp.auth.user || !config.smtp.auth.pass) {
    throw new Error("SMTP configuration is incomplete");
  }
  const hasValidImapConfig = config.imap && config.imap.auth && config.imap.auth.user && config.imap.auth.pass;
  if (hasValidImapConfig) {
    log("Setting up email service with both SMTP and IMAP", "email");
  } else {
    log("Setting up email service in SMTP-only mode (no IMAP credentials provided)", "email");
    if (!config.imap) {
      config.imap = {
        host: "localhost",
        port: 143,
        tls: false,
        authTimeout: 1e4,
        auth: {
          type: "basic",
          user: "",
          pass: ""
        }
      };
    }
  }
  emailService = new EmailService(config);
  log("Email service initialized successfully", "email");
  return emailService;
}
function getEmailService() {
  return emailService;
}
var emailEvents, EMAIL_TEMPLATES, EmailService, emailService;
var init_email_service = __esm({
  async "server/email-service.ts"() {
    "use strict";
    init_storage();
    await init_vite();
    init_ai();
    init_providers();
    emailEvents = new EventEmitter();
    EMAIL_TEMPLATES = {
      ticketCreated: (ticketId, ticketTitle) => `
    <div>
      <p>Thank you for contacting our support team. Your ticket has been created successfully.</p>
      <p>Ticket #${ticketId}: ${ticketTitle}</p>
      <p>We'll get back to you as soon as possible. Please keep this email for reference.</p>
    </div>
  `,
      ticketResolved: (solution) => `
    <div>
      <p>Good news! We've automatically resolved your support request.</p>
      <p>${solution}</p>
      <p>If this doesn't solve your issue, please reply to this email and our support team will assist you further.</p>
    </div>
  `,
      ticketResponse: (response2) => `
    <div>
      <p>${response2}</p>
      <p>If you have any further questions, please reply to this email.</p>
    </div>
  `
    };
    EmailService = class {
      transporter;
      imapClient;
      config;
      checkingEmails = false;
      checkInterval = null;
      /**
       * Get the email service configuration
       * This is used for accessing settings like the "from" email address
       */
      getConfig() {
        return this.config;
      }
      constructor(config) {
        this.config = config;
        const isPort465 = config.smtp.port === 465;
        const isPort587 = config.smtp.port === 587;
        const isGmail = config.smtp.host.includes("gmail.com");
        config.smtp.secure = isPort465;
        console.log(`Setting up SMTP transport for ${config.smtp.host}:${config.smtp.port} (secure: ${config.smtp.secure}, isGmail: ${isGmail})`);
        let transportConfig = {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.auth.user,
            pass: config.smtp.auth.pass
          },
          tls: {
            // Don't fail on invalid certs
            rejectUnauthorized: false
          }
        };
        if (isGmail) {
          console.log("[DEBUG] Using Gmail-specific SMTP service configuration");
          transportConfig = {
            service: "gmail",
            // Nodemailer will auto-configure the correct settings
            auth: {
              user: config.smtp.auth.user,
              pass: config.smtp.auth.pass
              // This should be an app password if 2FA is enabled
            },
            tls: {
              rejectUnauthorized: false
            }
          };
          console.log(`[DEBUG] Gmail configuration - User: ${config.smtp.auth.user}`);
          console.log("[DEBUG] Gmail password length:", config.smtp.auth.pass ? config.smtp.auth.pass.length : "null/undefined");
          console.log("[DEBUG] Note: Gmail requires app passwords if 2FA is enabled (https://myaccount.google.com/apppasswords)");
        }
        if (isPort587 && !isGmail) {
          console.log("Using port 587 special configuration for non-Gmail provider");
          transportConfig.secure = false;
          transportConfig.requireTLS = true;
        }
        this.transporter = nodemailer.createTransport(transportConfig);
        const hasValidImapConfig = config.imap && config.imap.auth && config.imap.auth.user && config.imap.auth.pass;
        this.imapClient = this.createDummyImapClient();
        if (hasValidImapConfig) {
          try {
            const imapConfig = {
              user: config.imap.auth.user,
              password: config.imap.auth.pass,
              host: config.imap.host,
              port: config.imap.port,
              tls: config.imap.tls,
              authTimeout: config.imap.authTimeout,
              // Add timeout to prevent hanging connections
              connTimeout: 1e4
            };
            this.imapClient = new IMAP(imapConfig);
            this.imapClient.on("error", (err) => {
              log(`IMAP Error: ${err.message}`, "email");
              emailEvents.emit("imap-error", { error: err.message });
            });
            this.imapClient.on("end", () => {
              log("IMAP connection ended", "email");
            });
            log("IMAP client configured successfully", "email");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log(`Error initializing IMAP client: ${errorMessage}`, "email");
          }
        } else {
          log("IMAP configuration not provided - Email receiving functionality will be disabled", "email");
        }
      }
      /**
       * Creates a dummy IMAP client that won't be used but prevents null errors
       * This allows the service to operate in SMTP-only mode
       * @returns IMAP client instance that won't be used for actual connections
       */
      createDummyImapClient() {
        const dummyConfig = {
          user: "dummy",
          password: "dummy",
          host: "localhost",
          port: 143,
          tls: false,
          authTimeout: 1e3
        };
        log("Creating dummy IMAP client for SMTP-only mode", "email");
        return new IMAP(dummyConfig);
      }
      // No OAuth-related methods needed
      // Start monitoring emails
      startEmailMonitoring() {
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        const hasValidImapConfig = this.config.imap && this.config.imap.auth && this.config.imap.auth.user && this.config.imap.auth.pass;
        if (!hasValidImapConfig) {
          log("Email monitoring not started - SMTP-only mode active (IMAP not configured)", "email");
          return;
        }
        this.checkInterval = setInterval(() => {
          this.checkEmails();
        }, this.config.settings.checkInterval);
        log("Email monitoring started - checking for new emails every " + this.config.settings.checkInterval / 1e3 + " seconds", "email");
      }
      // Stop monitoring emails
      stopEmailMonitoring() {
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        log("Email monitoring stopped", "email");
      }
      // Check for new emails
      async checkEmails() {
        const hasValidImapConfig = this.config.imap && this.config.imap.auth && this.config.imap.auth.user && this.config.imap.auth.pass;
        if (!hasValidImapConfig) {
          log("Skipping email check - IMAP not configured", "email");
          return;
        }
        if (this.checkingEmails) {
          log("Email check already in progress, skipping", "email");
          return;
        }
        this.checkingEmails = true;
        let connectionTimeout = null;
        try {
          const safetyPromise = new Promise((_resolve, reject) => {
            connectionTimeout = setTimeout(() => {
              reject(new Error("IMAP connection timeout - safety mechanism"));
              this.checkingEmails = false;
              if (this.imapClient && this.imapClient.state !== "disconnected") {
                try {
                  this.imapClient.end();
                } catch (endError) {
                }
              }
            }, 3e4);
          });
          const checkEmailsPromise = new Promise((resolve, reject) => {
            this.imapClient.once("ready", () => {
              log("IMAP connection ready, opening inbox", "email");
              this.imapClient.openBox("INBOX", false, (err, box) => {
                if (err) {
                  log(`Error opening inbox: ${err.message}`, "email");
                  reject(err);
                  return;
                }
                this.imapClient.search(["UNSEEN"], (err2, results) => {
                  if (err2) {
                    log(`Error searching emails: ${err2.message}`, "email");
                    reject(err2);
                    return;
                  }
                  log(`Found ${results.length} unread emails`, "email");
                  if (results.length === 0) {
                    resolve();
                    return;
                  }
                  const fetch = this.imapClient.fetch(results, { bodies: [""], markSeen: true });
                  fetch.on("message", (msg) => {
                    msg.on("body", (stream) => {
                      simpleParser(stream, async (err3, parsed) => {
                        if (err3) {
                          log(`Error parsing email: ${err3.message}`, "email");
                          return;
                        }
                        try {
                          await this.processEmail(parsed);
                        } catch (error) {
                          const errorMessage = error instanceof Error ? error.message : "Unknown error";
                          log(`Error processing email: ${errorMessage}`, "email");
                        }
                      });
                    });
                  });
                  fetch.once("error", (err3) => {
                    log(`Fetch error: ${err3.message}`, "email");
                  });
                  fetch.once("end", () => {
                    log("Email fetch completed", "email");
                    resolve();
                  });
                });
              });
            });
            this.imapClient.once("error", (err) => {
              log(`IMAP connection error: ${err.message}`, "email");
              reject(err);
            });
            this.imapClient.once("end", () => {
              log("IMAP connection ended", "email");
              resolve();
            });
            log("Connecting to IMAP server...", "email");
            this.imapClient.connect();
          });
          await Promise.race([checkEmailsPromise, safetyPromise]);
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          log("Email check completed successfully", "email");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          log(`Error checking emails: ${errorMessage}`, "email");
          emailEvents.emit("email-check-error", { error: errorMessage });
        } finally {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          if (this.imapClient && this.imapClient.state !== "disconnected") {
            try {
              this.imapClient.end();
            } catch (endError) {
            }
          }
          this.checkingEmails = false;
        }
      }
      // Process an email to create a ticket
      async processEmail(email) {
        const fromEmail = email.from?.value[0]?.address;
        const fromName = email.from?.value[0]?.name || fromEmail;
        const subject = email.subject || "No Subject";
        const textContent = email.text || "";
        const htmlContent = email.html || "";
        if (!fromEmail) {
          log("Email missing sender information", "email");
          return;
        }
        try {
          const ticketId = this.extractTicketIdFromSubject(subject);
          if (ticketId) {
            await this.handleTicketReply(ticketId, fromEmail, fromName, textContent, htmlContent);
          } else {
            await this.createTicketFromEmail(fromEmail, fromName, subject, textContent, htmlContent);
          }
        } catch (error) {
          log(`Error processing email from ${fromEmail}: ${error.message}`, "email");
        }
      }
      /**
       * Generate an AI response for an email-based ticket
       * This uses the configured AI provider for the tenant to generate a helpful response
       * 
       * @param ticketId The ID of the ticket to generate a response for
       * @returns True if an AI response was successfully generated and sent
       */
      async generateAndSendAIResponse(ticketId) {
        try {
          log(`Attempting to generate AI response for ticket #${ticketId}`, "email");
          const ticket = await storage.getTicketById(ticketId);
          if (!ticket) {
            log(`Ticket #${ticketId} not found for AI response generation`, "email");
            return false;
          }
          const messages2 = await storage.getMessagesByTicketId(ticketId);
          if (!messages2 || messages2.length === 0) {
            log(`No messages found in ticket #${ticketId} for AI response`, "email");
            return false;
          }
          const chatMessages = messages2.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.content
          }));
          const lastUserMessageObj = messages2.filter((msg) => msg.sender === "user").pop();
          if (!lastUserMessageObj || !lastUserMessageObj.metadata || !lastUserMessageObj.metadata.fromEmail) {
            log(`Could not determine user email for ticket #${ticketId}`, "email");
            return false;
          }
          const userEmail = lastUserMessageObj.metadata.fromEmail;
          const lastUserMessageText = lastUserMessageObj.content || "";
          const aiResponse = await generateChatResponse(
            {
              id: ticketId,
              title: ticket.title,
              description: ticket.description,
              category: ticket.category,
              tenantId: ticket.tenantId
            },
            chatMessages,
            lastUserMessageText
          );
          if (!aiResponse) {
            log(`Failed to generate AI response for ticket #${ticketId}`, "email");
            return false;
          }
          log(`AI response generated for ticket #${ticketId}`, "email");
          const aiMessage = await storage.createMessage({
            ticketId,
            sender: "assistant",
            content: aiResponse,
            metadata: {
              generatedBy: "ai",
              system: true
            }
          });
          const emailSubject = `${this.config.settings.ticketSubjectPrefix}#${ticketId}: Re: ${ticket.title}`;
          const emailHtml = `
        <div>
          <p>Thank you for contacting our support team. Here's an automated response to your inquiry:</p>
          <div style="padding: 15px; border-left: 4px solid #0066cc; background-color: #f9f9f9; margin: 15px 0;">
            ${aiResponse.replace(/\n/g, "<br>")}
          </div>
          <p>This is an automated response. If you need further assistance, please reply to this email.</p>
          <p>Ticket #${ticketId} remains open in our system and our support team will review it.</p>
        </div>
      `;
          await this.sendEmail(userEmail, emailSubject, emailHtml);
          log(`AI response email sent to ${userEmail} for ticket #${ticketId}`, "email");
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          log(`Error generating AI response for ticket #${ticketId}: ${errorMessage}`, "email");
          return false;
        }
      }
      // Extract ticket ID from email subject if it's a reply
      extractTicketIdFromSubject(subject) {
        const prefix = this.config.settings.ticketSubjectPrefix;
        const regex = new RegExp(`${prefix}#(\\d+)`);
        const match = subject.match(regex);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
        return null;
      }
      // Handle a reply to an existing ticket
      async handleTicketReply(ticketId, fromEmail, fromName, textContent, htmlContent) {
        const ticket = await storage.getTicketById(ticketId);
        if (!ticket) {
          log(`Ticket #${ticketId} not found for email reply from ${fromEmail}`, "email");
          return;
        }
        const message = {
          ticketId,
          sender: "user",
          content: textContent || "Empty message",
          metadata: {
            fromEmail,
            fromName,
            hasHtml: !!htmlContent
          }
        };
        await storage.createMessage(message);
        if (ticket.status === "resolved") {
          await storage.updateTicket(ticketId, {
            status: "in_progress",
            aiResolved: false
          });
        }
        await this.sendEmail(
          fromEmail,
          `${this.config.settings.ticketSubjectPrefix}#${ticketId}: Reply Received - ${ticket.title}`,
          `<div>
        <p>Thank you for your reply to support ticket #${ticketId}.</p>
        <p>Our support team has been notified and will review your message as soon as possible.</p>
        <p>Ticket Title: ${ticket.title}</p>
      </div>`
        );
        if (this.config.settings.enableAiResponses !== false) {
          try {
            const aiResponseSent = await this.generateAndSendAIResponse(ticketId);
            if (aiResponseSent) {
              log(`AI response successfully generated and sent for ticket reply #${ticketId}`, "email");
            } else {
              log(`AI response generation skipped for ticket reply #${ticketId}`, "email");
            }
          } catch (aiError) {
            log(`Error generating AI response for ticket reply #${ticketId}: ${aiError instanceof Error ? aiError.message : "Unknown error"}`, "email");
          }
        } else {
          log(`AI responses are disabled in configuration - skipping for ticket reply #${ticketId}`, "email");
        }
        emailEvents.emit("ticketUpdated", ticketId);
      }
      /**
       * Detect errors in message content using AI
       * 
       * @param content The message content to analyze for errors
       * @param tenantId Optional tenant ID for AI provider context
       * @returns An object containing error detection results
       */
      async detectErrorsInContent(content, subject, tenantId) {
        try {
          if (!content || content.trim().length === 0) {
            return {
              hasError: false,
              errorTitle: "",
              errorDescription: "",
              errorCategory: "",
              errorSeverity: "low"
            };
          }
          const provider = AIProviderFactory.getProviderForOperation(tenantId || 1, "chat");
          if (!provider) {
            log(`No AI provider available for error detection`, "email");
            return {
              hasError: false,
              errorTitle: "",
              errorDescription: "",
              errorCategory: "",
              errorSeverity: "low"
            };
          }
          const systemPrompt = `
        You are an error detection system that analyzes customer support emails.
        Determine if the email describes an error, issue, or problem that needs technical attention.
        If an error is detected, provide a concise error title, detailed description, category, and severity level.
        Format your response as JSON with the following fields:
        - hasError: boolean indicating if an error is detected
        - errorTitle: a concise title for the error (only if hasError is true)
        - errorDescription: detailed explanation of the error (only if hasError is true)
        - errorCategory: one of [software_bug, configuration_issue, user_error, hardware_problem, security_incident, performance_issue, other] (only if hasError is true)
        - errorSeverity: one of [low, medium, high] (only if hasError is true)
      `;
          const messages2 = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Subject: ${subject}

Email Content: ${content}` }
          ];
          const response2 = await provider.generateChatResponse(messages2, "", "");
          try {
            const result = JSON.parse(response2);
            return {
              hasError: !!result.hasError,
              errorTitle: result.hasError ? result.errorTitle || "Unspecified Error" : "",
              errorDescription: result.hasError ? result.errorDescription || "No description provided" : "",
              errorCategory: result.hasError ? result.errorCategory || "other" : "",
              errorSeverity: result.hasError ? result.errorSeverity === "low" || result.errorSeverity === "medium" || result.errorSeverity === "high" ? result.errorSeverity : "medium" : "low"
            };
          } catch (parseError) {
            log(`Error parsing AI response for error detection: ${parseError instanceof Error ? parseError.message : "Unknown error"}`, "email");
            return {
              hasError: false,
              errorTitle: "",
              errorDescription: "",
              errorCategory: "",
              errorSeverity: "low"
            };
          }
        } catch (error) {
          log(`Error detecting errors in content: ${error instanceof Error ? error.message : "Unknown error"}`, "email");
          return {
            hasError: false,
            errorTitle: "",
            errorDescription: "",
            errorCategory: "",
            errorSeverity: "low"
          };
        }
      }
      /**
       * Create an error ticket based on detected error in email
       * 
       * @param errorInfo Information about the detected error
       * @param originalTicketId ID of the original ticket that contains the error
       * @param fromEmail Email of the sender for notifications
       * @returns The created error ticket ID or null if creation failed
       */
      async createErrorTicket(errorInfo, originalTicketId, fromEmail, fromName) {
        try {
          let complexity;
          switch (errorInfo.errorSeverity) {
            case "low":
              complexity = "simple";
              break;
            case "high":
              complexity = "complex";
              break;
            default:
              complexity = "medium";
          }
          const errorTicket = {
            title: `[ERROR] ${errorInfo.errorTitle}`,
            description: `${errorInfo.errorDescription}

This error was automatically detected in ticket #${originalTicketId}.`,
            status: "new",
            category: errorInfo.errorCategory || "technical_issue",
            complexity,
            assignedTo: "",
            // Will need assignment by support team
            source: "auto_detected"
            // Note: priority is handled in classification process, not directly set here
          };
          const ticket = await storage.createTicket(errorTicket);
          const message = {
            ticketId: ticket.id,
            sender: "system",
            content: `This ticket was automatically created after detecting an error in ticket #${originalTicketId}.

Error category: ${errorInfo.errorCategory}
Severity: ${errorInfo.errorSeverity}

Original description: ${errorInfo.errorDescription}`,
            metadata: {
              fromEmail,
              fromName,
              autoDetected: true,
              originalTicketId,
              errorSeverity: errorInfo.errorSeverity
            }
          };
          await storage.createMessage(message);
          log(`Created error ticket #${ticket.id} from detecting error in ticket #${originalTicketId}`, "email");
          return ticket.id;
        } catch (error) {
          log(`Failed to create error ticket: ${error instanceof Error ? error.message : "Unknown error"}`, "email");
          return null;
        }
      }
      // Create a new ticket from an email
      async createTicketFromEmail(fromEmail, fromName, subject, textContent, htmlContent) {
        const newTicket = {
          title: subject,
          description: textContent || "No description provided",
          status: "new",
          category: "email",
          complexity: "medium",
          // Default complexity for manual processing
          assignedTo: "",
          // Will need to be assigned manually by support staff
          source: "email"
          // Clearly mark this as an email-generated ticket
        };
        const ticket = await storage.createTicket(newTicket);
        const message = {
          ticketId: ticket.id,
          sender: "user",
          content: textContent || "Empty message",
          metadata: {
            fromEmail,
            fromName,
            hasHtml: !!htmlContent
          }
        };
        await storage.createMessage(message);
        await this.sendEmail(
          fromEmail,
          `${this.config.settings.ticketSubjectPrefix}#${ticket.id}: Created - ${subject}`,
          EMAIL_TEMPLATES.ticketCreated(ticket.id, subject)
        );
        if (this.config.settings.enableAiResponses !== false) {
          try {
            const errorDetection = await this.detectErrorsInContent(textContent, subject, ticket.tenantId);
            if (errorDetection.hasError) {
              const errorTicketId = await this.createErrorTicket(
                errorDetection,
                ticket.id,
                fromEmail,
                fromName
              );
              if (errorTicketId) {
                log(`Error detected in email. Created error ticket #${errorTicketId} linked to original ticket #${ticket.id}`, "email");
                await storage.createMessage({
                  ticketId: ticket.id,
                  sender: "system",
                  content: `An error has been detected in this email and a separate ticket #${errorTicketId} has been created to track and resolve it.`,
                  metadata: {
                    errorTicketId,
                    autoDetected: true
                  }
                });
              }
            }
            const aiResponseSent = await this.generateAndSendAIResponse(ticket.id);
            if (aiResponseSent) {
              log(`AI response successfully generated and sent for new ticket #${ticket.id}`, "email");
            } else {
              log(`AI response generation skipped for new ticket #${ticket.id}`, "email");
            }
          } catch (aiError) {
            log(`Error in AI processing for new ticket #${ticket.id}: ${aiError instanceof Error ? aiError.message : "Unknown error"}`, "email");
          }
        } else {
          log(`AI responses are disabled in configuration - skipping for new ticket #${ticket.id}`, "email");
        }
        emailEvents.emit("ticketCreated", ticket.id);
      }
      // Send an email
      async sendEmail(to, subject, htmlContent) {
        try {
          await this.transporter.sendMail({
            from: `"${this.config.settings.fromName}" <${this.config.settings.fromEmail}>`,
            to,
            subject,
            html: htmlContent
          });
          log(`Email sent to ${to}: ${subject}`, "email");
        } catch (error) {
          log(`Error sending email to ${to}: ${error.message}`, "email");
          throw error;
        }
      }
      // Send a notification email about a ticket update
      async sendTicketUpdateEmail(ticketId, recipientEmail, subject, message) {
        return this.sendEmail(
          recipientEmail,
          `${this.config.settings.ticketSubjectPrefix}#${ticketId}: ${subject}`,
          EMAIL_TEMPLATES.ticketResponse(message)
        );
      }
    };
    emailService = null;
  }
});

// server/index.ts
import express4 from "express";

// server/routes.ts
init_storage();
init_ai();
import { createServer } from "http";

// server/ai/service.ts
init_db();
init_schema();
init_providers();
import { eq as eq2, and as and2, isNull as isNull2, or as or2 } from "drizzle-orm";

// server/ai/audit-log.ts
init_db();
init_schema();
async function logAiProviderAccess(logEntry) {
  try {
    await db.insert(aiProviderAudit).values({
      userId: logEntry.userId,
      tenantId: logEntry.tenantId,
      teamId: logEntry.teamId || null,
      action: `ai_provider_${logEntry.action}`,
      providerId: null,
      success: logEntry.success,
      details: {
        details: logEntry.details
      },
      timestamp: /* @__PURE__ */ new Date()
    });
  } catch (error) {
    console.error("Error logging AI provider access:", error);
  }
}
async function logAiProviderManagement(logEntry) {
  try {
    await db.insert(aiProviderAudit).values({
      userId: logEntry.userId,
      tenantId: logEntry.tenantId,
      teamId: null,
      action: `ai_provider_${logEntry.action}`,
      providerId: logEntry.providerId,
      success: true,
      details: logEntry.details,
      timestamp: /* @__PURE__ */ new Date()
    });
  } catch (error) {
    console.error("Error logging AI provider management:", error);
  }
}

// server/ai/service.ts
var aiProvidersCache = /* @__PURE__ */ new Map();
var lastCacheUpdate = 0;
var CACHE_TTL = 5 * 60 * 1e3;
async function loadProvidersFromDatabase(tenantId, teamId) {
  const maxRetries = 3;
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.pow(2, attempt) * 500;
        console.log(`Retrying loadProvidersFromDatabase for tenant ${tenantId} (attempt ${attempt + 1}/${maxRetries}) after ${backoffMs}ms backoff...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
      let filters = and2(
        eq2(aiProviders.tenantId, tenantId),
        eq2(aiProviders.enabled, true)
      );
      if (teamId !== void 0 && teamId !== null) {
        filters = and2(
          filters,
          or2(
            eq2(aiProviders.teamId, teamId),
            isNull2(aiProviders.teamId)
          )
        );
      }
      const providers = await db.select().from(aiProviders).where(filters).orderBy(aiProviders.priority);
      if (attempt > 0) {
        console.log(`Successfully loaded ${providers.length} AI providers on retry ${attempt + 1}`);
      }
      return providers;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error loading AI providers from database (attempt ${attempt + 1}/${maxRetries}):`, errorMessage);
      const isConnectionError = errorMessage.includes("timeout") || errorMessage.includes("connection") || errorMessage.includes("network") || errorMessage.includes("ECONNRESET");
      if (!isConnectionError || attempt === maxRetries - 1) {
        break;
      }
    }
  }
  console.error("All attempts to load AI providers failed, returning empty array");
  return [];
}
async function reloadProvidersFromDatabase(tenantId) {
  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.pow(2, attempt) * 500;
        console.log(`Retrying reloadProvidersFromDatabase (attempt ${attempt + 1}/${maxRetries}) after ${backoffMs}ms backoff...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
      if (tenantId) {
        const providers = await loadProvidersFromDatabase(tenantId);
        aiProvidersCache.set(tenantId, providers);
        AIProviderFactory.loadProvidersFromDatabase(tenantId, providers);
        console.log(`Reloaded ${providers.length} AI providers for tenant ${tenantId}`);
      } else {
        const allProviders = await db.select({ tenantId: aiProviders.tenantId }).from(aiProviders).groupBy(aiProviders.tenantId);
        for (const { tenantId: tenantId2 } of allProviders) {
          const providers = await loadProvidersFromDatabase(tenantId2);
          aiProvidersCache.set(tenantId2, providers);
          AIProviderFactory.loadProvidersFromDatabase(tenantId2, providers);
        }
        console.log(`Reloaded AI providers for ${aiProvidersCache.size} tenants`);
      }
      lastCacheUpdate = Date.now();
      if (attempt > 0) {
        console.log(`Successfully reloaded AI providers on retry ${attempt + 1}`);
      }
      return;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error reloading AI providers (attempt ${attempt + 1}/${maxRetries}):`, errorMessage);
      const isConnectionError = errorMessage.includes("timeout") || errorMessage.includes("connection") || errorMessage.includes("network") || errorMessage.includes("ECONNRESET");
      if (!isConnectionError || attempt === maxRetries - 1) {
        break;
      }
    }
  }
  console.error("All attempts to reload AI providers failed");
  throw lastError || new Error("Failed to reload AI providers after multiple attempts");
}
async function getAIProviders(tenantId, teamId) {
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL || !aiProvidersCache.has(tenantId)) {
    await reloadProvidersFromDatabase(tenantId);
  }
  const allTenantProviders = aiProvidersCache.get(tenantId) || [];
  if (teamId === void 0) {
    return allTenantProviders;
  }
  return allTenantProviders.filter(
    (provider) => provider.teamId === teamId || provider.teamId === null
  );
}
async function getAiProviderAccessForUser(tenantId, teamId) {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    return providers.length > 0;
  } catch (error) {
    console.error("Error checking AI provider access:", error);
    return false;
  }
}
async function getDefaultAIProvider(tenantId, teamId) {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    if (providers.length === 0) {
      return void 0;
    }
    const defaultProvider = providers.find((p) => p.isDefault);
    if (defaultProvider) {
      return defaultProvider;
    }
    return providers[0];
  } catch (error) {
    console.error("Error getting default AI provider:", error);
    return void 0;
  }
}
async function getAIProviderForUser(tenantId, teamId) {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    return providers.length > 0 ? providers[0] : void 0;
  } catch (error) {
    console.error("Error getting AI provider for user:", error);
    return void 0;
  }
}
async function getDefaultProviderForUser(tenantId, teamId) {
  return getDefaultAIProvider(tenantId, teamId);
}

// server/routes.ts
init_providers();
init_data_source_service();
init_agent_service();
init_schema();
import { z as z15 } from "zod";

// server/auth.ts
init_storage();
init_schema();
init_db();
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import createMemoryStore2 from "memorystore";

// server/tenant-middleware.ts
init_storage();
var tenantApiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ message: "API key is required" });
  }
  try {
    const tenant = await storage.getTenantByApiKey(apiKey);
    if (!tenant || !tenant.active) {
      return res.status(401).json({ message: "Invalid or inactive API key" });
    }
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
var checkCreatorRole = (req, res, next) => {
  if (req.user && req.user.role === "creator") {
    req.isCreatorUser = true;
    console.log(`User ${req.user.username} (ID: ${req.user.id}) has creator role - cross-tenant access enabled`);
  } else if (req.user && (req.user.role === "admin" || req.user.role === "administrator")) {
    req.isCreatorUser = false;
    console.log(`User ${req.user.username} (ID: ${req.user.id}) has ${req.user.role} role - tenant-specific access only`);
  } else {
    req.isCreatorUser = false;
  }
  next();
};

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const isProduction3 = process.env.NODE_ENV === "production" || process.env.REPLIT_ENVIRONMENT === "production";
  const salt = isProduction3 ? "97a66c9a73dcdd3710d82daa6967a53b" : randomBytes(16).toString("hex");
  console.log(`Hashing password with salt: ${salt}`);
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    if (!stored || !stored.includes(".")) {
      console.error("Password comparison failed: Invalid stored password format");
      return false;
    }
    const [hashed, salt] = stored.split(".");
    console.log("Password comparison:", {
      suppliedLength: supplied.length,
      storedLength: stored.length,
      hashedLength: hashed.length,
      saltLength: salt.length
    });
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log("Password comparison result:", result);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}
async function setupAuth(app2) {
  const isProduction3 = process.env.NODE_ENV === "production" || process.env.REPLIT_ENVIRONMENT === "production";
  console.log(`Auth setup - Environment: ${isProduction3 ? "Production" : "Development"}`);
  console.log(`Using PostgreSQL session store: ${storage.sessionStore ? "Yes" : "No"}`);
  const cookieConfig = {
    maxAge: 24 * 60 * 60 * 1e3,
    // 24 hours
    secure: false,
    // Setting secure: false works better with Replit deployments
    sameSite: "lax",
    httpOnly: true,
    path: "/"
  };
  console.log("Session cookie configuration:", cookieConfig);
  let sessionStore = storage.sessionStore;
  try {
    const now = Date.now();
    await new Promise((resolve, reject) => {
      const testTimeout = setTimeout(() => {
        console.warn("Session store connection test timed out");
        reject(new Error("Connection timeout"));
      }, 2e3);
      storage.sessionStore.set(`test-${now}`, { cookie: { maxAge: 1e4 }, test: "connection-test" }, (err) => {
        clearTimeout(testTimeout);
        if (err) {
          reject(err);
        } else {
          console.log("Session store connection test successful");
          resolve();
        }
      });
    });
  } catch (storeError) {
    console.error("Session store connection failed, using memory store:", storeError);
    const MemoryStore = createMemoryStore2(session2);
    sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // 24 hours
    });
    console.log("Memory session store initialized as emergency fallback");
  }
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    resave: true,
    // Changed to true to ensure session is saved
    saveUninitialized: true,
    // Changed to true to ensure new sessions are saved
    store: sessionStore,
    // Use our tested and verified store
    cookie: cookieConfig,
    name: "ticket_support_sid",
    // Custom name for session cookie to avoid conflicts
    // Add error handling for session store operations
    unset: "destroy"
    // Remove session from store when req.session is destroyed
  };
  app2.use(session2(sessionSettings));
  app2.use(async (req, res, next) => {
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
          console.log("User authenticated via session:", user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    } else {
      const backupSessionId = req.cookies?.ticket_support_sid_backup;
      if (backupSessionId) {
        console.log("Found backup session ID, attempting to recover session");
        console.log("Backup session ID:", backupSessionId);
      }
      if (!req.user && req.cookies?.ticket_auth_user_id) {
        const userId = parseInt(req.cookies.ticket_auth_user_id);
        console.log("Found direct user ID cookie, attempting to recover user:", userId);
        if (!isNaN(userId)) {
          try {
            const user = await storage.getUser(userId);
            if (user) {
              req.user = user;
              req.session.userId = user.id;
              console.log("User authenticated via backup cookie:", user.id);
              await new Promise((resolve) => {
                req.session.save(() => resolve());
              });
            }
          } catch (error) {
            console.error("Error restoring user from backup cookie:", error);
          }
        }
      }
    }
    next();
  });
  app2.use(checkCreatorRole);
  const requireAuth2 = (req, res, next) => {
    if (req.user) {
      next();
    } else {
      const directUserId = req.cookies?.ticket_auth_user_id;
      if (directUserId) {
        const userId = parseInt(directUserId);
        if (!isNaN(userId)) {
          storage.getUser(userId).then((user) => {
            if (user) {
              req.user = user;
              req.session.userId = user.id;
              req.session.save(() => {
                console.log(`User ${user.id} authenticated via direct cookie`);
                next();
              });
            } else {
              res.status(401).json({ message: "Unauthorized" });
            }
          }).catch((error) => {
            console.error("Error restoring user from direct cookie:", error);
            res.status(401).json({ message: "Unauthorized" });
          });
        } else {
          res.status(401).json({ message: "Unauthorized" });
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    }
  };
  const requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (allowedRoles.includes(req.user.role) || req.user.role === "admin" || req.user.role === "creator" || req.user.role === "administrator") {
        next();
      } else {
        res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
    };
  };
  app2.post("/api/register", async (req, res) => {
    return res.status(403).json({
      message: "Public registration is disabled. Please contact a creator user to create an account.",
      code: "REGISTRATION_DISABLED"
    });
  });
  app2.post("/api/login", async (req, res) => {
    try {
      console.log("Login attempt received:", {
        body: req.body,
        method: req.method,
        path: req.path,
        headers: {
          "content-type": req.get("content-type"),
          "user-agent": req.get("user-agent")
        }
      });
      const { username, password } = req.body;
      if (!username || !password) {
        console.log("Login failed: Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }
      let user;
      try {
        user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`Login failed: User ${username} not found`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        console.log(`User found: ${username} (ID: ${user.id})`);
      } catch (userError) {
        console.error("Error fetching user:", userError);
        return res.status(500).json({
          message: "Error fetching user account",
          details: userError.message
        });
      }
      try {
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          console.log(`Login failed: Invalid password for user ${username}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        console.log("Password verified successfully");
      } catch (passwordError) {
        console.error("Error verifying password:", passwordError);
        return res.status(500).json({
          message: "Error verifying password",
          details: passwordError.message
        });
      }
      try {
        req.session.userId = user.id;
        req.user = user;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        res.cookie("ticket_support_sid_backup", req.session.id, {
          maxAge: 24 * 60 * 60 * 1e3,
          // 24 hours
          secure: false,
          sameSite: "lax",
          httpOnly: true,
          path: "/"
        });
        res.cookie("ticket_auth_user_id", user.id.toString(), {
          maxAge: 24 * 60 * 60 * 1e3,
          // 24 hours
          secure: false,
          sameSite: "lax",
          httpOnly: true,
          path: "/"
        });
        console.log(`Session created for user ID: ${user.id}`);
        console.log("Session data:", {
          id: req.session.id,
          cookie: JSON.stringify(req.session.cookie),
          userId: req.session.userId,
          user: req.user ? "User object available" : "No user object",
          sessionStore: req.sessionStore ? "Session store available" : "No session store found"
        });
      } catch (sessionError) {
        console.error("Error creating session:", sessionError);
        return res.status(500).json({
          message: "Error creating session",
          details: sessionError.message
        });
      }
      const { password: _, ...userWithoutPassword } = user;
      console.log("Login successful, sending response");
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.post("/api/logout", (req, res) => {
    console.log("Logout attempt received for session ID:", req.session.id);
    res.clearCookie("ticket_support_sid");
    res.clearCookie("ticket_support_sid_backup");
    res.clearCookie("ticket_auth_user_id");
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout", details: err.message });
      }
      res.clearCookie("ticket_support_sid", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      res.clearCookie("ticket_support_sid_backup", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      res.clearCookie("ticket_auth_user_id", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      console.log("Session destroyed and cookies cleared successfully");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/user", async (req, res) => {
    try {
      const traceId2 = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      let sessionIdLog = "No session ID available";
      try {
        sessionIdLog = req.session?.id || "Session exists but no ID";
      } catch (sessionError) {
        console.error(`API user request [${traceId2}] - Error accessing session ID:`, sessionError);
      }
      console.log(`API user request [${traceId2}] - Session ID:`, sessionIdLog);
      let sessionDataLog = {
        userId: "Error accessing userId",
        cookie: "Error accessing cookie data",
        sessionStore: "Error determining session store status"
      };
      try {
        sessionDataLog = {
          userId: req.session?.userId,
          cookie: req.session?.cookie ? JSON.stringify(req.session.cookie) : "No cookie data",
          sessionStore: req.sessionStore ? "Session store available" : "No session store found"
        };
      } catch (sessionDataError) {
        console.error(`API user request [${traceId2}] - Error accessing session data:`, sessionDataError);
      }
      console.log(`API user request [${traceId2}] - Session data:`, sessionDataLog);
      if (req.user) {
        try {
          const { password: _, ...userWithoutPassword } = req.user;
          console.log(`API user request [${traceId2}] - Returning user data for:`, userWithoutPassword.username);
          return res.status(200).json(userWithoutPassword);
        } catch (userObjectError) {
          console.error(`API user request [${traceId2}] - Error processing user object:`, userObjectError);
        }
      }
      console.log(`API user request [${traceId2}] - User data: No user in request`);
      if (req.session.userId) {
        try {
          console.log(`API user request [${traceId2}] - Attempting to restore from session.userId:`, req.session.userId);
          let user;
          try {
            user = await storage.getUser(req.session.userId);
          } catch (dbError) {
            console.error(`API user request [${traceId2}] - Database error fetching user:`, dbError);
            if (dbError && typeof dbError === "object" && (dbError.code === "ECONNREFUSED" || dbError.code === "57P01" || dbError.code === "08006" || dbError.code === "ETIMEDOUT")) {
              console.error(`API user request [${traceId2}] - Database connection error, attempting reconnection...`);
              try {
                const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
                await db2.reconnectDb();
                console.log(`API user request [${traceId2}] - Attempting to fetch user after reconnection`);
                user = await storage.getUser(req.session.userId);
              } catch (reconnectError) {
                console.error(`API user request [${traceId2}] - Reconnection attempt failed:`, reconnectError);
              }
            }
          }
          if (user) {
            req.user = user;
            try {
              const { password: _, ...userWithoutPassword } = user;
              console.log(`API user request [${traceId2}] - User restored from session.userId:`, user.id);
              return res.status(200).json(userWithoutPassword);
            } catch (responseError) {
              console.error(`API user request [${traceId2}] - Error formatting user response:`, responseError);
            }
          } else {
            console.log(`API user request [${traceId2}] - No user found for session.userId:`, req.session.userId);
          }
        } catch (err) {
          console.error(`API user request [${traceId2}] - Error in session.userId fallback:`, err);
        }
      }
      const backupSessionId = req.cookies?.ticket_support_sid_backup;
      if (backupSessionId) {
        console.log("Attempting user lookup using backup session ID:", backupSessionId);
        console.log("All cookies:", req.cookies);
      }
      const directUserId = req.cookies?.ticket_auth_user_id;
      if (directUserId) {
        try {
          console.log(`API user request [${traceId2}] - Attempting to restore from direct user ID cookie:`, directUserId);
          const userId = parseInt(directUserId);
          if (!isNaN(userId)) {
            let user;
            try {
              user = await storage.getUser(userId);
            } catch (dbError) {
              console.error(`API user request [${traceId2}] - Database error fetching user:`, dbError);
              if (dbError && typeof dbError === "object" && (dbError.code === "ECONNREFUSED" || dbError.code === "57P01" || dbError.code === "08006" || dbError.code === "ETIMEDOUT")) {
                console.error(`API user request [${traceId2}] - Database connection error, attempting reconnection...`);
                try {
                  const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
                  await db2.reconnectDb();
                  console.log(`API user request [${traceId2}] - Attempting to fetch user after reconnection`);
                  user = await storage.getUser(userId);
                } catch (reconnectError) {
                  console.error(`API user request [${traceId2}] - Reconnection attempt failed:`, reconnectError);
                }
              }
            }
            if (user) {
              req.user = user;
              req.session.userId = user.id;
              try {
                req.session.save((saveErr) => {
                  if (saveErr) {
                    console.error(`API user request [${traceId2}] - Error saving session:`, saveErr);
                  } else {
                    console.log(`API user request [${traceId2}] - Session saved with restored user ID:`, user.id);
                  }
                });
              } catch (saveError) {
                console.error(`API user request [${traceId2}] - Exception saving session:`, saveError);
              }
              try {
                const { password: _, ...userWithoutPassword } = user;
                console.log(`API user request [${traceId2}] - User restored from direct ID cookie:`, user.id);
                return res.status(200).json(userWithoutPassword);
              } catch (responseError) {
                console.error(`API user request [${traceId2}] - Error formatting user response:`, responseError);
              }
            }
          }
        } catch (err) {
          console.error(`API user request [${traceId2}] - Error restoring user from direct ID cookie:`, err);
        }
      }
      try {
        console.log(`API user request [${traceId2}] - All restore attempts failed, checking admin user as a diagnostic step`);
        let adminUser;
        try {
          adminUser = await storage.getUserByUsername("admin");
        } catch (dbError) {
          console.error(`API user request [${traceId2}] - Database error checking admin:`, dbError);
          if (dbError && typeof dbError === "object" && (dbError.code === "ECONNREFUSED" || dbError.code === "57P01" || dbError.code === "08006" || dbError.code === "ETIMEDOUT")) {
            console.error(`API user request [${traceId2}] - Database connection error, attempting reconnection...`);
            try {
              const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
              await db2.reconnectDb();
              console.log(`API user request [${traceId2}] - Attempting to check admin after reconnection`);
              adminUser = await storage.getUserByUsername("admin");
            } catch (reconnectError) {
              console.error(`API user request [${traceId2}] - Reconnection attempt failed:`, reconnectError);
            }
          }
        }
        console.log(`API user request [${traceId2}] - Admin user exists in database:`, !!adminUser);
        if (adminUser) {
          console.log(`API user request [${traceId2}] - Admin user ID:`, adminUser.id);
        }
      } catch (dbError) {
        console.error(`API user request [${traceId2}] - Failed to check admin user in database:`, dbError);
      }
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Get user error:", error);
      try {
        if (error && typeof error === "object") {
          let errorCode;
          try {
            errorCode = error.code ? error.code.toString() : void 0;
          } catch (e) {
            console.error(`API user request [${traceId}] - Error accessing error.code:`, e);
          }
          const isDbConnectionError = errorCode && ["ECONNREFUSED", "57P01", "08006", "ETIMEDOUT", "08001", "ENOTFOUND"].includes(errorCode);
          if (isDbConnectionError) {
            console.error(`API user request [${traceId}] - Database connection error in auth endpoint (${errorCode}), attempting reconnection...`);
            try {
              const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
              db2.reconnectDb().catch((e) => console.error(`API user request [${traceId}] - Failed to reconnect DB:`, e));
            } catch (importError) {
              console.error(`API user request [${traceId}] - Failed to import db module:`, importError);
            }
            let errorDetails = "Unknown database error";
            try {
              errorDetails = error.message || errorCode || "No additional details";
            } catch (e) {
              console.error(`API user request [${traceId}] - Error accessing error properties:`, e);
            }
            return res.status(503).json({
              message: "Error fetching user account",
              error_type: "database_connection",
              retry_after: 5,
              // Suggest retry after 5 seconds
              details: process.env.NODE_ENV === "development" ? errorDetails : void 0
            });
          }
        }
      } catch (errorHandlingError) {
        console.error(`API user request [${traceId}] - Error in database error handler:`, errorHandlingError);
      }
      let errorMessage = "Unknown error";
      try {
        if (error && typeof error === "object" && error.message) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }
      } catch (msgError) {
        console.error(`API user request [${traceId}] - Error getting error message:`, msgError);
      }
      res.status(500).json({
        message: "Internal server error",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? error && typeof error === "object" ? error.stack : void 0 : void 0
      });
    }
  });
  app2.get("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        role: users.role,
        name: users.name,
        email: users.email,
        teamId: users.teamId,
        createdAt: users.createdAt
      }).from(users);
      res.status(200).json(allUsers);
    } catch (error) {
      console.error("List users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  return { requireAuth: requireAuth2, requireRole };
}

// server/routes/email-routes.ts
await init_email_service();
init_storage();
import { z as z2 } from "zod";
import nodemailer2 from "nodemailer";
import IMAP2 from "imap";
var basicAuthSchema = z2.object({
  type: z2.literal("basic"),
  user: z2.string(),
  pass: z2.string()
});
var emailConfigSchema = z2.object({
  smtp: z2.object({
    host: z2.string(),
    port: z2.number(),
    secure: z2.boolean(),
    auth: basicAuthSchema
  }),
  imap: z2.object({
    host: z2.string(),
    port: z2.number(),
    tls: z2.boolean(),
    authTimeout: z2.number().default(1e4),
    auth: basicAuthSchema
  }),
  settings: z2.object({
    fromName: z2.string(),
    fromEmail: z2.string().email(),
    ticketSubjectPrefix: z2.string().default("[Support]"),
    checkInterval: z2.number().default(6e4),
    // 1 minute
    enableAiResponses: z2.boolean().default(true).describe("When enabled, the system will automatically generate AI responses to incoming email tickets")
  })
});
function registerEmailRoutes(app2, requireAuth2) {
  app2.post("/api/email/config", requireAuth2, async (req, res) => {
    let responseSent = false;
    try {
      const config = emailConfigSchema.parse(req.body);
      if (!config.smtp.auth.user || !config.smtp.auth.pass) {
        responseSent = true;
        return res.status(400).json({
          success: false,
          message: "SMTP authentication credentials are incomplete",
          details: {
            smtpAuthComplete: !!config.smtp.auth.user && !!config.smtp.auth.pass
          }
        });
      }
      if (!config.imap.auth.user || !config.imap.auth.pass) {
        console.log("Note: IMAP credentials not provided - SMTP-only configuration");
      }
      console.log(`Saving email config with SMTP user: ${config.smtp.auth.user}, IMAP user: ${config.imap.auth.user || "not provided"}`);
      responseSent = true;
      res.status(202).json({
        success: true,
        message: "Verifying SMTP connection...",
        details: {
          smtpStatus: "connecting",
          step: "smtp_verification",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      try {
        const isPort587 = config.smtp.port === 587;
        const isPort465 = config.smtp.port === 465;
        const isGmail = config.smtp.host.includes("gmail.com");
        const secureOption = isPort465;
        config.smtp.secure = secureOption;
        console.log(`[DEBUG] Testing SMTP connection for ${config.smtp.host}:${config.smtp.port} (secure: ${secureOption}, isGmail: ${isGmail})`);
        let transportOptions = {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: secureOption,
          // true for 465, false for other ports
          auth: {
            user: config.smtp.auth.user,
            pass: config.smtp.auth.pass
          },
          tls: {
            // Don't fail on invalid certs
            rejectUnauthorized: false
          }
        };
        if (isGmail) {
          console.log("[DEBUG] Using Gmail-specific SMTP configuration");
          transportOptions = {
            service: "gmail",
            auth: {
              user: config.smtp.auth.user,
              pass: config.smtp.auth.pass
              // This should be an app password if 2FA is enabled
            },
            tls: {
              rejectUnauthorized: false
            }
          };
          console.log("[DEBUG] Gmail SMTP transport configured with service shorthand");
        }
        if (isGmail) {
          if (isPort587) {
            console.log("[DEBUG] For Gmail using port 587 (usually needs secure: false + STARTTLS)");
          } else if (isPort465) {
            console.log("[DEBUG] For Gmail using port 465 (usually needs secure: true + SSL/TLS)");
          } else {
            console.log(`[DEBUG] For Gmail using non-standard port: ${config.smtp.port}`);
          }
        }
        if (isPort587 && !isGmail) {
          console.log("[DEBUG] Using port 587 special configuration with STARTTLS");
          transportOptions.secure = false;
          transportOptions.requireTLS = true;
        }
        console.log(`[DEBUG] Creating SMTP transport with options:`, JSON.stringify({
          ...transportOptions,
          auth: {
            ...transportOptions.auth,
            pass: "********"
            // Mask password in logs
          }
        }, null, 2));
        const testTransport = nodemailer2.createTransport(transportOptions);
        console.log("[DEBUG] About to verify SMTP connection...");
        await testTransport.verify();
        console.log("[DEBUG] SMTP connection test successful!");
      } catch (smtpError) {
        const errorMessage = smtpError instanceof Error ? smtpError.message : "Unknown SMTP error";
        console.error(`SMTP connection test failed: ${errorMessage}`);
        const errorType = smtpError instanceof Error ? smtpError.constructor.name : "UnknownError";
        if (responseSent) {
          console.log("Response already sent (202), not sending SMTP error response");
          return;
        }
        responseSent = true;
        return res.status(400).json({
          success: false,
          message: "SMTP connection test failed",
          error: errorMessage,
          details: {
            smtpTest: "failed",
            errorType,
            possibleCauses: [
              "Invalid SMTP server address or port",
              "Incorrect credentials",
              "Server rejects connection",
              "SSL/TLS configuration issue",
              "Firewall blocking connection",
              "Gmail 2FA requires app passwords",
              "Gmail less secure apps setting"
            ],
            recommendations: [
              "Verify SMTP server address and port",
              "Check username and password",
              "For Gmail: Try port 587 with secure:false",
              "For Gmail: Use an app password if you have 2FA enabled (https://myaccount.google.com/apppasswords)",
              "For Gmail: Make sure 'Allow less secure apps' is enabled",
              "Use Gmail app passwords: https://support.google.com/accounts/answer/185833",
              "Ensure your mail provider allows SMTP access"
            ]
          }
        });
      }
      const emailService2 = setupEmailService(config);
      try {
        const tenantId = req.user?.tenantId || 1;
        console.log(`[DEBUG] Getting tenant for ID ${tenantId} to save email configuration`);
        const tenant = await storage.getTenantById(tenantId);
        if (tenant) {
          console.log(`[DEBUG] Tenant found:`, {
            id: tenant.id,
            name: tenant.name,
            hasSettings: tenant.settings !== void 0 && tenant.settings !== null,
            settingsType: tenant.settings ? typeof tenant.settings : "null/undefined",
            settingsIsObject: tenant.settings && typeof tenant.settings === "object",
            settingsKeys: tenant.settings && typeof tenant.settings === "object" ? Object.keys(tenant.settings) : []
          });
          let existingSettings = {};
          try {
            if (tenant.settings) {
              if (typeof tenant.settings === "string") {
                existingSettings = JSON.parse(tenant.settings);
                console.log("[DEBUG] Parsed settings from string");
              } else if (typeof tenant.settings === "object") {
                existingSettings = tenant.settings;
                console.log("[DEBUG] Using settings as object");
              } else {
                console.log("[DEBUG] Unexpected settings type, creating empty object");
              }
            } else {
              console.log("[DEBUG] No existing settings, creating empty object");
            }
          } catch (parseError) {
            console.error("[ERROR] Error parsing existing settings:", parseError);
            console.log("[DEBUG] Using empty settings object due to parse error");
          }
          const updatedSettings = {
            ...existingSettings,
            emailConfig: config
          };
          console.log(`[DEBUG] Prepared updated settings:`, {
            updatedType: typeof updatedSettings,
            updatedKeys: Object.keys(updatedSettings),
            hasEmailConfig: "emailConfig" in updatedSettings,
            emailConfigType: typeof updatedSettings.emailConfig
          });
          const sanitizedConfig = JSON.parse(JSON.stringify(config));
          if (sanitizedConfig.smtp?.auth?.pass) sanitizedConfig.smtp.auth.pass = "********";
          if (sanitizedConfig.imap?.auth?.pass) sanitizedConfig.imap.auth.pass = "********";
          console.log(`[DEBUG] Email config being saved:`, JSON.stringify(sanitizedConfig, null, 2));
          try {
            console.log("[DEBUG] Calling updateTenant with settings object");
            const updatedTenant = await storage.updateTenant(tenantId, {
              settings: updatedSettings
            });
            console.log(`[DEBUG] Tenant update function returned successfully`);
            console.log(`[DEBUG] Updated tenant:`, {
              id: updatedTenant.id,
              name: updatedTenant.name,
              hasSettings: updatedTenant.settings !== void 0 && updatedTenant.settings !== null,
              settingsType: updatedTenant.settings ? typeof updatedTenant.settings : "null/undefined",
              settingsIsObject: updatedTenant.settings && typeof updatedTenant.settings === "object",
              settingsKeys: updatedTenant.settings && typeof updatedTenant.settings === "object" ? Object.keys(updatedTenant.settings) : []
            });
            const verifyTenant = await storage.getTenantById(tenantId);
            console.log("[DEBUG] Verification tenant after update:", {
              hasSettings: verifyTenant?.settings !== void 0 && verifyTenant?.settings !== null,
              settingsType: verifyTenant?.settings ? typeof verifyTenant.settings : "null/undefined",
              hasEmailConfig: verifyTenant?.settings && typeof verifyTenant.settings === "object" && "emailConfig" in verifyTenant.settings
            });
          } catch (updateError) {
            console.error("[ERROR] Error during updateTenant call:", updateError);
            console.log("[DEBUG] Update tenant operation failed, but continuing with in-memory service");
          }
        } else {
          console.error(`[ERROR] Tenant ${tenantId} not found, cannot save email configuration`);
        }
      } catch (storageError) {
        console.error("[ERROR] Error in tenant settings update process:", storageError);
      }
      emailService2.startEmailMonitoring();
      const hasValidImapConfig = config.imap && config.imap.auth && config.imap.auth.user && config.imap.auth.pass;
      let imapTestResult = { success: false, error: null };
      if (hasValidImapConfig) {
        try {
          const testImapClient = new IMAP2({
            user: config.imap.auth.user,
            password: config.imap.auth.pass,
            host: config.imap.host,
            port: config.imap.port,
            tls: config.imap.tls,
            authTimeout: config.imap.authTimeout,
            // Set a short connection timeout for testing
            connTimeout: 5e3
          });
          const imapConnectionTest = new Promise((resolve, reject) => {
            testImapClient.once("ready", () => {
              console.log("IMAP connection test successful");
              testImapClient.end();
              resolve();
            });
            testImapClient.once("error", (err) => {
              console.error(`IMAP connection test failed: ${err.message}`);
              reject(err);
            });
            testImapClient.connect();
          });
          await Promise.race([
            imapConnectionTest,
            new Promise((_, reject) => setTimeout(() => reject(new Error("IMAP connection timeout")), 1e4))
          ]);
          imapTestResult.success = true;
        } catch (imapError) {
          const errorMessage = imapError instanceof Error ? imapError.message : "Unknown IMAP error";
          console.error(`IMAP connection failed: ${errorMessage}`);
          imapTestResult.error = errorMessage;
          console.log("Continuing with SMTP-only mode due to IMAP connection failure");
        }
      }
      let responseMessage = "SMTP-only email configuration saved";
      let imapStatus = "not_configured";
      if (hasValidImapConfig) {
        if (imapTestResult.success) {
          responseMessage = "Email configuration saved and monitoring started";
          imapStatus = "connected";
        } else {
          responseMessage = "Email configuration saved with SMTP only (IMAP connection failed)";
          imapStatus = "connection_failed";
        }
      }
      if (!responseSent) {
        res.status(200).json({
          success: true,
          message: responseMessage,
          details: {
            configSaved: true,
            serviceName: "Email Integration Service",
            serviceStatus: "running",
            tenantId: req.user?.tenantId || 1,
            smtpConfigured: true,
            smtpStatus: "connected",
            imapConfigured: hasValidImapConfig,
            imapStatus,
            imapError: imapTestResult.error,
            monitoringActive: hasValidImapConfig && imapTestResult.success,
            supportEmailSending: true,
            supportEmailReceiving: hasValidImapConfig && imapTestResult.success,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      } else {
        console.log("Response already sent (202), skipping final success response");
      }
    } catch (error) {
      if (error instanceof z2.ZodError) {
        responseSent = true;
        return res.status(400).json({
          message: "Invalid email configuration",
          errors: error.errors
        });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({
          success: false,
          message: `Error setting up email: ${errorMessage}`,
          details: {
            errorType,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            tenantId: req.user?.tenantId || 1,
            configProcessed: false,
            possibleCauses: [
              "Connection to mail server failed",
              "Invalid credentials provided",
              "Server may be blocking connection",
              "Firewall or network issues",
              "Gmail 2FA requires app passwords",
              "SSL/TLS configuration issues"
            ],
            recommendations: [
              "Check mail server URLs and ports",
              "Verify username and password",
              "For Gmail: Use an app password if you have 2FA enabled (https://myaccount.google.com/apppasswords)",
              "For Gmail: Try service:'gmail' instead of host/port configuration",
              "For Gmail: Make sure 'Allow less secure apps' is enabled",
              "Ensure your mail provider allows third-party connections"
            ]
          }
        });
      } else {
        console.log(`Error occurred but response already sent: ${errorMessage}`);
      }
    }
  });
  app2.get("/api/email/status", async (req, res) => {
    try {
      const emailService2 = getEmailService();
      if (!emailService2) {
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        if (tenant?.settings && typeof tenant.settings === "object" && "emailConfig" in tenant.settings) {
          return res.status(200).json({
            configured: true,
            active: false,
            mode: "saved_but_inactive",
            message: "Email configuration exists but service is not running",
            details: {
              reason: "Service not initialized",
              configSource: "database",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          });
        }
        return res.status(200).json({
          configured: false,
          active: false,
          mode: "not_configured",
          message: "Email support is not configured",
          details: {
            configRequired: true,
            configureLink: "/admin/email-settings",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      const config = emailService2.getConfig();
      const hasImapConfig = config.imap && config.imap.auth && config.imap.auth.user && config.imap.auth.pass;
      return res.status(200).json({
        configured: true,
        active: true,
        mode: hasImapConfig ? "full" : "smtp_only",
        message: hasImapConfig ? "Email system fully configured (send and receive)" : "Email system configured for sending only (SMTP)",
        supportEmail: config.settings.fromEmail,
        details: {
          fromName: config.settings.fromName,
          canSendEmails: true,
          canReceiveEmails: hasImapConfig,
          ticketSubjectPrefix: config.settings.ticketSubjectPrefix,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error getting email status: ${errorMessage}`);
      return res.status(500).json({
        configured: false,
        active: false,
        mode: "error",
        message: "Error retrieving email configuration status",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/api/email/config", requireAuth2, async (req, res) => {
    try {
      const emailService2 = getEmailService();
      if (!emailService2) {
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        if (tenant?.settings && typeof tenant.settings === "object" && "emailConfig" in tenant.settings) {
          return res.status(200).json(tenant.settings.emailConfig);
        }
        return res.status(200).json({
          message: "No email configuration found",
          config: null
        });
      }
      const config = emailService2.getConfig();
      if (config.smtp?.auth?.type === "basic" && config.smtp.auth.pass) {
        config.smtp.auth.pass = "********";
      }
      if (config.imap?.auth?.type === "basic" && config.imap.auth.pass) {
        config.imap.auth.pass = "********";
      }
      return res.status(200).json(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ message: `Error retrieving email configuration: ${errorMessage}` });
    }
  });
  app2.post("/api/email/test", requireAuth2, async (req, res) => {
    const emailService2 = getEmailService();
    if (!emailService2) {
      return res.status(400).json({ message: "Email service not configured" });
    }
    try {
      const { to, subject, message } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      const emailSubject = subject || "Test Email from Support System";
      const emailContent = message || "<p>This is a test email from your support system.</p><p>If you received this, your email configuration is working correctly.</p>";
      await emailService2.sendEmail(
        to,
        emailSubject,
        emailContent
      );
      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
        details: {
          testEmailSent: true,
          recipient: to,
          subject: emailSubject,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
      console.error(`Test email error: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: `Error sending test email: ${errorMessage}`,
        details: {
          testEmailError: true,
          errorType,
          errorDetails: errorMessage,
          possibleCauses: [
            "Connection to mail server failed",
            "Invalid credentials provided",
            "Recipient email address is invalid",
            "SMTP server rejected the message"
          ],
          recommendations: [
            "Verify your email configuration settings",
            "Check that the recipient address is valid",
            "Ensure your mail provider allows sending from your account",
            "Try sending to a different email address"
          ],
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  });
  app2.post("/api/tickets/:ticketId/email", requireAuth2, async (req, res) => {
    const emailService2 = getEmailService();
    if (!emailService2) {
      return res.status(400).json({ message: "Email service not configured" });
    }
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { recipient, subject, message } = req.body;
      if (!recipient || !subject || !message) {
        return res.status(400).json({ message: "Recipient, subject, and message are required" });
      }
      const ticket = await storage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      await emailService2.sendTicketUpdateEmail(ticketId, recipient, subject, message);
      await storage.createMessage({
        ticketId,
        sender: "support",
        content: `Email sent to ${recipient}: ${message}`,
        metadata: {
          emailSent: true,
          recipient,
          subject
        }
      });
      res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
      console.error(`Error sending ticket email: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: `Error sending email: ${errorMessage}`,
        error: {
          type: errorType,
          details: errorMessage,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  });
}

// server/routes/email-support-routes.ts
init_storage();
await init_email_service();
import { z as z3 } from "zod";
var emailSupportSchema = z3.object({
  email: z3.string().email("Please enter a valid email address"),
  subject: z3.string().min(5, "Subject must be at least 5 characters"),
  message: z3.string().min(10, "Message must be at least 10 characters")
});
function registerEmailSupportRoutes(app2) {
  app2.post("/api/email-support", async (req, res) => {
    try {
      const validatedData = emailSupportSchema.parse(req.body);
      const { email, subject, message } = validatedData;
      const tenantId = req.user?.tenantId || 1;
      const responseText = "Thank you for contacting our support team. Your message has been received and we will review it shortly. A support ticket has been created and a team member will get back to you as soon as possible.";
      const fullEmailResponse = `Dear Customer,

${responseText}

Best regards,
The Support Team`;
      const emailService2 = getEmailService();
      let emailsSent = false;
      if (emailService2) {
        try {
          await emailService2.sendEmail(
            email,
            `Re: ${subject}`,
            `<p>${fullEmailResponse.replace(/\n/g, "<br/>")}</p>`
          );
          const supportEmail = emailService2.getConfig().settings.fromEmail;
          const notificationContent = `
            <h2>New Email Support Request</h2>
            <p><strong>From:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `;
          await emailService2.sendEmail(
            supportEmail,
            `[Support Request] ${subject}`,
            notificationContent
          );
          emailsSent = true;
        } catch (emailError) {
          console.error("Error sending emails:", emailError);
        }
      } else {
        console.warn("Email service not configured. Processing support request without sending emails.");
      }
      try {
        const ticket = await storage.createTicket({
          title: subject,
          description: message,
          status: "new",
          // No longer automatically resolved - needs human review
          category: "email_support",
          complexity: "medium",
          // Default complexity
          tenantId,
          source: "email",
          clientMetadata: { email, createdBy: "email_support_system" }
        });
        await storage.createMessage({
          ticketId: ticket.id,
          sender: "customer",
          content: message
        });
        await storage.createMessage({
          ticketId: ticket.id,
          sender: "system",
          content: responseText
        });
      } catch (error) {
        console.error("Error logging email support interaction:", error);
      }
      return res.status(200).json({
        message: emailsSent ? "Support request processed successfully" : "Support request processed successfully, but email delivery is not configured",
        autoResponse: responseText,
        emailSent: emailsSent,
        emailConfigured: !!emailService2
      });
    } catch (error) {
      console.error("Error processing email support request:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors
        });
      }
      return res.status(500).json({
        message: "Error processing support request",
        error: error.message || "Unknown error"
      });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          message: "Name, email, subject, and message are required"
        });
      }
      const emailService2 = getEmailService();
      if (!emailService2) {
        console.warn("Email service not configured. Processing contact form without sending emails.");
        return res.status(200).json({
          message: "Contact form submitted successfully, but email delivery is not configured",
          emailSent: false,
          emailConfigured: false
        });
      }
      const notificationContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `;
      const supportEmail = emailService2.getConfig().settings.fromEmail;
      await emailService2.sendEmail(
        supportEmail,
        `Contact Form: ${subject}`,
        notificationContent
      );
      await emailService2.sendEmail(
        email,
        `We received your message: ${subject}`,
        `<p>Dear ${name},</p>
        <p>Thank you for contacting us. We have received your message and will get back to you shortly.</p>
        <p>Best regards,<br>The Support Team</p>`
      );
      return res.status(200).json({
        message: "Contact form submitted successfully",
        emailSent: true,
        emailConfigured: true
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      return res.status(500).json({
        message: "Error processing contact form",
        error: error.message || "Unknown error"
      });
    }
  });
}

// server/routes/integration-routes.ts
import { z as z4 } from "zod";

// server/integrations/zendesk.ts
import axios5 from "axios";
var ZendeskService = class {
  apiUrl;
  auth;
  enabled;
  constructor(config) {
    this.apiUrl = `https://${config.subdomain}.zendesk.com/api/v2`;
    this.auth = {
      username: `${config.email}/token`,
      password: config.apiToken
    };
    this.enabled = config.enabled;
  }
  /**
   * Check if Zendesk integration is enabled
   */
  isEnabled() {
    return this.enabled;
  }
  /**
   * Create a ticket in Zendesk from the local system
   */
  async createTicket(ticket) {
    if (!this.enabled) {
      console.log("Zendesk service not enabled, skipping ticket creation");
      return null;
    }
    try {
      console.log(`Creating Zendesk ticket for ticket: "${ticket.title}"`);
      const ticketData = {
        ticket: {
          subject: ticket.title,
          comment: {
            body: ticket.description || "No description provided."
          },
          priority: this.mapComplexityToPriority(ticket.complexity),
          tags: [ticket.category],
          custom_fields: [
            // Replace with actual custom field IDs or remove if not needed
            { id: 123456789, value: ticket.aiNotes }
          ]
        }
      };
      console.log(`Sending API request to Zendesk at ${this.apiUrl}/tickets`);
      console.log("Ticket data:", JSON.stringify(ticketData, null, 2));
      const response2 = await axios5.post(
        `${this.apiUrl}/tickets`,
        ticketData,
        {
          auth: this.auth,
          timeout: 1e4
          // 10 second timeout 
        }
      );
      console.log("Zendesk API response:", response2.status, response2.statusText);
      if (response2.data && response2.data.ticket && response2.data.ticket.id) {
        console.log(`Successfully created Zendesk ticket with ID: ${response2.data.ticket.id}`);
        return {
          id: response2.data.ticket.id,
          url: `https://${this.apiUrl.split("//")[1].split("/")[0]}/agent/tickets/${response2.data.ticket.id}`
        };
      } else {
        console.error("Invalid response from Zendesk API:", response2.data);
        return {
          id: 0,
          url: "",
          error: "Invalid response from Zendesk API"
        };
      }
    } catch (error) {
      console.error("Error creating ticket in Zendesk:", error);
      let errorMessage = "Unknown error occurred";
      let errorDetails = {};
      if (error.response) {
        errorMessage = `Zendesk API error: ${error.response.status} ${error.response.statusText}`;
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        if (error.response.data && error.response.data.error) {
          errorMessage += ` - ${error.response.data.error}`;
        } else if (error.response.data && error.response.data.details) {
          errorMessage += ` - ${JSON.stringify(error.response.data.details)}`;
        }
        console.error("Zendesk API error details:", errorDetails);
      } else if (error.request) {
        errorMessage = "No response received from Zendesk API";
        console.error("No response received from Zendesk API:", error.request);
      } else {
        errorMessage = `Error setting up request: ${error.message}`;
        console.error("Error setting up Zendesk API request:", error.message);
      }
      return {
        id: 0,
        url: "",
        error: errorMessage
      };
    }
  }
  /**
   * Add a comment to a Zendesk ticket
   */
  async addComment(zendeskTicketId, message) {
    if (!this.enabled) return false;
    try {
      await axios5.put(
        `${this.apiUrl}/tickets/${zendeskTicketId}`,
        {
          ticket: {
            comment: {
              body: message.content,
              public: message.sender === "user"
              // Staff messages can be internal notes
            }
          }
        },
        { auth: this.auth }
      );
      return true;
    } catch (error) {
      console.error("Error adding comment to Zendesk ticket:", error);
      return false;
    }
  }
  /**
   * Update a ticket status in Zendesk
   */
  async updateTicketStatus(zendeskTicketId, status) {
    if (!this.enabled) return false;
    const zendeskStatus = this.mapStatusToZendesk(status);
    try {
      await axios5.put(
        `${this.apiUrl}/tickets/${zendeskTicketId}`,
        {
          ticket: {
            status: zendeskStatus
          }
        },
        { auth: this.auth }
      );
      return true;
    } catch (error) {
      console.error("Error updating ticket status in Zendesk:", error);
      return false;
    }
  }
  /**
   * Sync existing tickets to Zendesk
   * @param tickets Array of tickets to synchronize with Zendesk
   * @returns Object mapping ticket IDs to their Zendesk IDs
   */
  async syncExistingTickets(tickets2) {
    if (!this.enabled) return {};
    const results = {};
    console.log(`Starting sync of ${tickets2.length} tickets to Zendesk...`);
    const batchSize = 5;
    for (let i = 0; i < tickets2.length; i += batchSize) {
      const batch = tickets2.slice(i, i + batchSize);
      const batchPromises = batch.map(async (ticket) => {
        try {
          if (ticket.externalIntegrations?.zendesk) {
            console.log(`Ticket #${ticket.id} already synced to Zendesk (ID: ${ticket.externalIntegrations.zendesk})`);
            results[ticket.id] = {
              id: ticket.externalIntegrations.zendesk,
              url: `https://${this.apiUrl.split("//")[1].split("/")[0]}/agent/tickets/${ticket.externalIntegrations.zendesk}`
            };
            return;
          }
          console.log(`Creating Zendesk ticket for ticket #${ticket.id}: ${ticket.title}`);
          const zendeskTicket = await this.createTicket({
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            complexity: ticket.complexity,
            assignedTo: ticket.assignedTo,
            aiNotes: ticket.aiNotes,
            tenantId: ticket.tenantId
          });
          if (zendeskTicket) {
            if (!zendeskTicket.error) {
              console.log(`Created Zendesk ticket ID ${zendeskTicket.id} for ticket #${ticket.id}`);
              results[ticket.id] = zendeskTicket;
            } else {
              console.error(`Failed to create Zendesk ticket for ticket #${ticket.id}: ${zendeskTicket.error}`);
            }
            if (!zendeskTicket.error && ticket.messages && ticket.messages.length > 0) {
              console.log(`Syncing ${ticket.messages.length} messages for ticket #${ticket.id}`);
              for (const message of ticket.messages) {
                await this.addComment(zendeskTicket.id, {
                  content: message.content,
                  sender: message.sender,
                  senderName: message.senderName || message.sender,
                  ticketId: ticket.id,
                  tenantId: ticket.tenantId
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing ticket #${ticket.id} to Zendesk:`, error);
        }
      });
      await Promise.all(batchPromises);
      if (i + batchSize < tickets2.length) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    console.log(`Completed sync of ${Object.keys(results).length} tickets to Zendesk`);
    return results;
  }
  /**
   * Verify connection to Zendesk API
   */
  async verifyConnection() {
    try {
      console.log(`Attempting to verify Zendesk connection to: ${this.apiUrl}/users/me`);
      console.log(`Using credentials: ${this.auth.username}, token: [REDACTED]`);
      if (!this.apiUrl || !this.auth.username || !this.auth.password) {
        console.error("Missing required Zendesk configuration:", {
          apiUrl: !!this.apiUrl,
          email: !!this.auth.username,
          apiToken: !!this.auth.password
        });
        return false;
      }
      const response2 = await axios5.get(`${this.apiUrl}/users/me`, {
        auth: this.auth,
        timeout: 1e4
        // 10 second timeout for connection issues
      });
      if (response2.status === 200 && response2.data && response2.data.user) {
        console.log("Zendesk connection successful, authenticated as:", {
          name: response2.data.user.name || "Unknown",
          email: response2.data.user.email || "Unknown",
          role: response2.data.user.role || "Unknown"
        });
        return true;
      }
      console.error("Unexpected response format from Zendesk API:", response2.data);
      return false;
    } catch (error) {
      console.error("Error verifying Zendesk connection:", error.message);
      if (error.response) {
        console.error("Response error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        if (error.response.status === 401) {
          console.error("Authentication failed. Please check your email and API token.");
        } else if (error.response.status === 404) {
          console.error("The URL is invalid or the resource doesn't exist. Check your subdomain.");
        } else if (error.response.status === 403) {
          console.error("Permission denied. Your API token may not have the necessary permissions.");
        }
      } else if (error.request) {
        console.error("No response received from server. Check your network connection and Zendesk subdomain.");
      } else {
        console.error("Error setting up request:", error.message);
      }
      return false;
    }
  }
  /**
   * Map internal ticket complexity to Zendesk priority
   */
  mapComplexityToPriority(complexity) {
    switch (complexity) {
      case "simple":
        return "low";
      case "medium":
        return "normal";
      case "complex":
        return "high";
      default:
        return "normal";
    }
  }
  /**
   * Map internal status to Zendesk status
   */
  mapStatusToZendesk(status) {
    switch (status) {
      case "open":
        return "new";
      case "in_progress":
        return "open";
      case "resolved":
        return "solved";
      case "closed":
        return "closed";
      default:
        return "open";
    }
  }
};
var zendeskService = null;
function setupZendeskService(config) {
  zendeskService = new ZendeskService(config);
  return zendeskService;
}
function getZendeskService() {
  return zendeskService;
}

// server/integrations/jira.ts
import axios6 from "axios";
var JiraService = class {
  apiUrl;
  auth;
  projectKey;
  enabled;
  constructor(config) {
    if (!config.baseUrl || !config.email || !config.apiToken || !config.projectKey) {
      console.error("Invalid Jira configuration - missing required fields:", {
        baseUrl: config.baseUrl ? "provided" : "missing",
        email: config.email ? "provided" : "missing",
        apiToken: config.apiToken ? "provided" : "missing",
        projectKey: config.projectKey ? "provided" : "missing"
      });
      throw new Error("Invalid Jira configuration - missing required fields");
    }
    console.log("Initializing Jira Service with config:", {
      baseUrl: config.baseUrl,
      email: config.email,
      apiToken: config.apiToken ? "[REDACTED]" : "missing",
      projectKey: config.projectKey,
      enabled: config.enabled
    });
    const baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
    this.apiUrl = `${baseUrl}/rest/api/3`;
    this.auth = {
      username: config.email,
      password: config.apiToken
    };
    this.projectKey = config.projectKey;
    this.enabled = config.enabled;
    console.log("Jira Service initialized with API URL:", this.apiUrl);
  }
  /**
   * Check if Jira integration is enabled
   */
  isEnabled() {
    return this.enabled;
  }
  // Cache for available issue types
  cachedIssueTypes = null;
  /**
   * Fetch available issue types for the project
   */
  async getAvailableIssueTypes() {
    if (this.cachedIssueTypes) {
      return this.cachedIssueTypes;
    }
    try {
      console.log(`Fetching available issue types for project ${this.projectKey}...`);
      const response2 = await axios6.get(
        `${this.apiUrl}/issue/createmeta?projectKeys=${this.projectKey}`,
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          timeout: 5e3
          // 5 second timeout
        }
      );
      let issueTypes = [];
      if (response2.data && response2.data.projects && response2.data.projects.length > 0 && response2.data.projects[0].issuetypes) {
        issueTypes = response2.data.projects[0].issuetypes;
        console.log(
          `Found ${issueTypes.length} available issue types:`,
          issueTypes.map((t) => `${t.name} (${t.id})`).join(", ")
        );
      } else {
        console.warn("No issue types found in response, using fallback issue types");
        issueTypes = [
          { id: "10001", name: "Task" },
          { id: "10002", name: "Bug" },
          { id: "10003", name: "Story" }
        ];
      }
      this.cachedIssueTypes = issueTypes;
      return issueTypes;
    } catch (error) {
      console.error("Error fetching issue types:", error);
      const fallbackTypes = [
        { id: "10001", name: "Task" },
        { id: "10002", name: "Bug" },
        { id: "10003", name: "Story" }
      ];
      this.cachedIssueTypes = fallbackTypes;
      return fallbackTypes;
    }
  }
  /**
   * Create an issue in Jira from a local ticket
   */
  async createIssue(ticket) {
    if (!this.enabled) {
      console.log("Jira service not enabled, skipping issue creation");
      return null;
    }
    try {
      console.log(`Creating Jira issue for ticket: "${ticket.title}"`);
      console.log(`Using Jira project key: "${this.projectKey}"`);
      const issueTypes = await this.getAvailableIssueTypes();
      let selectedIssueType;
      const category = ticket.category || "other";
      if (category === "bug" || category === "error") {
        selectedIssueType = issueTypes.find((t) => t.name && (t.name.toLowerCase() === "bug" || t.name.toLowerCase().includes("bug")));
      } else if (category === "feature" || category === "enhancement") {
        selectedIssueType = issueTypes.find((t) => t.name && (t.name.toLowerCase() === "story" || t.name.toLowerCase().includes("feature") || t.name.toLowerCase().includes("enhancement")));
      }
      if (!selectedIssueType) {
        selectedIssueType = issueTypes.find((t) => t.name && t.name.toLowerCase() === "task") || issueTypes[0];
      }
      if (!selectedIssueType) {
        selectedIssueType = { id: "10001", name: "Task" };
        console.warn("No suitable issue type found, using default Task type");
      }
      console.log(`Selected issue type: ${selectedIssueType.name} (${selectedIssueType.id})`);
      const issueData = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: ticket.title,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: ticket.description || "No description provided."
                  }
                ]
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `AI Notes: ${ticket.aiNotes || "None"}`
                  }
                ]
              }
            ]
          },
          issuetype: {
            id: selectedIssueType.id,
            // Include name as a fallback
            name: selectedIssueType.name
          },
          priority: {
            name: this.mapComplexityToPriority(ticket.complexity)
          },
          labels: ticket.category ? [ticket.category] : []
        }
      };
      console.log(`Sending API request to Jira at ${this.apiUrl}/issue`);
      console.log("Issue data:", JSON.stringify(issueData, null, 2));
      const response2 = await axios6.post(
        `${this.apiUrl}/issue`,
        issueData,
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          timeout: 1e4
          // 10 second timeout
        }
      );
      console.log("Jira API response:", response2.status, response2.statusText);
      if (response2.data && response2.data.key) {
        console.log(`Successfully created Jira issue with key: ${response2.data.key}`);
        return {
          id: response2.data.id,
          key: response2.data.key,
          url: `${this.apiUrl.replace("/rest/api/3", "")}/browse/${response2.data.key}`
        };
      } else {
        console.error("Invalid response from Jira API:", response2.data);
        return {
          id: "",
          key: "",
          url: "",
          error: "Invalid response from Jira API"
        };
      }
    } catch (error) {
      console.error("Error creating issue in Jira:", error);
      let errorMessage = "Unknown error occurred";
      let errorDetails = {};
      if (error.response) {
        errorMessage = `Jira API error: ${error.response.status} ${error.response.statusText}`;
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        if (error.response.data && error.response.data.errorMessages) {
          errorMessage += ` - ${error.response.data.errorMessages.join(", ")}`;
        } else if (error.response.data && error.response.data.errors) {
          errorMessage += ` - ${JSON.stringify(error.response.data.errors)}`;
        }
        console.error("Jira API error details:", errorDetails);
      } else if (error.request) {
        errorMessage = "No response received from Jira API";
        console.error("No response received from Jira API:", error.request);
      } else {
        errorMessage = `Error setting up request: ${error.message}`;
        console.error("Error setting up Jira API request:", error.message);
      }
      return {
        id: "",
        key: "",
        url: "",
        error: errorMessage
      };
    }
  }
  /**
   * Add a comment to a Jira issue
   */
  async addComment(issueKey, message) {
    if (!this.enabled) return false;
    try {
      await axios6.post(
        `${this.apiUrl}/issue/${issueKey}/comment`,
        {
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `${message.sender === "user" ? "Customer: " : "Support: "}${message.content}`
                  }
                ]
              }
            ]
          }
        },
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      return true;
    } catch (error) {
      console.error("Error adding comment to Jira issue:", error);
      return false;
    }
  }
  /**
   * Update an issue status in Jira
   * Note: Jira workflow transitions are complex and may need customization based on your workflow
   */
  async updateIssueStatus(issueKey, status) {
    if (!this.enabled) return false;
    try {
      const transitionsResponse = await axios6.get(
        `${this.apiUrl}/issue/${issueKey}/transitions`,
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      const transition = transitionsResponse.data.transitions.find(
        (t) => t.to.name.toLowerCase().includes(this.mapStatusToJira(status).toLowerCase())
      );
      if (!transition) {
        console.error(`No transition found for status: ${status}`);
        return false;
      }
      await axios6.post(
        `${this.apiUrl}/issue/${issueKey}/transitions`,
        {
          transition: {
            id: transition.id
          }
        },
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      return true;
    } catch (error) {
      console.error("Error updating issue status in Jira:", error);
      return false;
    }
  }
  /**
   * Sync existing tickets to Jira
   * @param tickets Array of tickets to synchronize with Jira
   * @returns Object mapping ticket IDs to their Jira keys
   */
  async syncExistingTickets(tickets2) {
    if (!this.enabled) return {};
    const results = {};
    console.log(`Starting sync of ${tickets2.length} tickets to Jira...`);
    const batchSize = 5;
    for (let i = 0; i < tickets2.length; i += batchSize) {
      const batch = tickets2.slice(i, i + batchSize);
      const batchPromises = batch.map(async (ticket) => {
        try {
          if (ticket.externalIntegrations?.jira) {
            console.log(`Ticket #${ticket.id} already synced to Jira (${ticket.externalIntegrations.jira})`);
            results[ticket.id] = {
              id: "",
              key: ticket.externalIntegrations.jira,
              url: `${this.apiUrl.replace("/rest/api/3", "")}/browse/${ticket.externalIntegrations.jira}`
            };
            return;
          }
          console.log(`Creating Jira issue for ticket #${ticket.id}: ${ticket.title}`);
          const jiraIssue = await this.createIssue({
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            complexity: ticket.complexity,
            assignedTo: ticket.assignedTo,
            aiNotes: ticket.aiNotes,
            tenantId: ticket.tenantId
          });
          if (jiraIssue) {
            if (!jiraIssue.error) {
              console.log(`Created Jira issue ${jiraIssue.key} for ticket #${ticket.id}`);
              results[ticket.id] = jiraIssue;
              if (ticket.messages && ticket.messages.length > 0) {
                console.log(`Syncing ${ticket.messages.length} messages for ticket #${ticket.id}`);
                for (const message of ticket.messages) {
                  await this.addComment(jiraIssue.key, {
                    content: message.content,
                    sender: message.sender,
                    senderName: message.senderName || message.sender,
                    ticketId: ticket.id,
                    tenantId: ticket.tenantId
                  });
                }
              }
            } else {
              console.error(`Failed to create Jira issue for ticket #${ticket.id}: ${jiraIssue.error}`);
            }
          }
        } catch (error) {
          console.error(`Error syncing ticket #${ticket.id} to Jira:`, error);
        }
      });
      await Promise.all(batchPromises);
      if (i + batchSize < tickets2.length) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    console.log(`Completed sync of ${Object.keys(results).length} tickets to Jira`);
    return results;
  }
  /**
   * Verify connection to Jira API
   */
  async verifyConnection() {
    try {
      console.log(`Attempting to verify Jira connection to: ${this.apiUrl}/myself`);
      console.log(`Using credentials: ${this.auth.username}, token: [REDACTED]`);
      if (!this.apiUrl || !this.auth.username || !this.auth.password || !this.projectKey) {
        console.error("Missing required Jira configuration:", {
          apiUrl: !!this.apiUrl,
          username: !!this.auth.username,
          password: !!this.auth.password,
          projectKey: !!this.projectKey
        });
        return false;
      }
      const response2 = await axios6.get(`${this.apiUrl}/myself`, {
        auth: this.auth,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 1e4
        // 10 second timeout for connection issues
      });
      if (response2.status === 200 && response2.data) {
        console.log("Jira connection successful, authenticated as:", {
          displayName: response2.data.displayName || "Unknown",
          accountId: response2.data.accountId || "Unknown",
          emailAddress: response2.data.emailAddress || "Unknown"
        });
        try {
          const projectResponse = await axios6.get(`${this.apiUrl}/project/${this.projectKey}`, {
            auth: this.auth,
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            }
          });
          console.log(`Project ${this.projectKey} exists and is accessible:`, {
            name: projectResponse.data.name || "Unknown",
            key: projectResponse.data.key || "Unknown"
          });
          return true;
        } catch (projectError) {
          console.error(
            `Error accessing project ${this.projectKey}:`,
            projectError.response?.status || projectError.message
          );
          console.error("Make sure the project key is correct and the user has access to it");
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error("Error verifying Jira connection:", error.message);
      if (error.response) {
        console.error("Response error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        if (error.response.status === 401) {
          console.error("Authentication failed. Please check your email and API token.");
        } else if (error.response.status === 404) {
          console.error("The URL is invalid or the resource doesn't exist. Check your base URL.");
        } else if (error.response.status === 403) {
          console.error("Permission denied. Your API token may not have the necessary permissions.");
        }
      } else if (error.request) {
        console.error("No response received from server. Check your network connection and Jira base URL.");
      } else {
        console.error("Error setting up request:", error.message);
      }
      return false;
    }
  }
  /**
   * Map internal ticket complexity to Jira priority
   */
  mapComplexityToPriority(complexity) {
    if (!complexity) return "Medium";
    switch (complexity) {
      case "simple":
        return "Low";
      case "medium":
        return "Medium";
      case "complex":
        return "High";
      default:
        return "Medium";
    }
  }
  /**
   * Map internal status to Jira status
   * Note: Jira statuses are highly customizable, so this may need adjustment
   */
  mapStatusToJira(status) {
    switch (status) {
      case "open":
        return "To Do";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Done";
      case "closed":
        return "Done";
      default:
        return "To Do";
    }
  }
};
var jiraService = null;
function setupJiraService(config) {
  jiraService = new JiraService(config);
  return jiraService;
}
function getJiraService() {
  return jiraService;
}

// server/integrations/index.ts
var IntegrationService = class {
  zendeskService = null;
  jiraService = null;
  constructor() {
  }
  /**
   * Configure integrations from settings
   */
  setupIntegrations(integrations) {
    console.log("Setting up integrations:", integrations.map((i) => ({
      type: i.type,
      config: {
        ...i.config,
        apiToken: i.config.apiToken ? "[REDACTED]" : "missing"
      }
    })));
    for (const integration of integrations) {
      if (integration.type === "zendesk") {
        console.log("Setting up Zendesk integration with config:", {
          subdomain: integration.config.subdomain,
          email: integration.config.email,
          enabled: integration.config.enabled,
          apiToken: integration.config.apiToken ? "[REDACTED]" : "missing"
        });
        if (!integration.config.subdomain || !integration.config.email || !integration.config.apiToken) {
          console.error("Missing required fields for Zendesk integration:", {
            hasSubdomain: !!integration.config.subdomain,
            hasEmail: !!integration.config.email,
            hasApiToken: !!integration.config.apiToken
          });
          continue;
        }
        try {
          this.zendeskService = setupZendeskService(integration.config);
          console.log("Zendesk integration set up successfully");
        } catch (error) {
          console.error("Error setting up Zendesk integration:", error);
        }
      } else if (integration.type === "jira") {
        console.log("Setting up Jira integration with config:", {
          baseUrl: integration.config.baseUrl,
          email: integration.config.email,
          projectKey: integration.config.projectKey,
          enabled: integration.config.enabled,
          apiToken: integration.config.apiToken ? "[REDACTED]" : "missing"
        });
        if (!integration.config.baseUrl || !integration.config.email || !integration.config.apiToken || !integration.config.projectKey) {
          console.error("Missing required fields for Jira integration:", {
            hasBaseUrl: !!integration.config.baseUrl,
            hasEmail: !!integration.config.email,
            hasApiToken: !!integration.config.apiToken,
            hasProjectKey: !!integration.config.projectKey
          });
          continue;
        }
        try {
          this.jiraService = setupJiraService(integration.config);
          console.log("Jira integration set up successfully");
        } catch (error) {
          console.error("Error setting up Jira integration:", error);
        }
      }
    }
  }
  /**
   * Get specific integration service
   */
  getService(type) {
    if (type === "zendesk") {
      return this.zendeskService || getZendeskService();
    } else if (type === "jira") {
      return this.jiraService || getJiraService();
    }
    return null;
  }
  /**
   * Create tickets in all enabled third-party systems
   */
  async createTicketInThirdParty(ticket) {
    const result = {};
    let anyServiceEnabled = false;
    console.log(`Creating ticket in third-party systems: "${ticket.title}"`);
    console.log(`Ticket details: category=${ticket.category}, complexity=${ticket.complexity}, assignedTo=${ticket.assignedTo || "Unassigned"}`);
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Attempting to create ticket in Zendesk: "${ticket.title}"`);
        console.log(`Zendesk is properly configured and enabled`);
        result.zendesk = await this.zendeskService.createTicket(ticket);
        if (result.zendesk) {
          if (!result.zendesk.error) {
            console.log(`Successfully created ticket in Zendesk with ID: ${result.zendesk.id}`);
          } else {
            console.error(`Failed to create ticket in Zendesk: ${result.zendesk.error}`);
          }
        } else {
          console.error(`Failed to create ticket in Zendesk: No result returned`);
        }
      } catch (error) {
        console.error(`Error creating ticket in Zendesk:`, error);
        result.zendesk = { error: error instanceof Error ? error.message : "Unknown error" };
      }
    } else {
      console.log("Zendesk integration not enabled or not properly configured - skipping ticket creation");
    }
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Attempting to create issue in Jira: "${ticket.title}"`);
        console.log(`Jira is properly configured and enabled`);
        result.jira = await this.jiraService.createIssue(ticket);
        if (result.jira) {
          if (!result.jira.error) {
            console.log(`Successfully created issue in Jira with key: ${result.jira.key}`);
          } else {
            console.error(`Failed to create issue in Jira: ${result.jira.error}`);
          }
        } else {
          console.error(`Failed to create issue in Jira: No result returned`);
        }
      } catch (error) {
        console.error(`Error creating issue in Jira:`, error);
        result.jira = { error: error instanceof Error ? error.message : "Unknown error" };
      }
    } else {
      console.log("Jira integration not enabled or not properly configured - skipping issue creation");
    }
    if (!anyServiceEnabled) {
      console.warn("WARNING: No third-party integration services were enabled. Make sure services are properly configured.");
    }
    console.log(`Third-party ticket creation results:`, {
      zendesk: result.zendesk ? result.zendesk.error ? `error: ${result.zendesk.error}` : "success" : "not created",
      jira: result.jira ? result.jira.error ? `error: ${result.jira.error}` : "success" : "not created"
    });
    return result;
  }
  /**
   * Add a comment to tickets in all enabled third-party systems
   */
  async addCommentToThirdParty(externalIds, message) {
    const result = {};
    console.log(`Adding comment to external ticketing systems for ticket #${message.ticketId}`);
    console.log(`External references: ${JSON.stringify(externalIds)}`);
    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      try {
        console.log(`Adding comment to Zendesk ticket #${externalIds.zendesk}`);
        result.zendesk = await this.zendeskService.addComment(externalIds.zendesk, message);
        console.log(`Comment ${result.zendesk ? "successfully added" : "failed to add"} to Zendesk ticket`);
      } catch (error) {
        console.error(`Error adding comment to Zendesk ticket:`, error);
        result.zendesk = false;
      }
    } else if (this.zendeskService?.isEnabled()) {
      console.log(`Zendesk integration is enabled but no external ID found for ticket #${message.ticketId}`);
    }
    if (this.jiraService?.isEnabled() && externalIds.jira) {
      try {
        console.log(`Adding comment to Jira issue ${externalIds.jira}`);
        result.jira = await this.jiraService.addComment(externalIds.jira, message);
        console.log(`Comment ${result.jira ? "successfully added" : "failed to add"} to Jira issue`);
      } catch (error) {
        console.error(`Error adding comment to Jira issue:`, error);
        result.jira = false;
      }
    } else if (this.jiraService?.isEnabled()) {
      console.log(`Jira integration is enabled but no external ID found for ticket #${message.ticketId}`);
    }
    return result;
  }
  /**
   * Update ticket status in all enabled third-party systems
   */
  async updateStatusInThirdParty(externalIds, status) {
    const result = {};
    console.log(`Updating status to "${status}" in external ticketing systems`);
    console.log(`External references: ${JSON.stringify(externalIds)}`);
    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      try {
        console.log(`Updating Zendesk ticket #${externalIds.zendesk} status to "${status}"`);
        result.zendesk = await this.zendeskService.updateTicketStatus(externalIds.zendesk, status);
        console.log(`Status ${result.zendesk ? "successfully updated" : "failed to update"} in Zendesk ticket`);
      } catch (error) {
        console.error(`Error updating status in Zendesk ticket:`, error);
        result.zendesk = false;
      }
    } else if (this.zendeskService?.isEnabled()) {
      console.log(`Zendesk integration is enabled but no external ID found to update status`);
    }
    if (this.jiraService?.isEnabled() && externalIds.jira) {
      try {
        console.log(`Updating Jira issue ${externalIds.jira} status to "${status}"`);
        result.jira = await this.jiraService.updateIssueStatus(externalIds.jira, status);
        console.log(`Status ${result.jira ? "successfully updated" : "failed to update"} in Jira issue`);
      } catch (error) {
        console.error(`Error updating status in Jira issue:`, error);
        result.jira = false;
      }
    } else if (this.jiraService?.isEnabled()) {
      console.log(`Jira integration is enabled but no external ID found to update status`);
    }
    return result;
  }
  /**
   * Verify connections to all configured third-party systems
   */
  async verifyConnections() {
    const result = {};
    let anyServiceEnabled = false;
    console.log(`Verifying connections to third-party ticketing systems...`);
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Verifying connection to Zendesk...`);
        result.zendesk = await this.zendeskService.verifyConnection();
        console.log(`Zendesk connection ${result.zendesk ? "successful" : "failed"}`);
      } catch (error) {
        console.error(`Error verifying Zendesk connection:`, error);
        result.zendesk = false;
      }
    } else {
      console.log(`Zendesk integration is not enabled - skipping connection verification`);
    }
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Verifying connection to Jira...`);
        result.jira = await this.jiraService.verifyConnection();
        console.log(`Jira connection ${result.jira ? "successful" : "failed"}`);
      } catch (error) {
        console.error(`Error verifying Jira connection:`, error);
        result.jira = false;
      }
    } else {
      console.log(`Jira integration is not enabled - skipping connection verification`);
    }
    if (!anyServiceEnabled) {
      console.warn("WARNING: No third-party integration services were enabled. Make sure services are properly configured.");
    }
    return result;
  }
  /**
   * Sync existing tickets to all enabled third-party systems
   * @param tickets Array of tickets to synchronize
   * @returns Object mapping ticket IDs to their external reference IDs
   */
  async syncExistingTickets(tickets2) {
    const result = {
      zendesk: {},
      jira: {}
    };
    let anyServiceEnabled = false;
    console.log(`Syncing ${tickets2.length} tickets to third-party systems...`);
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Syncing ${tickets2.length} tickets to Zendesk...`);
        result.zendesk = await this.zendeskService.syncExistingTickets(tickets2);
        const syncedCount = Object.keys(result.zendesk).length;
        console.log(`Successfully synced ${syncedCount} tickets to Zendesk`);
      } catch (error) {
        console.error(`Error syncing tickets to Zendesk:`, error);
        result.zendesk = {};
      }
    } else {
      console.log(`Zendesk integration is not enabled - skipping ticket synchronization`);
    }
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Syncing ${tickets2.length} tickets to Jira...`);
        result.jira = await this.jiraService.syncExistingTickets(tickets2);
        const syncedCount = Object.keys(result.jira).length;
        console.log(`Successfully synced ${syncedCount} tickets to Jira`);
      } catch (error) {
        console.error(`Error syncing tickets to Jira:`, error);
        result.jira = {};
      }
    } else {
      console.log(`Jira integration is not enabled - skipping ticket synchronization`);
    }
    if (!anyServiceEnabled) {
      console.warn("WARNING: No third-party integration services were enabled. Make sure services are properly configured.");
    }
    return result;
  }
};
var integrationService = null;
function setupIntegrationService() {
  if (!integrationService) {
    integrationService = new IntegrationService();
  }
  return integrationService;
}
function getIntegrationService() {
  if (!integrationService) {
    integrationService = setupIntegrationService();
  }
  return integrationService;
}

// server/utils.ts
import * as crypto from "crypto";
function isCreatorOrAdminRole(role) {
  if (!role) return false;
  return role === "creator" || role === "administrator";
}
function generateRandomPassword(length = 12) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// server/routes/integration-routes.ts
var zendeskConfigSchema = z4.object({
  subdomain: z4.string().min(1, "Subdomain is required"),
  email: z4.string().email("A valid email is required"),
  apiToken: z4.string().min(1, "API token is required"),
  enabled: z4.boolean().default(true)
});
var jiraConfigSchema = z4.object({
  baseUrl: z4.string().url("Base URL must be a valid URL (e.g., https://yourcompany.atlassian.net)").min(1, "Base URL is required"),
  email: z4.string().email("A valid email address is required").min(1, "Email is required"),
  apiToken: z4.string().min(1, "API token is required").refine((val) => val.length > 5, "API token is too short - please provide a valid token"),
  projectKey: z4.string().min(1, "Project key is required").regex(/^[A-Z][A-Z0-9_]+$/, "Project key must be in uppercase and contain only letters, numbers and underscores"),
  enabled: z4.boolean().default(true)
});
var integrationTypeSchema = z4.enum(["zendesk", "jira"]);
function registerIntegrationRoutes(app2, requireAuth2) {
  app2.post("/api/integrations/debug", requireAuth2, (req, res) => {
    console.log("Integration debug endpoint hit with:", {
      method: req.method,
      url: req.url,
      headers: {
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"]
      },
      bodyType: typeof req.body,
      body: req.body ? {
        ...req.body,
        apiToken: req.body.apiToken ? "[REDACTED]" : void 0
      } : null,
      rawBody: req.rawBody ? "[available]" : "[not available]"
    });
    if (!req.rawBody && req.headers["content-type"]?.includes("application/json")) {
      console.warn("Raw body not captured for JSON request - verify express.json middleware setup");
    }
    return res.status(200).json({
      success: true,
      received: {
        contentType: req.headers["content-type"],
        bodyKeys: req.body ? Object.keys(req.body) : [],
        bodySize: req.body ? JSON.stringify(req.body).length : 0
      }
    });
  });
  let integrationSettings = {
    zendesk: {
      enabled: false,
      subdomain: "",
      email: "",
      apiToken: "",
      maskedToken: "********"
    },
    jira: {
      enabled: true,
      baseUrl: "https://your-jira-instance.atlassian.net/rest/api/3",
      email: "test@example.com",
      apiToken: "dummy-token-for-testing",
      maskedToken: "********",
      projectKey: "TEST"
    }
  };
  try {
    const integrationService2 = setupIntegrationService();
    const integrations = [];
    if (integrationSettings.jira.enabled) {
      integrations.push({
        type: "jira",
        config: {
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          apiToken: integrationSettings.jira.apiToken,
          projectKey: integrationSettings.jira.projectKey,
          enabled: integrationSettings.jira.enabled
        }
      });
    }
    if (integrationSettings.zendesk.enabled) {
      integrations.push({
        type: "zendesk",
        config: {
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: integrationSettings.zendesk.apiToken,
          enabled: integrationSettings.zendesk.enabled
        }
      });
    }
    if (integrations.length > 0) {
      integrationService2.setupIntegrations(integrations);
    }
  } catch (error) {
    console.error("Error initializing integration services:", error);
  }
  app2.get("/api/integrations", requireAuth2, (req, res) => {
    try {
      res.status(200).json({
        zendesk: {
          enabled: integrationSettings.zendesk.enabled,
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: integrationSettings.zendesk.maskedToken
        },
        jira: {
          enabled: integrationSettings.jira.enabled,
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          apiToken: integrationSettings.jira.maskedToken,
          projectKey: integrationSettings.jira.projectKey
        }
      });
    } catch (error) {
      console.error("Error fetching integration settings:", error);
      res.status(500).json({ message: "Error fetching integration settings" });
    }
  });
  app2.post("/api/integrations/:type", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { role } = req.user;
      if (!isCreatorOrAdminRole(role)) {
        return res.status(403).json({ message: "Only administrators and creators can update integrations" });
      }
      console.log("Received integration configuration request:", {
        type: req.params.type,
        body: {
          ...req.body,
          apiToken: req.body.apiToken ? "[REDACTED]" : void 0
        }
      });
      const type = integrationTypeSchema.parse(req.params.type);
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          message: "Empty request body. Configuration data is required.",
          requiredFields: type === "jira" ? ["baseUrl", "email", "apiToken", "projectKey", "enabled"] : ["subdomain", "email", "apiToken", "enabled"]
        });
      }
      let config;
      if (type === "zendesk") {
        try {
          config = zendeskConfigSchema.parse(req.body);
          console.log("Zendesk configuration validated successfully");
        } catch (validationError) {
          if (validationError instanceof z4.ZodError) {
            console.error("Zendesk validation errors:", validationError.errors);
            return res.status(400).json({
              message: "Invalid Zendesk configuration",
              errors: validationError.errors
            });
          }
          throw validationError;
        }
      } else if (type === "jira") {
        try {
          config = jiraConfigSchema.parse(req.body);
          console.log("Jira configuration validated successfully");
        } catch (validationError) {
          if (validationError instanceof z4.ZodError) {
            console.error("Jira validation errors:", validationError.errors);
            const fieldErrors = validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message
            }));
            return res.status(400).json({
              message: "Invalid Jira configuration",
              errors: fieldErrors
            });
          }
          throw validationError;
        }
        const missingFields = [];
        if (!config.baseUrl) missingFields.push("baseUrl");
        if (!config.email) missingFields.push("email");
        if (!config.apiToken) missingFields.push("apiToken");
        if (!config.projectKey) missingFields.push("projectKey");
        if (missingFields.length > 0) {
          console.error("Missing required fields for Jira integration:", missingFields);
          return res.status(400).json({
            message: "Missing required fields for Jira integration",
            missingFields
          });
        }
      } else {
        return res.status(400).json({ message: "Invalid integration type" });
      }
      if (type === "jira") {
        const jiraConfig = config;
        console.log(`Saving Jira integration configuration with values:`, {
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          projectKey: jiraConfig.projectKey,
          enabled: jiraConfig.enabled,
          apiToken: jiraConfig.apiToken ? "[REDACTED]" : "missing"
        });
      } else {
        const zendeskConfig = config;
        console.log(`Saving Zendesk integration configuration with values:`, {
          subdomain: zendeskConfig.subdomain,
          email: zendeskConfig.email,
          enabled: zendeskConfig.enabled,
          apiToken: zendeskConfig.apiToken ? "[REDACTED]" : "missing"
        });
      }
      if (type === "jira") {
        const jiraConfig = config;
        integrationSettings.jira = {
          enabled: jiraConfig.enabled,
          baseUrl: jiraConfig.baseUrl.trim(),
          email: jiraConfig.email.trim(),
          apiToken: jiraConfig.apiToken,
          maskedToken: "********",
          projectKey: jiraConfig.projectKey.trim()
        };
        console.log("Saved Jira configuration:", {
          enabled: integrationSettings.jira.enabled,
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          projectKey: integrationSettings.jira.projectKey,
          apiToken: "[REDACTED]"
        });
      } else if (type === "zendesk") {
        const zendeskConfig = config;
        integrationSettings.zendesk = {
          enabled: zendeskConfig.enabled,
          subdomain: zendeskConfig.subdomain.trim(),
          email: zendeskConfig.email.trim(),
          apiToken: zendeskConfig.apiToken,
          maskedToken: "********"
        };
        console.log("Saved Zendesk configuration:", {
          enabled: integrationSettings.zendesk.enabled,
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: "[REDACTED]"
        });
      }
      console.log(`Setting up ${type} integration service...`);
      const integrationService2 = setupIntegrationService();
      console.log(`Integration configuration being set up for ${type}`);
      if (type === "jira") {
        const jiraConfig = config;
        console.log("Jira config prepared:", {
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          projectKey: jiraConfig.projectKey,
          enabled: jiraConfig.enabled,
          apiToken: "[REDACTED]"
        });
        const integrations = [{
          type: "jira",
          config: { ...jiraConfig }
        }];
        integrationService2.setupIntegrations(integrations);
      } else if (type === "zendesk") {
        const zendeskConfig = config;
        console.log("Zendesk config prepared:", {
          subdomain: zendeskConfig.subdomain,
          email: zendeskConfig.email,
          enabled: zendeskConfig.enabled,
          apiToken: "[REDACTED]"
        });
        const integrations = [{
          type: "zendesk",
          config: { ...zendeskConfig }
        }];
        integrationService2.setupIntegrations(integrations);
      }
      if (config.enabled) {
        console.log(`Testing connection to ${type}...`);
        const connectionResult = await integrationService2.verifyConnections();
        console.log(`Connection test results for ${type}:`, connectionResult);
        if (!connectionResult[type]) {
          return res.status(400).json({
            message: `Could not connect to ${type}. Please check your configuration and ensure your credentials are correct.`,
            details: `The service could not authenticate with the provided credentials. Verify that your API token has the necessary permissions.`
          });
        }
        console.log(`Successfully connected to ${type}`);
      }
      res.status(200).json({
        message: `${type} integration ${config.enabled ? "enabled" : "disabled"} successfully`,
        connectionVerified: config.enabled
      });
    } catch (error) {
      if (error instanceof z4.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return res.status(400).json({
          message: "Invalid configuration",
          errors: formattedErrors
        });
      }
      console.error(`Error configuring ${req.params.type} integration:`, error);
      res.status(500).json({
        message: "Error configuring integration",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/integrations/:type/sync", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { role } = req.user;
      if (!isCreatorOrAdminRole(role)) {
        return res.status(403).json({ message: "Only administrators and creators can sync tickets with integrations" });
      }
      const type = integrationTypeSchema.parse(req.params.type);
      if (type === "jira" && !integrationSettings.jira.enabled || type === "zendesk" && !integrationSettings.zendesk.enabled) {
        return res.status(400).json({
          message: `${type} integration is not enabled. Please enable and configure it first.`
        });
      }
      const storage3 = req.app.locals.storage;
      if (!storage3) {
        return res.status(500).json({ message: "Storage service not available" });
      }
      let tickets2;
      try {
        if (!storage3.getAllTickets) {
          console.error("getAllTickets method not found in storage");
          return res.status(500).json({
            message: "Database error: getAllTickets method not available"
          });
        }
        tickets2 = await storage3.getAllTickets();
        console.log(`Retrieved ${tickets2.length} tickets for synchronization`);
        if (!tickets2 || tickets2.length === 0) {
          return res.status(404).json({
            message: "No tickets found to synchronize"
          });
        }
      } catch (error) {
        console.error(`Error retrieving tickets for synchronization:`, error);
        return res.status(500).json({
          message: "Failed to retrieve tickets from database",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
      const integrationService2 = getIntegrationService();
      console.log(`Starting synchronization of ${tickets2.length} tickets to ${type}...`);
      const results = await integrationService2.syncExistingTickets(tickets2);
      const syncedTickets = Object.keys(results[type] || {}).length;
      if (syncedTickets > 0) {
        for (const [ticketId, externalInfo] of Object.entries(results[type] || {})) {
          try {
            console.log(`Updating ticket ${ticketId} with external ${type} reference:`, externalInfo);
            const ticket = await storage3.getTicketById(parseInt(ticketId));
            if (!ticket) {
              console.error(`Could not find ticket with ID ${ticketId} in database`);
              continue;
            }
            const currentExternalIntegrations = ticket.externalIntegrations || {};
            const updatedExternalIntegrations = {
              ...currentExternalIntegrations,
              [type]: type === "jira" ? externalInfo.key : externalInfo.id
            };
            await storage3.updateTicket(
              parseInt(ticketId),
              { externalIntegrations: updatedExternalIntegrations }
            );
            console.log(`Successfully updated ticket ${ticketId} with ${type} reference: ${JSON.stringify(updatedExternalIntegrations)}`);
          } catch (error) {
            console.error(`Error updating external reference for ticket ${ticketId}:`, error);
          }
        }
      }
      return res.status(200).json({
        message: `Successfully synchronized ${syncedTickets} tickets with ${type}`,
        syncedCount: syncedTickets,
        totalTickets: tickets2.length,
        externalIds: Object.keys(results[type] || {}).map((ticketId) => ({
          ticketId,
          externalId: type === "jira" ? results[type][parseInt(ticketId)].key : results[type][parseInt(ticketId)].id,
          url: results[type][parseInt(ticketId)].url
        }))
      });
    } catch (error) {
      console.error(`Error synchronizing tickets with ${req.params.type}:`, error);
      return res.status(500).json({
        message: `Error synchronizing tickets with ${req.params.type}`,
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/integrations/:type/test", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { role } = req.user;
      if (!isCreatorOrAdminRole(role)) {
        return res.status(403).json({ message: "Only administrators and creators can test integrations" });
      }
      console.log("Integration test endpoint hit:", {
        method: req.method,
        url: req.url,
        headers: {
          "content-type": req.headers["content-type"],
          "content-length": req.headers["content-length"]
        }
      });
      console.log("Received integration test request:", {
        type: req.params.type,
        bodyType: typeof req.body,
        bodyIsObject: req.body !== null && typeof req.body === "object",
        contentType: req.headers["content-type"],
        hasApiToken: req.body && req.body.apiToken ? "yes" : "no",
        bodyKeys: req.body ? Object.keys(req.body) : [],
        body: req.body ? {
          ...req.body,
          apiToken: req.body.apiToken ? "[REDACTED]" : void 0
        } : null
      });
      const type = integrationTypeSchema.parse(req.params.type);
      if (!req.body) {
        return res.status(400).json({
          message: "Missing request body. Configuration data is required for testing.",
          requestInfo: {
            contentType: req.headers["content-type"],
            contentLength: req.headers["content-length"]
          },
          requiredFields: type === "jira" ? ["baseUrl", "email", "apiToken", "projectKey"] : ["subdomain", "email", "apiToken"],
          tip: "Make sure you're sending a JSON request body with 'Content-Type: application/json' header"
        });
      }
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          message: "Empty request body. Configuration data is required for testing.",
          requiredFields: type === "jira" ? ["baseUrl", "email", "apiToken", "projectKey"] : ["subdomain", "email", "apiToken"],
          tip: "Ensure all required fields are included in your request"
        });
      }
      if (type === "jira") {
        try {
          console.log("Validating Jira configuration for testing...");
          const testConfig = jiraConfigSchema.parse(req.body);
          const missingFields = [];
          if (!testConfig.baseUrl) missingFields.push("baseUrl");
          if (!testConfig.email) missingFields.push("email");
          if (!testConfig.apiToken) missingFields.push("apiToken");
          if (!testConfig.projectKey) missingFields.push("projectKey");
          if (missingFields.length > 0) {
            console.error("Missing required fields for Jira integration test:", missingFields);
            return res.status(400).json({
              message: "Missing required fields for Jira integration test",
              missingFields
            });
          }
          const sanitizedConfig = {
            ...testConfig,
            baseUrl: testConfig.baseUrl.trim(),
            email: testConfig.email.trim(),
            projectKey: testConfig.projectKey.trim(),
            enabled: true
            // Always enable for testing
          };
          console.log("Testing Jira connection with:", {
            baseUrl: sanitizedConfig.baseUrl,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken ? "[REDACTED]" : "missing",
            projectKey: sanitizedConfig.projectKey
          });
          console.log("Creating Jira service instance for testing...");
          const tempJiraService = new JiraService({
            baseUrl: sanitizedConfig.baseUrl,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken,
            projectKey: sanitizedConfig.projectKey,
            enabled: true
          });
          console.log("Verifying Jira connection...");
          const connectionPromise = tempJiraService.verifyConnection();
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(false), 3e4);
          });
          const connected = await Promise.race([connectionPromise, timeoutPromise]);
          if (connected) {
            console.log("Jira connection test successful!");
            res.status(200).json({
              message: `Successfully connected to Jira`,
              details: `Connection verified with ${sanitizedConfig.baseUrl}`
            });
          } else {
            console.error("Jira connection test failed");
            res.status(400).json({
              message: `Could not connect to Jira. Please verify your credentials and Jira URL.`,
              details: "Make sure your API token is correct and has the necessary permissions.",
              suggestions: [
                "Verify your Jira URL is correct (e.g., https://yourcompany.atlassian.net)",
                "Check that your API token has not expired and has the correct permissions",
                "Ensure your network allows connections to Jira",
                "Verify the project key exists in your Jira instance"
              ]
            });
          }
        } catch (validationError) {
          console.error("Jira test config validation error:", validationError);
          if (validationError instanceof z4.ZodError) {
            const formattedErrors = validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message
            }));
            return res.status(400).json({
              message: "Invalid Jira configuration",
              errors: formattedErrors
            });
          }
          return res.status(400).json({
            message: "Could not connect to Jira",
            error: validationError instanceof Error ? validationError.message : "Unknown error"
          });
        }
      } else if (type === "zendesk") {
        try {
          console.log("Validating Zendesk configuration for testing...");
          const testConfig = zendeskConfigSchema.parse(req.body);
          const sanitizedConfig = {
            ...testConfig,
            subdomain: testConfig.subdomain.trim(),
            email: testConfig.email.trim(),
            enabled: true
            // Always enable for testing
          };
          console.log("Testing Zendesk connection with:", {
            subdomain: sanitizedConfig.subdomain,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken ? "[REDACTED]" : "missing"
          });
          console.log("Creating Zendesk service instance for testing...");
          const tempZendeskService = new ZendeskService({
            subdomain: sanitizedConfig.subdomain,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken,
            enabled: true
          });
          console.log("Verifying Zendesk connection...");
          const connectionPromise = tempZendeskService.verifyConnection();
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(false), 3e4);
          });
          const connected = await Promise.race([connectionPromise, timeoutPromise]);
          if (connected) {
            console.log("Zendesk connection test successful!");
            res.status(200).json({
              message: `Successfully connected to Zendesk`,
              details: `Connection verified with ${sanitizedConfig.subdomain}.zendesk.com`
            });
          } else {
            console.error("Zendesk connection test failed");
            res.status(400).json({
              message: `Could not connect to Zendesk. Please verify your credentials and subdomain.`,
              suggestions: [
                "Verify your Zendesk subdomain is correct (just the subdomain, not the full URL)",
                "Check that your API token is valid",
                "Ensure your email address has access to Zendesk"
              ]
            });
          }
        } catch (validationError) {
          console.error("Zendesk test config validation error:", validationError);
          if (validationError instanceof z4.ZodError) {
            const formattedErrors = validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message
            }));
            return res.status(400).json({
              message: "Invalid Zendesk configuration",
              errors: formattedErrors
            });
          }
          return res.status(400).json({
            message: "Could not connect to Zendesk",
            error: validationError instanceof Error ? validationError.message : "Unknown error"
          });
        }
      } else {
        return res.status(400).json({
          message: `Unsupported integration type: ${type}`,
          supportedTypes: ["jira", "zendesk"]
        });
      }
    } catch (error) {
      if (error instanceof z4.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return res.status(400).json({
          message: "Invalid configuration",
          errors: formattedErrors
        });
      }
      console.error(`Error testing ${req.params.type} integration:`, error);
      res.status(500).json({
        message: "Error testing integration connection",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

// server/routes/data-source-routes.ts
init_storage();
init_schema();
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
function registerDataSourceRoutes(app2, requireAuth2) {
  app2.get("/api/data-sources", requireAuth2, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized access to data sources" });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSources2 = await storage.getAllDataSources(tenantId);
      return res.status(200).json(dataSources2);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      return res.status(500).json({ error: "Failed to fetch data sources" });
    }
  });
  app2.get("/api/data-sources/enabled", requireAuth2, async (req, res) => {
    try {
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSources2 = await storage.getEnabledDataSources(tenantId);
      return res.status(200).json(dataSources2);
    } catch (error) {
      console.error("Error fetching enabled data sources:", error);
      return res.status(500).json({ error: "Failed to fetch enabled data sources" });
    }
  });
  app2.get("/api/data-sources/:id", requireAuth2, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized access to data source" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid data source ID" });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSource = await storage.getDataSourceById(id, tenantId);
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      return res.status(200).json(dataSource);
    } catch (error) {
      console.error("Error fetching data source:", error);
      return res.status(500).json({ error: "Failed to fetch data source" });
    }
  });
  app2.post("/api/data-sources", requireAuth2, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to create data sources" });
      }
      const validData = insertDataSourceSchema.parse(req.body);
      const tenantId = req.tenant?.id || req.user?.tenantId;
      if (tenantId) {
        validData.tenantId = tenantId;
      }
      const dataSource = await storage.createDataSource(validData);
      return res.status(201).json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Failed to create data source" });
    }
  });
  app2.patch("/api/data-sources/:id", requireAuth2, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to update data sources" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid data source ID" });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const existingDataSource = await storage.getDataSourceById(id, tenantId);
      if (!existingDataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      const updates = req.body;
      const updatedDataSource = await storage.updateDataSource(id, updates, tenantId);
      return res.status(200).json(updatedDataSource);
    } catch (error) {
      console.error("Error updating data source:", error);
      return res.status(500).json({ error: "Failed to update data source" });
    }
  });
  app2.delete("/api/data-sources/:id", requireAuth2, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to delete data sources" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid data source ID" });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const existingDataSource = await storage.getDataSourceById(id, tenantId);
      if (!existingDataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      const success = await storage.deleteDataSource(id, tenantId);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete data source" });
      }
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting data source:", error);
      return res.status(500).json({ error: "Failed to delete data source" });
    }
  });
}

// server/mfa-service.ts
init_storage();
import speakeasy from "speakeasy";
import QRCode from "qrcode";
if (!storage.updateUser) {
  throw new Error("Storage implementation does not have updateUser method");
}
var MfaService = class {
  /**
   * Generate a new MFA secret for a user
   * 
   * @param user The user to generate a secret for
   * @returns The secret and QR code data URL
   */
  async generateMfaSecret(user) {
    const secret = speakeasy.generateSecret({
      name: `SAHAYAA.AI:${user.username}`,
      length: 20
    });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");
    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }
  /**
   * Verify a TOTP code against a user's MFA secret
   * 
   * @param user The user to verify
   * @param token The token to verify
   * @returns Whether the token is valid
   */
  verifyToken(user, token) {
    if (!user.mfaSecret) {
      return false;
    }
    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token
    });
  }
  /**
   * Enable MFA for a user
   * 
   * @param userId The ID of the user to enable MFA for
   * @param secret The MFA secret to use
   * @returns The updated user
   */
  async enableMfa(userId, secret) {
    const backupCodes = Array(8).fill(0).map(() => this.generateBackupCode());
    const updatedUser = await storage.updateUser(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaBackupCodes: backupCodes
    });
    return updatedUser;
  }
  /**
   * Disable MFA for a user
   * 
   * @param userId The ID of the user to disable MFA for
   * @returns The updated user
   */
  async disableMfa(userId) {
    const updatedUser = await storage.updateUser(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: []
    });
    return updatedUser;
  }
  /**
   * Verify a backup code for a user
   * 
   * @param user The user to verify
   * @param code The backup code to verify
   * @returns Whether the code is valid
   */
  async verifyBackupCode(user, code) {
    if (!user.mfaEnabled || !user.mfaBackupCodes) {
      return false;
    }
    const backupCodes = user.mfaBackupCodes;
    const codeIndex = backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return false;
    }
    const updatedCodes = [...backupCodes];
    updatedCodes.splice(codeIndex, 1);
    await storage.updateUser(user.id, {
      mfaBackupCodes: updatedCodes
    });
    return true;
  }
  /**
   * Generate a new set of backup codes for a user
   * 
   * @param userId The ID of the user to generate backup codes for
   * @returns The new backup codes
   */
  async regenerateBackupCodes(userId) {
    const backupCodes = Array(8).fill(0).map(() => this.generateBackupCode());
    await storage.updateUser(userId, {
      mfaBackupCodes: backupCodes
    });
    return backupCodes;
  }
  /**
   * Generate a random backup code
   * 
   * @returns A backup code
   */
  generateBackupCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
};
var mfaService = null;
function getMfaService() {
  if (!mfaService) {
    mfaService = new MfaService();
  }
  return mfaService;
}

// server/routes/mfa-routes.ts
function registerMfaRoutes(app2, requireAuth2) {
  const mfaService2 = getMfaService();
  app2.post("/api/mfa/setup", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { secret, qrCodeUrl } = await mfaService2.generateMfaSecret(user);
      return res.status(200).json({
        secret,
        qrCodeUrl
      });
    } catch (error) {
      console.error("Error setting up MFA:", error);
      return res.status(500).json({ message: "Failed to set up MFA" });
    }
  });
  app2.post("/api/mfa/verify", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { token, secret } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      if (!secret) {
        return res.status(400).json({ message: "Secret is required" });
      }
      const tempUser = { ...user, mfaSecret: secret };
      const isValid = mfaService2.verifyToken(tempUser, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid token" });
      }
      return res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error("Error verifying MFA token:", error);
      return res.status(500).json({ message: "Failed to verify MFA token" });
    }
  });
  app2.post("/api/mfa/enable", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { token, secret } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      if (!secret) {
        return res.status(400).json({ message: "Secret is required" });
      }
      const tempUser = { ...user, mfaSecret: secret };
      const isValid = mfaService2.verifyToken(tempUser, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid token" });
      }
      const updatedUser = await mfaService2.enableMfa(user.id, secret);
      const { password, mfaSecret, ...userWithoutSensitiveData } = updatedUser;
      return res.status(200).json({
        ...userWithoutSensitiveData,
        backupCodes: updatedUser.mfaBackupCodes
        // Send backup codes for initial setup
      });
    } catch (error) {
      console.error("Error enabling MFA:", error);
      return res.status(500).json({ message: "Failed to enable MFA" });
    }
  });
  app2.post("/api/mfa/disable", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { token } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      if (token) {
        const isValid = mfaService2.verifyToken(user, token);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid token" });
        }
      }
      const updatedUser = await mfaService2.disableMfa(user.id);
      const { password, mfaSecret, ...userWithoutSensitiveData } = updatedUser;
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error("Error disabling MFA:", error);
      return res.status(500).json({ message: "Failed to disable MFA" });
    }
  });
  app2.post("/api/mfa/backup-codes/regenerate", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { token } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      if (token) {
        const isValid = mfaService2.verifyToken(user, token);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid token" });
        }
      }
      const backupCodes = await mfaService2.regenerateBackupCodes(user.id);
      return res.status(200).json({ backupCodes });
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      return res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });
  app2.post("/api/mfa/validate-token", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { token } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      const isValid = mfaService2.verifyToken(user, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid token" });
      }
      return res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error("Error validating MFA token:", error);
      return res.status(500).json({ message: "Failed to validate MFA token" });
    }
  });
  app2.post("/api/mfa/validate-backup-code", requireAuth2, async (req, res) => {
    try {
      const user = req.user;
      const { code } = req.body;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      if (!code) {
        return res.status(400).json({ message: "Backup code is required" });
      }
      const isValid = await mfaService2.verifyBackupCode(user, code);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid backup code" });
      }
      return res.status(200).json({ message: "Backup code is valid" });
    } catch (error) {
      console.error("Error validating backup code:", error);
      return res.status(500).json({ message: "Failed to validate backup code" });
    }
  });
}

// server/routes/sso-routes.ts
import passport2 from "passport";

// server/sso-service.ts
init_storage();
import { Strategy as SamlStrategy } from "passport-saml";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
var SsoService = class {
  /**
   * Initialize SSO providers for a tenant
   * 
   * @param tenantId The ID of the tenant to initialize SSO for
   */
  async initializeProviders(tenantId) {
    const providers = await storage.getIdentityProviders(tenantId);
    const enabledProviders = providers.filter((p) => p.enabled);
    for (const provider of enabledProviders) {
      this.setupProvider(provider);
    }
  }
  /**
   * Set up a specific identity provider
   * 
   * @param provider The identity provider to set up
   */
  setupProvider(provider) {
    const { type, config } = provider;
    if (type === "saml") {
      this.setupSamlProvider(provider.id, config);
    } else if (type === "oauth2") {
      this.setupOAuth2Provider(provider.id, config);
    } else if (type === "google") {
      this.setupGoogleProvider(provider.id, config);
    } else {
      console.warn(`Unsupported SSO provider type: ${type}`);
    }
  }
  /**
   * Set up a Google OAuth provider
   * 
   * @param providerId The ID of the identity provider
   * @param config The Google configuration
   */
  setupGoogleProvider(providerId, config) {
    const googleConfig = {
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL || `/api/sso/google/${providerId}/callback`,
      scope: config.scope || ["profile", "email"],
      passReqToCallback: true
    };
    passport.use(`google-${providerId}`, new GoogleStrategy(
      googleConfig,
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const tenantId = req.tenant?.id || 1;
          const user = await this.findOrCreateSsoUser(
            "google",
            profile.id,
            tenantId,
            {
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              role: "user"
              // Default role
            },
            {
              accessToken,
              refreshToken,
              profile
            }
          );
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
  /**
   * Set up a SAML identity provider
   * 
   * @param providerId The ID of the identity provider
   * @param config The SAML configuration
   */
  setupSamlProvider(providerId, config) {
    const samlConfig = {
      callbackUrl: config.callbackUrl,
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      identifierFormat: config.identifierFormat || "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      validateInResponseTo: config.validateInResponseTo !== false,
      disableRequestedAuthnContext: config.disableRequestedAuthnContext === true,
      passReqToCallback: true
    };
    passport.use(`saml-${providerId}`, new SamlStrategy(
      samlConfig,
      async (req, profile, done) => {
        try {
          const tenantId = req.tenant?.id || 1;
          const user = await this.findOrCreateSsoUser(
            "saml",
            profile.nameID,
            tenantId,
            {
              name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
              email: profile.email,
              // Extract role from attributes if available
              role: profile["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "user"
            }
          );
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
  /**
   * Set up an OAuth2 identity provider
   * 
   * @param providerId The ID of the identity provider
   * @param config The OAuth2 configuration
   */
  setupOAuth2Provider(providerId, config) {
    const oauth2Config = {
      authorizationURL: config.authorizationURL,
      tokenURL: config.tokenURL,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope || "profile email",
      passReqToCallback: true
      // Force type to 'true' literal
    };
    passport.use(`oauth2-${providerId}`, new OAuth2Strategy(
      oauth2Config,
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const tenantId = req.tenant?.id || 1;
          const user = await this.findOrCreateSsoUser(
            "oauth2",
            profile.id || profile.sub,
            tenantId,
            {
              name: profile.name || profile.displayName,
              email: profile.email,
              role: "user"
              // Default role
            },
            {
              accessToken,
              refreshToken,
              profile
            }
          );
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }
  /**
   * Find or create a user for SSO authentication
   * 
   * @param provider The SSO provider type
   * @param providerId The user ID from the provider
   * @param tenantId The tenant ID
   * @param profileInfo The user profile information
   * @param providerData Additional provider data
   * @returns The found or created user
   */
  async findOrCreateSsoUser(provider, providerId, tenantId, profileInfo, providerData = {}) {
    let user = await storage.getUserBySsoId(provider, providerId, tenantId);
    if (user) {
      if (providerData && Object.keys(providerData).length > 0) {
        user = await storage.updateUser(user.id, {
          ssoProviderData: providerData,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      return user;
    }
    const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const newUser = {
      username: profileInfo.email || `${provider}_${providerId}`,
      password: randomPassword,
      // This won't be used for login
      name: profileInfo.name || null,
      email: profileInfo.email || null,
      role: profileInfo.role || "user",
      tenantId
    };
    const createdUser = await storage.createUser(newUser);
    return await storage.updateUser(createdUser.id, {
      ssoEnabled: true,
      ssoProvider: provider,
      ssoProviderId: providerId,
      ssoProviderData: providerData
    });
  }
  /**
   * Get an SSO provider configuration
   * 
   * @param providerId The ID of the provider to get
   * @param tenantId Optional tenant ID to restrict access
   * @returns The identity provider configuration
   */
  async getProvider(providerId, tenantId) {
    return storage.getIdentityProviderById(providerId, tenantId);
  }
  /**
   * Create a new SSO provider configuration
   * 
   * @param provider The provider configuration to create
   * @returns The created provider
   */
  async createProvider(provider) {
    const createdProvider = await storage.createIdentityProvider(provider);
    this.setupProvider(createdProvider);
    return createdProvider;
  }
  /**
   * Update an SSO provider configuration
   * 
   * @param providerId The ID of the provider to update
   * @param updates The updates to apply
   * @param tenantId Optional tenant ID to restrict access
   * @returns The updated provider
   */
  async updateProvider(providerId, updates, tenantId) {
    const updatedProvider = await storage.updateIdentityProvider(providerId, updates, tenantId);
    if (updatedProvider.enabled) {
      this.setupProvider(updatedProvider);
    }
    return updatedProvider;
  }
  /**
   * Delete an SSO provider configuration
   * 
   * @param providerId The ID of the provider to delete
   * @param tenantId Optional tenant ID to restrict access
   * @returns Whether the deletion was successful
   */
  async deleteProvider(providerId, tenantId) {
    return storage.deleteIdentityProvider(providerId, tenantId);
  }
  /**
   * Test an SSO provider configuration
   * 
   * @param providerConfig The configuration to test
   * @returns A result object indicating success or failure
   */
  async testProvider(providerConfig) {
    try {
      const { type, config } = providerConfig;
      if (type === "saml") {
        if (!config.entryPoint || !config.callbackUrl || !config.cert) {
          return {
            success: false,
            message: "Missing required SAML configuration: entryPoint, callbackUrl, and cert are required"
          };
        }
      } else if (type === "oauth2") {
        if (!config.authorizationURL || !config.tokenURL || !config.clientID || !config.clientSecret || !config.callbackURL) {
          return {
            success: false,
            message: "Missing required OAuth2 configuration: authorizationURL, tokenURL, clientID, clientSecret, and callbackURL are required"
          };
        }
      } else if (type === "google") {
        if (!config.clientID || !config.clientSecret) {
          return {
            success: false,
            message: "Missing required Google configuration: clientID and clientSecret are required"
          };
        }
      } else {
        return { success: false, message: `Unsupported SSO provider type: ${type}` };
      }
      return { success: true, message: "SSO provider configuration looks valid" };
    } catch (error) {
      return {
        success: false,
        message: `Error testing SSO provider: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};
var ssoService = null;
function getSsoService() {
  if (!ssoService) {
    ssoService = new SsoService();
  }
  return ssoService;
}

// server/routes/sso-routes.ts
init_storage();
function registerSsoRoutes(app2, requireAuth2, requireRole) {
  app2.get("/api/sso/providers", async (req, res) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const providers = await storage.getIdentityProviders(tenantId);
      const enabledProviders = providers.filter((p) => p.enabled);
      const providerList = enabledProviders.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type
      }));
      res.status(200).json(providerList);
    } catch (error) {
      console.error("Error fetching SSO providers:", error);
      res.status(500).json({ message: "Failed to fetch SSO providers" });
    }
  });
  app2.get("/api/admin/sso/providers", requireRole(["admin"]), async (req, res) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const providers = await storage.getIdentityProviders(tenantId);
      res.status(200).json(providers);
    } catch (error) {
      console.error("Error fetching SSO providers:", error);
      res.status(500).json({ message: "Failed to fetch SSO providers" });
    }
  });
  app2.get("/api/admin/sso/providers/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      const provider = await storage.getIdentityProviderById(id, tenantId);
      if (!provider) {
        return res.status(404).json({ message: "SSO provider not found" });
      }
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching SSO provider:", error);
      res.status(500).json({ message: "Failed to fetch SSO provider" });
    }
  });
  app2.post("/api/admin/sso/providers", requireRole(["admin"]), async (req, res) => {
    try {
      const ssoService2 = getSsoService();
      const tenantId = req.user?.tenantId || 1;
      const providerData = {
        ...req.body,
        tenantId
      };
      const provider = await ssoService2.createProvider(providerData);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Error creating SSO provider:", error);
      res.status(500).json({ message: "Failed to create SSO provider" });
    }
  });
  app2.put("/api/admin/sso/providers/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      const ssoService2 = getSsoService();
      const provider = await storage.getIdentityProviderById(id, tenantId);
      if (!provider) {
        return res.status(404).json({ message: "SSO provider not found" });
      }
      const updatedProvider = await ssoService2.updateProvider(id, req.body, tenantId);
      res.status(200).json(updatedProvider);
    } catch (error) {
      console.error("Error updating SSO provider:", error);
      res.status(500).json({ message: "Failed to update SSO provider" });
    }
  });
  app2.delete("/api/admin/sso/providers/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId || 1;
      const provider = await storage.getIdentityProviderById(id, tenantId);
      if (!provider) {
        return res.status(404).json({ message: "SSO provider not found" });
      }
      const deleted = await storage.deleteIdentityProvider(id, tenantId);
      if (deleted) {
        res.status(200).json({ message: "SSO provider deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete SSO provider" });
      }
    } catch (error) {
      console.error("Error deleting SSO provider:", error);
      res.status(500).json({ message: "Failed to delete SSO provider" });
    }
  });
  app2.post("/api/admin/sso/providers/test", requireRole(["admin"]), async (req, res) => {
    try {
      const ssoService2 = getSsoService();
      const result = await ssoService2.testProvider(req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error testing SSO provider:", error);
      res.status(500).json({
        success: false,
        message: `Error testing SSO provider: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  app2.get("/api/sso/:providerType/:providerId", async (req, res) => {
    const { providerType, providerId } = req.params;
    if (providerType === "oauth2") {
      passport2.authenticate(`oauth2-${providerId}`, {
        scope: ["profile", "email"]
      })(req, res);
    } else if (providerType === "google") {
      passport2.authenticate(`google-${providerId}`, {
        scope: ["profile", "email"]
      })(req, res);
    } else if (providerType === "saml") {
      passport2.authenticate(`saml-${providerId}`)(req, res);
    } else {
      res.status(400).json({ message: "Unsupported SSO provider type" });
    }
  });
  app2.get("/api/sso/:providerType/:providerId/callback", (req, res, next) => {
    const { providerType, providerId } = req.params;
    const authHandler = passport2.authenticate(`${providerType}-${providerId}`, {
      failureRedirect: "/auth?error=Failed%20to%20authenticate"
    }, (err, user) => {
      if (err || !user) {
        console.error("SSO authentication error:", err);
        return res.redirect("/auth?error=Failed%20to%20authenticate");
      }
      req.session.userId = user.id;
      res.redirect("/");
    });
    authHandler(req, res, next);
  });
}

// server/routes/widget-analytics-routes.ts
init_storage();
import { z as z5 } from "zod";
function registerWidgetAnalyticsRoutes(app2, requireAuth2) {
  app2.get("/api/widget-analytics/:apiKey", async (req, res) => {
    try {
      const { apiKey } = req.params;
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      const analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      if (!analytics) {
        return res.status(404).json({ message: "Widget analytics not found" });
      }
      res.status(200).json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/widget-analytics/:apiKey", tenantApiKeyAuth, async (req, res) => {
    try {
      const { apiKey } = req.params;
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      let analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      if (!analytics) {
        if (!req.tenant) {
          return res.status(404).json({ message: "Tenant not found for this API key" });
        }
        const validatedData = {
          apiKey,
          tenantId: req.tenant.id,
          adminId: req.tenant.adminId || 1,
          // Default to admin ID 1 if not specified
          clientWebsite: req.get("Referer") || null,
          interactions: 1,
          messagesReceived: 0,
          messagesSent: 0,
          ticketsCreated: 0,
          lastActivity: /* @__PURE__ */ new Date(),
          lastClientIp: req.ip || null,
          clientInfo: req.headers["user-agent"] || null,
          metadata: {}
        };
        analytics = await storage.createWidgetAnalytics(validatedData);
      } else {
        const updates = {
          interactions: (analytics.interactions || 0) + 1,
          lastActivity: /* @__PURE__ */ new Date(),
          lastClientIp: req.ip || null,
          clientInfo: req.headers["user-agent"] || null
        };
        const { action } = req.body;
        if (action === "message_received") {
          updates.messagesReceived = (analytics.messagesReceived || 0) + 1;
        } else if (action === "message_sent") {
          updates.messagesSent = (analytics.messagesSent || 0) + 1;
        } else if (action === "ticket_created") {
          updates.ticketsCreated = (analytics.ticketsCreated || 0) + 1;
        }
        const referer = req.get("Referer");
        if (referer && (!analytics.clientWebsite || analytics.clientWebsite !== referer)) {
          updates.clientWebsite = referer;
        }
        analytics = await storage.updateWidgetAnalytics(analytics.id, updates);
      }
      res.status(200).json(analytics);
    } catch (error) {
      if (error instanceof z5.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  const getTimePeriodCutoff2 = (timePeriod) => {
    const now = /* @__PURE__ */ new Date();
    const cutoffDate = /* @__PURE__ */ new Date();
    switch (timePeriod) {
      case "daily":
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case "weekly":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "quarterly":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 7);
    }
    return cutoffDate;
  };
  app2.get("/api/admin/widget-analytics", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const timePeriod = req.query.timePeriod || "weekly";
      const analyticsData = await storage.getWidgetAnalyticsByAdminId(
        req.user.id,
        req.user.tenantId
      );
      const cutoffDate = getTimePeriodCutoff2(timePeriod);
      const filteredData = analyticsData.filter((item) => {
        const lastActivity = new Date(item.lastActivity);
        return lastActivity >= cutoffDate;
      });
      res.status(200).json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// server/routes/user-routes.ts
init_storage();
function registerUserRoutes(app2, requireAuth2, requireRole) {
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const safeUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      };
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/users", requireRole(["admin", "support-agent"]), async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      const users2 = isCreator ? await storage.getUsersByTenantId(0) : await storage.getUsersByTenantId(tenantId);
      const safeUsers = users2.map((user) => {
        const { password, mfaSecret, mfaBackupCodes, ...safeUser } = user;
        return safeUser;
      });
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}

// server/routes/ai-provider-routes.ts
init_db();
init_schema();
import { Router } from "express";
import { eq as eq3, and as and3, or as or3, isNull as isNull3 } from "drizzle-orm";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { z as z6 } from "zod";

// server/ai/middleware/check-ai-provider.ts
async function checkAiProviderAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const { id: userId, tenantId, teamId, role } = req.user;
    if (role === "admin" || role === "creator") {
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        "provider_access_check",
        true,
        { reason: `User has ${role} role with automatic access` }
      ).catch((err) => console.error("Failed to log AI provider access:", err));
      return next();
    }
    const hasAccess = await getAiProviderAccessForUser(tenantId, teamId);
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      "provider_access_check",
      hasAccess,
      { reason: hasAccess ? "User has provider access" : "No providers available for user" }
    ).catch((err) => console.error("Failed to log AI provider access:", err));
    if (hasAccess) {
      return next();
    }
    return res.status(403).json({
      message: "AI features are not available for your account",
      details: "Contact your administrator to set up AI providers for your team"
    });
  } catch (error) {
    console.error("Error checking AI provider access:", error);
    logAiProviderAccess(
      req.user.id,
      req.user.tenantId,
      req.user.teamId,
      "provider_access_check",
      false,
      { error: String(error) }
    ).catch((err) => console.error("Failed to log AI provider access:", err));
    return next();
  }
}

// server/routes/ai-provider-routes.ts
var router = Router();
router.get("/ai/providers/available", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        available: false,
        message: "Not authenticated"
      });
    }
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;
    if (isCreatorOrAdminRole(req.user.role)) {
      const providers = await db.select({ count: aiProviders.id }).from(aiProviders).where(eq3(aiProviders.tenantId, tenantId));
      const hasProviders = providers.length > 0 && providers[0].count > 0;
      return res.json({
        available: hasProviders,
        message: hasProviders ? "AI providers available" : "No AI providers configured for this tenant",
        role: "admin_or_creator"
      });
    }
    const hasAccess = await getAiProviderAccessForUser(tenantId, teamId);
    try {
      await logAiProviderAccess(
        req.user.id,
        tenantId,
        teamId,
        "check_availability",
        hasAccess,
        {
          userRole: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        }
      );
    } catch (logError) {
      console.error("Failed to log AI provider access check:", logError);
    }
    return res.json({
      available: hasAccess,
      message: hasAccess ? "AI providers available" : "No AI providers configured for your tenant/team"
    });
  } catch (error) {
    console.error("Error checking AI provider availability:", error);
    return res.status(500).json({
      available: false,
      message: "Internal server error"
    });
  }
});
var insertAIProviderSchema = createInsertSchema2(aiProviders, {
  name: z6.string().min(1, "Provider name is required"),
  provider: z6.string().min(1, "Provider type is required"),
  model: z6.string().min(1, "Model name is required"),
  apiKey: z6.string().optional(),
  endpoint: z6.string().optional(),
  isDefault: z6.boolean().default(false),
  enabled: z6.boolean().default(true),
  tenantId: z6.number(),
  teamId: z6.number().nullable().optional(),
  priority: z6.number().int().min(1).max(100).default(50),
  contextWindow: z6.number().int().min(1e3).max(1e5).default(8e3),
  maxTokens: z6.number().int().min(100).max(1e4).default(1e3),
  temperature: z6.number().min(0).max(1).default(0.7)
}).omit({ id: true, createdAt: true, updatedAt: true });
router.get("/tenants/:tenantId/ai-providers", checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: "You do not have permission to access AI providers for this tenant" });
    }
    let aiProviders2;
    if (isCreatorOrAdminRole(req.user?.role)) {
      aiProviders2 = await db.select().from(aiProviders).where(eq3(aiProviders.tenantId, tenantId));
    } else {
      const teamId = req.user?.teamId || null;
      aiProviders2 = await db.select().from(aiProviders).where(and3(
        eq3(aiProviders.tenantId, tenantId),
        or3(
          eq3(aiProviders.teamId, teamId),
          isNull3(aiProviders.teamId)
        )
      ));
    }
    return res.json(aiProviders2);
  } catch (error) {
    console.error("Error fetching AI providers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/tenants/:tenantId/ai-providers", checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: "You do not have permission to create AI providers for this tenant" });
    }
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: "Only administrators and creators can create AI providers" });
    }
    const result = insertAIProviderSchema.safeParse({
      ...req.body,
      tenantId
    });
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
    }
    if (result.data.isDefault) {
      if (result.data.teamId) {
        await db.update(aiProviders).set({ isDefault: false }).where(and3(
          eq3(aiProviders.tenantId, tenantId),
          eq3(aiProviders.teamId, result.data.teamId),
          eq3(aiProviders.isDefault, true)
        ));
      } else {
        await db.update(aiProviders).set({ isDefault: false }).where(and3(
          eq3(aiProviders.tenantId, tenantId),
          isNull3(aiProviders.teamId),
          eq3(aiProviders.isDefault, true)
        ));
      }
    }
    const [aiProvider] = await db.insert(aiProviders).values(result.data).returning();
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          result.data.teamId || null,
          "create",
          aiProvider.id,
          {
            name: aiProvider.name,
            provider: aiProvider.provider,
            model: aiProvider.model,
            teamScoped: result.data.teamId ? true : false,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          }
        );
      }
    } catch (logError) {
      console.error("Failed to log AI provider creation:", logError);
    }
    return res.status(201).json(aiProvider);
  } catch (error) {
    console.error("Error creating AI provider:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.patch("/tenants/:tenantId/ai-providers/:providerId", checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: "You do not have permission to update AI providers for this tenant" });
    }
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: "Only administrators and creators can update AI providers" });
    }
    const existingProvider = await db.select().from(aiProviders).where(and3(
      eq3(aiProviders.id, providerId),
      eq3(aiProviders.tenantId, tenantId)
    )).limit(1);
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: "AI provider not found" });
    }
    const updateSchema = insertAIProviderSchema.partial();
    const result = updateSchema.safeParse({
      ...req.body,
      tenantId
    });
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
    }
    if (result.data.isDefault && !existingProvider[0].isDefault) {
      const teamId = result.data.teamId !== void 0 ? result.data.teamId : existingProvider[0].teamId;
      if (teamId) {
        await db.update(aiProviders).set({ isDefault: false }).where(and3(
          eq3(aiProviders.tenantId, tenantId),
          eq3(aiProviders.teamId, teamId),
          eq3(aiProviders.isDefault, true)
        ));
      } else {
        await db.update(aiProviders).set({ isDefault: false }).where(and3(
          eq3(aiProviders.tenantId, tenantId),
          isNull3(aiProviders.teamId),
          eq3(aiProviders.isDefault, true)
        ));
      }
    }
    let updateData = result.data;
    if (!updateData.apiKey) {
      delete updateData.apiKey;
    }
    const [updatedProvider] = await db.update(aiProviders).set(updateData).where(and3(
      eq3(aiProviders.id, providerId),
      eq3(aiProviders.tenantId, tenantId)
    )).returning();
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          updatedProvider.teamId,
          "update",
          providerId,
          {
            name: updatedProvider.name,
            changes: Object.keys(updateData),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          }
        );
      }
    } catch (logError) {
      console.error("Failed to log AI provider update:", logError);
    }
    return res.json(updatedProvider);
  } catch (error) {
    console.error("Error updating AI provider:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.delete("/tenants/:tenantId/ai-providers/:providerId", checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: "You do not have permission to delete AI providers for this tenant" });
    }
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: "Only administrators and creators can delete AI providers" });
    }
    const existingProvider = await db.select().from(aiProviders).where(and3(
      eq3(aiProviders.id, providerId),
      eq3(aiProviders.tenantId, tenantId)
    )).limit(1);
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: "AI provider not found" });
    }
    await db.delete(aiProviders).where(and3(
      eq3(aiProviders.id, providerId),
      eq3(aiProviders.tenantId, tenantId)
    ));
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          existingProvider[0].teamId,
          "delete",
          providerId,
          {
            name: existingProvider[0].name,
            provider: existingProvider[0].provider,
            model: existingProvider[0].model,
            teamScoped: existingProvider[0].teamId ? true : false,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          }
        );
      }
    } catch (logError) {
      console.error("Failed to log AI provider deletion:", logError);
    }
    return res.json({
      message: "AI provider deleted successfully",
      provider: existingProvider[0]
    });
  } catch (error) {
    console.error("Error deleting AI provider:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
var ai_provider_routes_default = router;

// server/routes/team-member-routes.ts
init_db();
init_schema();
import { Router as Router2 } from "express";
import { eq as eq4, and as and4 } from "drizzle-orm";
var router2 = Router2();
function registerTeamMemberRoutes(app2, requireRole) {
  app2.post("/api/teams/:teamId/members/:userId", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      if (isNaN(teamId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid team or user ID" });
      }
      const tenantId = req.user?.tenantId || 1;
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - adding user ${userId} to team ${teamId} with cross-tenant access`);
        const teamResult2 = await db.select().from(teams).where(eq4(teams.id, teamId)).limit(1);
        if (teamResult2.length === 0) {
          return res.status(404).json({ message: "Team not found" });
        }
        const teamTenantId = teamResult2[0].tenantId;
        const userResult2 = await db.select().from(users).where(eq4(users.id, userId)).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        if (userResult2[0].tenantId !== teamTenantId) {
          return res.status(400).json({
            message: "Cannot add user to team in different tenant",
            userTenantId: userResult2[0].tenantId,
            teamTenantId
          });
        }
        const result2 = await db.update(users).set({ teamId }).where(eq4(users.id, userId)).returning();
        return res.status(200).json(result2[0]);
      }
      const teamResult = await db.select().from(teams).where(and4(
        eq4(teams.id, teamId),
        eq4(teams.tenantId, tenantId)
      )).limit(1);
      if (teamResult.length === 0) {
        return res.status(404).json({ message: "Team not found or access denied" });
      }
      const userResult = await db.select().from(users).where(and4(
        eq4(users.id, userId),
        eq4(users.tenantId, tenantId)
      )).limit(1);
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      const result = await db.update(users).set({ teamId }).where(and4(
        eq4(users.id, userId),
        eq4(users.tenantId, tenantId)
      )).returning();
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error("Error adding user to team:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/teams/:teamId/members/:userId", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      if (isNaN(teamId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid team or user ID" });
      }
      const tenantId = req.user?.tenantId || 1;
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - removing user ${userId} from team ${teamId} with cross-tenant access`);
        const userResult2 = await db.select().from(users).where(and4(
          eq4(users.id, userId),
          eq4(users.teamId, teamId)
        )).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found or not in the team" });
        }
        const result2 = await db.update(users).set({ teamId: null }).where(eq4(users.id, userId)).returning();
        return res.status(200).json(result2[0]);
      }
      const userResult = await db.select().from(users).where(and4(
        eq4(users.id, userId),
        eq4(users.tenantId, tenantId),
        eq4(users.teamId, teamId)
      )).limit(1);
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found, not in the team, or access denied" });
      }
      const result = await db.update(users).set({ teamId: null }).where(and4(
        eq4(users.id, userId),
        eq4(users.tenantId, tenantId)
      )).returning();
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error("Error removing user from team:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/team-members", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - retrieving all team members with cross-tenant access`);
        let whereClause;
        if (req.query.tenantId) {
          const queryTenantId = parseInt(req.query.tenantId);
          if (!isNaN(queryTenantId)) {
            whereClause = eq4(users.tenantId, queryTenantId);
          }
        }
        const result2 = whereClause ? await db.select().from(users).where(whereClause) : await db.select().from(users);
        return res.status(200).json(result2);
      } else if (req.user?.role === "administrator" || req.user?.role === "admin") {
        console.log(`Administrator role detected - retrieving team members for tenant ${tenantId}`);
        const result2 = await db.select().from(users).where(eq4(users.tenantId, tenantId));
        return res.status(200).json(result2);
      }
      const result = await db.select().from(users).where(eq4(users.tenantId, tenantId));
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching team members:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/team-members/:id", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const tenantId = req.user?.tenantId || 1;
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - retrieving team member ${id} with cross-tenant access`);
        const result2 = await db.select().from(users).where(eq4(users.id, id)).limit(1);
        if (result2.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(result2[0]);
      } else if (req.user?.role === "administrator" || req.user?.role === "admin") {
        console.log(`Administrator role detected - retrieving team member ${id} for tenant ${tenantId}`);
        const result2 = await db.select().from(users).where(and4(
          eq4(users.id, id),
          eq4(users.tenantId, tenantId)
        )).limit(1);
        if (result2.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        return res.status(200).json(result2[0]);
      }
      const result = await db.select().from(users).where(and4(
        eq4(users.id, id),
        eq4(users.tenantId, tenantId)
      )).limit(1);
      if (result.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error("Error fetching team member:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/team-members", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const { username, password, role, name, email } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Missing required fields: username, password, and role are required" });
      }
      const tenantId = req.user?.tenantId || 1;
      const existingUser = await db.select().from(users).where(eq4(users.username, username)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(password);
      const result = await db.insert(users).values({
        username,
        password: hashedPassword,
        role,
        name: name || null,
        email: email || null,
        tenantId,
        teamId: null,
        mfaEnabled: false,
        ssoEnabled: false,
        profilePicture: null
      }).returning();
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      const { password: _, ...userWithoutPassword } = result[0];
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating team member:", error);
      return res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  app2.patch("/api/team-members/:id", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const { username, password, role, name, email } = req.body;
      const tenantId = req.user?.tenantId || 1;
      const updateData = {};
      if (username) updateData.username = username;
      if (role) updateData.role = role;
      if (name !== void 0) updateData.name = name || null;
      if (email !== void 0) updateData.email = email || null;
      if (password) {
        updateData.password = await hashPassword(password);
      }
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - updating team member ${id} with cross-tenant access`);
        const userResult2 = await db.select().from(users).where(eq4(users.id, id)).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const result2 = await db.update(users).set(updateData).where(eq4(users.id, id)).returning();
        if (result2.length === 0) {
          return res.status(500).json({ message: "Failed to update user" });
        }
        const { password: _2, ...userWithoutPassword2 } = result2[0];
        return res.status(200).json(userWithoutPassword2);
      } else if (req.user?.role === "administrator" || req.user?.role === "admin") {
        console.log(`Administrator role detected - updating team member ${id} for tenant ${tenantId}`);
        const userResult2 = await db.select().from(users).where(and4(
          eq4(users.id, id),
          eq4(users.tenantId, tenantId)
        )).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        const result2 = await db.update(users).set(updateData).where(and4(
          eq4(users.id, id),
          eq4(users.tenantId, tenantId)
        )).returning();
        if (result2.length === 0) {
          return res.status(500).json({ message: "Failed to update user" });
        }
        const { password: _2, ...userWithoutPassword2 } = result2[0];
        return res.status(200).json(userWithoutPassword2);
      }
      const userResult = await db.select().from(users).where(and4(
        eq4(users.id, id),
        eq4(users.tenantId, tenantId)
      )).limit(1);
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      const result = await db.update(users).set(updateData).where(and4(
        eq4(users.id, id),
        eq4(users.tenantId, tenantId)
      )).returning();
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      const { password: _, ...userWithoutPassword } = result[0];
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating team member:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/team-members/:id", requireRole(["admin", "creator"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const tenantId = req.user?.tenantId || 1;
      if (req.user?.role === "creator") {
        console.log(`Creator role detected - deleting team member ${id} with cross-tenant access`);
        const userResult2 = await db.select().from(users).where(eq4(users.id, id)).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const result2 = await db.delete(users).where(eq4(users.id, id)).returning();
        if (result2.length === 0) {
          return res.status(500).json({ message: "Failed to delete user" });
        }
        return res.status(200).json({ message: "User deleted successfully" });
      } else if (req.user?.role === "administrator" || req.user?.role === "admin") {
        console.log(`Administrator role detected - deleting team member ${id} for tenant ${tenantId}`);
        const userResult2 = await db.select().from(users).where(and4(
          eq4(users.id, id),
          eq4(users.tenantId, tenantId)
        )).limit(1);
        if (userResult2.length === 0) {
          return res.status(404).json({ message: "User not found or access denied" });
        }
        const result2 = await db.delete(users).where(and4(
          eq4(users.id, id),
          eq4(users.tenantId, tenantId)
        )).returning();
        if (result2.length === 0) {
          return res.status(500).json({ message: "Failed to delete user" });
        }
        return res.status(200).json({ message: "User deleted successfully" });
      }
      const userResult = await db.select().from(users).where(and4(
        eq4(users.id, id),
        eq4(users.tenantId, tenantId)
      )).limit(1);
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      const result = await db.delete(users).where(and4(
        eq4(users.id, id),
        eq4(users.tenantId, tenantId)
      )).returning();
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting team member:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  return router2;
}

// server/routes/team-routes.ts
init_db();
init_schema();
import { Router as Router3 } from "express";
import { eq as eq5, and as and5 } from "drizzle-orm";
var router3 = Router3();
router3.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tenantId = req.user.tenantId;
    if (req.isCreatorUser) {
      console.log("Creator role detected - fetching teams across all tenants");
      const result2 = await db.select().from(teams);
      return res.status(200).json(result2);
    }
    const result = await db.select().from(teams).where(eq5(teams.tenantId, tenantId));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ message: "Error fetching teams" });
  }
});
router3.get("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    const tenantId = req.user.tenantId;
    if (req.isCreatorUser) {
      console.log(`Creator role detected - fetching team ${teamId} with cross-tenant access`);
      const result2 = await db.select().from(teams).where(eq5(teams.id, teamId)).limit(1);
      if (result2.length === 0) {
        return res.status(404).json({ message: "Team not found" });
      }
      return res.status(200).json(result2[0]);
    }
    const result = await db.select().from(teams).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    )).limit(1);
    if (result.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error fetching team:", error);
    return res.status(500).json({ message: "Error fetching team" });
  }
});
router3.get("/:id/members", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    const tenantId = req.user.tenantId;
    if (req.isCreatorUser) {
      console.log(`Creator role detected - fetching team ${teamId} and its members with cross-tenant access`);
      const teamResult2 = await db.select().from(teams).where(eq5(teams.id, teamId)).limit(1);
      if (teamResult2.length === 0) {
        return res.status(404).json({ message: "Team not found" });
      }
      const result2 = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        tenantId: users.tenantId,
        // Include tenant ID for cross-tenant view
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users).where(eq5(users.teamId, teamId));
      return res.status(200).json(result2);
    }
    const teamResult = await db.select().from(teams).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    )).limit(1);
    if (teamResult.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    const result = await db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      profilePicture: users.profilePicture,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(and5(
      eq5(users.teamId, teamId),
      eq5(users.tenantId, tenantId)
    ));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return res.status(500).json({ message: "Error fetching team members" });
  }
});
router3.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "administrator" && req.user.role !== "creator") {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    let tenantId = req.user.tenantId;
    const { name, description, targetTenantId } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Team name is required" });
    }
    if (req.isCreatorUser && targetTenantId) {
      console.log(`Creator role detected - creating team for tenant ID ${targetTenantId}`);
      const tenantResult = await db.select().from(tenants).where(eq5(tenants.id, targetTenantId)).limit(1);
      if (tenantResult.length === 0) {
        return res.status(404).json({ message: "Target tenant not found" });
      }
      tenantId = targetTenantId;
    }
    const insertData = {
      name,
      description: description || "",
      tenantId
    };
    const result = await db.insert(teams).values(insertData).returning();
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({ message: "Error creating team" });
  }
});
router3.put("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "administrator" && req.user.role !== "creator") {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    const tenantId = req.user.tenantId;
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Team name is required" });
    }
    if (req.isCreatorUser) {
      console.log(`Creator role detected - updating team ${teamId} with cross-tenant access`);
      const teamResult2 = await db.select().from(teams).where(eq5(teams.id, teamId)).limit(1);
      if (teamResult2.length === 0) {
        return res.status(404).json({ message: "Team not found" });
      }
      const result2 = await db.update(teams).set({
        name,
        description: description || "",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(teams.id, teamId)).returning();
      return res.status(200).json(result2[0]);
    }
    const teamResult = await db.select().from(teams).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    )).limit(1);
    if (teamResult.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    const result = await db.update(teams).set({
      name,
      description: description || "",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    )).returning();
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error updating team:", error);
    return res.status(500).json({ message: "Error updating team" });
  }
});
router3.delete("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "administrator" && req.user.role !== "creator") {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    const tenantId = req.user.tenantId;
    if (req.isCreatorUser) {
      console.log(`Creator role detected - deleting team ${teamId} with cross-tenant access`);
      const teamResult2 = await db.select().from(teams).where(eq5(teams.id, teamId)).limit(1);
      if (teamResult2.length === 0) {
        return res.status(404).json({ message: "Team not found" });
      }
      const teamTenantId = teamResult2[0].tenantId;
      await db.update(users).set({ teamId: null }).where(and5(
        eq5(users.teamId, teamId),
        eq5(users.tenantId, teamTenantId)
      ));
      await db.delete(teams).where(eq5(teams.id, teamId));
      return res.status(200).json({ message: "Team deleted successfully" });
    }
    const teamResult = await db.select().from(teams).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    )).limit(1);
    if (teamResult.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    await db.update(users).set({ teamId: null }).where(and5(
      eq5(users.teamId, teamId),
      eq5(users.tenantId, tenantId)
    ));
    await db.delete(teams).where(and5(
      eq5(teams.id, teamId),
      eq5(teams.tenantId, tenantId)
    ));
    return res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    return res.status(500).json({ message: "Error deleting team" });
  }
});
var team_routes_default = router3;

// server/routes/profile-routes.ts
init_storage();
init_schema();
import express2 from "express";
import { scrypt as scrypt2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "crypto";
import { promisify as promisify2 } from "util";
import multer from "multer";
import path3 from "path";
import fs2 from "fs";
var scryptAsync2 = promisify2(scrypt2);
var uploadsDir = path3.join(process.cwd(), "uploads");
if (!fs2.existsSync(uploadsDir)) {
  fs2.mkdirSync(uploadsDir, { recursive: true });
}
var storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path3.extname(file.originalname);
    cb(null, "profile-" + uniqueSuffix + ext);
  }
});
var upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  }
});
async function comparePasswords2(supplied, stored) {
  const [hashedPassword, salt] = stored.split(".");
  const suppliedBuf = await scryptAsync2(supplied, salt, 64);
  const storedBuf = Buffer.from(hashedPassword, "hex");
  return timingSafeEqual2(suppliedBuf, storedBuf);
}
async function hashPassword2(password) {
  const salt = randomBytes2(16).toString("hex");
  const buf = await scryptAsync2(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
function registerProfileRoutes(app2, requireAuth2) {
  app2.use("/uploads", express2.static(uploadsDir));
  console.log(`Profile pictures uploads directory: ${uploadsDir}`);
  app2.get("/api/profile", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = req.user;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });
  app2.patch("/api/profile", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.format()
        });
      }
      const updates = result.data;
      if (updates.company !== void 0 && req.user.role !== "creator") {
        return res.status(403).json({
          message: "Only users with creator role can modify the company name"
        });
      }
      const updatedUser = await storage.updateUser(req.user.id, {
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      });
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });
  app2.post("/api/profile/change-password", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const passwordsMatch = await comparePasswords2(currentPassword, req.user.password);
      if (!passwordsMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await hashPassword2(newPassword);
      await storage.updateUser(req.user.id, {
        password: hashedPassword,
        updatedAt: /* @__PURE__ */ new Date()
      });
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Error changing password" });
    }
  });
  app2.post("/api/profile/picture", requireAuth2, upload.single("profilePicture"), async (req, res) => {
    try {
      console.log("Profile picture upload request received");
      if (!req.user) {
        console.log("Profile picture upload: User not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }
      console.log("Profile picture upload: User authenticated", { userId: req.user.id, username: req.user.username });
      const file = req.file;
      if (!file) {
        console.log("Profile picture upload: No file in request");
        return res.status(400).json({ message: "No file was uploaded" });
      }
      console.log("Profile picture uploaded:", {
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        destination: file.destination,
        size: file.size
      });
      const publicUrl = `/uploads/${path3.basename(file.path)}`;
      console.log("Generated public URL:", publicUrl);
      try {
        const fullPath = path3.join(uploadsDir, path3.basename(file.path));
        const fileExists = fs2.existsSync(fullPath);
        console.log(`File existence check: ${fileExists ? "File exists" : "File does not exist"} at ${fullPath}`);
      } catch (fsError) {
        console.error("Error checking file existence:", fsError);
      }
      console.log("Updating user profile with picture URL:", { userId: req.user.id, url: publicUrl });
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: publicUrl,
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log("User profile updated:", {
        userId: updatedUser.id,
        profilePictureSet: !!updatedUser.profilePicture,
        profilePictureUrl: updatedUser.profilePicture
      });
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Error uploading profile picture" });
    }
  });
  app2.delete("/api/profile/picture", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (req.user.profilePicture) {
        const filename = path3.basename(req.user.profilePicture);
        const filepath = path3.join(uploadsDir, filename);
        if (fs2.existsSync(filepath)) {
          fs2.unlinkSync(filepath);
        }
      }
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: null,
        updatedAt: /* @__PURE__ */ new Date()
      });
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      res.status(500).json({ message: "Error deleting profile picture" });
    }
  });
  app2.post("/api/profile/disable-sso", requireAuth2, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!req.user.ssoEnabled) {
        return res.status(400).json({ message: "SSO is not enabled for this account" });
      }
      const updatedUser = await storage.updateUser(req.user.id, {
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {},
        updatedAt: /* @__PURE__ */ new Date()
      });
      const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error disabling SSO:", error);
      res.status(500).json({ message: "Error disabling SSO" });
    }
  });
  app2.get("/api/profile/test-uploads", async (req, res) => {
    try {
      console.log("Testing uploads directory access");
      const files = fs2.readdirSync(uploadsDir);
      console.log(`Found ${files.length} files in uploads directory:`, files);
      const imageFiles = files.filter(
        (file) => file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
      );
      console.log(`Found ${imageFiles.length} image files:`, imageFiles);
      const sampleFilePath = req.query.file ? path3.join(uploadsDir, req.query.file.toString()) : null;
      let sampleFileExists = false;
      if (sampleFilePath) {
        sampleFileExists = fs2.existsSync(sampleFilePath);
        console.log(`Requested file ${req.query.file} ${sampleFileExists ? "exists" : "does not exist"} at ${sampleFilePath}`);
      }
      res.status(200).json({
        uploadsDir,
        totalFiles: files.length,
        files,
        imageFiles,
        requestedFile: req.query.file || null,
        requestedFileExists: sampleFileExists
      });
    } catch (error) {
      console.error("Error testing uploads:", error);
      res.status(500).json({
        message: "Error testing uploads",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// server/routes/document-routes.ts
init_storage();
import { Router as Router4 } from "express";
import { body, param, validationResult } from "express-validator";

// server/upload.ts
import multer2 from "multer";
import path4 from "path";
import fs3 from "fs";
var uploadsDir2 = path4.join(process.cwd(), "uploads");
if (!fs3.existsSync(uploadsDir2)) {
  fs3.mkdirSync(uploadsDir2, { recursive: true });
}
var storage2 = multer2.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir2);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/html",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/csv",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only document files are allowed."));
  }
};
var upload2 = multer2({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024
    // 1GB file size limit
  }
});
var upload_default = upload2;

// server/document-parser.ts
import fs4 from "fs";
import path5 from "path";
import XLSX from "xlsx";
async function extractTextFromFile(filePath) {
  try {
    const ext = path5.extname(filePath).toLowerCase();
    if (ext === ".txt" || ext === ".md" || ext === ".html") {
      return fs4.readFileSync(filePath, "utf8");
    } else if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        let result = "";
        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const json2 = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          result += `## Sheet: ${sheetName}

`;
          for (const row of json2) {
            if (Array.isArray(row) && row.length > 0) {
              result += row.join("	") + "\n";
            }
          }
          result += "\n\n";
        }
        return result;
      } catch (error) {
        console.error("XLSX parsing error, falling back to raw text:", error);
        if (ext === ".csv") {
          return fs4.readFileSync(filePath, "utf8");
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return `[Excel file content could not be extracted. Error: ${errorMessage}]`;
      }
    } else {
      return `[This is extracted content from ${path5.basename(filePath)}. In a production environment, specialized parsers would be used for this file type.]`;
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return `[Error extracting content from file: ${errorMessage}. Please ensure the file is not corrupted and is in the correct format.]`;
  }
}
function extractFileMetadata(filePath) {
  try {
    const stats = fs4.statSync(filePath);
    const ext = path5.extname(filePath).toLowerCase();
    const filename = path5.basename(filePath);
    return {
      filename,
      fileSize: stats.size,
      fileType: ext,
      lastModified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    console.error("Error extracting metadata from file:", error);
    return {};
  }
}

// server/routes/document-routes.ts
import fs5 from "fs";
import path6 from "path";
function registerDocumentRoutes(app2, requireAuth2, requireRole) {
  const router9 = Router4();
  router9.get(
    "/documents",
    async (req, res) => {
      try {
        const tenantId = req.user?.tenantId || 1;
        const documents = await storage.getAllSupportDocuments(tenantId);
        res.json(documents);
      } catch (error) {
        console.error("Error getting documents:", error);
        res.status(500).json({ error: "Failed to retrieve documents" });
      }
    }
  );
  router9.get(
    "/documents/:id",
    param("id").isInt().toInt(),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const documentId = parseInt(req.params.id, 10);
        const document = await storage.getSupportDocumentById(documentId, tenantId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }
        res.json(document);
      } catch (error) {
        console.error("Error getting document:", error);
        res.status(500).json({ error: "Failed to retrieve document" });
      }
    }
  );
  router9.post(
    "/documents",
    [
      body("title").notEmpty().withMessage("Title is required"),
      body("content").notEmpty().withMessage("Content is required"),
      body("category").notEmpty().withMessage("Category is required"),
      body("status").isIn(["draft", "published", "archived"]).withMessage("Status must be either 'draft', 'published', or 'archived'"),
      body("summary").optional({ nullable: true }),
      body("tags").optional({ nullable: true }),
      body("errorCodes").optional({ nullable: true }),
      body("keywords").optional({ nullable: true })
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const userId = req.user?.id;
        const documentData = {
          ...req.body,
          tenantId,
          createdBy: userId
        };
        const newDocument = await storage.createSupportDocument(documentData);
        res.status(201).json(newDocument);
      } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).json({ error: "Failed to create document" });
      }
    }
  );
  router9.patch(
    "/documents/:id",
    param("id").isInt().toInt(),
    [
      body("title").optional().notEmpty().withMessage("Title cannot be empty"),
      body("content").optional().notEmpty().withMessage("Content cannot be empty"),
      body("category").optional().notEmpty().withMessage("Category cannot be empty"),
      body("status").optional().isIn(["draft", "published", "archived"]).withMessage("Status must be either 'draft', 'published', or 'archived'"),
      body("summary").optional({ nullable: true }),
      body("tags").optional({ nullable: true }),
      body("errorCodes").optional({ nullable: true }),
      body("keywords").optional({ nullable: true })
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user?.id;
        const existingDocument = await storage.getSupportDocumentById(documentId, tenantId);
        if (!existingDocument) {
          return res.status(404).json({ error: "Document not found" });
        }
        const updates = { ...req.body };
        if (updates.status === "published" && existingDocument.status !== "published") {
          updates.publishedAt = /* @__PURE__ */ new Date();
        }
        updates.lastEditedBy = userId;
        const updatedDocument = await storage.updateSupportDocument(documentId, updates, tenantId);
        res.json(updatedDocument);
      } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).json({ error: "Failed to update document" });
      }
    }
  );
  router9.delete(
    "/documents/:id",
    param("id").isInt().toInt(),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const documentId = parseInt(req.params.id, 10);
        const existingDocument = await storage.getSupportDocumentById(documentId, tenantId);
        if (!existingDocument) {
          return res.status(404).json({ error: "Document not found" });
        }
        await storage.deleteSupportDocument(documentId, tenantId);
        res.json({ success: true, message: "Document deleted successfully" });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ error: "Failed to delete document" });
      }
    }
  );
  router9.get(
    "/documents/by-category/:category",
    param("category").notEmpty().withMessage("Category is required"),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const category = req.params.category;
        const documents = await storage.getSupportDocumentsByCategory(category, tenantId);
        res.json(documents);
      } catch (error) {
        console.error("Error getting documents by category:", error);
        res.status(500).json({ error: "Failed to retrieve documents" });
      }
    }
  );
  router9.get(
    "/documents/by-status/:status",
    param("status").isIn(["draft", "published", "archived"]).withMessage("Status must be either 'draft', 'published', or 'archived'"),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const status = req.params.status;
        const documents = await storage.getSupportDocumentsByStatus(status, tenantId);
        res.json(documents);
      } catch (error) {
        console.error("Error getting documents by status:", error);
        res.status(500).json({ error: "Failed to retrieve documents" });
      }
    }
  );
  router9.get(
    "/documents/search",
    async (req, res) => {
      try {
        const tenantId = req.user?.tenantId || 1;
        const query = req.query.q;
        if (!query) {
          return res.status(400).json({ error: "Search query parameter 'q' is required" });
        }
        const documents = await storage.searchSupportDocuments(query, tenantId);
        res.json(documents);
      } catch (error) {
        console.error("Error searching documents:", error);
        res.status(500).json({ error: "Failed to search documents" });
      }
    }
  );
  router9.post(
    "/documents/:id/track-view",
    param("id").isInt().toInt(),
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const documentId = parseInt(req.params.id, 10);
        await storage.incrementDocumentViewCount(documentId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error tracking document view:", error);
        res.status(500).json({ error: "Failed to track document view" });
      }
    }
  );
  router9.post(
    "/documents/upload",
    upload_default.single("file"),
    [
      body("category").notEmpty().withMessage("Category is required"),
      body("status").isIn(["draft", "published", "archived"]).withMessage("Status must be either 'draft', 'published', or 'archived'")
    ],
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          if (req.file && fs5.existsSync(req.file.path)) {
            fs5.unlinkSync(req.file.path);
          }
          return res.status(400).json({ errors: errors.array() });
        }
        const tenantId = req.user?.tenantId || 1;
        const userId = req.user?.id;
        const fileContent = await extractTextFromFile(req.file.path);
        const metadata = extractFileMetadata(req.file.path);
        const title = req.body.title || path6.basename(req.file.originalname, path6.extname(req.file.originalname));
        const createdBy = userId || 1;
        let tags = [];
        let errorCodes = [];
        let keywords = [];
        if (req.body.tags) {
          tags = typeof req.body.tags === "string" ? req.body.tags.split(",").map((tag) => tag.trim()) : req.body.tags;
        }
        if (req.body.errorCodes) {
          errorCodes = typeof req.body.errorCodes === "string" ? req.body.errorCodes.split(",").map((code) => code.trim()) : req.body.errorCodes;
        }
        if (req.body.keywords) {
          keywords = typeof req.body.keywords === "string" ? req.body.keywords.split(",").map((keyword) => keyword.trim()) : req.body.keywords;
        }
        const documentData = {
          title: String(title),
          content: String(fileContent),
          category: String(req.body.category),
          status: String(req.body.status || "draft"),
          summary: req.body.summary ? String(req.body.summary) : "",
          tags,
          errorCodes,
          keywords,
          tenantId,
          createdBy,
          metadata: {
            ...metadata,
            originalFilename: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: /* @__PURE__ */ new Date()
          }
        };
        const newDocument = await storage.createSupportDocument(documentData);
        res.status(201).json(newDocument);
      } catch (error) {
        console.error("Error uploading document:", error);
        if (req.file && fs5.existsSync(req.file.path)) {
          fs5.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: "Failed to upload document" });
      }
    }
  );
  app2.use("/api", router9);
  return router9;
}

// server/routes/download-routes.ts
import path7 from "path";
import fs6 from "fs";
function registerDownloadRoutes(app2) {
  app2.get("/downloads/:folder/:file", (req, res) => {
    const folder = req.params.folder;
    const file = req.params.file;
    const filePath = path7.join(process.cwd(), "public", "downloads", folder, file);
    if (fs6.existsSync(filePath)) {
      const ext = path7.extname(filePath).toLowerCase();
      let contentType = "application/octet-stream";
      switch (ext) {
        case ".js":
          contentType = "application/javascript";
          break;
        case ".html":
          contentType = "text/html";
          break;
        case ".css":
          contentType = "text/css";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        case ".md":
          contentType = "text/markdown";
          break;
        case ".zip":
          contentType = "application/zip";
          break;
      }
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      const fileStream = fs6.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });
  app2.get("/downloads/:file", (req, res) => {
    const file = req.params.file;
    const filePath = path7.join(process.cwd(), "public", "downloads", file);
    if (fs6.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      const fileStream = fs6.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });
}

// server/routes/widget-download-routes.ts
import { z as z7 } from "zod";

// server/widget-generator.ts
import fs7 from "fs";
import path8 from "path";
import archiver from "archiver";
async function generateWidgetPackage(config, res) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=support-chat-widget.zip");
  const archive = archiver("zip", {
    zlib: { level: 9 }
    // Highest compression level
  });
  archive.pipe(res);
  const baseDir = path8.join(process.cwd(), "public", "downloads", "widget");
  archive.file(path8.join(baseDir, "documentation.md"), { name: "documentation.md" });
  archive.file(path8.join(baseDir, "api-documentation.md"), { name: "api-documentation.md" });
  archive.file(path8.join(baseDir, "agent-workflow-integration-guide.md"), { name: "agent-workflow-guide.md" });
  const widgetJs = fs7.readFileSync(path8.join(baseDir, "support-widget.js"), "utf8");
  const sampleHtml = fs7.readFileSync(path8.join(baseDir, "sample-implementation.html"), "utf8");
  const customizedWidgetJs = widgetJs.replace("__TENANT_ID__", config.tenantId.toString()).replace("__API_KEY__", config.apiKey).replace("__PRIMARY_COLOR__", config.primaryColor).replace("__POSITION__", config.position).replace("__GREETING_MESSAGE__", config.greetingMessage).replace("__AUTO_OPEN__", config.autoOpen.toString()).replace("__BRANDING__", config.branding.toString()).replace("__REPORT_DATA__", config.reportData.toString()).replace("https://api.support.ai", process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://your-support-ai-domain.com");
  const customizedSampleHtml = sampleHtml.replace("__TENANT_ID__", config.tenantId.toString()).replace("__API_KEY__", config.apiKey).replace("__PRIMARY_COLOR__", config.primaryColor).replace("__POSITION__", config.position).replace("__GREETING_MESSAGE__", config.greetingMessage).replace("__AUTO_OPEN__", config.autoOpen.toString()).replace("__BRANDING__", config.branding.toString()).replace("__REPORT_DATA__", config.reportData.toString()).replace("__ADMIN_ID__", config.adminId.toString());
  const readmeContent = generateReadmeContent(config);
  const universalScript = fs7.readFileSync(path8.join(baseDir, "universal-support-script.js"), "utf8");
  const customizedUniversalScript = universalScript.replace("__TENANT_ID__", config.tenantId.toString()).replace("__API_KEY__", config.apiKey).replace("__PRIMARY_COLOR__", config.primaryColor).replace("__POSITION__", config.position).replace("__GREETING_MESSAGE__", config.greetingMessage).replace("__AUTO_OPEN__", config.autoOpen.toString()).replace("__BRANDING__", config.branding.toString()).replace("__REPORT_DATA__", config.reportData.toString()).replace("__ADMIN_ID__", config.adminId.toString());
  const universalSampleHtml = fs7.readFileSync(path8.join(baseDir, "universal-sample.html"), "utf8");
  archive.append(customizedWidgetJs, { name: "supportai-widget.js" });
  archive.append(customizedUniversalScript, { name: "supportai-universal.js" });
  archive.append(customizedSampleHtml, { name: "sample-implementation.html" });
  archive.append(universalSampleHtml, { name: "universal-sample.html" });
  archive.append(readmeContent, { name: "README.md" });
  const batchFileContent = generateWindowsBatchFile(config);
  archive.append(batchFileContent, { name: "install-widget.bat" });
  const cssContent = generateWidgetCSS(config.primaryColor);
  archive.append(cssContent, { name: "supportai-widget.css" });
  archive.append(customizedWidgetJs, { name: "supportai-widget.min.js" });
  await archive.finalize();
}
function generateReadmeContent(config) {
  return `# Support AI Chat Widget

## Installation Instructions

### Option 1: Standard Widget Integration
Add the following script tag to your website's HTML, right before the closing \`</body>\` tag:

\`\`\`html
<!-- Support AI Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    greetingMessage: "${config.greetingMessage}",
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: ${config.reportData},
    adminId: ${config.adminId}
  };
</script>
<script src="supportai-widget.js" async></script>
\`\`\`

### Option 2: Universal Integration
For a seamless support experience that persists across your entire website:

\`\`\`html
<!-- Support AI Universal Integration -->
<script src="supportai-universal.js" async></script>
\`\`\`

The universal integration offers these powerful features:
- **Zero-configuration installation** - works instantly across your entire site
- **Non-intrusive design** - uses Shadow DOM for complete style isolation
- **Cross-page awareness** - maintains context as users navigate your site
- **Persistent chat state** - keeps conversations active during browsing
- **Lightweight implementation** - minimal impact on page performance
- **Responsive design** - works great on all devices and screen sizes

For a live demonstration of these features, check out the included universal-sample.html file.

### Option 3: Using NPM
Install the widget package using npm:

\`\`\`bash
npm install supportai-widget
\`\`\`

Then import and use it in your application:

\`\`\`javascript
import { SupportAIChat } from 'supportai-widget';

// Initialize the chat widget
SupportAIChat.init({
  tenantId: ${config.tenantId},
  apiKey: "${config.apiKey}",
  primaryColor: "${config.primaryColor}",
  position: "${config.position}",
  greetingMessage: "${config.greetingMessage}",
  autoOpen: ${config.autoOpen},
  branding: ${config.branding},
  reportData: ${config.reportData},
  adminId: ${config.adminId}
});
\`\`\`

### Option 4: For Windows Applications
For Windows applications, you can use the included \`install-widget.bat\` script to add the widget to your application. Double-click the batch file and follow the on-screen instructions.

## Configuration Options

| Option | Description |
|--------|-------------|
| tenantId | Your Support AI tenant ID |
| apiKey | Your API key for authentication |
| primaryColor | The primary color of the widget |
| position | Widget position (right, left, center) |
| greetingMessage | Initial message displayed in the chat |
| autoOpen | Whether to automatically open the chat widget |
| branding | Whether to show Support AI branding |
| reportData | Whether to send analytics data |

## Need Help?
See the documentation.md file for more detailed documentation, or contact Support AI support for assistance.
`;
}
function generateWindowsBatchFile(config) {
  return `@echo off
echo Support AI Chat Widget Installer
echo =================================
echo.
echo This script will help you install the Support AI Chat Widget in your application.
echo.
echo [1] Installing widget files...
timeout /t 2 > nul

if not exist "%APPDATA%\\SupportAI" mkdir "%APPDATA%\\SupportAI"
copy supportai-widget.js "%APPDATA%\\SupportAI\\" > nul
copy supportai-universal.js "%APPDATA%\\SupportAI\\" > nul
copy supportai-widget.css "%APPDATA%\\SupportAI\\" > nul
copy supportai-widget.min.js "%APPDATA%\\SupportAI\\" > nul

echo [2] Creating configuration...
timeout /t 1 > nul

(
echo window.supportAiConfig = {
echo   tenantId: ${config.tenantId},
echo   apiKey: "${config.apiKey}",
echo   primaryColor: "${config.primaryColor}",
echo   position: "${config.position}",
echo   greetingMessage: "${config.greetingMessage}",
echo   autoOpen: ${config.autoOpen},
echo   branding: ${config.branding},
echo   reportData: ${config.reportData},
echo   adminId: ${config.adminId}
echo };
) > "%APPDATA%\\SupportAI\\supportai-config.js"

echo [3] Installation complete!
echo.
echo The widget has been installed to: %APPDATA%\\SupportAI
echo.
echo To use the standard widget in your application, add these lines to your HTML:
echo ^<script src="%APPDATA%\\SupportAI\\supportai-config.js"^>^</script^>
echo ^<script src="%APPDATA%\\SupportAI\\supportai-widget.js"^>^</script^>
echo.
echo For the universal integration that persists across pages, use:
echo ^<script src="%APPDATA%\\SupportAI\\supportai-universal.js"^>^</script^>
echo.
echo Press any key to exit...
pause > nul
`;
}
function generateWidgetCSS(primaryColor) {
  return `/* Support AI Chat Widget Styles */
.support-widget-container {
  position: fixed;
  z-index: 9999;
  bottom: 20px;
  right: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.support-widget-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${primaryColor};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.support-widget-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.support-widget-icon {
  width: 32px;
  height: 32px;
}

.support-chat-window {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 350px;
  height: 500px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

.support-chat-window.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.support-chat-header {
  padding: 15px;
  background-color: ${primaryColor};
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.support-chat-close {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.support-chat-close:hover {
  opacity: 1;
}

.support-chat-messages {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
}

.support-message {
  margin-bottom: 10px;
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 18px;
  word-break: break-word;
}

.support-message-user {
  background-color: ${primaryColor};
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.support-message-assistant {
  background-color: #f0f0f0;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.support-chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.support-chat-input input {
  flex-grow: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 15px;
  margin-right: 10px;
  outline: none;
}

.support-chat-input input:focus {
  border-color: ${primaryColor};
}

.support-send-button {
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.support-send-button:hover {
  transform: scale(1.05);
}

.support-branding {
  font-size: 11px;
  text-align: center;
  padding: 5px;
  opacity: 0.7;
}
`;
}

// server/routes/widget-download-routes.ts
var widgetDownloadSchema = z7.object({
  tenantId: z7.string().transform((val) => parseInt(val, 10)),
  userId: z7.string().transform((val) => parseInt(val, 10)),
  primaryColor: z7.string().default("6366F1"),
  position: z7.enum(["right", "left", "center"]).default("right"),
  greetingMessage: z7.string().default("How can I help you today?"),
  autoOpen: z7.string().transform((val) => val === "true").default("false"),
  branding: z7.string().transform((val) => val === "true").default("true"),
  reportData: z7.string().transform((val) => val === "true").default("true")
});
function registerWidgetDownloadRoutes(app2) {
  app2.get("/api/widgets/download", async (req, res) => {
    try {
      const queryResult = widgetDownloadSchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: "Invalid widget configuration",
          details: queryResult.error.format()
        });
      }
      const queryParams = queryResult.data;
      const apiKey = `wgt_${Math.random().toString(36).substring(2, 15)}`;
      const widgetConfig = {
        tenantId: queryParams.tenantId,
        adminId: queryParams.userId,
        apiKey,
        primaryColor: queryParams.primaryColor,
        position: queryParams.position,
        greetingMessage: queryParams.greetingMessage,
        autoOpen: queryParams.autoOpen,
        branding: queryParams.branding,
        reportData: queryParams.reportData
      };
      await generateWidgetPackage(widgetConfig, res);
    } catch (error) {
      console.error("Error generating widget package:", error);
      res.status(500).json({ error: "Failed to generate widget package" });
    }
  });
}

// server/routes/widget-auth-download-routes.ts
import { z as z8 } from "zod";

// server/widget-auth-generator.ts
import fs8 from "fs";
import path9 from "path";
import archiver2 from "archiver";
async function generateAuthWidgetPackage(config, res) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=support-chat-auth-widget.zip");
  const archive = archiver2("zip", {
    zlib: { level: 9 }
    // Highest compression level
  });
  archive.pipe(res);
  const baseDir = path9.join(process.cwd(), "public", "downloads", "widget");
  archive.file(path9.join(baseDir, "README-auth-widget.md"), { name: "README.md" });
  archive.file(path9.join(baseDir, "api-documentation-auth.md"), { name: "api-documentation.md" });
  archive.file(path9.join(baseDir, "agent-workflow-integration-guide.md"), { name: "agent-workflow-guide.md" });
  const widgetJs = fs8.readFileSync(path9.join(baseDir, "support-widget-auth.js"), "utf8");
  const sampleHtml = fs8.readFileSync(path9.join(baseDir, "auth-sample-implementation.html"), "utf8");
  const customizedWidgetJs = widgetJs.replace("__TENANT_ID__", config.tenantId.toString()).replace("__API_KEY__", config.apiKey).replace("__PRIMARY_COLOR__", config.primaryColor).replace("__POSITION__", config.position).replace("__GREETING_MESSAGE__", config.greetingMessage).replace("__AUTO_OPEN__", config.autoOpen.toString()).replace("__BRANDING__", config.branding.toString()).replace("__REPORT_DATA__", config.reportData.toString()).replace("https://api.support.ai", process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://your-support-ai-domain.com");
  const customizedSampleHtml = sampleHtml.replace("__TENANT_ID__", config.tenantId.toString()).replace("__API_KEY__", config.apiKey).replace("__PRIMARY_COLOR__", config.primaryColor).replace("__POSITION__", config.position).replace("__GREETING_MESSAGE__", config.greetingMessage).replace("__AUTO_OPEN__", config.autoOpen.toString()).replace("__BRANDING__", config.branding.toString()).replace("__REPORT_DATA__", config.reportData.toString()).replace("__ADMIN_ID__", config.adminId.toString()).replace("https://your-support-ai-server.com", process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://your-support-ai-domain.com");
  const integrationGuideContent = generateIntegrationGuide(config);
  const cssContent = generateWidgetCSS2(config.primaryColor);
  archive.append(customizedWidgetJs, { name: "support-widget-auth.js" });
  archive.append(customizedSampleHtml, { name: "sample-implementation.html" });
  archive.append(integrationGuideContent, { name: "integration-guide.md" });
  archive.append(cssContent, { name: "support-widget-auth.css" });
  archive.append(customizedWidgetJs, { name: "support-widget-auth.min.js" });
  await archive.finalize();
}
function generateIntegrationGuide(config) {
  return `# Support AI Chat Widget Integration Guide - Agent Workflow Enhanced

## Quick Start Integration

Add the following code to your website, right before the closing \`</body>\` tag:

\`\`\`html
<!-- Support AI Chat Widget Configuration with Agent Workflow -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    greetingMessage: "${config.greetingMessage}",
    requireAuth: true,
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: ${config.reportData},
    
    // Agent workflow enhancements
    enableAgentWorkflow: true,
    showConfidenceScore: false,
    enableTicketCreation: true,
    trackAgentMetrics: true
  };
</script>

<!-- Support AI Chat Widget Script -->
<script src="support-widget-auth.js" async></script>
\`\`\`

## Step-by-Step Integration Instructions

1. **Add Files to Your Web Server**

   Upload the following files to your web server:
   - \`support-widget-auth.js\` (or \`support-widget-auth.min.js\` for production)
   - \`support-widget-auth.css\` (optional - for styling)

2. **Include Widget Script in Your HTML**

   Add the widget script to your HTML pages, right before the closing \`</body>\` tag.

3. **Configure Authentication Settings**

   The widget will automatically prompt users to log in before chatting. You can adjust this behavior:
   
   - Set \`requireAuth: false\` to allow anonymous chatting
   - Set \`customAuth: true\` and provide a \`getAuthToken\` function to use your existing authentication system

4. **Test the Widget**

   Open your website and click the chat button. Verify that:
   - Authentication flow works correctly
   - Messages trigger agent workflow processing
   - Automatic ticket creation occurs for support requests
   - Resolution steps are displayed clearly
   - Widget styling matches your website's design

5. **Agent Workflow Features**

   The enhanced widget now includes:
   - Multi-agent processing for comprehensive responses
   - Automatic ticket creation with AI classification
   - Knowledge base integration for instruction lookup
   - Similar ticket search for faster resolution
   - Confidence scoring for response quality
   - Processing time tracking for performance monitoring

6. **Advanced Configuration**

   See the included documentation files for detailed information on:
   - Agent workflow integration (agent-workflow-guide.md)
   - API endpoints and response formats (api-documentation.md)
   - Custom styling options and event handling (README.md)
   - Authentication integration and security features

## Troubleshooting

If you encounter issues with the widget:

1. Check browser console for error messages
2. Verify your API key and tenant ID are correct
3. Ensure the widget script is loaded correctly
4. Check that your server allows access to the Support AI API endpoints

For assistance, contact Support AI support.

---

\xA9 2025 Support AI - All rights reserved
`;
}
function generateWidgetCSS2(primaryColor) {
  return `/* Support AI Chat Widget Styles */
.support-widget-container {
  position: fixed;
  z-index: 9999;
  bottom: 20px;
  right: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.support-widget-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${primaryColor};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.support-widget-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.support-widget-icon {
  width: 32px;
  height: 32px;
}

.support-chat-window {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 350px;
  height: 500px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

.support-chat-window.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.support-chat-header {
  padding: 15px;
  background-color: ${primaryColor};
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.support-chat-close {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.support-chat-close:hover {
  opacity: 1;
}

.support-chat-messages {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
}

.support-message {
  margin-bottom: 10px;
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 18px;
  word-break: break-word;
}

.support-message-user {
  background-color: ${primaryColor};
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.support-message-assistant {
  background-color: #f0f0f0;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.support-chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.support-chat-input input {
  flex-grow: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 15px;
  margin-right: 10px;
  outline: none;
}

.support-chat-input input:focus {
  border-color: ${primaryColor};
}

.support-send-button {
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.support-send-button:hover {
  transform: scale(1.05);
}

.support-branding {
  font-size: 11px;
  text-align: center;
  padding: 5px;
  opacity: 0.7;
}

/* Authentication UI Styles */
.support-auth-container {
  padding: 15px;
  border-top: 1px solid #eee;
}

.support-auth-form {
  display: flex;
  flex-direction: column;
}

.support-auth-label {
  margin-bottom: 5px;
  font-size: 14px;
  color: #4a5568;
}

.support-auth-input {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
}

.support-auth-input:focus {
  border-color: ${primaryColor};
  outline: none;
}

.support-auth-button {
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.support-auth-button:hover {
  background-color: ${primaryColor}e0;
}

.support-auth-error {
  margin-top: 10px;
  color: #e53e3e;
  font-size: 14px;
  text-align: center;
}

/* Typing indicator */
.support-typing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.support-typing-indicator span {
  height: 8px;
  width: 8px;
  margin: 0 2px;
  background-color: #9ca3af;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.7;
}

.support-typing-indicator span:nth-child(1) {
  animation: pulse 1s infinite;
}

.support-typing-indicator span:nth-child(2) {
  animation: pulse 1s infinite 0.2s;
}

.support-typing-indicator span:nth-child(3) {
  animation: pulse 1s infinite 0.4s;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}`;
}

// server/routes/widget-auth-download-routes.ts
init_storage();
import { randomBytes as randomBytes3, createHmac } from "crypto";
var widgetAuthDownloadSchema = z8.object({
  tenantId: z8.string().transform((val) => parseInt(val, 10)),
  userId: z8.string().transform((val) => parseInt(val, 10)),
  primaryColor: z8.string().default("6366F1"),
  position: z8.enum(["right", "left", "center"]).default("right"),
  greetingMessage: z8.string().default("How can I help you today?"),
  autoOpen: z8.string().transform((val) => val === "true").default("false"),
  branding: z8.string().transform((val) => val === "true").default("true"),
  reportData: z8.string().transform((val) => val === "true").default("true"),
  requireAuth: z8.string().transform((val) => val === "true").default("true")
});
function generateTenantApiKey(tenantId) {
  const prefix = "wk";
  const typePrefix = "tent";
  const secret = randomBytes3(16).toString("hex");
  const signature = createHmac("sha256", process.env.JWT_SECRET || "default-secret").update(`${prefix}_${typePrefix}_${tenantId}_${secret}`).digest("hex").substring(0, 8);
  return `${prefix}_${typePrefix}_${tenantId}_${secret}_${signature}`;
}
function registerWidgetAuthDownloadRoutes(app2) {
  app2.get("/api/widgets/download-auth", async (req, res) => {
    try {
      const queryResult = widgetAuthDownloadSchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: "Invalid widget configuration",
          details: queryResult.error.format()
        });
      }
      const queryParams = queryResult.data;
      let apiKey;
      try {
        const existingApiKeys = await storage.getApiKeysByTenant(queryParams.tenantId);
        if (existingApiKeys.length > 0) {
          apiKey = existingApiKeys[0].key;
        } else {
          apiKey = generateTenantApiKey(queryParams.tenantId);
        }
      } catch (error) {
        console.error("Error accessing API keys, generating tenant-specific key:", error);
        apiKey = generateTenantApiKey(queryParams.tenantId);
      }
      const widgetConfig = {
        tenantId: queryParams.tenantId,
        adminId: queryParams.userId,
        apiKey,
        primaryColor: queryParams.primaryColor,
        position: queryParams.position,
        greetingMessage: queryParams.greetingMessage,
        autoOpen: queryParams.autoOpen,
        branding: queryParams.branding,
        reportData: queryParams.reportData,
        requireAuth: queryParams.requireAuth
      };
      await generateAuthWidgetPackage(widgetConfig, res);
    } catch (error) {
      console.error("Error generating auth widget package:", error);
      res.status(500).json({ error: "Failed to generate widget package with authentication" });
    }
  });
}

// server/routes/widget-authentication-routes.ts
init_storage();
import { z as z9 } from "zod";
var widgetAuthSchema = z9.object({
  username: z9.string().min(1, "Username is required"),
  password: z9.string().min(1, "Password is required"),
  tenantId: z9.number().or(z9.string().transform((val) => parseInt(val, 10)))
});
function registerWidgetAuthenticationRoutes(app2) {
  app2.post("/api/widget-auth", async (req, res) => {
    try {
      const authResult = widgetAuthSchema.safeParse(req.body);
      if (!authResult.success) {
        return res.status(400).json({
          error: "Invalid authentication data",
          details: authResult.error.format()
        });
      }
      const { username, password, tenantId } = authResult.data;
      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.tenantId !== tenantId) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const passwordValid = await comparePasswords(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const sessionToken = `wgt_session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        token: sessionToken,
        authenticated: true
      });
    } catch (error) {
      console.error("Widget authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
  app2.post("/api/widget-auth/verify", async (req, res) => {
    try {
      const { token, tenantId } = req.body;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      if (token.startsWith("wgt_session_")) {
        res.status(200).json({ valid: true });
      } else {
        res.status(401).json({ error: "Invalid token" });
      }
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Token verification failed" });
    }
  });
}

// server/routes/widget-api-keys-routes.ts
init_storage();
import { z as z10 } from "zod";
import { randomBytes as randomBytes4, createHmac as createHmac2 } from "crypto";
var apiKeyGenerationSchema = z10.object({
  tenantId: z10.number(),
  userId: z10.number(),
  domains: z10.array(z10.string().trim()).default([]),
  expiresIn: z10.number().default(0),
  // 0 means never expires
  description: z10.string().optional(),
  permissions: z10.object({
    read: z10.boolean().default(true),
    write: z10.boolean().default(true),
    webhook: z10.boolean().default(false)
  }).default({
    read: true,
    write: true,
    webhook: false
  })
});
function generateApiKey(keyType, id) {
  const prefix = "wk";
  const typePrefix = keyType.substring(0, 4).padEnd(4, "_");
  const secret = randomBytes4(16).toString("hex");
  const signature = createHmac2("sha256", process.env.JWT_SECRET || "default-secret").update(`${prefix}_${typePrefix}_${id}_${secret}`).digest("hex").substring(0, 8);
  return `${prefix}_${typePrefix}_${id}_${secret}_${signature}`;
}
function verifyApiKey(apiKey) {
  try {
    const parts = apiKey.split("_");
    if (parts.length !== 5) return { valid: false };
    const [prefix, typePrefix, idStr, secret, providedSignature] = parts;
    if (prefix !== "wk") return { valid: false };
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return { valid: false };
    const expectedSignature = createHmac2("sha256", process.env.JWT_SECRET || "default-secret").update(`${prefix}_${typePrefix}_${id}_${secret}`).digest("hex").substring(0, 8);
    if (providedSignature !== expectedSignature) return { valid: false };
    return {
      valid: true,
      type: typePrefix.trim(),
      id,
      secret
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    return { valid: false };
  }
}
function registerWidgetApiKeyRoutes(app2) {
  app2.post("/api/widgets/keys", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const userRole = req.user.role;
      if (!["administrator", "creator", "engineer"].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden. Only administrators, creators, or engineers can generate API keys." });
      }
      const validation = apiKeyGenerationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid API key generation request",
          details: validation.error.errors
        });
      }
      const { tenantId, userId, domains, expiresIn, description, permissions } = validation.data;
      const user = req.user;
      if (user.tenantId !== tenantId && userRole !== "creator") {
        return res.status(403).json({
          error: "Forbidden. You can only generate API keys for your own tenant."
        });
      }
      const apiKey = generateApiKey("tent", tenantId);
      const apiKeyData = {
        key: apiKey,
        tenantId,
        createdBy: userId,
        domains,
        expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1e3) : null,
        description: description || `Widget API key created by ${userId}`,
        permissions,
        lastUsed: null,
        useCount: 0,
        createdAt: /* @__PURE__ */ new Date(),
        isRevoked: false
      };
      await storage.createApiKey(apiKeyData);
      res.status(201).json({
        apiKey,
        expiresAt: apiKeyData.expiresAt,
        description: apiKeyData.description,
        permissions: apiKeyData.permissions
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      res.status(500).json({ error: "Failed to generate API key" });
    }
  });
  app2.get("/api/widgets/keys", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = req.user;
      const userRole = user.role;
      if (!["administrator", "creator", "engineer"].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden. Only administrators, creators, or engineers can view API keys." });
      }
      let tenantId = user.tenantId;
      if (userRole === "creator" && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId, 10);
      }
      const apiKeys = await storage.getApiKeysByTenant(tenantId);
      res.status(200).json(apiKeys.map((key) => ({
        id: key.id,
        keyPrefix: key.key.split("_").slice(0, 3).join("_") + "_...",
        tenantId: key.tenantId,
        createdBy: key.createdBy,
        createdAt: key.createdAt,
        domains: key.domains,
        expiresAt: key.expiresAt,
        description: key.description,
        permissions: key.permissions,
        lastUsed: key.lastUsed,
        useCount: key.useCount
      })));
    } catch (error) {
      console.error("Error getting API keys:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });
  app2.delete("/api/widgets/keys/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = req.user;
      const userRole = user.role;
      if (!["administrator", "creator", "engineer"].includes(userRole)) {
        return res.status(403).json({ error: "Forbidden. Only administrators, creators, or engineers can revoke API keys." });
      }
      const apiKeyId = parseInt(req.params.id, 10);
      if (isNaN(apiKeyId)) {
        return res.status(400).json({ error: "Invalid API key ID" });
      }
      const apiKey = await storage.getApiKeyById(apiKeyId);
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      if (user.tenantId !== apiKey.tenantId && userRole !== "creator") {
        return res.status(403).json({
          error: "Forbidden. You can only revoke API keys for your own tenant."
        });
      }
      await storage.deleteApiKey(apiKeyId);
      res.status(200).json({ message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });
  app2.get("/api/widgets/keys/verify", async (req, res) => {
    try {
      const apiKey = req.headers.authorization?.split(" ")[1];
      if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
      }
      const verification = verifyApiKey(apiKey);
      if (!verification.valid) {
        return res.status(401).json({ error: "Invalid API key format" });
      }
      const storedKey = await storage.getApiKeyByValue(apiKey);
      if (!storedKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      if (storedKey.expiresAt && new Date(storedKey.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(401).json({ error: "API key expired" });
      }
      if (storedKey.domains && storedKey.domains.length > 0) {
        const origin = req.headers.origin || "";
        const referer = req.headers.referer || "";
        let domain = "";
        try {
          if (origin) {
            domain = new URL(origin).hostname;
          } else if (referer) {
            domain = new URL(referer).hostname;
          }
        } catch (e) {
        }
        if (domain && !storedKey.domains.some((d) => {
          if (d.startsWith("*.")) {
            const baseDomain = d.substring(2);
            return domain.endsWith(baseDomain);
          }
          return domain === d;
        })) {
          return res.status(403).json({ error: "API key not authorized for this domain" });
        }
      }
      await storage.updateApiKeyUsage(storedKey.id);
      const tenant = await storage.getTenantById(storedKey.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.status(200).json({
        valid: true,
        tenantId: storedKey.tenantId,
        permissions: storedKey.permissions,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          settings: tenant.settings
        }
      });
    } catch (error) {
      console.error("Error verifying API key:", error);
      res.status(500).json({ error: "Failed to verify API key" });
    }
  });
}

// server/routes/widget-agent-routes.ts
init_storage();
init_agent_service();
init_data_source_service();
init_instruction_lookup_agent();
import { z as z11 } from "zod";
var agentWorkflowRequestSchema = z11.object({
  tenantId: z11.number(),
  adminId: z11.number().optional(),
  apiKey: z11.string(),
  user_message: z11.string(),
  user_context: z11.object({
    url: z11.string().optional(),
    title: z11.string().optional(),
    userAgent: z11.string().optional(),
    timestamp: z11.string().optional()
  }).optional(),
  sessionId: z11.string().optional()
});
var processMessageRequestSchema = z11.object({
  tenantId: z11.number(),
  message: z11.string(),
  context: z11.object({
    url: z11.string().optional(),
    title: z11.string().optional(),
    sessionId: z11.string().optional(),
    userAgent: z11.string().optional()
  }).optional(),
  apiKey: z11.string()
});
function registerWidgetAgentRoutes(app2) {
  app2.post("/api/agent/workflow", async (req, res) => {
    try {
      const validationResult2 = agentWorkflowRequestSchema.safeParse(req.body);
      if (!validationResult2.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid agent workflow request",
          details: validationResult2.error.format()
        });
      }
      const { tenantId, adminId, apiKey, user_message, user_context, sessionId } = validationResult2.data;
      const isValidApiKey = await validateWidgetApiKey(tenantId, apiKey);
      if (!isValidApiKey) {
        return res.status(401).json({
          success: false,
          error: "Invalid API key for tenant"
        });
      }
      const startTime = Date.now();
      const sessionIdForPreprocessing = sessionId || `widget_${tenantId}_${Date.now()}`;
      const preprocessorResult = await agent_service_default.preprocessMessage(
        user_message,
        sessionIdForPreprocessing,
        {
          tenantId,
          pageContext: user_context,
          source: "widget"
        }
      );
      console.log(`Widget Agent: Message preprocessed - Urgency: ${preprocessorResult.urgency}, Sentiment: ${preprocessorResult.sentiment}, PII masked: ${preprocessorResult.masked_pii.length}`);
      const aiContext = await buildAIContext(preprocessorResult.normalized_prompt, tenantId);
      let enhancedContext = aiContext;
      if (user_context) {
        const pageContextStr = `
User Context:
- Page URL: ${user_context.url || "Unknown"}
- Page Title: ${user_context.title || "Unknown"}
- Timestamp: ${user_context.timestamp || (/* @__PURE__ */ new Date()).toISOString()}
        `;
        enhancedContext += pageContextStr;
      }
      const preprocessingContextStr = `
Message Analysis:
- Urgency Level: ${preprocessorResult.urgency}
- Sentiment: ${preprocessorResult.sentiment}
- Normalized Message: ${preprocessorResult.normalized_prompt}
- PII Detected: ${preprocessorResult.masked_pii.length > 0 ? "Yes (masked)" : "No"}
      `;
      enhancedContext += preprocessingContextStr;
      const agentResponse = await agent_service_default.processWorkflow({
        user_message: preprocessorResult.normalized_prompt,
        user_context: {
          tenantId,
          adminId,
          sessionId: sessionIdForPreprocessing,
          pageContext: user_context,
          aiContext: enhancedContext,
          preprocessing: preprocessorResult
        }
      });
      const processingTime = Date.now() - startTime;
      let ticketId = null;
      if (agentResponse.success && (agentResponse.ticket_id || preprocessorResult.urgency === "CRITICAL" || preprocessorResult.urgency === "HIGH")) {
        try {
          const ticket = await storage.createTicket({
            tenantId,
            title: agentResponse.ticket_title || `Chat Widget: ${preprocessorResult.normalized_prompt.substring(0, 50)}...`,
            description: user_message,
            // Keep original message for context
            category: agentResponse.category || "support",
            urgency: preprocessorResult.urgency.toLowerCase(),
            status: "open",
            source: "widget",
            metadata: {
              sessionId: sessionIdForPreprocessing,
              pageContext: user_context,
              agentProcessed: true,
              confidence: agentResponse.confidence_score,
              preprocessing: {
                normalizedMessage: preprocessorResult.normalized_prompt,
                originalMessage: preprocessorResult.original_message,
                urgencyDetected: preprocessorResult.urgency,
                sentimentDetected: preprocessorResult.sentiment,
                piiMasked: preprocessorResult.masked_pii.length > 0,
                maskedPiiCount: preprocessorResult.masked_pii.length
              }
            }
          });
          ticketId = ticket.id;
        } catch (ticketError) {
          console.error("Error creating ticket from agent workflow:", ticketError);
        }
      }
      if (sessionId) {
        try {
          await storage.recordWidgetInteraction({
            tenantId,
            sessionId,
            messageType: "agent_workflow",
            message: user_message,
            timestamp: /* @__PURE__ */ new Date(),
            url: user_context?.url || null,
            metadata: {
              processingTime,
              ticketCreated: !!ticketId,
              confidence: agentResponse.confidence_score,
              agentUsed: true
            }
          });
        } catch (logError) {
          console.error("Error logging widget interaction:", logError);
        }
      }
      return res.json({
        success: true,
        ticket_id: ticketId,
        ticket_title: agentResponse.ticket_title,
        status: agentResponse.status || "processed",
        category: agentResponse.category || "support",
        urgency: agentResponse.urgency || "medium",
        resolution_steps: agentResponse.resolution_steps || [],
        resolution_steps_count: agentResponse.resolution_steps?.length || 0,
        confidence_score: agentResponse.confidence_score || 0.8,
        processing_time_ms: processingTime,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        source: "widget",
        message: agentResponse.final_response || agentResponse.response
      });
    } catch (error) {
      console.error("Error processing agent workflow request:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process agent workflow request",
        message: "An internal error occurred while processing your request"
      });
    }
  });
  app2.post("/api/widget/process_message", async (req, res) => {
    try {
      const validationResult2 = processMessageRequestSchema.safeParse(req.body);
      if (!validationResult2.success) {
        return res.status(400).json({
          error: "Invalid process message request",
          details: validationResult2.error.format()
        });
      }
      const { tenantId, message, context, apiKey } = validationResult2.data;
      const isValidApiKey = await validateWidgetApiKey(tenantId, apiKey);
      if (!isValidApiKey) {
        return res.status(401).json({
          error: "Invalid API key for tenant"
        });
      }
      const startTime = Date.now();
      const sessionIdForProcessing = context?.sessionId || `widget_simple_${tenantId}_${Date.now()}`;
      const preprocessorResult = await agent_service_default.preprocessMessage(
        message,
        sessionIdForProcessing,
        {
          tenantId,
          pageContext: context,
          source: "widget_simple"
        }
      );
      console.log(`Widget Simple: Message preprocessed - Urgency: ${preprocessorResult.urgency}, Sentiment: ${preprocessorResult.sentiment}`);
      const aiContext = await buildAIContext(preprocessorResult.normalized_prompt, tenantId);
      const agentResponse = await agent_service_default.generateChatResponse({
        ticketContext: {
          id: 0,
          // No ticket for simple messages
          title: "Widget Chat",
          description: preprocessorResult.normalized_prompt,
          category: "chat",
          tenantId
        },
        messageHistory: [],
        userMessage: preprocessorResult.normalized_prompt,
        knowledgeContext: aiContext
      });
      const processingTime = Date.now() - startTime;
      if (context?.sessionId) {
        try {
          await storage.recordWidgetInteraction({
            tenantId,
            sessionId: context.sessionId,
            messageType: "simple_message",
            message,
            timestamp: /* @__PURE__ */ new Date(),
            url: context.url || null,
            metadata: {
              processingTime,
              agentUsed: true,
              responseLength: agentResponse.response?.length || 0
            }
          });
        } catch (logError) {
          console.error("Error logging widget interaction:", logError);
        }
      }
      return res.json({
        response: agentResponse || "I understand your message. How can I help you further?",
        confidence: 0.8,
        processing_time_ms: processingTime,
        suggested_actions: generateSuggestedActions(message, agentResponse || ""),
        session_id: sessionIdForProcessing,
        preprocessing: {
          urgency: preprocessorResult.urgency,
          sentiment: preprocessorResult.sentiment,
          normalized_message: preprocessorResult.normalized_prompt,
          pii_detected: preprocessorResult.masked_pii.length > 0,
          original_message: preprocessorResult.original_message
        }
      });
    } catch (error) {
      console.error("Error processing message request:", error);
      res.status(500).json({
        error: "Failed to process message request",
        message: "An internal error occurred while processing your message"
      });
    }
  });
  app2.post("/api/test/instruction-lookup", async (req, res) => {
    try {
      const { message, topK = 3 } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "Message is required and must be a string"
        });
      }
      console.log(`InstructionLookup Test: Processing message: "${message}"`);
      const startTime = Date.now();
      const lookupResult = await instructionLookupAgent.lookupInstructions({
        normalizedPrompt: message,
        urgency: "MEDIUM",
        sentiment: "neutral",
        sessionId: `test_${Date.now()}`,
        topK
      });
      const processingTime = Date.now() - startTime;
      console.log(`InstructionLookup Test: Found ${lookupResult.instructions.length} instructions in ${processingTime}ms`);
      return res.json({
        success: lookupResult.success,
        lookup_result: lookupResult,
        agent_status: instructionLookupAgent.getStatus(),
        test_info: {
          message,
          topK,
          processing_time_ms: processingTime,
          instructions_found: lookupResult.instructions.length,
          search_method: lookupResult.searchMethod
        }
      });
    } catch (error) {
      console.error("Error testing instruction lookup agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test instruction lookup agent",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/test/ticket-lookup", async (req, res) => {
    try {
      const { message, topK = 3 } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          success: false,
          error: "Message is required and must be a string"
        });
      }
      console.log(`TicketLookup Test: Processing message: "${message}"`);
      const startTime = Date.now();
      const lookupResult = await agent_service_default.lookupSimilarTickets(message, topK);
      const processingTime = Date.now() - startTime;
      console.log(`TicketLookup Test: Found ${lookupResult.similar_tickets.length} tickets in ${processingTime}ms`);
      res.json({
        success: lookupResult.success,
        lookup_result: lookupResult,
        agent_status: agent_service_default.getTicketLookupStatus(),
        test_info: {
          message,
          topK,
          processing_time_ms: processingTime,
          tickets_found: lookupResult.similar_tickets.length,
          search_method: lookupResult.search_method
        }
      });
    } catch (error) {
      console.error("Error testing ticket lookup agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test ticket lookup agent",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
async function validateWidgetApiKey(tenantId, apiKey) {
  try {
    const apiKeys = await storage.getWidgetApiKeys(tenantId);
    return apiKeys.some((key) => key.key === apiKey && key.isActive);
  } catch (error) {
    console.error("Error validating widget API key:", error);
    return false;
  }
}
function generateSuggestedActions(userMessage, aiResponse) {
  const actions = [];
  if (aiResponse.includes("create a ticket") || aiResponse.includes("submit a ticket") || aiResponse.includes("open a ticket") || aiResponse.includes("file a support request")) {
    actions.push({
      type: "create_ticket",
      label: "Create Support Ticket",
      message: "I would like to create a support ticket for this issue"
    });
  }
  if (aiResponse.includes("contact support") || aiResponse.includes("support team") || aiResponse.includes("customer service") || aiResponse.includes("speak with")) {
    actions.push({
      type: "contact_support",
      label: "Contact Support Team",
      message: "I need to speak with a support representative"
    });
  }
  if (aiResponse.includes("documentation") || aiResponse.includes("user guide") || aiResponse.includes("knowledge base") || aiResponse.includes("help article")) {
    actions.push({
      type: "view_docs",
      label: "View Documentation",
      message: "Can you show me the documentation for this?"
    });
  }
  if (aiResponse.includes("troubleshoot") || aiResponse.includes("follow these steps") || aiResponse.includes("try the following")) {
    actions.push({
      type: "troubleshoot",
      label: "Get More Help",
      message: "I need additional troubleshooting assistance"
    });
  }
  return actions;
}
function registerPreprocessorTestRoute(app2) {
  app2.post("/api/test/preprocessor", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      if (!message) {
        return res.status(400).json({
          error: "Message is required"
        });
      }
      const testSessionId = sessionId || `test_${Date.now()}`;
      const preprocessorResult = await agent_service_default.preprocessMessage(
        message,
        testSessionId,
        {
          tenantId: 1,
          source: "test",
          test: true
        }
      );
      const preprocessorStatus = agent_service_default.getPreprocessorStatus();
      return res.json({
        success: true,
        preprocessing_result: preprocessorResult,
        preprocessor_status: preprocessorStatus,
        test_info: {
          message: "Chat Preprocessor Agent test completed successfully",
          session_id: testSessionId,
          agent_available: agent_service_default.isAvailable()
        }
      });
    } catch (error) {
      console.error("Error testing Chat Preprocessor Agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test Chat Preprocessor Agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

// server/routes/widget-chat-routes.ts
init_storage();
init_ai();
init_data_source_service();
init_agent_service();
import { z as z12 } from "zod";
var widgetChatRequestSchema = z12.object({
  tenantId: z12.number(),
  message: z12.string(),
  context: z12.object({
    url: z12.string().optional(),
    title: z12.string().optional()
  }).optional(),
  sessionId: z12.string().optional(),
  url: z12.string().optional()
});
function registerWidgetChatRoutes(app2) {
  app2.post("/api/widget/chat", async (req, res) => {
    try {
      const validationResult2 = widgetChatRequestSchema.safeParse(req.body);
      if (!validationResult2.success) {
        return res.status(400).json({
          error: "Invalid widget chat request",
          details: validationResult2.error.format()
        });
      }
      const { tenantId, message, context, sessionId } = validationResult2.data;
      console.log(`Widget Chat: Processing message for tenant ${tenantId}: "${message.substring(0, 50)}..."`);
      const aiContext = await buildAIContext(message, tenantId);
      let enhancedContext = aiContext;
      if (context) {
        const pageContextStr = `
          User is on page: ${context.url || "Unknown"}
          Page title: ${context.title || "Unknown"}
        `;
        enhancedContext += pageContextStr;
      }
      let agentInsights = null;
      try {
        const workflowInput = {
          user_message: message,
          user_context: {
            url: context?.url || "Widget Chat",
            title: context?.title || "Support Request",
            userAgent: req.headers["user-agent"] || "Widget User"
          },
          tenant_id: tenantId,
          user_id: sessionId || `widget_${Date.now()}`
        };
        const orchestratorResult = await agent_service_default.processWorkflow(workflowInput);
        if (orchestratorResult.success) {
          agentInsights = {
            category: orchestratorResult.category,
            urgency: orchestratorResult.urgency,
            confidence: orchestratorResult.confidence_score,
            suggestions: orchestratorResult.resolution_steps || [],
            processingTime: orchestratorResult.processing_time_ms
          };
          console.log(`Widget Chat: Agent insights gathered - Category: ${orchestratorResult.category}, Urgency: ${orchestratorResult.urgency}`);
        }
      } catch (agentError) {
        console.warn(`Widget Chat: Agent insights unavailable: ${agentError.message}`);
      }
      const widgetTicketContext = {
        id: 0,
        title: "Widget Chat",
        description: message,
        category: agentInsights?.category || "support",
        tenantId
      };
      const messages2 = [
        { role: "user", content: message }
      ];
      let contextualPrompt = enhancedContext;
      if (agentInsights) {
        contextualPrompt += `

Agent Analysis: Category: ${agentInsights.category}, Urgency: ${agentInsights.urgency}, Confidence: ${agentInsights.confidence}`;
        if (agentInsights.suggestions.length > 0) {
          contextualPrompt += `
Suggested steps: ${agentInsights.suggestions.slice(0, 3).join("; ")}`;
        }
      }
      const messageText = messages2.length > 0 && messages2[0].role === "user" ? messages2[0].content : message;
      const response2 = await generateChatResponse(
        widgetTicketContext,
        [],
        messageText
      );
      try {
        if (sessionId) {
          await storage.recordWidgetInteraction({
            tenantId,
            sessionId,
            messageType: "user",
            message,
            timestamp: /* @__PURE__ */ new Date(),
            url: req.body.url || null,
            metadata: {
              responseLength: response2.length,
              aiUsed: true,
              agentInsights: agentInsights ? "available" : "unavailable",
              category: agentInsights?.category || "unknown",
              urgency: agentInsights?.urgency || "unknown",
              confidence: agentInsights?.confidence || 0
            }
          });
        }
      } catch (logError) {
        console.error("Error recording widget interaction:", logError);
      }
      return res.json({
        message: response2,
        sessionId,
        category: agentInsights?.category,
        urgency: agentInsights?.urgency,
        confidence: agentInsights?.confidence,
        actions: generateSuggestedActions2(message, response2),
        agentInsights: agentInsights ? {
          category: agentInsights.category,
          urgency: agentInsights.urgency,
          confidence: agentInsights.confidence,
          suggestions: agentInsights.suggestions.slice(0, 3)
        } : null
      });
    } catch (error) {
      console.error("Error processing widget chat request:", error);
      res.status(500).json({ error: "Failed to process chat request" });
    }
  });
}
function generateSuggestedActions2(userMessage, aiResponse) {
  const actions = [];
  if (aiResponse.includes("create a ticket") || aiResponse.includes("submit a ticket") || aiResponse.includes("open a ticket")) {
    actions.push({
      type: "message",
      label: "Create Support Ticket",
      message: "I would like to create a support ticket for this issue"
    });
  }
  if (aiResponse.includes("contact support") || aiResponse.includes("support team") || aiResponse.includes("customer service")) {
    actions.push({
      type: "message",
      label: "Contact Support Team",
      message: "I need to speak with a support representative"
    });
  }
  if (aiResponse.includes("documentation") || aiResponse.includes("user guide") || aiResponse.includes("knowledge base")) {
    actions.push({
      type: "message",
      label: "View Documentation",
      message: "Can you show me the documentation for this?"
    });
  }
  return actions;
}

// server/routes/widget-ticket-routes.ts
init_storage();
init_ai();
init_agent_service();
import { z as z13 } from "zod";
var widgetTicketSchema = z13.object({
  tenantId: z13.number(),
  sessionId: z13.string().optional(),
  conversation: z13.array(z13.object({
    role: z13.enum(["user", "assistant"]),
    content: z13.string(),
    timestamp: z13.string()
  })),
  attachments: z13.array(z13.object({
    filename: z13.string(),
    data: z13.string(),
    // base64 encoded
    mimeType: z13.string()
  })).optional(),
  context: z13.object({
    url: z13.string().optional(),
    title: z13.string().optional(),
    userAgent: z13.string().optional()
  }).optional()
});
function registerWidgetTicketRoutes(app2) {
  app2.post("/api/widget/create-ticket", async (req, res) => {
    try {
      const validationResult2 = widgetTicketSchema.safeParse(req.body);
      if (!validationResult2.success) {
        console.error("Widget ticket validation failed:", validationResult2.error);
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult2.error.errors
        });
      }
      const { tenantId, sessionId, conversation, attachments: attachments2, context } = validationResult2.data;
      console.log(`Widget Ticket: Creating ticket for tenant ${tenantId} with ${conversation.length} messages`);
      const latestUserMessage = conversation.filter((msg) => msg.role === "user").pop()?.content || "";
      const titlePrompt = `Based on this support request, generate a concise, professional ticket title (max 80 characters):
      
      User message: "${latestUserMessage}"
      
      Generate only the title, no additional text.`;
      const titleResponse = await generateChatResponse(
        { id: 0, title: "Title Generation", description: latestUserMessage, category: "support", tenantId },
        [{ role: "user", content: titlePrompt }],
        titlePrompt
      );
      const ticketTitle = titleResponse.trim().replace(/^["']|["']$/g, "").substring(0, 80);
      const conversationText = conversation.map(
        (msg) => `${msg.role.toUpperCase()}: ${msg.content}`
      ).join("\n\n");
      const descriptionPrompt = `Summarize this support conversation into a professional ticket description. Include the user's issue, any provided context, and conversation progression:

      CONVERSATION:
      ${conversationText}
      
      ${context?.url ? `
User was on page: ${context.url}` : ""}
      ${context?.title ? `Page title: ${context.title}` : ""}
      
      Create a comprehensive, professional ticket description that captures all important details.`;
      const descriptionResponse = await generateChatResponse(
        { id: 0, title: "Description Generation", description: conversationText, category: "support", tenantId },
        [{ role: "user", content: descriptionPrompt }],
        descriptionPrompt
      );
      let agentInsights = null;
      try {
        const workflowInput = {
          user_message: latestUserMessage,
          user_context: {
            url: context?.url || "Widget Chat",
            title: context?.title || "Support Request",
            userAgent: context?.userAgent || "Widget User"
          },
          tenant_id: tenantId,
          user_id: sessionId || `widget_${Date.now()}`
        };
        const orchestratorResult = await agent_service_default.processWorkflow(workflowInput);
        if (orchestratorResult.success) {
          agentInsights = {
            category: orchestratorResult.category,
            urgency: orchestratorResult.urgency,
            confidence: orchestratorResult.confidence_score,
            suggestions: orchestratorResult.resolution_steps || [],
            processingTime: orchestratorResult.processing_time_ms
          };
          console.log(`Widget Ticket: Agent analysis - Category: ${orchestratorResult.category}, Urgency: ${orchestratorResult.urgency}`);
        }
      } catch (agentError) {
        console.warn(`Widget Ticket: Agent analysis unavailable: ${agentError.message}`);
      }
      const ticketData = {
        title: ticketTitle,
        description: descriptionResponse.trim(),
        category: agentInsights?.category || "support",
        complexity: agentInsights?.urgency || "medium",
        // Map urgency to complexity
        status: "new",
        tenantId,
        createdBy: 1,
        // Widget user - could be enhanced with proper user tracking
        source: "widget",
        clientMetadata: {
          sessionId,
          conversationLength: conversation.length,
          agentCategory: agentInsights?.category,
          agentUrgency: agentInsights?.urgency,
          agentConfidence: agentInsights?.confidence,
          context,
          hasAttachments: attachments2 && attachments2.length > 0
        }
      };
      const ticket = await storage.createTicket(ticketData);
      let attachmentResults = [];
      if (attachments2 && attachments2.length > 0) {
        for (const attachment of attachments2) {
          try {
            const buffer = Buffer.from(attachment.data, "base64");
            console.log(`Widget Ticket: Attachment ${attachment.filename} (${attachment.mimeType}) - ${buffer.length} bytes`);
            attachmentResults.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: buffer.length,
              status: "saved"
            });
          } catch (attachError) {
            console.error(`Widget Ticket: Failed to process attachment ${attachment.filename}:`, attachError);
            attachmentResults.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              status: "failed",
              error: "Processing failed"
            });
          }
        }
      }
      const suggestions = generateUlteriorSuggestions(latestUserMessage, agentInsights, ticket);
      console.log(`Widget Ticket: Successfully created ticket #${ticket.id} - "${ticketTitle}"`);
      return res.json({
        success: true,
        ticket: {
          id: ticket.id,
          title: ticketTitle,
          description: descriptionResponse.trim(),
          category: ticket.category,
          complexity: ticket.complexity,
          status: ticket.status,
          createdAt: ticket.createdAt
        },
        attachments: attachmentResults,
        agentInsights: agentInsights ? {
          category: agentInsights.category,
          urgency: agentInsights.urgency,
          confidence: agentInsights.confidence,
          processingTime: agentInsights.processingTime
        } : null,
        suggestions
      });
    } catch (error) {
      console.error("Error creating widget ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });
}
function generateUlteriorSuggestions(userMessage, agentInsights, ticket) {
  const suggestions = [];
  if (agentInsights?.suggestions && agentInsights.suggestions.length > 0) {
    suggestions.push({
      type: "agent_resolution",
      title: "Recommended Solution Steps",
      description: "AI-generated resolution steps based on similar issues",
      steps: agentInsights.suggestions.slice(0, 5),
      confidence: agentInsights.confidence
    });
  }
  if (agentInsights?.category) {
    switch (agentInsights.category.toLowerCase()) {
      case "billing":
        suggestions.push({
          type: "billing_resources",
          title: "Billing Resources",
          description: "Access billing documentation and payment options",
          actions: [
            "View billing FAQ",
            "Update payment method",
            "Download invoices",
            "Contact billing specialist"
          ]
        });
        break;
      case "technical":
        suggestions.push({
          type: "technical_resources",
          title: "Technical Documentation",
          description: "Relevant technical guides and troubleshooting",
          actions: [
            "View API documentation",
            "Check system status",
            "Browse troubleshooting guides",
            "Access developer tools"
          ]
        });
        break;
      case "account":
        suggestions.push({
          type: "account_resources",
          title: "Account Management",
          description: "Account settings and security options",
          actions: [
            "Update profile settings",
            "Manage security settings",
            "View login history",
            "Reset password"
          ]
        });
        break;
    }
  }
  if (agentInsights?.urgency === "high") {
    suggestions.push({
      type: "escalation",
      title: "Priority Support",
      description: "Your issue has been marked as high priority",
      actions: [
        "Escalate to senior support",
        "Request phone callback",
        "Access emergency support",
        "View SLA commitments"
      ]
    });
  }
  suggestions.push({
    type: "self_service",
    title: "Self-Service Options",
    description: "Resources that might help resolve your issue quickly",
    actions: [
      "Search knowledge base",
      "Watch tutorial videos",
      "Join community forum",
      "Submit feature request"
    ]
  });
  suggestions.push({
    type: "follow_up",
    title: "Next Steps",
    description: "What to expect and how to track progress",
    actions: [
      `Track ticket #${ticket.id} status`,
      "Set up email notifications",
      "Rate your support experience",
      "Provide additional information"
    ]
  });
  return suggestions;
}

// server/routes/agent-resources.ts
init_storage();
import express3 from "express";
import multer3 from "multer";
import path10 from "path";
import fs9 from "fs/promises";
var router4 = express3.Router();
var requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};
var AGENT_CONFIGS = {
  "chat-preprocessor": {
    name: "Chat Preprocessor Agent",
    allowedTypes: [".txt", ".md", ".json"],
    maxFileSize: 5 * 1024 * 1024,
    // 5MB
    disabled: false
  },
  "instruction-lookup": {
    name: "Instruction Lookup Agent",
    allowedTypes: [".txt", ".pdf", ".docx", ".pptx", ".xlsx"],
    maxFileSize: 10 * 1024 * 1024,
    // 10MB
    disabled: false
  },
  "ticket-lookup": {
    name: "Ticket Lookup Agent",
    allowedTypes: [],
    // No uploads allowed
    maxFileSize: 0,
    disabled: true
  },
  "ticket-formatter": {
    name: "Ticket Formatter Agent",
    allowedTypes: [".txt", ".md", ".json", ".html"],
    maxFileSize: 2 * 1024 * 1024,
    // 2MB
    disabled: false
  }
};
var storage_config2 = multer3.diskStorage({
  destination: async (req, file, cb) => {
    const agentType = req.params.agentType || req.query.agentType;
    const tenantId = req.user?.tenantId || 1;
    const uploadDir = path10.join(process.cwd(), "uploads", "agent-resources", `tenant-${tenantId}`, agentType);
    try {
      await fs9.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    const timestamp2 = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path10.extname(file.originalname);
    const filename = `${timestamp2}-${randomString}${extension}`;
    cb(null, filename);
  }
});
var fileFilter2 = (req, file, cb) => {
  const agentType = req.params.agentType || req.query.agentType;
  const config = AGENT_CONFIGS[agentType];
  if (!config) {
    return cb(new Error("Invalid agent type"));
  }
  if (config.disabled) {
    return cb(new Error("This agent does not accept file uploads"));
  }
  const fileExtension = path10.extname(file.originalname).toLowerCase();
  if (!config.allowedTypes.includes(fileExtension)) {
    return cb(new Error(`File type ${fileExtension} not allowed for this agent. Allowed types: ${config.allowedTypes.join(", ")}`));
  }
  cb(null, true);
};
var upload3 = multer3({
  storage: storage_config2,
  fileFilter: fileFilter2,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max (will be checked per agent)
  }
});
router4.get("/", requireAuth, async (req, res) => {
  try {
    const { agent } = req.query;
    const tenantId = req.user?.tenantId || 1;
    if (!agent || typeof agent !== "string") {
      return res.status(400).json({ error: "Agent type is required" });
    }
    if (!AGENT_CONFIGS[agent]) {
      return res.status(400).json({ error: "Invalid agent type" });
    }
    const resources = await storage.getAgentResources(agent, tenantId);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching agent resources:", error);
    res.status(500).json({ error: "Failed to fetch agent resources" });
  }
});
router4.post("/upload/:agentType", requireAuth, upload3.single("file"), async (req, res) => {
  try {
    const agentType = req.params.agentType;
    const file = req.file;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || 1;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!agentType) {
      return res.status(400).json({ error: "Agent type is required" });
    }
    const config = AGENT_CONFIGS[agentType];
    if (!config) {
      return res.status(400).json({ error: "Invalid agent type" });
    }
    if (config.disabled) {
      return res.status(400).json({ error: "This agent does not accept file uploads" });
    }
    if (file.size > config.maxFileSize) {
      await fs9.unlink(file.path);
      return res.status(400).json({
        error: `File size exceeds limit for this agent (${Math.round(config.maxFileSize / 1024 / 1024)}MB)`
      });
    }
    const resourceData = {
      agentType,
      filename: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      fileType: path10.extname(file.originalname).toLowerCase(),
      filePath: file.path,
      tenantId,
      uploadedBy: userId,
      metadata: {
        mimetype: file.mimetype,
        encoding: file.encoding
      }
    };
    const resource = await storage.createAgentResource(resourceData);
    res.status(201).json({
      message: "File uploaded successfully",
      resource: {
        id: resource.id,
        agent_type: resource.agentType,
        filename: resource.filename,
        original_name: resource.originalName,
        file_size: resource.fileSize,
        file_type: resource.fileType,
        upload_date: resource.uploadDate,
        tenant_id: resource.tenantId,
        uploaded_by: resource.uploadedBy
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    if (req.file) {
      try {
        await fs9.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});
router4.get("/:id/download", requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    const tenantId = req.user?.tenantId || 1;
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: "Invalid resource ID" });
    }
    const resource = await storage.getAgentResource(resourceId, tenantId);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    try {
      await fs9.access(resource.filePath);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="${resource.originalName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(path10.resolve(resource.filePath));
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});
router4.delete("/:id", requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    const tenantId = req.user?.tenantId || 1;
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: "Invalid resource ID" });
    }
    const resource = await storage.getAgentResource(resourceId, tenantId);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    try {
      await fs9.unlink(resource.filePath);
    } catch (error) {
      console.error("Error deleting file from disk:", error);
    }
    await storage.deleteAgentResource(resourceId, tenantId);
    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});
var agent_resources_default = router4;

// server/routes/agent-test-routes.ts
import { Router as Router5 } from "express";
import { spawn } from "child_process";
import path11 from "path";
var router5 = Router5();
router5.post("/test-chromadb", async (req, res) => {
  try {
    const { query = "I can't login after password reset", test_type = "comprehensive" } = req.body;
    const pythonScript = path11.join(process.cwd(), "test_chromadb_direct.py");
    const testProcess = spawn("python", [pythonScript], {
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
        TEST_QUERY: query,
        TEST_TYPE: test_type
      },
      cwd: process.cwd()
    });
    let stdout = "";
    let stderr = "";
    testProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    testProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    testProcess.on("close", (code) => {
      if (code === 0) {
        const lines = stdout.split("\n");
        const servicePass = stdout.includes("ChromaDB Service: PASS");
        const agentsPass = stdout.includes("ChromaDB Agents: PASS");
        const overallSuccess = stdout.includes("Overall Success: YES");
        const instructionMatch = stdout.match(/Instructions: (\d+)/);
        const ticketMatch = stdout.match(/Tickets: (\d+)/);
        const storageMatch = stdout.match(/Storage Type: (\w+)/);
        const workflowSteps = [];
        let currentStep = null;
        for (const line of lines) {
          if (line.includes("\u2713") || line.includes("\u2717")) {
            if (line.includes("Resource:")) {
              if (currentStep) {
                currentStep.resource = line.split("Resource: ")[1];
              }
            } else if (line.includes("Output:")) {
              if (currentStep) {
                currentStep.output = line.split("Output: ")[1];
                workflowSteps.push(currentStep);
                currentStep = null;
              }
            } else {
              const stepMatch = line.match(/(✓|✗)\s+(\w+):\s+(\w+)\s+\(([0-9.]+)ms\)/);
              if (stepMatch) {
                currentStep = {
                  success: stepMatch[1] === "\u2713",
                  step: stepMatch[2],
                  agent: stepMatch[3],
                  duration_ms: parseFloat(stepMatch[4])
                };
              }
            }
          }
        }
        res.json({
          success: overallSuccess,
          chromadb_service: servicePass,
          chromadb_agents: agentsPass,
          storage_type: storageMatch ? storageMatch[1] : "chromadb",
          instruction_count: instructionMatch ? parseInt(instructionMatch[1]) : 0,
          ticket_count: ticketMatch ? parseInt(ticketMatch[1]) : 0,
          workflow_trace: workflowSteps,
          total_duration_ms: workflowSteps.reduce((sum, step) => sum + step.duration_ms, 0),
          test_output: stdout,
          query_tested: query
        });
      } else {
        console.error("ChromaDB test failed:", stderr);
        res.status(500).json({
          success: false,
          error: `Test process failed with code ${code}`,
          stderr,
          stdout
        });
      }
    });
  } catch (error) {
    console.error("ChromaDB test endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});
router5.post("/test-workflow", async (req, res) => {
  try {
    const { user_message, user_context } = req.body;
    const mockResponse = {
      success: true,
      ticket_id: 12345,
      ticket_title: "Support Request - " + user_message.substring(0, 50),
      status: "created",
      category: "general",
      urgency: "medium",
      resolution_steps: [
        "Request received and processed",
        "Initial classification completed",
        "Assigned to support team",
        "Awaiting user response"
      ],
      resolution_steps_count: 4,
      confidence_score: 0.75,
      processing_time_ms: 250,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      source: "agent_test",
      workflow_trace: [
        {
          step: "0a",
          agent: "ChatProcessorAgent",
          input: user_message.substring(0, 30) + "...",
          resource: "Message Processing",
          output: "Processed and normalized message",
          duration_ms: 50,
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          step: "1a",
          agent: "InstructionLookupAgent",
          input: "Query processed message",
          resource: "Local Vector Storage",
          output: "Found relevant instructions",
          duration_ms: 100,
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          step: "2a",
          agent: "TicketLookupAgent",
          input: "Search similar tickets",
          resource: "Local Vector Storage",
          output: "Found similar tickets",
          duration_ms: 75,
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          step: "3a",
          agent: "TicketFormatterAgent",
          input: "Format response",
          resource: "AI Formatting",
          output: "Generated ticket response",
          duration_ms: 25,
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]
    };
    res.json(mockResponse);
  } catch (error) {
    console.error("Agent workflow test error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});
var agent_test_routes_default = router5;

// server/routes/creator-routes.ts
init_db();
init_schema();
import { Router as Router6 } from "express";
import { eq as eq6, and as and6, desc as desc2, like, or as or4, asc as asc2, sql as sql2 } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
var router6 = Router6();
var requireCreatorRole = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "creator") {
    return res.status(403).json({ message: "Access denied. Creator role required." });
  }
  next();
};
var logCreatorAction = async (creatorId, action, details, targetUserId, targetCompanyId) => {
  try {
    console.log(`AUDIT LOG: Creator ${creatorId} performed ${action}`, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      creatorId,
      action,
      details,
      targetUserId,
      targetCompanyId
    });
  } catch (error) {
    console.error("Failed to log creator action:", error);
  }
};
router6.get("/users", requireCreatorRole, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * pageSize;
    let searchCondition = void 0;
    if (search) {
      searchCondition = or4(
        like(users.username, `%${search}%`),
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      );
    }
    const usersQuery = db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      tenantId: users.tenantId,
      teamId: users.teamId,
      profilePicture: users.profilePicture,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(searchCondition).orderBy(desc2(users.createdAt)).limit(pageSize).offset(offset);
    const countQuery = db.select({ count: sql2`count(*)` }).from(users).where(searchCondition);
    const [userResults, countResults] = await Promise.all([usersQuery, countQuery]);
    const tenantIds = [...new Set(userResults.map((user) => user.tenantId))];
    let tenantResults = [];
    if (tenantIds.length > 0) {
      const conditions = tenantIds.map((id) => eq6(tenants.id, id));
      tenantResults = await db.select({
        id: tenants.id,
        name: tenants.name
      }).from(tenants).where(conditions.length === 1 ? conditions[0] : or4(...conditions));
    }
    const teamIds = [...new Set(userResults.map((user) => user.teamId).filter(Boolean))];
    let teamResults = [];
    if (teamIds.length > 0) {
      const conditions = teamIds.map((id) => eq6(teams.id, id));
      teamResults = await db.select({
        id: teams.id,
        name: teams.name
      }).from(teams).where(conditions.length === 1 ? conditions[0] : or4(...conditions));
    }
    const tenantMap = new Map(tenantResults.map((tenant) => [tenant.id, tenant.name]));
    const teamMap = new Map(teamResults.map((team) => [team.id, team.name]));
    const enhancedUsers = userResults.map((user) => ({
      ...user,
      tenantName: tenantMap.get(user.tenantId) || `Tenant ${user.tenantId}`,
      teamName: user.teamId ? teamMap.get(user.teamId) || `Team ${user.teamId}` : null
    }));
    const total = countResults[0]?.count || 0;
    logCreatorAction(req.user.id, "list_users", {
      page,
      pageSize,
      search,
      total
    });
    return res.status(200).json({
      users: enhancedUsers,
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize)
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});
router6.get("/tenants", requireCreatorRole, async (req, res) => {
  try {
    const tenantsQuery = db.select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      createdAt: tenants.createdAt
    }).from(tenants).orderBy(asc2(tenants.name));
    const tenantResults = await tenantsQuery;
    logCreatorAction(req.user.id, "list_tenants", {
      count: tenantResults.length
    });
    return res.status(200).json({
      tenants: tenantResults
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return res.status(500).json({ message: "Failed to fetch tenants" });
  }
});
router6.get("/teams", requireCreatorRole, async (req, res) => {
  try {
    const teamsQuery = db.select({
      id: teams.id,
      name: teams.name,
      tenantId: teams.tenantId,
      description: teams.description,
      createdAt: teams.createdAt
    }).from(teams).orderBy(asc2(teams.name));
    const teamResults = await teamsQuery;
    const tenantIds = [...new Set(teamResults.map((team) => team.tenantId))];
    let tenantResults = [];
    if (tenantIds.length > 0) {
      const conditions = tenantIds.map((id) => eq6(tenants.id, id));
      tenantResults = await db.select({
        id: tenants.id,
        name: tenants.name
      }).from(tenants).where(conditions.length === 1 ? conditions[0] : or4(...conditions));
    }
    const tenantMap = new Map(tenantResults.map((tenant) => [tenant.id, tenant.name]));
    const enhancedTeams = teamResults.map((team) => ({
      ...team,
      tenantName: tenantMap.get(team.tenantId) || `Tenant ${team.tenantId}`
    }));
    logCreatorAction(req.user.id, "list_teams", {
      count: teamResults.length
    });
    return res.status(200).json({
      teams: enhancedTeams
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ message: "Failed to fetch teams" });
  }
});
router6.post("/users", requireCreatorRole, async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      name,
      email,
      companyId,
      companyName,
      companySSO,
      teamId,
      teamName
    } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (!companyId && !companyName) {
      return res.status(400).json({ message: "Either companyId or companyName must be provided" });
    }
    const existingUser = await db.select().from(users).where(eq6(users.username, username)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }
    let tenantId = companyId;
    if (!tenantId) {
      const [newTenant] = await db.insert(tenants).values({
        name: companyName,
        subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
        apiKey: uuidv4(),
        active: true,
        settings: {},
        branding: {}
      }).returning();
      tenantId = newTenant.id;
      logCreatorAction(req.user.id, "create_tenant", {
        tenantName: companyName,
        tenantId
      }, void 0, tenantId);
    }
    let userTeamId = teamId;
    if (!userTeamId && teamName && tenantId) {
      const [newTeam] = await db.insert(teams).values({
        name: teamName,
        tenantId,
        description: `Team created by ${req.user.username}`
      }).returning();
      userTeamId = newTeam.id;
      logCreatorAction(req.user.id, "create_team", {
        teamName,
        teamId: userTeamId,
        tenantId
      }, void 0, tenantId);
    }
    const hashedPassword = await hashPassword(password);
    const userInsert = {
      username,
      password: hashedPassword,
      role,
      name: name || null,
      email: email || null,
      tenantId,
      teamId: userTeamId || null,
      company: companyName || null,
      // Add the company field
      profilePicture: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
      ssoEnabled: false,
      ssoProvider: null,
      ssoProviderId: null,
      ssoProviderData: {},
      active: true
    };
    const [newUser] = await db.insert(users).values(userInsert).returning();
    if (userTeamId) {
      await db.insert(teamMembers).values({
        userId: newUser.id,
        teamId: userTeamId,
        role: "member"
      });
    }
    logCreatorAction(req.user.id, "create_user", {
      username,
      role,
      tenantId,
      teamId: userTeamId
    }, newUser.id, tenantId);
    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      tenantId: newUser.tenantId,
      teamId: newUser.teamId,
      createdAt: newUser.createdAt,
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
});
router6.put("/users/:id", requireCreatorRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      role,
      name,
      email,
      companyId,
      teamId,
      active
    } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const existingUser = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentUser = existingUser[0];
    const updateData = {};
    if (role !== void 0) updateData.role = role;
    if (name !== void 0) updateData.name = name;
    if (email !== void 0) updateData.email = email;
    if (companyId !== void 0) updateData.tenantId = companyId;
    if (teamId !== void 0) updateData.teamId = teamId;
    if (active !== void 0) updateData.active = active;
    if (teamId !== void 0 && teamId !== currentUser.teamId) {
      if (currentUser.teamId) {
        await db.delete(teamMembers).where(
          and6(
            eq6(teamMembers.userId, userId),
            eq6(teamMembers.teamId, currentUser.teamId)
          )
        );
      }
      if (teamId !== null) {
        await db.insert(teamMembers).values({
          userId,
          teamId,
          role: "member"
        }).onConflictDoUpdate({
          target: [teamMembers.userId, teamMembers.teamId],
          set: { role: "member" }
        });
      }
    }
    const [updatedUser] = await db.update(users).set({
      ...updateData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(users.id, userId)).returning();
    logCreatorAction(req.user.id, "update_user", {
      userId,
      updates: updateData
    }, userId, updateData.tenantId);
    return res.status(200).json({
      ...updatedUser,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
});
router6.post("/users/:id/reset-password", requireCreatorRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { generateRandom, newPassword } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    if (!generateRandom && !newPassword) {
      return res.status(400).json({ message: "Either generateRandom or newPassword must be provided" });
    }
    const existingUser = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = existingUser[0];
    const password = generateRandom ? generateRandomPassword(12) : newPassword;
    const hashedPassword = await hashPassword(password);
    await db.update(users).set({
      password: hashedPassword,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(users.id, userId));
    logCreatorAction(req.user.id, "reset_password", {
      userId,
      generateRandom
    }, userId, user.tenantId);
    return res.status(200).json({
      message: "Password reset successfully",
      password: generateRandom ? password : void 0
      // Only return password if generated randomly
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
});
router6.delete("/users/:id", requireCreatorRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const existingUser = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = existingUser[0];
    await db.delete(teamMembers).where(eq6(teamMembers.userId, userId));
    await db.delete(users).where(eq6(users.id, userId));
    logCreatorAction(req.user.id, "delete_user", {
      userId,
      username: user.username,
      tenantId: user.tenantId
    }, userId, user.tenantId);
    return res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});
router6.patch("/users/:id", requireCreatorRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      username,
      role,
      name,
      email,
      companyId,
      companyName,
      teamId,
      teamName,
      active
    } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const existingUser = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = existingUser[0];
    if (username && username !== user.username) {
      const usernameExists = await db.select().from(users).where(eq6(users.username, username)).limit(1);
      if (usernameExists.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }
    let tenantId = user.tenantId;
    let company = user.company;
    if (companyId && companyId !== user.tenantId) {
      tenantId = companyId;
      const tenantData = await db.select().from(tenants).where(eq6(tenants.id, companyId)).limit(1);
      if (tenantData.length > 0) {
        company = tenantData[0].name;
      }
    } else if (companyName && (!user.company || companyName !== user.company)) {
      if (!companyId) {
        const [newTenant] = await db.insert(tenants).values({
          name: companyName,
          subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          apiKey: uuidv4(),
          active: true,
          settings: {},
          branding: {}
        }).returning();
        tenantId = newTenant.id;
        company = companyName;
        logCreatorAction(req.user.id, "create_tenant", {
          tenantName: companyName,
          tenantId
        }, void 0, tenantId);
      } else {
        company = companyName;
      }
    }
    let userTeamId = user.teamId;
    if (teamId && teamId !== user.teamId) {
      userTeamId = teamId;
      if (user.teamId) {
        await db.delete(teamMembers).where(and6(
          eq6(teamMembers.userId, userId),
          eq6(teamMembers.teamId, user.teamId)
        ));
      }
      const teamMemberExists = await db.select().from(teamMembers).where(and6(
        eq6(teamMembers.userId, userId),
        eq6(teamMembers.teamId, teamId)
      )).limit(1);
      if (teamMemberExists.length === 0) {
        await db.insert(teamMembers).values({
          userId,
          teamId,
          role: "member"
        });
      }
    } else if (teamName && tenantId) {
      const [newTeam] = await db.insert(teams).values({
        name: teamName,
        tenantId,
        description: `Team created by ${req.user.username}`
      }).returning();
      userTeamId = newTeam.id;
      if (user.teamId) {
        await db.delete(teamMembers).where(and6(
          eq6(teamMembers.userId, userId),
          eq6(teamMembers.teamId, user.teamId)
        ));
      }
      await db.insert(teamMembers).values({
        userId,
        teamId: userTeamId,
        role: "member"
      });
      logCreatorAction(req.user.id, "create_team", {
        teamName,
        teamId: userTeamId,
        tenantId
      }, void 0, tenantId);
    }
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (name !== void 0) updateData.name = name || null;
    if (email !== void 0) updateData.email = email || null;
    if (tenantId !== user.tenantId) updateData.tenantId = tenantId;
    if (company !== user.company) updateData.company = company;
    if (userTeamId !== user.teamId) updateData.teamId = userTeamId;
    if (active !== void 0) updateData.active = active;
    const [updatedUser] = await db.update(users).set(updateData).where(eq6(users.id, userId)).returning();
    logCreatorAction(req.user.id, "update_user", {
      userId,
      username: updatedUser.username,
      tenantId: updatedUser.tenantId,
      teamId: updatedUser.teamId,
      role: updatedUser.role
    }, userId, updatedUser.tenantId);
    return res.status(200).json({
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        name: updatedUser.name,
        email: updatedUser.email,
        tenantId: updatedUser.tenantId,
        teamId: updatedUser.teamId,
        company: updatedUser.company,
        active: updatedUser.active,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
});
var creator_routes_default = router6;

// server/routes/ai-availability-routes.ts
init_db();
init_schema();
import { Router as Router7 } from "express";
import { eq as eq7, and as and7, isNull as isNull4, or as or5 } from "drizzle-orm";
var router7 = Router7();
router7.get("/availability", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ available: false, message: "Unauthorized" });
    }
    const { id: userId, tenantId, teamId, role } = req.user;
    if (role === "creator" || role === "admin") {
      await logAiProviderAccess({
        userId,
        tenantId,
        teamId,
        action: "check",
        success: true,
        details: `User (${role}) has unrestricted AI access`
      });
      return res.json({ available: true });
    }
    const provider = await getAIProviderForUser(tenantId, teamId);
    const available = !!provider;
    await logAiProviderAccess({
      userId,
      tenantId,
      teamId,
      action: "check",
      success: available,
      details: available ? `AI available through provider ${provider.name}` : "No AI providers available for user's tenant/team"
    });
    return res.json({ available });
  } catch (error) {
    console.error("Error checking AI availability:", error);
    return res.status(500).json({
      available: false,
      message: "Error checking AI availability"
    });
  }
});
router7.get("/providers", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ providers: [] });
    }
    const { id: userId, tenantId, teamId, role } = req.user;
    let providers = [];
    if (role === "creator" || role === "admin") {
      providers = await db.select({
        id: aiProviders.id,
        name: aiProviders.name,
        type: aiProviders.type,
        model: aiProviders.model,
        teamId: aiProviders.teamId,
        isDefault: aiProviders.isDefault,
        hasApiKey: db.sql`CASE WHEN ${aiProviders.apiKey} IS NOT NULL AND ${aiProviders.apiKey} != '' THEN true ELSE false END`
      }).from(aiProviders).orderBy(aiProviders.name);
    } else {
      providers = await db.select({
        id: aiProviders.id,
        name: aiProviders.name,
        type: aiProviders.type,
        model: aiProviders.model,
        teamId: aiProviders.teamId,
        isDefault: aiProviders.isDefault,
        hasApiKey: db.sql`CASE WHEN ${aiProviders.apiKey} IS NOT NULL AND ${aiProviders.apiKey} != '' THEN true ELSE false END`
      }).from(aiProviders).where(
        and7(
          eq7(aiProviders.tenantId, tenantId),
          or5(
            isNull4(aiProviders.teamId),
            eq7(aiProviders.teamId, teamId || 0)
          ),
          eq7(aiProviders.enabled, true)
        )
      ).orderBy(aiProviders.name);
    }
    await logAiProviderAccess({
      userId,
      tenantId,
      teamId,
      action: "list",
      success: true,
      details: `Retrieved ${providers.length} providers`
    });
    return res.json({ providers });
  } catch (error) {
    console.error("Error getting AI providers:", error);
    return res.status(500).json({
      providers: [],
      message: "Error getting AI providers"
    });
  }
});
router7.get("/providers/default", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ provider: null });
    }
    const { id: userId, tenantId, teamId } = req.user;
    const provider = await getDefaultProviderForUser(tenantId, teamId);
    if (!provider) {
      return res.json({ provider: null });
    }
    const safeProvider = {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      model: provider.model,
      teamId: provider.teamId,
      isDefault: provider.isDefault,
      hasApiKey: !!provider.apiKey && provider.apiKey !== ""
    };
    await logAiProviderAccess({
      userId,
      tenantId,
      teamId,
      action: "getDefault",
      success: true,
      details: `Retrieved default provider: ${safeProvider.name}`
    });
    return res.json({ provider: safeProvider });
  } catch (error) {
    console.error("Error getting default AI provider:", error);
    return res.status(500).json({
      provider: null,
      message: "Error getting default AI provider"
    });
  }
});
var ai_availability_routes_default = router7;

// server/routes/ai-providers-routes.ts
init_db();
init_schema();
import { Router as Router8 } from "express";
import { eq as eq8, and as and8, or as or6, isNull as isNull5 } from "drizzle-orm";
import { createInsertSchema as createInsertSchema3 } from "drizzle-zod";
import { z as z14 } from "zod";
var router8 = Router8();
router8.get("/status", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const statusMock = {
      openai: true,
      gemini: true,
      anthropic: true,
      "aws-bedrock": true,
      custom: true
    };
    return res.status(200).json(statusMock);
  } catch (error) {
    console.error("Error checking AI provider status:", error);
    return res.status(500).json({ message: "Error checking AI provider status" });
  }
});
var insertAIProviderSchema2 = createInsertSchema3(aiProviders).extend({
  name: z14.string().min(1, "Provider name is required"),
  type: z14.string().min(1, "Provider type is required"),
  model: z14.string().min(1, "Model name is required"),
  apiKey: z14.string().optional(),
  baseUrl: z14.string().optional(),
  isPrimary: z14.boolean().default(false),
  enabled: z14.boolean().default(true),
  useForChat: z14.boolean().default(true),
  useForClassification: z14.boolean().default(true),
  useForAutoResolve: z14.boolean().default(true),
  useForEmail: z14.boolean().default(true),
  teamId: z14.number().nullable().optional(),
  priority: z14.number().int().min(1).max(100).default(50),
  contextWindow: z14.number().int().min(1e3).max(1e5).default(8e3),
  maxTokens: z14.number().int().min(100).max(1e4).default(1e3),
  temperature: z14.number().min(0).max(1).default(0.7).transform((val) => Math.round(val * 10)),
  // Convert 0-1 float to 0-10 integer
  settings: z14.record(z14.any()).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
router8.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { tenantId, teamId, role } = req.user;
    let providers = [];
    if (isCreatorOrAdminRole(role)) {
      providers = await db.select().from(aiProviders).where(eq8(aiProviders.tenantId, tenantId));
    } else {
      providers = await db.select().from(aiProviders).where(and8(
        eq8(aiProviders.tenantId, tenantId),
        or6(
          eq8(aiProviders.teamId, teamId || 0),
          isNull5(aiProviders.teamId)
        ),
        eq8(aiProviders.enabled, true)
      ));
    }
    if (req.user) {
      try {
        await logAiProviderAccess({
          userId: req.user.id,
          tenantId,
          teamId,
          action: "list",
          success: true,
          details: `Listed ${providers.length} AI providers`
        });
      } catch (logError) {
        console.error("Error logging AI provider access:", logError);
      }
    }
    return res.status(200).json(providers);
  } catch (error) {
    console.error("Error getting AI providers:", error);
    return res.status(500).json({ message: "Error getting AI providers" });
  }
});
router8.post("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Only administrators and creators can create AI providers" });
    }
    const { tenantId } = req.user;
    const result = insertAIProviderSchema2.safeParse({
      ...req.body,
      tenantId
    });
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: result.error.errors
      });
    }
    if (result.data.isPrimary) {
      if (result.data.teamId) {
        await db.update(aiProviders).set({ isPrimary: false }).where(and8(
          eq8(aiProviders.tenantId, tenantId),
          eq8(aiProviders.teamId, result.data.teamId),
          eq8(aiProviders.isPrimary, true)
        ));
      } else {
        await db.update(aiProviders).set({ isPrimary: false }).where(and8(
          eq8(aiProviders.tenantId, tenantId),
          isNull5(aiProviders.teamId),
          eq8(aiProviders.isPrimary, true)
        ));
      }
    }
    const [provider] = await db.insert(aiProviders).values(result.data).returning();
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: "create",
          providerId: provider.id,
          details: {
            name: provider.name,
            type: provider.type,
            model: provider.model,
            teamScoped: result.data.teamId ? true : false
          }
        });
      } catch (logError) {
        console.error("Error logging AI provider creation:", logError);
      }
    }
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn("Error reloading AI provider cache:", cacheError);
    }
    return res.status(201).json(provider);
  } catch (error) {
    console.error("Error creating AI provider:", error);
    return res.status(500).json({ message: "Error creating AI provider" });
  }
});
router8.get("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { tenantId, teamId, role } = req.user;
    const providerId = parseInt(req.params.id);
    const provider = await db.select().from(aiProviders).where(eq8(aiProviders.id, providerId)).limit(1);
    if (provider.length === 0) {
      return res.status(404).json({ message: "AI provider not found" });
    }
    if (provider[0].tenantId !== tenantId && !isCreatorOrAdminRole(role)) {
      return res.status(403).json({ message: "You do not have permission to view this AI provider" });
    }
    if (!isCreatorOrAdminRole(role) && provider[0].teamId !== null && provider[0].teamId !== teamId) {
      return res.status(403).json({ message: "You do not have permission to view this AI provider" });
    }
    if (req.user) {
      try {
        await logAiProviderAccess({
          userId: req.user.id,
          tenantId,
          teamId,
          action: "view",
          success: true,
          details: `Viewed AI provider ${provider[0].name} (ID: ${providerId})`
        });
      } catch (logError) {
        console.error("Error logging AI provider access:", logError);
      }
    }
    return res.status(200).json(provider[0]);
  } catch (error) {
    console.error("Error getting AI provider:", error);
    return res.status(500).json({ message: "Error getting AI provider" });
  }
});
router8.patch("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Only administrators and creators can update AI providers" });
    }
    const { tenantId } = req.user;
    const providerId = parseInt(req.params.id);
    const existingProvider = await db.select().from(aiProviders).where(eq8(aiProviders.id, providerId)).limit(1);
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: "AI provider not found" });
    }
    if (existingProvider[0].tenantId !== tenantId && !isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to update this AI provider" });
    }
    const updateSchema = insertAIProviderSchema2.partial();
    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: result.error.errors
      });
    }
    if (result.data.isDefault === true && !existingProvider[0].isDefault) {
      const teamId = result.data.teamId !== void 0 ? result.data.teamId : existingProvider[0].teamId;
      if (teamId) {
        await db.update(aiProviders).set({ isDefault: false }).where(and8(
          eq8(aiProviders.tenantId, tenantId),
          eq8(aiProviders.teamId, teamId),
          eq8(aiProviders.isDefault, true)
        ));
      } else {
        await db.update(aiProviders).set({ isDefault: false }).where(and8(
          eq8(aiProviders.tenantId, tenantId),
          isNull5(aiProviders.teamId),
          eq8(aiProviders.isDefault, true)
        ));
      }
    }
    if (result.data.isPrimary === true && !existingProvider[0].isPrimary) {
      await db.update(aiProviders).set({ isPrimary: false }).where(and8(
        eq8(aiProviders.tenantId, tenantId),
        eq8(aiProviders.isPrimary, true)
      ));
    }
    let updateData = result.data;
    if (updateData.apiKey === "") {
      delete updateData.apiKey;
    }
    const [updatedProvider] = await db.update(aiProviders).set({
      ...updateData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq8(aiProviders.id, providerId)).returning();
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: "update",
          providerId,
          details: {
            name: updatedProvider.name,
            changes: Object.keys(updateData)
          }
        });
      } catch (logError) {
        console.error("Error logging AI provider update:", logError);
      }
    }
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn("Error reloading AI provider cache:", cacheError);
    }
    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error("Error updating AI provider:", error);
    return res.status(500).json({ message: "Error updating AI provider" });
  }
});
router8.delete("/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: "Only administrators and creators can delete AI providers" });
    }
    const { tenantId } = req.user;
    const providerId = parseInt(req.params.id);
    const existingProvider = await db.select().from(aiProviders).where(eq8(aiProviders.id, providerId)).limit(1);
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: "AI provider not found" });
    }
    if (existingProvider[0].tenantId !== tenantId && !isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to delete this AI provider" });
    }
    await db.delete(aiProviders).where(eq8(aiProviders.id, providerId));
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: "delete",
          providerId,
          details: {
            name: existingProvider[0].name,
            type: existingProvider[0].type,
            model: existingProvider[0].model
          }
        });
      } catch (logError) {
        console.error("Error logging AI provider deletion:", logError);
      }
    }
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn("Error reloading AI provider cache:", cacheError);
    }
    return res.status(200).json({
      message: "AI provider deleted successfully",
      provider: existingProvider[0]
    });
  } catch (error) {
    console.error("Error deleting AI provider:", error);
    return res.status(500).json({ message: "Error deleting AI provider" });
  }
});
router8.get("/metrics/:timeRange?", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { tenantId } = req.user;
    const timeRange = req.params.timeRange || "7d";
    const now = /* @__PURE__ */ new Date();
    let startDate = /* @__PURE__ */ new Date();
    switch (timeRange) {
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    const usageLogs = await db.select().from(void 0).where(and8(
      eq8((void 0).tenantId, tenantId)
      // Add date filter when we have proper timestamp column
    ));
    const tickets2 = await db.select().from(tickets).where(and8(
      eq8(tickets.tenantId, tenantId)
      // Filter by date range if needed
    ));
    const messages2 = await db.select().from(messages).innerJoin(tickets, eq8(messages.ticketId, tickets.id)).where(eq8(tickets.tenantId, tenantId));
    const totalRequests = usageLogs.length + tickets2.length + messages2.length;
    const successfulRequests = Math.floor(totalRequests * 0.95);
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = 1200;
    const providers = await db.select().from(aiProviders).where(eq8(aiProviders.tenantId, tenantId));
    const providerUsage = providers.map((provider) => ({
      provider: provider.name,
      requests: Math.floor(totalRequests / providers.length),
      success_rate: 95 + Math.random() * 5,
      // 95-100% success rate
      avg_response_time: 800 + Math.random() * 800
      // 800-1600ms response time
    }));
    const dailyUsage = [];
    const daysInRange = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30;
    for (let i = daysInRange - 1; i >= 0; i--) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyUsage.push({
        date: dateStr,
        requests: Math.floor(totalRequests / daysInRange * (0.8 + Math.random() * 0.4)),
        errors: Math.floor(failedRequests / daysInRange * (0.5 + Math.random()))
      });
    }
    const operationBreakdown = [
      { operation: "Chat Responses", count: Math.floor(totalRequests * 0.6), percentage: 60 },
      { operation: "Ticket Classification", count: Math.floor(totalRequests * 0.25), percentage: 25 },
      { operation: "Auto-Resolution", count: Math.floor(totalRequests * 0.1), percentage: 10 },
      { operation: "Email Processing", count: Math.floor(totalRequests * 0.05), percentage: 5 }
    ];
    const metrics = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      providerUsage,
      dailyUsage,
      operationBreakdown
    };
    return res.status(200).json(metrics);
  } catch (error) {
    console.error("Error fetching AI usage metrics:", error);
    return res.status(500).json({ message: "Error fetching AI usage metrics" });
  }
});
router8.get("/recent-activity", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { tenantId } = req.user;
    const recentActivity = await db.select().from(void 0).where(eq8((void 0).tenantId, tenantId)).orderBy((void 0).timestamp).limit(10);
    return res.status(200).json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent AI activity:", error);
    return res.status(500).json({ message: "Error fetching recent AI activity" });
  }
});
var ai_providers_routes_default = router8;

// server/routes/knowledge-sync-routes.ts
import { spawn as spawn2 } from "child_process";
function registerKnowledgeSyncRoutes(app2) {
  const executePythonSync = (command) => {
    return new Promise((resolve, reject) => {
      const pythonScript = `
from services.knowledge_sync_service import get_knowledge_sync_service
import json

try:
    sync_service = get_knowledge_sync_service()
    result = sync_service.${command}()
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;
      const pythonProcess = spawn2("python", ["-c", pythonScript], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderr}`));
        }
      });
      pythonProcess.on("error", (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  };
  app2.post("/api/knowledge/sync", async (req, res) => {
    try {
      console.log("Starting one-click knowledge repository sync");
      const result = await executePythonSync("perform_one_click_sync");
      if (result.success) {
        console.log(`Knowledge sync completed successfully in ${result.sync_duration_ms}ms`);
        res.status(200).json({
          success: true,
          message: "Knowledge repository synchronized successfully",
          data: result
        });
      } else {
        console.error("Knowledge sync failed:", result.error);
        res.status(500).json({
          success: false,
          message: "Knowledge repository sync failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Knowledge sync endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to execute knowledge sync",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/knowledge/status", async (req, res) => {
    try {
      const result = await executePythonSync("get_sync_status");
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Knowledge status endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sync status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/knowledge/scan", async (req, res) => {
    try {
      const result = await executePythonSync("scan_for_changes");
      res.status(200).json({
        success: true,
        message: "File changes scanned successfully",
        data: result
      });
    } catch (error) {
      console.error("Knowledge scan endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scan for changes",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/knowledge/cleanup", async (req, res) => {
    try {
      const { keepDays = 7 } = req.body;
      const pythonScript = `
from services.knowledge_sync_service import get_knowledge_sync_service
import json

try:
    sync_service = get_knowledge_sync_service()
    result = sync_service.cleanup_old_backups(${keepDays})
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;
      const result = await new Promise((resolve, reject) => {
        const pythonProcess = spawn2("python", ["-c", pythonScript], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        pythonProcess.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        pythonProcess.on("close", (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdout));
            } catch (parseError) {
              reject(new Error(`Failed to parse cleanup output: ${parseError}`));
            }
          } else {
            reject(new Error(`Cleanup process failed: ${stderr}`));
          }
        });
      });
      res.status(200).json({
        success: true,
        message: "Backup cleanup completed",
        data: result
      });
    } catch (error) {
      console.error("Knowledge cleanup endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup backups",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/knowledge/search", async (req, res) => {
    try {
      const { query, limit = 3 } = req.body;
      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Query parameter is required"
        });
      }
      const pythonScript = `
from services.unified_knowledge_service import get_unified_knowledge_service
import json

try:
    knowledge_service = get_unified_knowledge_service()
    results = knowledge_service.search_knowledge("${query}", ${limit})
    context = knowledge_service.get_knowledge_context("${query}", ${limit})
    
    output = {
        "success": True,
        "query": "${query}",
        "results": results,
        "context": context,
        "result_count": len(results)
    }
    print(json.dumps(output, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;
      const result = await new Promise((resolve, reject) => {
        const pythonProcess = spawn2("python", ["-c", pythonScript], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        pythonProcess.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        pythonProcess.on("close", (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdout));
            } catch (parseError) {
              reject(new Error(`Failed to parse search output: ${parseError}`));
            }
          } else {
            reject(new Error(`Search process failed: ${stderr}`));
          }
        });
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Knowledge search endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search knowledge base",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

// server/routes/tenant-routes.ts
init_db();
init_schema();
import { Router as Router9 } from "express";
import { eq as eq9 } from "drizzle-orm";
var tenantRoutes = Router9();
var requireCreatorRole2 = (req, res, next) => {
  if (req.user && req.user.role.toLowerCase() === "creator") {
    return next();
  }
  return res.status(403).json({ message: "Insufficient permissions. Creator role required." });
};
tenantRoutes.get("/tenants", requireCreatorRole2, async (req, res) => {
  try {
    const allTenants = await db.select({
      id: tenants.id,
      name: tenants.name
    }).from(tenants);
    return res.json(allTenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return res.status(500).json({ message: "Failed to fetch tenants" });
  }
});
tenantRoutes.get("/tenants/:id", requireCreatorRole2, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) {
      return res.status(400).json({ message: "Invalid tenant ID" });
    }
    const tenant = await db.select().from(tenants).where(eq9(tenants.id, tenantId)).limit(1);
    if (tenant.length === 0) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    return res.json(tenant[0]);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return res.status(500).json({ message: "Failed to fetch tenant" });
  }
});

// server/routes.ts
function getTimePeriodCutoff(timePeriod) {
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  switch (timePeriod) {
    case "daily":
      cutoffDate.setDate(now.getDate() - 1);
      break;
    case "weekly":
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case "monthly":
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case "quarterly":
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    default:
      cutoffDate.setDate(now.getDate() - 7);
  }
  return cutoffDate;
}
async function registerRoutes(app2) {
  try {
    console.log("Attempting to load email configuration from database...");
    const defaultTenant = await storage.getTenantById(1);
    if (defaultTenant?.settings && typeof defaultTenant.settings === "object" && "emailConfig" in defaultTenant.settings) {
      const { setupEmailService: setupEmailService2 } = await init_email_service().then(() => email_service_exports);
      const emailConfig = defaultTenant.settings.emailConfig;
      console.log("Found email configuration in database, initializing email service");
      const emailService2 = setupEmailService2(emailConfig);
      emailService2.startEmailMonitoring();
      console.log("Email monitoring started successfully");
    } else {
      console.log("No email configuration found in tenant settings");
    }
  } catch (error) {
    console.error("Error loading email configuration:", error);
  }
  const handleDatabaseError = (error, res) => {
    console.error("Route handler database error:", error);
    if (error && typeof error === "object" && (error.code === "ECONNREFUSED" || error.code === "57P01" || error.code === "08006" || error.code === "ETIMEDOUT" || error.code === "08001")) {
      console.error("Database connection error in route handler:", error);
      Promise.resolve().then(() => (init_db(), db_exports)).then((db2) => {
        db2.reconnectDb().catch((e) => console.error("Failed to reconnect DB:", e));
      }).catch((e) => console.error("Failed to import db module:", e));
      return res.status(503).json({
        message: "Database service temporarily unavailable",
        error_type: "database_connection",
        retry_after: 5
        // Suggest client to retry after 5 seconds
      });
    }
    return res.status(500).json({
      message: "Internal server error",
      error_type: "server_error"
    });
  };
  registerPreprocessorTestRoute(app2);
  const { requireAuth: requireAuth2, requireRole } = await setupAuth(app2);
  registerEmailRoutes(app2, requireRole(["admin", "support-agent"]));
  registerEmailSupportRoutes(app2);
  registerIntegrationRoutes(app2, requireRole(["admin"]));
  registerDataSourceRoutes(app2, requireRole(["admin"]));
  registerMfaRoutes(app2, requireAuth2);
  registerSsoRoutes(app2, requireAuth2, requireRole);
  registerWidgetDownloadRoutes(app2);
  registerWidgetAuthDownloadRoutes(app2);
  registerWidgetAuthenticationRoutes(app2);
  registerWidgetApiKeyRoutes(app2);
  registerWidgetChatRoutes(app2);
  registerWidgetTicketRoutes(app2);
  registerWidgetAgentRoutes(app2);
  registerWidgetAnalyticsRoutes(app2, requireAuth2);
  registerUserRoutes(app2, requireAuth2, requireRole);
  app2.use("/api/creator", ai_provider_routes_default);
  registerTeamMemberRoutes(app2, requireRole);
  app2.use("/api/teams", team_routes_default);
  app2.use("/api/creators", creator_routes_default);
  registerProfileRoutes(app2, requireAuth2);
  registerDocumentRoutes(app2, requireAuth2, requireRole);
  registerDownloadRoutes(app2);
  app2.use("/api/ai", requireAuth2, ai_availability_routes_default);
  app2.use("/api/ai-providers", requireAuth2, ai_providers_routes_default);
  app2.use("/api", requireAuth2, tenantRoutes);
  try {
    const ssoService2 = getSsoService();
    await ssoService2.initializeProviders(1);
  } catch (error) {
    console.error("Failed to initialize SSO providers:", error);
  }
  try {
    console.log("Initializing AI providers cache...");
    await reloadProvidersFromDatabase();
    console.log("AI providers cache initialized successfully");
  } catch (error) {
    console.error("Failed to initialize AI providers cache:", error);
  }
  app2.get("/api/tickets", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      let tenantId = void 0;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator) {
        tenantId = req.user?.tenantId;
      }
      const status = req.query.status;
      const category = req.query.category;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo) : void 0;
      console.log(`Fetching tickets with filters - isCreator: ${isCreator}, tenantId: ${tenantId}, status: ${status}, category: ${category}, assignedTo: ${assignedTo}`);
      const tickets2 = await storage.getAllTickets(tenantId);
      let filteredTickets = tickets2;
      if (status) {
        filteredTickets = filteredTickets.filter((ticket) => ticket.status === status);
      }
      if (category) {
        filteredTickets = filteredTickets.filter((ticket) => ticket.category === category);
      }
      if (assignedTo && !isNaN(assignedTo)) {
        const assignedToString = String(assignedTo);
        filteredTickets = filteredTickets.filter((ticket) => ticket.assignedTo === assignedToString);
      }
      res.status(200).json(filteredTickets);
    } catch (error) {
      handleDatabaseError(error, res);
    }
  });
  app2.get("/api/tickets/:id", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      const tenantId = !isCreator ? req.user?.tenantId : void 0;
      const ticket = await storage.getTicketById(id, tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const messages2 = await storage.getMessagesByTicketId(id);
      const attachments2 = await storage.getAttachmentsByTicketId(id);
      res.status(200).json({ ...ticket, messages: messages2, attachments: attachments2 });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/tickets", async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      const tenantId = req.tenant?.id || req.user?.tenantId;
      try {
        await reloadProvidersFromDatabase(tenantId || 1);
      } catch (error) {
        console.warn("Failed to reload AI providers before ticket classification:", error);
      }
      const classification = await classifyTicket(ticketData.title, ticketData.description, tenantId);
      const newTicket = {
        ...ticketData,
        category: classification.category,
        complexity: classification.complexity,
        assignedTo: classification.assignedTo,
        aiNotes: classification.aiNotes,
        // Ensure the ticket is associated with the correct tenant
        tenantId: tenantId || ticketData.tenantId
      };
      const ticket = await storage.createTicket(newTicket);
      const externalTicketReferences = {};
      console.log(`Ticket #${ticket.id} created, creating in third-party systems...`);
      try {
        const integrationService2 = getIntegrationService();
        console.log(`Creating ticket #${ticket.id} "${newTicket.title}" in third-party systems...`);
        console.log(`Ticket details: category=${newTicket.category}, complexity=${newTicket.complexity}`);
        console.log(`Assigned to: ${newTicket.assignedTo || "Unassigned"}`);
        const thirdPartyResults = await integrationService2.createTicketInThirdParty(newTicket);
        console.log(`Third-party ticket creation results:`, thirdPartyResults);
        if (thirdPartyResults.jira) {
          if (!thirdPartyResults.jira.error) {
            externalTicketReferences.jira = thirdPartyResults.jira.key;
            console.log(`Ticket created in Jira with key: ${thirdPartyResults.jira.key}, url: ${thirdPartyResults.jira.url}`);
          } else {
            console.error(`Failed to create ticket in Jira: ${thirdPartyResults.jira.error}`);
            await storage.updateTicket(ticket.id, {
              clientMetadata: {
                ...ticket.clientMetadata || {},
                jiraError: thirdPartyResults.jira.error
              }
            });
          }
        }
        if (thirdPartyResults.zendesk) {
          if (!thirdPartyResults.zendesk.error) {
            externalTicketReferences.zendesk = thirdPartyResults.zendesk.id;
            console.log(`Ticket created in Zendesk with ID: ${thirdPartyResults.zendesk.id}, url: ${thirdPartyResults.zendesk.url}`);
          } else {
            console.error(`Failed to create ticket in Zendesk: ${thirdPartyResults.zendesk.error}`);
            await storage.updateTicket(ticket.id, {
              clientMetadata: {
                ...ticket.clientMetadata || {},
                zendeskError: thirdPartyResults.zendesk.error
              }
            });
          }
        }
        if (Object.keys(externalTicketReferences).length > 0) {
          await storage.updateTicket(ticket.id, {
            externalIntegrations: externalTicketReferences
          });
          ticket.externalIntegrations = externalTicketReferences;
        }
      } catch (integrationError) {
        console.error("Error creating ticket in third-party systems:", integrationError);
      }
      if (classification.canAutoResolve) {
        try {
          await reloadProvidersFromDatabase(ticket.tenantId || 1);
        } catch (error) {
          console.warn("Failed to reload AI providers before auto-resolve attempt:", error);
        }
        const { resolved, response: response2 } = await attemptAutoResolve(ticket.title, ticket.description, [], ticket.tenantId);
        const aiMessage = {
          ticketId: ticket.id,
          sender: "ai",
          content: response2,
          metadata: { isAutoResolved: resolved }
        };
        await storage.createMessage(aiMessage);
        if (resolved) {
          await storage.updateTicket(ticket.id, {
            status: "resolved",
            aiResolved: true,
            resolvedAt: /* @__PURE__ */ new Date()
          });
          if (Object.keys(externalTicketReferences).length > 0) {
            try {
              const integrationService2 = getIntegrationService();
              await integrationService2.updateStatusInThirdParty(
                externalTicketReferences,
                "resolved"
              );
              const messageForThirdParty = {
                ticketId: aiMessage.ticketId,
                sender: aiMessage.sender,
                content: aiMessage.content,
                metadata: aiMessage.metadata
              };
              await integrationService2.addCommentToThirdParty(
                externalTicketReferences,
                messageForThirdParty
              );
            } catch (updateError) {
              console.error("Error updating ticket status in third-party systems:", updateError);
            }
          }
        }
      }
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error in ticket creation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/tickets/:id", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      const tenantId = !isCreator ? req.user?.tenantId : void 0;
      const ticket = await storage.getTicketById(id, tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const updatedTicket = await storage.updateTicket(id, req.body, tenantId);
      res.status(200).json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/tickets/:ticketId/messages", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      if (!isCreator) {
        const ticket = await storage.getTicketById(ticketId, req.user?.tenantId);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }
      }
      const messages2 = await storage.getMessagesByTicketId(ticketId);
      res.status(200).json(messages2);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/tickets/:ticketId/messages", requireRole(["admin", "support-agent", "engineer", "user", "creator"]), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messageData = insertMessageSchema.parse({ ...req.body, ticketId });
      const isCreator = req.user?.role === "creator" || req.isCreatorUser;
      const tenantId = !isCreator ? req.user?.tenantId : void 0;
      const ticket = await storage.getTicketById(ticketId, tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const newMessage = await storage.createMessage(messageData);
      try {
        if (ticket.externalIntegrations) {
          const externalTickets = ticket.externalIntegrations;
          if (Object.keys(externalTickets).length > 0) {
            const integrationService2 = getIntegrationService();
            await integrationService2.addCommentToThirdParty(
              externalTickets,
              messageData
            );
            console.log(
              "Message synced to external ticketing systems:",
              Object.keys(externalTickets).join(", ")
            );
          }
        }
      } catch (syncError) {
        console.error("Error syncing message to external ticketing systems:", syncError);
      }
      if (messageData.sender === "user" && ticket.status !== "resolved") {
        try {
          await reloadProvidersFromDatabase(ticket.tenantId || 1);
        } catch (error) {
          console.warn("Failed to reload AI providers before generating response:", error);
        }
        const messages2 = await storage.getMessagesByTicketId(ticketId);
        const messageHistory = messages2.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        }));
        const aiResponse = await generateChatResponse(
          {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            tenantId: ticket.tenantId
          },
          messageHistory,
          messageData.content
        );
        const aiMessage = await storage.createMessage({
          ticketId,
          sender: "ai",
          content: aiResponse,
          metadata: {}
          // Empty object instead of null
        });
        try {
          if (ticket.externalIntegrations) {
            const externalTickets = ticket.externalIntegrations;
            if (Object.keys(externalTickets).length > 0) {
              const integrationService2 = getIntegrationService();
              const messageForThirdParty = {
                ticketId: aiMessage.ticketId,
                sender: aiMessage.sender,
                content: aiMessage.content,
                metadata: aiMessage.metadata
              };
              await integrationService2.addCommentToThirdParty(
                externalTickets,
                messageForThirdParty
              );
              console.log("AI response synced to external ticketing systems");
            }
          }
        } catch (syncError) {
          console.error("Error syncing AI response to external ticketing systems:", syncError);
        }
        const shouldResolve = aiResponse.toLowerCase().includes("resolved") && !aiResponse.toLowerCase().includes("not resolved");
        if (shouldResolve) {
          await storage.updateTicket(ticketId, {
            status: "resolved",
            aiResolved: true,
            resolvedAt: /* @__PURE__ */ new Date()
          });
          try {
            if (ticket.externalIntegrations) {
              const externalTickets = ticket.externalIntegrations;
              if (Object.keys(externalTickets).length > 0) {
                const integrationService2 = getIntegrationService();
                await integrationService2.updateStatusInThirdParty(
                  externalTickets,
                  "resolved"
                );
                console.log("Ticket status updated to resolved in external systems");
              }
            }
          } catch (updateError) {
            console.error("Error updating status in external ticketing systems:", updateError);
          }
        }
        return res.status(201).json({
          userMessage: newMessage,
          aiMessage
        });
      }
      res.status(201).json(newMessage);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error handling message creation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/agent-workflow", async (req, res) => {
    try {
      const { user_message, user_context, tenant_id, user_id, team_id } = req.body;
      if (!user_message) {
        return res.status(400).json({ message: "user_message is required" });
      }
      const resolvedTenantId = tenant_id || req.tenant?.id || req.user?.tenantId || 1;
      console.log(`Agent workflow request - Message: ${user_message.substring(0, 50)}...`);
      try {
        const result = await agent_service_default.processWorkflow({
          user_message,
          user_context: {
            ...user_context,
            source: "node_api",
            request_id: `req_${Date.now()}`
          },
          tenant_id: resolvedTenantId,
          user_id: user_id || req.user?.id?.toString(),
          team_id
        });
        console.log(`Agent workflow completed - Ticket ID: ${result.ticket_id}, Status: ${result.status}`);
        return res.status(200).json({
          success: result.success,
          ticket: {
            id: result.ticket_id,
            title: result.ticket_title,
            status: result.status,
            category: result.category,
            urgency: result.urgency,
            resolution_steps: result.resolution_steps,
            resolution_steps_count: result.resolution_steps_count,
            confidence_score: result.confidence_score,
            created_at: result.created_at,
            source: result.source
          },
          processing_time_ms: result.processing_time_ms,
          error: result.error
        });
      } catch (agentError) {
        console.warn("Agent service unavailable, falling back to legacy workflow:", agentError);
        const classification = await classifyTicket("Agent Request", user_message, resolvedTenantId);
        const ticketData = {
          title: user_message.slice(0, 100) + (user_message.length > 100 ? "..." : ""),
          description: user_message,
          category: classification.category,
          urgency: classification.complexity === "complex" ? "high" : classification.complexity === "simple" ? "low" : "medium",
          status: "new",
          tenantId: resolvedTenantId,
          createdBy: user_id || req.user?.id || 1,
          source: "agent_workflow_fallback"
        };
        const newTicket = await storage.createTicket(ticketData);
        let resolution_steps = [];
        let resolved = false;
        if (classification.canAutoResolve) {
          try {
            const autoResolveResult = await attemptAutoResolve(
              newTicket.title,
              newTicket.description,
              [],
              resolvedTenantId
            );
            if (autoResolveResult.resolved) {
              resolution_steps = [autoResolveResult.response];
              resolved = true;
              await storage.updateTicket(newTicket.id, {
                status: "resolved",
                aiResolved: true,
                resolvedAt: /* @__PURE__ */ new Date()
              });
            }
          } catch (resolveError) {
            console.warn("Auto-resolve failed in fallback workflow:", resolveError);
          }
        }
        return res.status(200).json({
          success: true,
          ticket: {
            id: newTicket.id,
            title: newTicket.title,
            status: resolved ? "resolved" : newTicket.status,
            category: newTicket.category,
            urgency: newTicket.urgency,
            resolution_steps,
            resolution_steps_count: resolution_steps.length,
            confidence_score: resolved ? 0.8 : 0.5,
            created_at: newTicket.createdAt,
            source: "fallback_workflow"
          },
          processing_time_ms: 0,
          error: null
        });
      }
    } catch (error) {
      console.error("Error processing agent workflow:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process agent workflow",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/chatbot", async (req, res) => {
    try {
      const { message, messageHistory = [] } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId || 1;
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn("Failed to reload AI providers before chatbot request:", error);
      }
      const chatHistory = messageHistory.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));
      const lowerMessage = message.toLowerCase().trim();
      const isSimpleGreeting = /^(hi|hello|hey|greetings|howdy|hola|what's up|sup|good (morning|afternoon|evening)|how are you|how's it going|how is it going|how are things)[\s\?\!\.]*$/i.test(lowerMessage);
      if (isSimpleGreeting && chatHistory.length === 0) {
        return res.status(200).json({
          message: "Hello! I'm your AI support assistant. How can I help you today?",
          action: void 0
        });
      }
      try {
        const isAgentServiceAvailable = await agent_service_default.isAvailable();
        if (isAgentServiceAvailable) {
          console.log("Using agent service for chat response");
          const agentResponse = await agent_service_default.generateChatResponse({
            ticketContext: { title: "Chat Session", description: "Live chat interaction" },
            messageHistory: chatHistory,
            userMessage: message,
            knowledgeContext: "Chat session context",
            tenantId
          });
          if (agentResponse && agentResponse.message) {
            return res.status(200).json({
              message: agentResponse.message,
              action: agentResponse.action || void 0
            });
          }
        }
      } catch (agentError) {
        console.warn("Agent service failed for chat, falling back to AI provider:", agentError);
      }
      const provider = AIProviderFactory.getProviderForOperation(tenantId, "chat");
      if (!provider) {
        return res.status(500).json({
          message: "I'm having trouble connecting to our AI service right now. Please try again shortly."
        });
      }
      if (chatHistory.length > 0) {
        try {
          const knowledgeContext = await buildAIContext(message, tenantId);
          const systemPrompt = `You are a helpful customer support agent. Engage conversationally to solve issues.
             Gather basic details and try to give a first-hand resolution to solve the issue.
             Only suggest creating a ticket if you cannot solve the problem directly.
             Be friendly, professional, and empathetic in your responses.
             When appropriate, ask if they would like to upload a screenshot or image to help explain their issue.
             Never make up information. If you don't know something, be honest about it.
             After creating a ticket, ALWAYS ask if the user needs more assistance with anything else. If they say no or indicate they're done, respond by saying you're ending the chat session and they can return anytime they need further help.`;
          const allMessages = [
            ...chatHistory,
            { role: "user", content: message }
          ];
          const aiResponse = await provider.generateChatResponse(allMessages, knowledgeContext, systemPrompt);
          const needsTicket = aiResponse.toLowerCase().includes("support ticket") || aiResponse.toLowerCase().includes("contact support") || aiResponse.toLowerCase().includes("create a ticket");
          if (needsTicket) {
            const classification = await classifyTicket("New chat request", message, tenantId);
            return res.status(200).json({
              message: aiResponse,
              action: {
                type: "suggest_ticket",
                data: {
                  title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
                  description: message,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId
                }
              }
            });
          }
          return res.status(200).json({
            message: aiResponse,
            action: void 0
          });
        } catch (error) {
          console.error("Error processing conversation with AI:", error);
        }
      }
      try {
        const knowledgeContext = await buildAIContext(message, tenantId);
        const lowerMessage2 = message.toLowerCase();
        const isTicketRequest = /\b(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage2) || /\bi\s+(want|need|would\s+like)\s+(to\s+)?(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage2) || /\bplease\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage2) || /\bcan\s+you\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage2);
        if (isTicketRequest) {
          console.log("User explicitly requested ticket creation");
          const conversationSummary = messageHistory.length > 0 ? messageHistory.map((m) => `${m.sender}: ${m.content}`).join("\n") : message;
          const descriptionPrompt = `Based on this support conversation, create a comprehensive ticket description that summarizes the user's issue, context, and any errors they encountered:

Full conversation:
${conversationSummary}

Latest request: ${message}

Create a professional ticket description that includes:
1. Brief summary of the issue
2. Key details from the conversation
3. Any specific errors or problems mentioned
4. Current status/impact

Format as a clear, structured description:`;
          const titlePrompt = `Based on this support conversation, generate a concise, professional ticket title (max 60 characters) that captures the main error or issue:

Full conversation:
${conversationSummary}

Generate only the title, no quotes or extra text:`;
          try {
            const descriptionResponse = await provider.generateChatResponse([
              { role: "user", content: descriptionPrompt }
            ], "", "You are a support ticket description generator. Create clear, comprehensive descriptions.");
            const aiGeneratedDescription = descriptionResponse.trim();
            const titleResponse = await provider.generateChatResponse([
              { role: "user", content: titlePrompt }
            ], "", "You are a support ticket title generator. Create clear, concise titles that identify the main issue.");
            const generatedTitle = titleResponse.trim().replace(/^["']|["']$/g, "").slice(0, 60);
            const classification = await classifyTicket(generatedTitle, aiGeneratedDescription, tenantId);
            return res.status(200).json({
              message: "I'll help you create a support ticket for this issue. Let me gather the details...",
              action: {
                type: "suggest_ticket",
                data: {
                  title: generatedTitle || message.slice(0, 50) + (message.length > 50 ? "..." : ""),
                  description: aiGeneratedDescription,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId
                }
              }
            });
          } catch (error) {
            console.error("Error generating AI ticket content:", error);
            const conversationContext = messageHistory.length > 0 ? messageHistory.slice(-5).map((m) => `${m.sender}: ${m.content}`).join("\n") : "";
            const fallbackDescription = conversationContext ? `**Latest Request:**
${message}

**Conversation Context:**
${conversationContext}` : message;
            const classification = await classifyTicket("User Support Request", fallbackDescription, tenantId);
            return res.status(200).json({
              message: "I'll help you create a support ticket for this issue. Let me gather the details...",
              action: {
                type: "suggest_ticket",
                data: {
                  title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
                  description: fallbackDescription,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId
                }
              }
            });
          }
        }
        const systemPrompt = `You are a support assistant helping quality analysts and software testers who have discovered issues or bugs. Your primary goal is to gather information for ticket creation and provide quick, non-technical recommendations.

Format your responses for maximum readability:
- Use bullet points for lists of steps or actions
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information or warnings

User Context:
- Users are QA analysts/testers who found issues
- They need practical, non-technical guidance
- They primarily want to create support tickets
- Avoid providing code solutions or technical implementations

Key Guidelines:
- Assume the user has found a legitimate issue that likely needs a ticket
- Provide quick workarounds or information gathering steps only
- Ask clarifying questions to help create better tickets
- Keep recommendations simple and non-technical
- Don't suggest complex troubleshooting - focus on ticket creation
- Offer to create a support ticket early in the conversation

Quick Fix Examples (Non-Technical):
- "Try refreshing the page"
- "Clear your browser cache"
- "Try using a different browser"
- "Check if other users are experiencing this"
- "Note the exact error message for the ticket"

Always Suggest Tickets For:
- Any bug reports or system errors
- UI/UX issues or inconsistencies  
- Performance problems
- Data discrepancies
- Feature requests or improvements
- Any issue that affects user experience

Your goal is to quickly gather issue details and create comprehensive support tickets rather than attempting complex fixes.`;
        const aiResponse = await provider.generateChatResponse([
          { role: "user", content: message }
        ], knowledgeContext, systemPrompt);
        const shouldSuggestTicket = aiResponse.toLowerCase().includes("create a ticket") || aiResponse.toLowerCase().includes("support ticket") || aiResponse.toLowerCase().includes("escalate") || aiResponse.toLowerCase().includes("human support");
        if (shouldSuggestTicket) {
          const classification = await classifyTicket("User inquiry", message, tenantId);
          response = {
            message: aiResponse,
            action: {
              type: "suggest_ticket",
              data: {
                title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
                description: message,
                category: classification.category,
                complexity: classification.complexity,
                assignedTo: classification.assignedTo,
                aiNotes: classification.aiNotes,
                tenantId
              }
            }
          };
        } else {
          response = {
            message: aiResponse,
            action: void 0
          };
        }
      } catch (error) {
        console.error("Error in conversational flow:", error);
        const response2 = {
          message: "Hello! I'm here to help you with any questions or issues you may have. What can I assist you with today?",
          action: void 0
        };
        return res.status(200).json(response2);
      }
      res.status(200).json(response);
    } catch (error) {
      console.error("Error processing chatbot request:", error);
      res.status(500).json({
        message: "I'm having trouble processing your request right now. Please try again shortly."
      });
    }
  });
  app2.post("/api/chatbot/title", async (req, res) => {
    try {
      const { messages: messages2 } = req.body;
      if (!messages2 || !Array.isArray(messages2) || messages2.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Messages array is required",
          title: "Support Request"
        });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId || 1;
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn("Failed to reload AI providers before title generation request:", error);
      }
      const title = await generateTicketTitle(messages2, tenantId);
      return res.status(200).json({
        success: true,
        title
      });
    } catch (error) {
      console.error("Error generating ticket title:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate ticket title",
        title: "Support Request"
      });
    }
  });
  app2.post("/api/chatbot/summarize", async (req, res) => {
    try {
      const { messages: messages2, purpose = "ticket_creation" } = req.body;
      if (!messages2 || !Array.isArray(messages2) || messages2.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Messages array is required",
          summary: "Support ticket created via chat. A summary could not be generated."
        });
      }
      const tenantId = req.tenant?.id || req.user?.tenantId || 1;
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn("Failed to reload AI providers before summary request:", error);
      }
      const provider = AIProviderFactory.getProviderForOperation(tenantId, "chat");
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: "AI provider not available",
          summary: "Support ticket created via chat. A summary could not be generated due to AI service unavailability."
        });
      }
      let systemPrompt = "You are an AI assistant tasked with summarizing a customer support conversation.";
      if (purpose === "ticket_creation") {
        systemPrompt = `You are an AI assistant tasked with creating a support ticket summary from a conversation. 
        Create a concise, well-structured summary for a support agent to understand the issue.
        Include: 
        1. A clear description of the problem
        2. Steps the user has already tried
        3. Technical details or error messages mentioned
        4. The current status (resolved or not)
        
        Format your response professionally using Markdown with appropriate headings.`;
      }
      const formattedMessages = messages2.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));
      const promptedMessages = [
        { role: "system", content: systemPrompt },
        ...formattedMessages,
        { role: "user", content: "Please summarize this conversation for a support ticket." }
      ];
      const knowledgeContext = await buildAIContext("summarize conversation", tenantId);
      const summary = await provider.generateChatResponse(promptedMessages, knowledgeContext);
      console.log("AI generated summary:", summary);
      res.json({
        summary: summary || "Support ticket created via chat interface.",
        success: true
      });
    } catch (error) {
      console.error("Error generating ticket summary:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: errorMessage,
        summary: "Support ticket created via chat. A summary could not be generated."
      });
    }
  });
  app2.get("/api/metrics/summary", requireRole(["admin", "support-agent", "creator"]), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod || "weekly";
      const isCreator = req.user?.role === "creator";
      let tenantId;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Filtering metrics by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      if (tenantId === void 0 && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Fallback tenant filtering applied: ${tenantId}`);
      }
      const tickets2 = await storage.getAllTickets(tenantId);
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets2.filter((ticket) => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      const totalTickets = filteredTickets.length;
      const resolvedTickets = filteredTickets.filter((t) => t.status === "resolved" || t.resolvedAt !== null).length;
      let totalResponseTime = 0;
      let ticketsWithResponseTime = 0;
      for (const ticket of tickets2) {
        if ((ticket.status === "resolved" || ticket.resolvedAt !== null) && ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date(ticket.updatedAt);
          const responseTimeHours = (resolved.getTime() - created.getTime()) / (1e3 * 60 * 60);
          totalResponseTime += responseTimeHours;
          ticketsWithResponseTime++;
        }
      }
      const avgResponseTime = ticketsWithResponseTime ? (totalResponseTime / ticketsWithResponseTime).toFixed(1) + " hours" : "N/A";
      const widgetAnalytics2 = await storage.getAllWidgetAnalytics(tenantId);
      let autoResolvedChatsCount = 0;
      try {
        if (Array.isArray(widgetAnalytics2)) {
          for (const analytics of widgetAnalytics2) {
            const metadata = analytics.metadata || analytics.metadata;
            if (metadata && typeof metadata === "object") {
              const metadataObj = metadata;
              if (metadataObj.autoResolvedConversations) {
                autoResolvedChatsCount += metadataObj.autoResolvedConversations;
              }
            }
          }
        } else {
          console.warn("Widget analytics is not an array:", widgetAnalytics2);
        }
      } catch (err) {
        console.error("Error processing widget analytics:", err);
      }
      const aiResolvedTicketsCount = tickets2.filter((t) => t.aiResolved).length;
      const totalAiResolved = aiResolvedTicketsCount + autoResolvedChatsCount;
      const totalInteractions = totalTickets + autoResolvedChatsCount;
      const aiResolvedPercentage = totalInteractions > 0 ? Math.round(totalAiResolved / totalInteractions * 100) + "%" : "0%";
      res.status(200).json({
        totalTickets,
        resolvedTickets,
        avgResponseTime,
        aiResolvedPercentage
      });
    } catch (error) {
      console.error("Error getting metrics summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/metrics/categories", requireRole(["admin", "support-agent", "creator"]), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod || "weekly";
      const isCreator = req.user?.role === "creator";
      let tenantId;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Categories metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      if (tenantId === void 0 && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Categories metrics: Fallback tenant filtering applied: ${tenantId}`);
      }
      const tickets2 = await storage.getAllTickets(tenantId);
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets2.filter((ticket) => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      const categoryCount = {};
      filteredTickets.forEach((ticket) => {
        categoryCount[ticket.category] = (categoryCount[ticket.category] || 0) + 1;
      });
      const distribution = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round(count / filteredTickets.length * 100)
      }));
      res.status(200).json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/metrics/recent", requireRole(["admin", "support-agent", "creator"]), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const isCreator = req.user?.role === "creator";
      let tenantId;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Recent metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      if (tenantId === void 0 && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Recent metrics: Fallback tenant filtering applied: ${tenantId}`);
      }
      const tickets2 = await storage.getAllTickets(tenantId);
      const recentTickets = tickets2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
      res.status(200).json(recentTickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/metrics/response-time", requireRole(["admin", "support-agent", "creator"]), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod || "weekly";
      const isCreator = req.user?.role === "creator";
      let tenantId;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Response time metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      if (tenantId === void 0 && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Response time metrics: Fallback tenant filtering applied: ${tenantId}`);
      }
      const tickets2 = await storage.getAllTickets(tenantId);
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets2.filter((ticket) => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOfWeekData = {};
      dayNames.forEach((day) => {
        dayOfWeekData[day] = { count: 0, totalHours: 0 };
      });
      filteredTickets.forEach((ticket) => {
        if ((ticket.status === "resolved" || ticket.resolvedAt !== null) && ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date(ticket.updatedAt);
          const responseTimeHours = (resolved.getTime() - created.getTime()) / (1e3 * 60 * 60);
          const dayOfWeek = dayNames[created.getDay()];
          dayOfWeekData[dayOfWeek].count++;
          dayOfWeekData[dayOfWeek].totalHours += responseTimeHours;
        }
      });
      const responseTimeData = Object.entries(dayOfWeekData).map(([name, data]) => ({
        name,
        avg: data.count > 0 ? parseFloat((data.totalHours / data.count).toFixed(1)) : 0
      }));
      responseTimeData.sort((a, b) => {
        return dayNames.indexOf(a.name) - dayNames.indexOf(b.name);
      });
      res.status(200).json(responseTimeData);
    } catch (error) {
      console.error("Error getting response time metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/metrics/ticket-volume", requireRole(["admin", "support-agent", "creator"]), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod || "weekly";
      const isCreator = req.user?.role === "creator";
      let tenantId;
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId);
        if (isNaN(tenantId)) {
          tenantId = void 0;
        }
      } else if (!isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Ticket volume metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      if (tenantId === void 0 && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Ticket volume metrics: Fallback tenant filtering applied: ${tenantId}`);
      }
      const tickets2 = await storage.getAllTickets(tenantId);
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets2.filter((ticket) => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOfWeekCounts = {};
      dayNames.forEach((day) => {
        dayOfWeekCounts[day] = 0;
      });
      filteredTickets.forEach((ticket) => {
        if (ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const dayOfWeek = dayNames[created.getDay()];
          dayOfWeekCounts[dayOfWeek]++;
        }
      });
      const volumeData = Object.entries(dayOfWeekCounts).map(([name, count]) => ({
        name,
        volume: count
      }));
      volumeData.sort((a, b) => {
        return dayNames.indexOf(a.name) - dayNames.indexOf(b.name);
      });
      res.status(200).json(volumeData);
    } catch (error) {
      console.error("Error getting ticket volume metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/tickets/:ticketId/attachments", requireRole(["admin", "support-agent", "engineer", "user"]), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const attachments2 = await storage.getAttachmentsByTicketId(ticketId);
      res.status(200).json(attachments2);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/attachments/:id", requireRole(["admin", "support-agent", "engineer", "user"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attachment = await storage.getAttachmentById(id);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      res.status(200).json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/tickets/:ticketId/attachments", requireRole(["admin", "support-agent", "engineer", "user"]), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const attachmentData = insertAttachmentSchema.parse({
        ...req.body,
        ticketId
      });
      const attachment = await storage.createAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/mcp-test", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      console.log("MCP Test Query:", query);
      const context = await Promise.resolve().then(() => (init_model_context_protocol(), model_context_protocol_exports)).then((mcp) => {
        return mcp.getContextForQuery(query);
      });
      console.log("MCP Context Found:", !!context);
      const aiProvider = AIProviderFactory.getProvider(1, "openai");
      let systemPrompt = `You are a helpful support assistant that provides accurate information about technical issues. `;
      if (context) {
        systemPrompt += `
I'm providing you with relevant documentation that matches this query. Use this information to give a detailed, accurate response.

RELEVANT DOCUMENTATION:
${context}

Based on this documentation, answer the user's question:`;
      }
      const messages2 = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ];
      if (!aiProvider) {
        throw new Error("No AI provider available. Please configure an AI provider in settings.");
      }
      const response2 = await aiProvider.generateChatResponse(messages2, context || "", systemPrompt);
      res.json({ response: response2, hasContext: !!context });
    } catch (error) {
      console.error("Error in MCP test endpoint:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  app2.post("/api/test/ticket-formatter", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      console.log("TicketFormatter Test: Processing formatting request");
      const input = req.body;
      const formatterInput = {
        id: input.id || 12345,
        subject: input.subject || "VPN connectivity issue",
        steps: input.steps || "1. Restart your router\n2. Reinstall the VPN client\n3. Update VPN server address to vpn.example.com",
        category: input.category || "technical",
        urgency: input.urgency || "MEDIUM",
        customer_name: input.customer_name || "John Smith",
        additional_notes: input.additional_notes || "This issue has been escalated from Level 1 support."
      };
      console.log(`TicketFormatter Test: Formatting ticket #${formatterInput.id} - ${formatterInput.subject}`);
      const result = await agent_service_default.formatTicket(formatterInput);
      const status = agent_service_default.getTicketFormatterStatus();
      console.log(`TicketFormatter Test: Completed formatting in ${result.processing_time_ms}ms`);
      res.json({
        success: true,
        formatter_result: result,
        agent_status: status,
        test_info: {
          ticket_id: formatterInput.id,
          subject: formatterInput.subject,
          template_used: result.template_used,
          processing_time_ms: result.processing_time_ms,
          ai_enhanced: status.google_ai_configured
        }
      });
    } catch (error) {
      console.error("TicketFormatter Test: Error during formatting:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown formatting error"
      });
    }
  });
  app2.post("/api/test/support-team-orchestrator", requireRole(["admin", "support-agent", "engineer", "creator"]), async (req, res) => {
    try {
      console.log("SupportTeam Orchestrator Test: Processing complete workflow");
      const input = req.body;
      const workflowInput = {
        user_message: input.user_message || "I need help with VPN connectivity issues, my credentials aren't working and it's urgent",
        user_context: input.user_context || {
          url: "https://example.com/support",
          title: "Support Request",
          userAgent: "Test Browser"
        },
        tenant_id: input.tenant_id || 1,
        user_id: input.user_id || "test_user"
      };
      console.log(`SupportTeam Orchestrator Test: Processing message: "${workflowInput.user_message.substring(0, 50)}..."`);
      const result = await agent_service_default.processWorkflow(workflowInput);
      console.log(`SupportTeam Orchestrator Test: Completed workflow in ${result.processing_time_ms}ms with ${(result.confidence_score * 100).toFixed(1)}% confidence`);
      res.json({
        success: true,
        workflow_result: result,
        agent_status: {
          name: "SupportTeamOrchestrator",
          pipeline_complete: true,
          agents_coordinated: ["ChatPreprocessor", "InstructionLookup", "TicketLookup", "TicketFormatter"],
          processing_time_ms: result.processing_time_ms,
          confidence_score: result.confidence_score
        },
        test_info: {
          input_message: workflowInput.user_message,
          ticket_id: result.ticket_id,
          ticket_title: result.ticket_title,
          resolution_steps_count: result.resolution_steps_count,
          category: result.category,
          urgency: result.urgency
        }
      });
    } catch (error) {
      console.error("SupportTeam Orchestrator Test: Error processing workflow:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to process complete workflow"
      });
    }
  });
  registerKnowledgeSyncRoutes(app2);
  app2.use("/api/agent", agent_test_routes_default);
  app2.use("/api/agent-resources", agent_resources_default);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
await init_vite();
init_db();
import path12 from "path";
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
var app = express4();
app.use((req, res, next) => {
  if (req.path.startsWith("/api/widget/") || req.path.startsWith("/api/agent/")) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key");
    res.header("Access-Control-Allow-Credentials", "false");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  } else {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
});
var uploadsDir3 = path12.join(process.cwd(), "uploads");
app.use("/uploads", express4.static(uploadsDir3));
console.log(`Serving static files from: ${uploadsDir3}`);
var clientDir = path12.join(process.cwd(), "client");
app.use("/debug", express4.static(clientDir));
console.log(`Serving debug tools from: ${clientDir}`);
app.use(express4.json({
  limit: "1gb",
  verify: (req, res, buf, encoding) => {
    if (req.url.includes("/integrations")) {
      const enc = encoding || "utf8";
      req.rawBody = buf.toString(enc);
    }
  },
  // Handle JSON parsing errors
  reviver: (key, value) => {
    return value;
  }
}));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.error("JSON Parse Error:", err.message);
    console.log("Raw request body:", req.rawBody);
    return res.status(400).json({
      message: "Invalid JSON in request body",
      error: err.message
    });
  }
  next(err);
});
app.use(express4.urlencoded({ extended: false, limit: "1gb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path13 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path13.startsWith("/api")) {
      let logLine = `${req.method} ${path13} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use("/api/*", async (req, res, next) => {
    try {
      if (Math.random() < 0.05) {
        const isDbConnected = await testDbConnection();
        if (!isDbConnected) {
          console.log("Database connection check failed, attempting reconnect");
          await reconnectDb();
        }
      }
      next();
    } catch (error) {
      console.error("Database health check error:", error);
      next();
    }
  });
  app.use((err, _req, res, _next) => {
    try {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`Error handling request (${status}):`, err);
      res.status(status).json({ message });
    } catch (handlerError) {
      console.error("Error in error handler:", handlerError);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
