import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// AI provider types
export const AiProviderTypeEnum = z.enum([
  'openai',
  'gemini',
  'anthropic',
  'aws-bedrock',
  'bedrock', // Including legacy 'bedrock' type which maps to 'aws-bedrock' in the code
  'ollama', // Local/self-hosted Llama models via Ollama API
  // 'perplexity' removed
  'custom'
]);

// Document status types
export const DocumentStatusEnum = z.enum([
  'draft',
  'published',
  'archived'
]);

// API key permissions enum
export const ApiKeyPermissionEnum = z.object({
  read: z.boolean().default(true),
  write: z.boolean().default(true),
  webhook: z.boolean().default(false)
});

// Industry types
export const IndustryTypes = [
  'technology',
  'healthcare',
  'finance',
  'education',
  'retail',
  'manufacturing',
  'legal',
  'government',
  'real_estate',
  'transportation',
  'hospitality',
  'media',
  'telecommunications',
  'energy',
  'nonprofit',
  'none'
] as const;

export type IndustryType = typeof IndustryTypes[number];

// Permission flags for role-based access control
export interface RolePermissions {
  // Ticket permissions
  canViewOwnTickets: boolean;
  canViewAllTickets: boolean;
  canCreateTickets: boolean;
  canEditOwnTickets: boolean;
  canEditAllTickets: boolean;
  canAssignTickets: boolean;
  canDeleteTickets: boolean;
  canCommentOnTickets: boolean;
  
  // AI permissions
  canAccessAISettings: boolean;
  canAccessAIProviders: boolean;
  canManageInstructions: boolean;
  canManageAgentResources: boolean;
  
  // Integration permissions
  canAccessIntegrations: boolean;
  canManageIntegrations: boolean;
  
  // User management permissions
  canViewUsers: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  
  // System permissions
  canAccessSettings: boolean;
  canManageSettings: boolean;
  canAccessAnalytics: boolean;
  canAccessChatLogs: boolean;
}

// Industry-specific role definitions
export interface IndustryRoleDefinition {
  key: string;
  name: string;
  description: string;
  permissions: RolePermissions;
}

// Healthcare roles
export const HealthcareRoles: Record<string, IndustryRoleDefinition> = {
  chief_doctor: {
    key: 'chief_doctor',
    name: 'Chief Doctor',
    description: 'Full administrative access to all system features',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: true,
      canAssignTickets: true,
      canDeleteTickets: true,
      canCommentOnTickets: true,
      canAccessAISettings: true,
      canAccessAIProviders: true,
      canManageInstructions: true,
      canManageAgentResources: true,
      canAccessIntegrations: true,
      canManageIntegrations: true,
      canViewUsers: true,
      canManageUsers: true,
      canManageTeams: true,
      canAccessSettings: true,
      canManageSettings: true,
      canAccessAnalytics: true,
      canAccessChatLogs: true
    }
  },
  doctor: {
    key: 'doctor',
    name: 'Doctor',
    description: 'Can manage tickets, assign cases, and configure integrations',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: true,
      canAssignTickets: true,
      canDeleteTickets: false,
      canCommentOnTickets: true,
      canAccessAISettings: false,
      canAccessAIProviders: false,
      canManageInstructions: false,
      canManageAgentResources: false,
      canAccessIntegrations: true,
      canManageIntegrations: true,
      canViewUsers: true,
      canManageUsers: true,
      canManageTeams: false,
      canAccessSettings: false,
      canManageSettings: false,
      canAccessAnalytics: true,
      canAccessChatLogs: false
    }
  },
  nurse: {
    key: 'nurse',
    name: 'Nurse',
    description: 'Can view tickets and add comments, but no editing or AI/integration access',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: false,
      canEditAllTickets: false,
      canAssignTickets: false,
      canDeleteTickets: false,
      canCommentOnTickets: true,
      canAccessAISettings: false,
      canAccessAIProviders: false,
      canManageInstructions: false,
      canManageAgentResources: false,
      canAccessIntegrations: false,
      canManageIntegrations: false,
      canViewUsers: true,
      canManageUsers: false,
      canManageTeams: false,
      canAccessSettings: false,
      canManageSettings: false,
      canAccessAnalytics: false,
      canAccessChatLogs: false
    }
  }
};

// Default roles for other industries (can be extended later)
export const DefaultRoles: Record<string, IndustryRoleDefinition> = {
  admin: {
    key: 'admin',
    name: 'Administrator',
    description: 'Full administrative access to all system features',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: true,
      canAssignTickets: true,
      canDeleteTickets: true,
      canCommentOnTickets: true,
      canAccessAISettings: true,
      canAccessAIProviders: true,
      canManageInstructions: true,
      canManageAgentResources: true,
      canAccessIntegrations: true,
      canManageIntegrations: true,
      canViewUsers: true,
      canManageUsers: true,
      canManageTeams: true,
      canAccessSettings: true,
      canManageSettings: true,
      canAccessAnalytics: true,
      canAccessChatLogs: true
    }
  },
  support_agent: {
    key: 'support_agent',
    name: 'Support Agent',
    description: 'Can manage tickets and view analytics',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: true,
      canAssignTickets: true,
      canDeleteTickets: false,
      canCommentOnTickets: true,
      canAccessAISettings: false,
      canAccessAIProviders: false,
      canManageInstructions: true,
      canManageAgentResources: false,
      canAccessIntegrations: false,
      canManageIntegrations: false,
      canViewUsers: true,
      canManageUsers: false,
      canManageTeams: false,
      canAccessSettings: false,
      canManageSettings: false,
      canAccessAnalytics: true,
      canAccessChatLogs: false
    }
  },
  engineer: {
    key: 'engineer',
    name: 'Engineer',
    description: 'Can view tickets and analytics',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: true,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: false,
      canAssignTickets: false,
      canDeleteTickets: false,
      canCommentOnTickets: true,
      canAccessAISettings: false,
      canAccessAIProviders: false,
      canManageInstructions: false,
      canManageAgentResources: false,
      canAccessIntegrations: false,
      canManageIntegrations: false,
      canViewUsers: false,
      canManageUsers: false,
      canManageTeams: false,
      canAccessSettings: false,
      canManageSettings: false,
      canAccessAnalytics: true,
      canAccessChatLogs: false
    }
  },
  user: {
    key: 'user',
    name: 'User',
    description: 'Can create and view own tickets',
    permissions: {
      canViewOwnTickets: true,
      canViewAllTickets: false,
      canCreateTickets: true,
      canEditOwnTickets: true,
      canEditAllTickets: false,
      canAssignTickets: false,
      canDeleteTickets: false,
      canCommentOnTickets: true,
      canAccessAISettings: false,
      canAccessAIProviders: false,
      canManageInstructions: false,
      canManageAgentResources: false,
      canAccessIntegrations: false,
      canManageIntegrations: false,
      canViewUsers: false,
      canManageUsers: false,
      canManageTeams: false,
      canAccessSettings: false,
      canManageSettings: false,
      canAccessAnalytics: false,
      canAccessChatLogs: false
    }
  }
};

// Get roles for a specific industry
export function getIndustryRoles(industryType: IndustryType): Record<string, IndustryRoleDefinition> {
  switch (industryType) {
    case 'healthcare':
      return HealthcareRoles;
    // Add more industries here as needed
    default:
      return DefaultRoles;
  }
}

// Get permissions for a specific role in an industry
export function getRolePermissions(industryType: IndustryType, roleKey: string): RolePermissions | null {
  const roles = getIndustryRoles(industryType);
  const role = roles[roleKey];
  
  if (role) {
    return role.permissions;
  }
  
  // Fallback to default roles if not found in industry-specific roles
  const defaultRole = DefaultRoles[roleKey];
  if (defaultRole) {
    return defaultRole.permissions;
  }
  
  // Creator always has full permissions
  if (roleKey === 'creator' || roleKey === 'administrator') {
    return DefaultRoles.admin.permissions;
  }
  
  return null;
}

// Check if user has specific permission
export function hasPermission(
  industryType: IndustryType,
  roleKey: string,
  permission: keyof RolePermissions
): boolean {
  // Creator always has all permissions
  if (roleKey === 'creator' || roleKey === 'administrator') {
    return true;
  }
  
  const permissions = getRolePermissions(industryType, roleKey);
  if (!permissions) {
    return false;
  }
  
  return permissions[permission];
}

// Tenant table for multi-tenant support
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  apiKey: text("apiKey").notNull().unique(),
  adminId: integer("adminId").default(1), // Reference to the admin user for this tenant
  industryType: text("industryType").default("none").notNull(), // Industry category (creator-only edit)
  settings: json("settings").default({}).notNull(), // Tenant-specific settings
  branding: json("branding").default({
    primaryColor: '#4F46E5',
    logo: null,
    companyName: '',
    emailTemplate: 'default'
  }).notNull(),
  active: boolean("active").default(true),
  isTrial: boolean("isTrial").default(false).notNull(), // Trial account flag
  ticketLimit: integer("ticketLimit").default(null), // Max tickets allowed (null = unlimited)
  ticketsCreated: integer("ticketsCreated").default(0).notNull(), // Current ticket count
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Custom user roles table (creator-only management)
export const customUserRoles = pgTable("custom_user_roles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  industryType: text("industryType").notNull().default("none"), // Associate role with industry
  roleName: text("roleName").notNull(), // e.g., "Technical Support", "Sales Representative"
  roleKey: text("roleKey").notNull(), // e.g., "technical_support", "sales_rep"
  description: text("description"),
  permissions: json("permissions").$type<RolePermissions>().notNull(), // Full permission object
  isDefault: boolean("isDefault").default(false), // System default roles
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure unique role keys per industry type per tenant
    roleKeyUnique: uniqueIndex("role_key_industry_tenant_unique").on(table.roleKey, table.industryType, table.tenantId),
  };
});

export const insertCustomUserRoleSchema = createInsertSchema(customUserRoles)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const updateCustomUserRoleSchema = insertCustomUserRoleSchema
  .partial()
  .omit({ tenantId: true }); // Prevent updating tenantId for security

export type InsertCustomUserRole = z.infer<typeof insertCustomUserRoleSchema>;
export type UpdateCustomUserRole = z.infer<typeof updateCustomUserRoleSchema>;
export type CustomUserRole = typeof customUserRoles.$inferSelect;

// Teams table for organizing users and tickets
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Create a unique index on team name + tenantId
    teamNameUnique: uniqueIndex("team_name_tenant_unique").on(table.name, table.tenantId),
  };
});

export const insertTeamSchema = createInsertSchema(teams)
  .omit({ id: true, createdAt: true, updatedAt: true });
  
// Team Members table for managing team membership
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("teamId").notNull(),
  userId: integer("userId").notNull(),
  role: text("role").notNull().default("member"), // member, leader, admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Create a unique index on userId + teamId to prevent duplicate memberships
    membershipUnique: uniqueIndex("membership_unique").on(table.userId, table.teamId),
  };
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  teamId: integer("teamId"), // Reference to the team the user belongs to
  username: text("username").notNull().unique(), // Global unique username across all tenants
  password: text("password").notNull(),
  role: text("role").notNull().default("member"), // creator, administrator, support_engineer, user, member
  name: text("name"),
  email: text("email").unique(), // Global unique email across all tenants
  company: text("company"), // Company or organization name
  profilePicture: text("profilePicture"), // URL or path to profile picture
  
  // MFA fields
  mfaEnabled: boolean("mfaEnabled").default(false),
  mfaSecret: text("mfaSecret"),
  mfaBackupCodes: json("mfaBackupCodes").default([]),
  
  // SSO fields
  ssoEnabled: boolean("ssoEnabled").default(false),
  ssoProvider: text("ssoProvider"), // "google", "microsoft", "saml", etc.
  ssoProviderId: text("ssoProviderId"), // External provider's user ID
  ssoProviderData: json("ssoProviderData").default({}),
  
  // Email verification fields
  emailVerified: boolean("emailVerified").default(false),
  emailVerificationCode: text("emailVerificationCode"),
  emailVerificationExpiry: timestamp("emailVerificationExpiry"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .pick({
    username: true,
    password: true,
    role: true,
    name: true,
    email: true,
    company: true,
    profilePicture: true,
    tenantId: true,
    teamId: true,
  });

// Schema for updating user profile
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Please enter a valid email").optional(),
  company: z.string().optional(),
  profilePicture: z.string().nullable().optional(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1), // Default to tenant 1 for backward compatibility
  companyTicketId: integer("companyTicketId").notNull(), // Company-specific sequential ticket ID (1, 2, 3, ...)
  teamId: integer("teamId"), // Reference to the team the ticket belongs to
  createdBy: integer("createdBy"), // Reference to the user who created the ticket
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, resolved
  category: text("category").notNull(), // authentication, billing, feature_request, etc.
  complexity: text("complexity").default("medium"), // simple, medium, complex
  assignedTo: text("assignedTo"), // role or specific user
  source: text("source").default("chat"), // chat, email, widget, api
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  aiResolved: boolean("aiResolved").default(false),
  aiNotes: text("aiNotes"),
  // Integration fields
  externalIntegrations: json("externalIntegrations"), // {zendesk: {id, url}, jira: {id, key, url}}
  // Client metadata (for when tickets are created from external clients)
  clientMetadata: json("clientMetadata"),
}, (table) => {
  return {
    // Create a unique index on companyTicketId + tenantId to ensure per-company uniqueness
    companyTicketIdUnique: uniqueIndex("company_ticket_id_unique").on(table.companyTicketId, table.tenantId),
  };
});

export const insertTicketSchema = createInsertSchema(tickets)
  .omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true, companyTicketId: true });

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

// Chat logs table for admin audit trail
export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().default(1),
  userId: integer("userId"), // User who sent the message (null for anonymous)
  ticketId: integer("ticketId"), // Associated ticket if any
  sender: text("sender").notNull(), // user, ai, support, system, etc.
  content: text("content").notNull(),
  metadata: json("metadata"), // Additional context (IP, user agent, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs)
  .omit({ id: true, createdAt: true });

// Type definitions
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Ticket = typeof tickets.$inferSelect & {
  assignedToUsername?: string | null;
};
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type ChatLog = typeof chatLogs.$inferSelect;
export type InsertChatLog = z.infer<typeof insertChatLogSchema>;

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

// Integration Settings Table for persistent storage of JIRA/Zendesk configurations
export const integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  serviceType: text("serviceType").notNull(), // 'jira', 'zendesk', etc.
  isEnabled: boolean("isEnabled").default(false).notNull(),
  configuration: json("configuration").notNull(), // Store all config including credentials
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure each tenant can only have one configuration per service type
    serviceTypePerTenant: uniqueIndex("integration_service_type_tenant_unique").on(table.serviceType, table.tenantId),
  };
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;

// Integration Settings Relations
export const integrationSettingsRelations = relations(integrationSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrationSettings.tenantId],
    references: [tenants.id]
  }),
}));

// Widget API Keys for secure access to the widget API
export const widgetApiKeys = pgTable("widget_api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  tenantId: integer("tenantId").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsed: timestamp("lastUsed"),
  expiresAt: timestamp("expiresAt"),
  domains: json("domains").$type<string[]>().default([]),
  useCount: integer("useCount").default(0).notNull(),
  description: text("description"),
  permissions: json("permissions").$type<z.infer<typeof ApiKeyPermissionEnum>>().default({
    read: true,
    write: true,
    webhook: false
  }).notNull(),
  isRevoked: boolean("isRevoked").default(false).notNull()
});

export const insertWidgetApiKeySchema = createInsertSchema(widgetApiKeys)
  .omit({ id: true, createdAt: true, useCount: true, lastUsed: true, isRevoked: true });

export type WidgetApiKey = typeof widgetApiKeys.$inferSelect;
export type InsertWidgetApiKey = z.infer<typeof insertWidgetApiKeySchema>;

// AI provider configurations
export const aiProviders = pgTable("ai_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  teamId: integer("teamId"), // Optional, if null, applies to all teams in tenant
  type: text("type").notNull(), // 'openai', 'anthropic', 'google', 'aws', 'azure', 'ollama', 'custom'
  name: text("name").notNull(), // Display name for the provider
  model: text("model").notNull(), // Model name to use, e.g., 'gpt-4', 'claude-3', 'llama3.1', etc.
  apiKey: text("apiKey"), // API key (stored securely, optional for Ollama)
  baseUrl: text("baseUrl"), // Base URL for API requests (required for Ollama: http://localhost:11434)
  isPrimary: boolean("isPrimary").default(false), // Whether this is the primary provider
  isDefault: boolean("isDefault").default(false), // Whether this is the default provider
  enabled: boolean("enabled").default(true), // Whether this provider is enabled
  settings: json("settings").default({}), // Provider-specific settings
  useForClassification: boolean("useForClassification").default(true), // Use for ticket classification
  useForAutoResolve: boolean("useForAutoResolve").default(true), // Use for auto-resolving tickets
  useForChat: boolean("useForChat").default(true), // Use for chat responses
  useForEmail: boolean("useForEmail").default(true), // Use for email responses
  priority: integer("priority").default(50).notNull(), // Priority (1-100, higher = more priority)
  contextWindow: integer("contextWindow").default(8000).notNull(), // Max context window size
  maxTokens: integer("maxTokens").default(1000).notNull(), // Max output tokens
  temperature: integer("temperature").default(7).notNull(), // Temperature setting (0-10, divided by 10 in code)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Audit log for AI provider access and management
export const aiProviderAudit = pgTable("ai_provider_audit", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who performed the action
  tenantId: integer("tenant_id").notNull(), // Tenant context
  teamId: integer("team_id"), // Team context (optional)
  timestamp: timestamp("timestamp").defaultNow().notNull(), // When the action occurred
  action: text("action").notNull(), // Action type (access, create, update, delete, etc.)
  providerId: integer("provider_id"), // Provider ID if applicable
  success: boolean("success").default(true), // Whether access was granted/action succeeded
  details: json("details"), // Additional details about the action
});

export const insertAiProviderSchema = createInsertSchema(aiProviders)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type AiProvider = typeof aiProviders.$inferSelect;
export type InsertAiProvider = z.infer<typeof insertAiProviderSchema>;
export type AiProviderAudit = typeof aiProviderAudit.$inferSelect;

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

// Agent resources table for agent-specific file uploads with strict isolation
export const agentResources = pgTable("agent_resources", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(), // 'chat-preprocessor', 'instruction-lookup', 'ticket-formatter'
  filename: text("filename").notNull(), // Server-side filename (unique)
  originalName: text("original_name").notNull(), // Original filename as uploaded
  fileSize: integer("file_size").notNull(), // File size in bytes
  fileType: text("file_type").notNull(), // File extension (.txt, .pdf, etc.)
  filePath: text("file_path").notNull(), // Path to the stored file
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  metadata: json("metadata").default({}), // Additional file metadata
});

export const insertAgentResourceSchema = createInsertSchema(agentResources)
  .omit({ id: true, uploadDate: true });

export type AgentResource = typeof agentResources.$inferSelect;
export type InsertAgentResource = z.infer<typeof insertAgentResourceSchema>;

// Database connection types enum for MCP integration
export const DatabaseTypeEnum = z.enum([
  'oracle',
  'mysql',
  'postgresql',
  'mssql',
  'sqlite'
]);

// MCP Database connections for external data sources
export const mcpDatabaseConnections = pgTable("mcp_database_connections", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Display name for the connection
  type: text("type").notNull(), // oracle, mysql, postgresql, mssql, sqlite
  host: text("host").notNull(),
  port: integer("port").notNull(),
  database: text("database").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(), // Encrypted in production
  schema: text("schema"), // Optional schema name
  description: text("description"), // Purpose of this connection
  isActive: boolean("is_active").default(true).notNull(),
  connectionString: text("connection_string"), // Full connection string if needed
  sslConfig: json("ssl_config").default({}), // SSL configuration
  metadata: json("metadata").default({}), // Additional connection metadata
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastTested: timestamp("last_tested"), // Last successful connection test
  testStatus: text("test_status").default("pending"), // pending, success, failed
  errorMessage: text("error_message"), // Last error if connection failed
}, (table) => {
  return {
    // Create a unique index on name + tenantId
    connectionNameUnique: uniqueIndex("mcp_connection_name_tenant_unique").on(table.name, table.tenantId),
  };
});

export const insertMcpDatabaseConnectionSchema = createInsertSchema(mcpDatabaseConnections)
  .omit({ id: true, createdAt: true, updatedAt: true, lastTested: true });

export type McpDatabaseConnection = typeof mcpDatabaseConnections.$inferSelect;
export type InsertMcpDatabaseConnection = z.infer<typeof insertMcpDatabaseConnectionSchema>;

// MCP Query templates for reusable database queries
export const mcpQueryTemplates = pgTable("mcp_query_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id").notNull().references(() => mcpDatabaseConnections.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Template name
  description: text("description"),
  queryType: text("query_type").notNull(), // data_dictionary, ticket_lookup, similarity_search
  sqlTemplate: text("sql_template").notNull(), // SQL query with parameters
  parameters: json("parameters").default([]), // Parameter definitions
  isActive: boolean("is_active").default(true).notNull(),
  useForMcp: boolean("use_for_mcp").default(true).notNull(), // Use in MCP responses
  priority: integer("priority").default(50).notNull(), // Query priority (1-100)
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Create a unique index on name + connectionId
    queryTemplateNameUnique: uniqueIndex("mcp_query_template_name_connection_unique").on(table.name, table.connectionId),
  };
});

export const insertMcpQueryTemplateSchema = createInsertSchema(mcpQueryTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type McpQueryTemplate = typeof mcpQueryTemplates.$inferSelect;
export type InsertMcpQueryTemplate = z.infer<typeof insertMcpQueryTemplateSchema>;

// MCP Query execution logs
export const mcpQueryLogs = pgTable("mcp_query_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  connectionId: integer("connection_id").notNull().references(() => mcpDatabaseConnections.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => mcpQueryTemplates.id, { onDelete: "set null" }),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
  queryText: text("query_text").notNull(), // Actual executed query
  parameters: json("parameters").default({}), // Query parameters used
  executionTime: integer("execution_time_ms"), // Query execution time in ms
  resultCount: integer("result_count"), // Number of rows returned
  success: boolean("success").notNull(),
  errorMessage: text("error_message"), // Error if query failed
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata").default({}), // Additional execution metadata
});

export const insertMcpQueryLogSchema = createInsertSchema(mcpQueryLogs)
  .omit({ id: true, timestamp: true });

export type McpQueryLog = typeof mcpQueryLogs.$inferSelect;
export type InsertMcpQueryLog = z.infer<typeof insertMcpQueryLogSchema>;

// Email provider types enum
export const EmailProviderTypeEnum = z.enum([
  'smtp', // Traditional SMTP/IMAP
  'sendgrid', // SendGrid API
  'outlook', // Outlook/Microsoft 365
]);

// Email provider configurations
export const emailProviders = pgTable("email_providers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  providerType: text("provider_type").notNull(), // smtp, sendgrid, outlook
  name: text("name").notNull(), // Display name
  isActive: boolean("is_active").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Primary provider for sending
  
  // Provider-specific configuration (stored as JSON)
  configuration: json("configuration").notNull(),
  
  // Email settings
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  ticketSubjectPrefix: text("ticket_subject_prefix").default("[Ticket #]").notNull(),
  
  // AI and monitoring settings
  enableAiResponses: boolean("enable_ai_responses").default(true).notNull(),
  checkInterval: integer("check_interval").default(60000).notNull(), // For IMAP polling (ms)
  
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastTested: timestamp("last_tested"),
  testStatus: text("test_status").default("pending"), // pending, success, failed
}, (table) => {
  return {
    providerNameUnique: uniqueIndex("email_provider_name_tenant_unique").on(table.name, table.tenantId),
  };
});

export const insertEmailProviderSchema = createInsertSchema(emailProviders)
  .omit({ id: true, createdAt: true, updatedAt: true, lastTested: true });

export type EmailProvider = typeof emailProviders.$inferSelect;
export type InsertEmailProvider = z.infer<typeof insertEmailProviderSchema>;
