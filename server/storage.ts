import { 
  users, 
  tickets, 
  messages,
  attachments,
  dataSources,
  tenants,
  identityProviders,
  widgetAnalytics,
  aiProviders,
  supportDocuments,
  documentUsage,
  teams,
  type User, 
  type InsertUser, 
  type Ticket, 
  type InsertTicket, 
  type Message, 
  type InsertMessage,
  type Attachment,
  type InsertAttachment,
  type DataSource,
  type InsertDataSource,
  type Tenant,
  type InsertTenant,
  type IdentityProvider,
  type InsertIdentityProvider,
  type WidgetAnalytics,
  type InsertWidgetAnalytics,
  type AiProvider,
  type InsertAiProvider,
  type SupportDocument,
  type InsertSupportDocument,
  type DocumentUsage,
  type InsertDocumentUsage,
  type Team,
  type InsertTeam
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db, pool, testDbConnection, executeQuery } from "./db";

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';

// Interface for all storage operations
export interface IStorage {
  // Tenant operations
  getTenantById(id: number): Promise<Tenant | undefined>;
  getTenantByApiKey(apiKey: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: number): Promise<User | undefined>;
  getUsersByTenantId(tenantId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUserBySsoId(provider: string, providerId: string, tenantId?: number): Promise<User | undefined>;
  
  // Identity provider operations
  getIdentityProviders(tenantId: number): Promise<IdentityProvider[]>;
  getIdentityProviderById(id: number, tenantId?: number): Promise<IdentityProvider | undefined>;
  createIdentityProvider(provider: InsertIdentityProvider): Promise<IdentityProvider>;
  updateIdentityProvider(id: number, updates: Partial<IdentityProvider>, tenantId?: number): Promise<IdentityProvider>;
  deleteIdentityProvider(id: number, tenantId?: number): Promise<boolean>;
  
  // Ticket operations
  getAllTickets(tenantId?: number): Promise<Ticket[]>;
  getTicketById(id: number, tenantId?: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<Ticket>, tenantId?: number): Promise<Ticket>;
  
  // Message operations
  getMessagesByTicketId(ticketId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Attachment operations
  getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]>;
  getAttachmentById(id: number): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  
  // Data source operations
  getAllDataSources(tenantId?: number): Promise<DataSource[]>;
  getEnabledDataSources(tenantId?: number): Promise<DataSource[]>;
  getDataSourceById(id: number, tenantId?: number): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, updates: Partial<DataSource>, tenantId?: number): Promise<DataSource>;
  deleteDataSource(id: number, tenantId?: number): Promise<boolean>;
  
  // AI provider operations
  getAiProviders(tenantId: number): Promise<AiProvider[]>;
  getAiProviderById(id: number, tenantId?: number): Promise<AiProvider | undefined>;
  getAiProvidersByType(type: string, tenantId: number): Promise<AiProvider[]>;
  getPrimaryAiProvider(tenantId: number): Promise<AiProvider | undefined>;
  createAiProvider(provider: InsertAiProvider): Promise<AiProvider>;
  updateAiProvider(id: number, updates: Partial<AiProvider>, tenantId?: number): Promise<AiProvider>;
  deleteAiProvider(id: number, tenantId?: number): Promise<boolean>;
  
  // Widget analytics operations
  getWidgetAnalyticsByApiKey(apiKey: string): Promise<WidgetAnalytics | undefined>;
  getWidgetAnalyticsByAdminId(adminId: number, tenantId?: number): Promise<WidgetAnalytics[]>;
  getAllWidgetAnalytics(tenantId?: number): Promise<WidgetAnalytics[]>;
  createWidgetAnalytics(analytics: InsertWidgetAnalytics): Promise<WidgetAnalytics>;
  updateWidgetAnalytics(id: number, updates: Partial<WidgetAnalytics>): Promise<WidgetAnalytics>;
  
  // Support document operations
  getAllSupportDocuments(tenantId?: number): Promise<SupportDocument[]>;
  getSupportDocumentById(id: number, tenantId?: number): Promise<SupportDocument | undefined>;
  getSupportDocumentsByCategory(category: string, tenantId?: number): Promise<SupportDocument[]>;
  getSupportDocumentsByStatus(status: string, tenantId?: number): Promise<SupportDocument[]>;
  searchSupportDocuments(query: string, tenantId?: number): Promise<SupportDocument[]>;
  createSupportDocument(document: InsertSupportDocument): Promise<SupportDocument>;
  updateSupportDocument(id: number, updates: Partial<SupportDocument>, tenantId?: number): Promise<SupportDocument>;
  deleteSupportDocument(id: number, tenantId?: number): Promise<boolean>;
  incrementDocumentViewCount(id: number): Promise<void>;
  
  // Document usage operations
  logDocumentUsage(usage: InsertDocumentUsage): Promise<DocumentUsage>;
  getDocumentUsageById(id: number): Promise<DocumentUsage | undefined>;
  getDocumentUsageByDocumentId(documentId: number): Promise<DocumentUsage[]>;
  getDocumentUsageAnalytics(startDate: Date, endDate: Date, tenantId?: number): Promise<any>;
  
  // Team operations
  getAllTeams(tenantId?: number): Promise<Team[]>;
  getTeamById(id: number, tenantId?: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<Team>, tenantId?: number): Promise<Team>;
  deleteTeam(id: number, tenantId?: number): Promise<boolean>;
  getUsersByTeamId(teamId: number, tenantId?: number): Promise<User[]>;
  getTicketsByTeamId(teamId: number, tenantId?: number): Promise<Ticket[]>;
  
  // Session management
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private tenants: Map<number, Tenant>;
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private messages: Map<number, Message>;
  private attachments: Map<number, Attachment>;
  private dataSources: Map<number, DataSource>;
  private widgetAnalyticsData: Map<number, WidgetAnalytics>;
  private aiProviders: Map<number, AiProvider>;
  private supportDocuments: Map<number, SupportDocument>;
  private documentUsageData: Map<number, DocumentUsage>;
  private teams: Map<number, Team>;
  private tenantIdCounter: number;
  private userIdCounter: number;
  private ticketIdCounter: number;
  private messageIdCounter: number;
  private attachmentIdCounter: number;
  private dataSourceIdCounter: number;
  private widgetAnalyticsIdCounter: number;
  private aiProviderIdCounter: number;
  private supportDocumentIdCounter: number;
  private documentUsageIdCounter: number;
  private teamIdCounter: number;
  
  // Add caches for critical data in production
  private userCache: Map<string, User> = new Map();
  private tenantCache: Map<string, Tenant> = new Map();
  private tenantByApiKeyCache: Map<string, Tenant> = new Map();
  private tenantBySubdomainCache: Map<string, Tenant> = new Map();
  private ticketCache: Map<string, Ticket> = new Map();
  private supportDocumentCache: Map<string, SupportDocument> = new Map();
  
  public sessionStore: session.Store;

  constructor() {
    this.tenants = new Map();
    this.users = new Map();
    this.tickets = new Map();
    this.messages = new Map();
    this.attachments = new Map();
    this.dataSources = new Map();
    this.widgetAnalyticsData = new Map();
    this.aiProviders = new Map();
    this.supportDocuments = new Map();
    this.documentUsageData = new Map();
    this.teams = new Map();
    this.tenantIdCounter = 1;
    this.userIdCounter = 1;
    this.ticketIdCounter = 1;
    this.messageIdCounter = 1;
    this.attachmentIdCounter = 1;
    this.dataSourceIdCounter = 1;
    this.widgetAnalyticsIdCounter = 1;
    this.aiProviderIdCounter = 1;
    this.supportDocumentIdCounter = 1;
    this.documentUsageIdCounter = 1;
    this.teamIdCounter = 1;
    
    // Initialize sample documents in the constructor
    this.initSampleSupportDocuments();
    
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Create a default tenant
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
        primaryColor: '#4F46E5',
        logo: null,
        companyName: 'Support AI',
        emailTemplate: 'default'
      }
    });
    
    // Add a default admin user for the default tenant
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@example.com",
      role: "admin",
      name: "Admin User",
      tenantId: 1 // Default tenant ID
    });
    
    // Initialize with sample tickets, data sources, and support documents
    this.initSampleTickets();
    this.initSampleDataSources();
    this.initSampleAiProviders();
    this.initSampleSupportDocuments();
  }
  
  private async initSampleAiProviders() {
    // Create default OpenAI provider
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
    
    // Adding a secondary provider
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
  
  private async initSampleSupportDocuments() {
    // Sample documents with different categories, statuses, and content types
    const sampleDocuments: InsertSupportDocument[] = [
      {
        title: "Getting Started Guide",
        content: "This guide will help you get started with our product. Follow these steps to set up your account and begin using the platform.",
        category: "guide",
        status: "published",
        tenantId: 1,
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
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
        createdBy: 1, // Admin user
        metadata: {
          version: "0.5",
          author: "Product Management",
          tags: ["roadmap", "preview", "upcoming"],
          priority: 5
        }
      }
    ];
    
    // Create the sample documents
    for (const documentData of sampleDocuments) {
      // Use the private Map directly to avoid the issue with missing method
      const id = this.supportDocumentIdCounter++;
      const now = new Date();
      
      const newDocument: SupportDocument = {
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
  
  private async initSampleDataSources() {
    // Import the existing knowledge base from knowledgeBase.ts
    const { knowledgeBase } = await import('./knowledgeBase');
    
    // Create a default knowledge base data source
    await this.createDataSource({
      name: "Default Knowledge Base",
      type: "kb",
      description: "Built-in knowledge base with common support solutions",
      content: JSON.stringify(knowledgeBase),
      enabled: true,
      priority: 1,
      tenantId: 1 // Default tenant ID
    });
    
    // Create other sample data sources
    await this.createDataSource({
      name: "Product Documentation",
      type: "url",
      description: "Official product documentation",
      content: "https://docs.example.com/api",
      enabled: true,
      priority: 2,
      tenantId: 1 // Default tenant ID
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
      tenantId: 1 // Default tenant ID
    });
  }
  
  private async initSampleTickets() {
    // Sample tickets with various categories, statuses, and complexities
    const sampleTickets: InsertTicket[] = [
      {
        title: "Login not working with Google account",
        description: "I tried to login with my Google account but keep getting an error message that says 'Authentication failed'.",
        category: "authentication",
        complexity: "medium",
        status: "open",
        assignedTo: "support",
      },
      {
        title: "Can't update my profile picture",
        description: "Whenever I try to upload a new profile picture, the system hangs and then gives me a timeout error.",
        category: "profile_management",
        complexity: "simple",
        status: "in_progress",
        assignedTo: "support",
      },
      {
        title: "Credit card payment failing",
        description: "I'm trying to upgrade to the premium plan but my credit card payment is being declined even though the card works elsewhere.",
        category: "billing",
        complexity: "medium",
        status: "open",
        assignedTo: "billing",
      },
      {
        title: "Feature request: Dark mode",
        description: "It would be great if you could add a dark mode option to reduce eye strain when using the app at night.",
        category: "feature_request",
        complexity: "complex",
        status: "open",
        assignedTo: "product",
      },
      {
        title: "API integration with Zapier not working",
        description: "I've set up a Zapier integration with your API but the webhook calls are failing with a 403 error.",
        category: "api_integration",
        complexity: "complex",
        status: "in_progress",
        assignedTo: "engineering",
      },
      {
        title: "How do I reset my password?",
        description: "I forgot my password and don't see a reset option on the login page.",
        category: "authentication",
        complexity: "simple",
        status: "resolved",
        assignedTo: "support",
        aiResolved: true,
      },
      {
        title: "Mobile app crashing on startup",
        description: "After the latest update, the mobile app crashes immediately when I try to open it. I'm using an iPhone 12 with iOS 15.",
        category: "mobile_app",
        complexity: "complex",
        status: "open",
        assignedTo: "engineering",
      },
      {
        title: "Can't export my data in CSV format",
        description: "The CSV export feature isn't working. When I try to download my data, I get an empty file.",
        category: "data_management",
        complexity: "medium",
        status: "in_progress",
        assignedTo: "engineering",
      },
      {
        title: "Need help with custom report configuration",
        description: "I'm trying to create a custom report that shows user activity by region, but I'm not sure how to set up the filters correctly.",
        category: "reporting",
        complexity: "medium",
        status: "resolved",
        assignedTo: "support",
      },
      {
        title: "Website is slow to load dashboard",
        description: "The dashboard takes over 30 seconds to load completely. This started happening about a week ago.",
        category: "performance",
        complexity: "complex",
        status: "in_progress",
        assignedTo: "engineering",
      }
    ];
    
    // Create the sample tickets
    for (const ticketData of sampleTickets) {
      // Override the default status with the one from the sample data
      const ticket = await this.createTicket({
        ...ticketData,
        status: ticketData.status || "new"
      });
      
      // For resolved tickets, set a resolvedAt date
      if (ticket.status === "resolved") {
        const resolvedDate = new Date();
        resolvedDate.setHours(resolvedDate.getHours() - Math.floor(Math.random() * 72)); // Random time within last 3 days
        await this.updateTicket(ticket.id, { 
          resolvedAt: resolvedDate,
          status: "resolved",
          aiResolved: ticketData.aiResolved || false
        });
      }
      
      // Add a sample message for each ticket
      await this.createMessage({
        ticketId: ticket.id,
        sender: "user",
        content: ticket.description,
        metadata: null
      });
      
      // Add AI response for simple tickets
      if (ticket.complexity === "simple") {
        await this.createMessage({
          ticketId: ticket.id,
          sender: "ai",
          content: `Thank you for your message. ${
            ticket.status === "resolved" 
              ? "I've found a solution to your issue. " + (ticket.category === "authentication" 
                ? "You can reset your password by clicking on the 'Forgot Password' link below the login form. We'll send you an email with instructions." 
                : "Please try refreshing the page and clearing your browser cache, then try again.")
              : "Our team is looking into this and will get back to you shortly."
          }`,
          metadata: { autoResponse: true }
        });
      }
    }
  }

  // Tenant operations
  async getTenantById(id: number): Promise<Tenant | undefined> {
    // Check cache first for better performance and resilience
    const cacheKey = `tenant:${id}`;
    const cachedTenant = this.tenantCache.get(cacheKey);
    if (cachedTenant) {
      console.log(`Tenant cache hit for ID: ${id}`);
      return cachedTenant;
    }
    
    // Cache miss, look up in the map
    const tenant = this.tenants.get(id);
    
    // If found, add to cache for future requests
    if (tenant) {
      this.tenantCache.set(cacheKey, tenant);
      
      // Clear cache entry after 30 minutes to avoid stale data
      setTimeout(() => {
        this.tenantCache.delete(cacheKey);
      }, 30 * 60 * 1000);
    }
    
    return tenant;
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    // Check cache first for better performance and resilience
    const cachedTenant = this.tenantByApiKeyCache.get(apiKey);
    if (cachedTenant) {
      console.log(`Tenant cache hit for API key: ${apiKey.substring(0, 4)}****`);
      return cachedTenant;
    }
    
    // Cache miss, look up in the map
    const tenant = Array.from(this.tenants.values()).find(
      (tenant) => tenant.apiKey === apiKey
    );
    
    // If found, add to cache for future requests
    if (tenant) {
      this.tenantByApiKeyCache.set(apiKey, tenant);
      
      // Clear cache entry after 30 minutes to avoid stale data
      setTimeout(() => {
        this.tenantByApiKeyCache.delete(apiKey);
      }, 30 * 60 * 1000);
    }
    
    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    // Check cache first for better performance and resilience
    const cachedTenant = this.tenantBySubdomainCache.get(subdomain);
    if (cachedTenant) {
      console.log(`Tenant cache hit for subdomain: ${subdomain}`);
      return cachedTenant;
    }
    
    // Cache miss, look up in the map
    const tenant = Array.from(this.tenants.values()).find(
      (tenant) => tenant.subdomain === subdomain
    );
    
    // If found, add to cache for future requests
    if (tenant) {
      this.tenantBySubdomainCache.set(subdomain, tenant);
      
      // Clear cache entry after 30 minutes to avoid stale data
      setTimeout(() => {
        this.tenantBySubdomainCache.delete(subdomain);
      }, 30 * 60 * 1000);
    }
    
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = this.tenantIdCounter++;
    const now = new Date();
    const tenant: Tenant = {
      ...insertTenant,
      id,
      createdAt: now,
      updatedAt: now,
      active: insertTenant.active ?? true,
      settings: insertTenant.settings ?? {},
      branding: insertTenant.branding ?? {
        primaryColor: '#4F46E5',
        logo: null,
        companyName: '',
        emailTemplate: 'default'
      }
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenants.get(id);
    if (!tenant) {
      throw new Error(`Tenant with id ${id} not found`);
    }
    
    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date()
    };
    
    // Update in the main Map
    this.tenants.set(id, updatedTenant);
    
    // Clear any cached entries to ensure fresh data is retrieved next time
    this.tenantCache.delete(`tenant:${id}`);
    
    // If apiKey or subdomain are being changed, clear cache entries for both old and new values
    if (updates.apiKey && updates.apiKey !== tenant.apiKey) {
      this.tenantByApiKeyCache.delete(tenant.apiKey); // Clear old apiKey cache
      this.tenantByApiKeyCache.delete(updates.apiKey); // Clear new apiKey cache just in case
    }
    
    if (updates.subdomain && updates.subdomain !== tenant.subdomain) {
      this.tenantBySubdomainCache.delete(tenant.subdomain); // Clear old subdomain cache
      this.tenantBySubdomainCache.delete(updates.subdomain); // Clear new subdomain cache just in case
    }
    
    console.log(`Cache entries cleared for tenant ID: ${id}`);
    
    return updatedTenant;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Check cache first for better performance and resilience
    const cacheKey = `user:${id}`;
    const cachedUser = this.userCache.get(cacheKey);
    if (cachedUser) {
      console.log(`User cache hit for ID: ${id}`);
      return cachedUser;
    }
    
    // Cache miss, look up in the map
    const user = this.users.get(id);
    
    // If found, add to cache for future requests
    if (user) {
      this.userCache.set(cacheKey, user);
      
      // Clear cache entry after 1 hour to avoid stale data
      setTimeout(() => {
        this.userCache.delete(cacheKey);
      }, 60 * 60 * 1000);
    }
    
    return user;
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    // Generate a cache key based on username and optional tenantId
    const cacheKey = tenantId ? `${username}:${tenantId}` : username;
    
    // Check cache first for faster response and resilience
    const cachedUser = this.userCache.get(cacheKey);
    if (cachedUser) {
      console.log(`User cache hit for username: ${username}`);
      return cachedUser;
    }
    
    // Cache miss, look up in the map
    let user: User | undefined;
    
    if (tenantId) {
      user = Array.from(this.users.values()).find(
        (user) => user.username === username && user.tenantId === tenantId
      );
    } else {
      user = Array.from(this.users.values()).find(
        (user) => user.username === username
      );
    }
    
    // If found, add to cache for future requests
    if (user) {
      this.userCache.set(cacheKey, user);
      
      // Clear cache entry after 1 hour to avoid stale data
      setTimeout(() => {
        this.userCache.delete(cacheKey);
      }, 60 * 60 * 1000);
    }
    
    return user;
  }
  
  async getUsersByTenantId(tenantId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.tenantId === tenantId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "user",
      name: insertUser.name || null,
      email: insertUser.email || null,
      tenantId: insertUser.tenantId || 1, // Default to tenant ID 1 if not specified
      
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
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    
    // Update in the main Map
    this.users.set(id, updatedUser);
    
    // Clear any cached entries to ensure fresh data is retrieved next time
    this.userCache.delete(`user:${id}`);
    
    // If username is being changed, clear cache entries for both old and new usernames
    if (updates.username && updates.username !== user.username) {
      // Clear old username cache
      const oldCacheKey = user.tenantId ? `${user.username}:${user.tenantId}` : user.username;
      this.userCache.delete(oldCacheKey);
      
      // Clear new username cache just in case it exists
      const newCacheKey = user.tenantId ? `${updates.username}:${user.tenantId}` : updates.username;
      this.userCache.delete(newCacheKey);
    }
    
    console.log(`Cache entries cleared for user ID: ${id}`);
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    // Delete the user from the main Map
    this.users.delete(id);
    
    // Clear any cached entries
    this.userCache.delete(`user:${id}`);
    
    // Clear username cache entries
    if (user.username) {
      const cacheKey = user.tenantId ? `${user.username}:${user.tenantId}` : user.username;
      this.userCache.delete(cacheKey);
    }
    
    console.log(`User with ID ${id} has been deleted`);
  }
  
  async getUserBySsoId(provider: string, providerId: string, tenantId?: number): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => 
        user.ssoProvider === provider && 
        user.ssoProviderId === providerId && 
        (!tenantId || user.tenantId === tenantId)
    );
  }
  
  // Identity Provider operations
  private identityProviders: Map<number, IdentityProvider> = new Map();
  private identityProviderIdCounter: number = 1;
  
  async getIdentityProviders(tenantId: number): Promise<IdentityProvider[]> {
    return Array.from(this.identityProviders.values()).filter(
      (provider) => provider.tenantId === tenantId
    );
  }
  
  async getIdentityProviderById(id: number, tenantId?: number): Promise<IdentityProvider | undefined> {
    const provider = this.identityProviders.get(id);
    if (tenantId && provider && provider.tenantId !== tenantId) {
      return undefined; // Don't return providers from other tenants
    }
    return provider;
  }
  
  async createIdentityProvider(insertProvider: InsertIdentityProvider): Promise<IdentityProvider> {
    const id = this.identityProviderIdCounter++;
    const now = new Date();
    
    const provider: IdentityProvider = {
      ...insertProvider,
      id,
      createdAt: now,
      updatedAt: now,
      enabled: insertProvider.enabled ?? true // Ensure enabled is not undefined
    };
    
    this.identityProviders.set(id, provider);
    return provider;
  }
  
  async updateIdentityProvider(id: number, updates: Partial<IdentityProvider>, tenantId?: number): Promise<IdentityProvider> {
    const provider = this.identityProviders.get(id);
    if (!provider) {
      throw new Error(`Identity provider with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure provider belongs to that tenant
    if (tenantId && provider.tenantId !== tenantId) {
      throw new Error(`Identity provider with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    const updatedProvider: IdentityProvider = {
      ...provider,
      ...updates,
      updatedAt: new Date()
    };
    
    this.identityProviders.set(id, updatedProvider);
    return updatedProvider;
  }
  
  async deleteIdentityProvider(id: number, tenantId?: number): Promise<boolean> {
    const provider = this.identityProviders.get(id);
    if (!provider) {
      return false;
    }
    
    // If tenantId is provided, ensure provider belongs to that tenant
    if (tenantId && provider.tenantId !== tenantId) {
      return false;
    }
    
    return this.identityProviders.delete(id);
  }
  
  // Ticket operations
  async getAllTickets(tenantId?: number): Promise<Ticket[]> {
    if (tenantId) {
      return Array.from(this.tickets.values()).filter(ticket => ticket.tenantId === tenantId);
    }
    return Array.from(this.tickets.values());
  }
  
  async getTicketById(id: number, tenantId?: number): Promise<Ticket | undefined> {
    // Generate a cache key with both id and optional tenantId
    const cacheKey = tenantId ? `ticket:${id}:${tenantId}` : `ticket:${id}`;
    
    // Check cache first for better performance and resilience
    const cachedTicket = this.ticketCache.get(cacheKey);
    if (cachedTicket) {
      console.log(`Ticket cache hit for ID: ${id}`);
      return cachedTicket;
    }
    
    // Cache miss, look up in the map
    const ticket = this.tickets.get(id);
    
    // If tenantId provided, verify ticket belongs to that tenant
    if (tenantId && ticket && ticket.tenantId !== tenantId) {
      return undefined; // Don't return tickets from other tenants
    }
    
    // If found and passes tenant check, add to cache for future requests
    if (ticket) {
      this.ticketCache.set(cacheKey, ticket);
      
      // Clear cache entry after 15 minutes to avoid stale data
      setTimeout(() => {
        this.ticketCache.delete(cacheKey);
      }, 15 * 60 * 1000);
    }
    
    return ticket;
  }
  
  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.ticketIdCounter++;
    const now = new Date();
    
    // Ensure all required properties have values
    const ticket = {
      ...insertTicket,
      id,
      tenantId: insertTicket.tenantId || 1, // Default to tenant ID 1 if not specified
      status: insertTicket.status || "new",
      aiResolved: insertTicket.aiResolved || false,
      complexity: insertTicket.complexity || "medium",
      assignedTo: insertTicket.assignedTo || null,
      aiNotes: insertTicket.aiNotes || null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null
    } as Ticket;
    
    // Store in main storage
    this.tickets.set(id, ticket);
    
    // Cache the new ticket for future lookups with both cache key formats
    const cacheKey = `ticket:${id}`;
    const tenantCacheKey = `ticket:${id}:${ticket.tenantId}`;
    
    this.ticketCache.set(cacheKey, ticket);
    this.ticketCache.set(tenantCacheKey, ticket);
    
    // Set expiration for cache entries (15 minutes)
    setTimeout(() => {
      this.ticketCache.delete(cacheKey);
      this.ticketCache.delete(tenantCacheKey);
    }, 15 * 60 * 1000);
    
    return ticket;
  }
  
  async updateTicket(id: number, updates: Partial<Ticket>, tenantId?: number): Promise<Ticket> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new Error(`Ticket with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure ticket belongs to that tenant
    if (tenantId && ticket.tenantId !== tenantId) {
      throw new Error(`Ticket with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      updatedAt: new Date()
    };
    
    // Update the ticket in the Map
    this.tickets.set(id, updatedTicket);
    
    // Clear cache entries for this ticket to ensure fresh data is retrieved next time
    // We clear both versions of the cache key (with and without tenantId)
    this.ticketCache.delete(`ticket:${id}`);
    if (tenantId) {
      this.ticketCache.delete(`ticket:${id}:${tenantId}`);
    }
    
    // If the ticket has a tenantId, also clear the cache entry with that tenantId
    if (ticket.tenantId) {
      this.ticketCache.delete(`ticket:${id}:${ticket.tenantId}`);
    }
    
    console.log(`Cache entries cleared for ticket ID: ${id}`);
    
    return updatedTicket;
  }
  
  // Message operations
  // Create a cache for messages by ticket ID
  private messagesByTicketCache: Map<number, Message[]> = new Map();
  
  async getMessagesByTicketId(ticketId: number): Promise<Message[]> {
    // Check cache first
    if (this.messagesByTicketCache.has(ticketId)) {
      console.log(`Message cache hit for ticket ID: ${ticketId}`);
      return this.messagesByTicketCache.get(ticketId) || [];
    }
    
    // Cache miss, look up in the map
    const messages = Array.from(this.messages.values())
      .filter(message => message.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Store in cache for future lookups
    this.messagesByTicketCache.set(ticketId, messages);
    
    // Set cache expiration (5 minutes)
    setTimeout(() => {
      this.messagesByTicketCache.delete(ticketId);
    }, 5 * 60 * 1000);
    
    return messages;
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message = {
      ...insertMessage,
      id,
      metadata: insertMessage.metadata || null,
      createdAt: now,
      updatedAt: now
    } as Message;
    
    // Store in main storage
    this.messages.set(id, message);
    
    // Update message cache for the related ticket if it exists
    const ticketId = message.ticketId;
    if (this.messagesByTicketCache.has(ticketId)) {
      const cachedMessages = this.messagesByTicketCache.get(ticketId) || [];
      cachedMessages.push(message);
      
      // Re-sort messages by creation time
      cachedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Update the cache
      this.messagesByTicketCache.set(ticketId, cachedMessages);
      console.log(`Message cache updated for ticket ID: ${ticketId}`);
    }
    
    // Invalidate ticket cache for this ticket to ensure updated ticket data is fetched
    // when ticket details are requested next time (to show updated message count, etc.)
    this.ticketCache.delete(`ticket:${ticketId}`);
    this.ticketCache.delete(`ticket:${ticketId}:${message.tenantId}`);
    
    return message;
  }
  
  // Attachment operations
  async getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]> {
    return Array.from(this.attachments.values())
      .filter(attachment => attachment.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async getAttachmentById(id: number): Promise<Attachment | undefined> {
    return this.attachments.get(id);
  }
  
  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = this.attachmentIdCounter++;
    const now = new Date();
    const attachment = {
      ...insertAttachment,
      id,
      createdAt: now
    } as Attachment;
    this.attachments.set(id, attachment);
    return attachment;
  }

  // Data source operations
  async getAllDataSources(tenantId?: number): Promise<DataSource[]> {
    if (tenantId) {
      return Array.from(this.dataSources.values())
        .filter(source => source.tenantId === tenantId)
        .sort((a, b) => a.priority - b.priority);
    }
    return Array.from(this.dataSources.values())
      .sort((a, b) => a.priority - b.priority);
  }

  async getEnabledDataSources(tenantId?: number): Promise<DataSource[]> {
    let sources = Array.from(this.dataSources.values())
      .filter(source => source.enabled);
    
    if (tenantId) {
      sources = sources.filter(source => source.tenantId === tenantId);
    }
    
    return sources.sort((a, b) => a.priority - b.priority);
  }

  async getDataSourceById(id: number, tenantId?: number): Promise<DataSource | undefined> {
    const dataSource = this.dataSources.get(id);
    
    if (tenantId && dataSource && dataSource.tenantId !== tenantId) {
      return undefined; // Don't return data sources from other tenants
    }
    
    return dataSource;
  }

  async createDataSource(insertDataSource: InsertDataSource): Promise<DataSource> {
    const id = this.dataSourceIdCounter++;
    const now = new Date();
    const dataSource: DataSource = {
      ...insertDataSource,
      id,
      description: insertDataSource.description || null,
      content: insertDataSource.content || null,
      enabled: insertDataSource.enabled ?? true,
      priority: insertDataSource.priority ?? 10,
      tenantId: insertDataSource.tenantId || 1, // Default to tenant ID 1 if not specified
      createdAt: now,
      updatedAt: now
    };
    this.dataSources.set(id, dataSource);
    return dataSource;
  }

  async updateDataSource(id: number, updates: Partial<DataSource>, tenantId?: number): Promise<DataSource> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure data source belongs to that tenant
    if (tenantId && dataSource.tenantId !== tenantId) {
      throw new Error(`Data source with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    const updatedDataSource: DataSource = {
      ...dataSource,
      ...updates,
      updatedAt: new Date()
    };
    
    this.dataSources.set(id, updatedDataSource);
    return updatedDataSource;
  }

  async deleteDataSource(id: number, tenantId?: number): Promise<boolean> {
    const dataSource = this.dataSources.get(id);
    
    if (!dataSource) {
      return false;
    }
    
    // If tenantId is provided, ensure data source belongs to that tenant
    if (tenantId && dataSource.tenantId !== tenantId) {
      throw new Error(`Data source with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    return this.dataSources.delete(id);
  }
  
  // AI provider operations
  async getAiProviders(tenantId: number): Promise<AiProvider[]> {
    return Array.from(this.aiProviders.values()).filter(
      (provider) => provider.tenantId === tenantId
    );
  }
  
  async getAiProviderById(id: number, tenantId?: number): Promise<AiProvider | undefined> {
    const provider = this.aiProviders.get(id);
    if (tenantId && provider && provider.tenantId !== tenantId) {
      return undefined; // Don't return providers from other tenants
    }
    return provider;
  }
  
  async getAiProvidersByType(type: string, tenantId: number): Promise<AiProvider[]> {
    return Array.from(this.aiProviders.values()).filter(
      (provider) => provider.type === type && provider.tenantId === tenantId
    );
  }
  
  async getPrimaryAiProvider(tenantId: number): Promise<AiProvider | undefined> {
    return Array.from(this.aiProviders.values()).find(
      (provider) => provider.tenantId === tenantId && provider.isPrimary === true && provider.enabled === true
    );
  }
  
  async createAiProvider(provider: InsertAiProvider): Promise<AiProvider> {
    const id = this.aiProviderIdCounter++;
    const now = new Date();
    
    // If this is marked as primary, ensure no other provider for this tenant is primary
    if (provider.isPrimary) {
      for (const existingProvider of this.aiProviders.values()) {
        if (existingProvider.tenantId === provider.tenantId && existingProvider.isPrimary) {
          // Set existing primary provider to not primary
          existingProvider.isPrimary = false;
          this.aiProviders.set(existingProvider.id, existingProvider);
        }
      }
    }
    
    const aiProvider: AiProvider = {
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
  
  async updateAiProvider(id: number, updates: Partial<AiProvider>, tenantId?: number): Promise<AiProvider> {
    const provider = this.aiProviders.get(id);
    if (!provider) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure provider belongs to that tenant
    if (tenantId && provider.tenantId !== tenantId) {
      throw new Error(`AI provider with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    // If this is being set as primary, ensure no other provider for this tenant is primary
    if (updates.isPrimary) {
      for (const existingProvider of this.aiProviders.values()) {
        if (existingProvider.id !== id && existingProvider.tenantId === provider.tenantId && existingProvider.isPrimary) {
          // Set existing primary provider to not primary
          existingProvider.isPrimary = false;
          this.aiProviders.set(existingProvider.id, existingProvider);
        }
      }
    }
    
    const updatedProvider: AiProvider = {
      ...provider,
      ...updates,
      updatedAt: new Date()
    };
    
    this.aiProviders.set(id, updatedProvider);
    return updatedProvider;
  }
  
  async deleteAiProvider(id: number, tenantId?: number): Promise<boolean> {
    const provider = this.aiProviders.get(id);
    if (!provider) {
      return false;
    }
    
    // If tenantId is provided, ensure provider belongs to that tenant
    if (tenantId && provider.tenantId !== tenantId) {
      return false;
    }
    
    return this.aiProviders.delete(id);
  }

  // Widget analytics operations
  async getWidgetAnalyticsByApiKey(apiKey: string): Promise<WidgetAnalytics | undefined> {
    return Array.from(this.widgetAnalyticsData.values()).find(
      (analytics) => analytics.apiKey === apiKey
    );
  }
  
  async getWidgetAnalyticsByAdminId(adminId: number, tenantId?: number): Promise<WidgetAnalytics[]> {
    return Array.from(this.widgetAnalyticsData.values()).filter(
      (analytics) => 
        analytics.adminId === adminId && 
        (!tenantId || analytics.tenantId === tenantId)
    );
  }
  
  async getAllWidgetAnalytics(tenantId?: number): Promise<WidgetAnalytics[]> {
    // Return all widget analytics, optionally filtered by tenant
    return Array.from(this.widgetAnalyticsData.values())
      .filter(analytics => {
        // Handle database fields using snake_case while code uses camelCase
        const analyticsAny = analytics as any;
        const analyticsWithSnakeCase = ('tenant_id' in analyticsAny) ? analyticsAny.tenant_id : analyticsAny.tenantId;
        return !tenantId || analyticsWithSnakeCase === tenantId;
      })
      .map(analytics => {
        // Map any snake_case fields to camelCase for consistency
        const result = { ...analytics };
        const analyticsAny = analytics as any;
        
        // Check if we have snake_case fields and map them
        if ('tenant_id' in analyticsAny) {
          result.tenantId = analyticsAny.tenant_id;
        }
        if ('admin_id' in analyticsAny) {
          result.adminId = analyticsAny.admin_id;
        }
        if ('client_website' in analyticsAny) {
          result.clientWebsite = analyticsAny.client_website;
        }
        if ('client_info' in analyticsAny) {
          result.clientInfo = analyticsAny.client_info;
        }
        if ('messages_received' in analyticsAny) {
          result.messagesReceived = analyticsAny.messages_received;
        }
        if ('messages_sent' in analyticsAny) {
          result.messagesSent = analyticsAny.messages_sent;
        }
        if ('tickets_created' in analyticsAny) {
          result.ticketsCreated = analyticsAny.tickets_created;
        }
        if ('last_activity' in analyticsAny) {
          result.lastActivity = analyticsAny.last_activity;
        }
        if ('last_client_ip' in analyticsAny) {
          result.lastClientIp = analyticsAny.last_client_ip;
        }
        if ('created_at' in analyticsAny) {
          result.createdAt = analyticsAny.created_at;
        }
        if ('updated_at' in analyticsAny) {
          result.updatedAt = analyticsAny.updated_at;
        }
        
        return result;
      });
  }
  
  async createWidgetAnalytics(insertAnalytics: InsertWidgetAnalytics): Promise<WidgetAnalytics> {
    const id = this.widgetAnalyticsIdCounter++;
    const now = new Date();
    
    const analytics: WidgetAnalytics = {
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
  
  async updateWidgetAnalytics(id: number, updates: Partial<WidgetAnalytics>): Promise<WidgetAnalytics> {
    const analytics = this.widgetAnalyticsData.get(id);
    if (!analytics) {
      throw new Error(`Widget analytics with id ${id} not found`);
    }
    
    const updatedAnalytics: WidgetAnalytics = {
      ...analytics,
      ...updates,
      updatedAt: new Date()
    };
    
    this.widgetAnalyticsData.set(id, updatedAnalytics);
    return updatedAnalytics;
  }
  
  // Support document operations
  async getAllSupportDocuments(tenantId?: number): Promise<SupportDocument[]> {
    let documents = Array.from(this.supportDocuments.values());
    
    if (tenantId) {
      documents = documents.filter(doc => doc.tenantId === tenantId);
    }
    
    // Sort by priority (highest first)
    return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  
  async getSupportDocumentById(id: number, tenantId?: number): Promise<SupportDocument | undefined> {
    // Check cache first for better performance
    const cacheKey = `document:${id}`;
    const cachedDocument = this.supportDocumentCache.get(cacheKey);
    
    if (cachedDocument) {
      console.log(`Document cache hit for ID: ${id}`);
      // If tenantId is provided, ensure the cached document belongs to that tenant
      if (tenantId && cachedDocument.tenantId !== tenantId) {
        return undefined;
      }
      return cachedDocument;
    }
    
    // Cache miss, look up in the map
    const document = this.supportDocuments.get(id);
    
    // If tenantId is provided, ensure the document belongs to that tenant
    if (document && (!tenantId || document.tenantId === tenantId)) {
      // Add to cache for future requests
      this.supportDocumentCache.set(cacheKey, document);
      
      // Clear cache entry after 10 minutes to avoid stale data
      setTimeout(() => {
        this.supportDocumentCache.delete(cacheKey);
      }, 10 * 60 * 1000);
      
      return document;
    }
    
    return undefined;
  }
  
  async getSupportDocumentsByCategory(category: string, tenantId?: number): Promise<SupportDocument[]> {
    let documents = Array.from(this.supportDocuments.values());
    
    // Filter by category and optionally by tenant
    documents = documents.filter(doc => 
      doc.category === category && 
      (!tenantId || doc.tenantId === tenantId)
    );
    
    // Sort by priority (highest first)
    return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  
  async getSupportDocumentsByStatus(status: string, tenantId?: number): Promise<SupportDocument[]> {
    let documents = Array.from(this.supportDocuments.values());
    
    // Filter by status and optionally by tenant
    documents = documents.filter(doc => 
      doc.status === status && 
      (!tenantId || doc.tenantId === tenantId)
    );
    
    // Sort by priority (highest first)
    return documents.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  
  async searchSupportDocuments(query: string, tenantId?: number): Promise<SupportDocument[]> {
    if (!query) {
      return this.getAllSupportDocuments(tenantId);
    }
    
    const lowercaseQuery = query.toLowerCase();
    let documents = Array.from(this.supportDocuments.values());
    
    // Filter by tenant if specified
    if (tenantId) {
      documents = documents.filter(doc => doc.tenantId === tenantId);
    }
    
    // Search across title, content, category, and tags in metadata
    documents = documents.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) || 
      doc.content.toLowerCase().includes(lowercaseQuery) || 
      doc.category.toLowerCase().includes(lowercaseQuery) ||
      // Check tags in metadata if they exist
      (doc.metadata && 
       doc.metadata.tags && 
       Array.isArray(doc.metadata.tags) && 
       doc.metadata.tags.some((tag: string) => 
         tag.toLowerCase().includes(lowercaseQuery)
       ))
    );
    
    // Sort by relevance (currently just priority) and then by view count if available
    return documents.sort((a, b) => {
      // First sort by priority
      const priorityDiff = (a.priority || 0) - (b.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by view count if available
      return (b.viewCount || 0) - (a.viewCount || 0);
    });
  }
  
  async createSupportDocument(document: InsertSupportDocument): Promise<SupportDocument> {
    const id = this.supportDocumentIdCounter++;
    const now = new Date();
    
    const newDocument: SupportDocument = {
      ...document,
      id,
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
      status: document.status || "draft"
    };
    
    this.supportDocuments.set(id, newDocument);
    
    // Clear any category-based caches
    // In a real application, we might have category-based caches to clear
    
    return newDocument;
  }
  
  async updateSupportDocument(id: number, updates: Partial<SupportDocument>, tenantId?: number): Promise<SupportDocument> {
    const document = this.supportDocuments.get(id);
    
    if (!document) {
      throw new Error(`Support document with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure the document belongs to that tenant
    if (tenantId && document.tenantId !== tenantId) {
      throw new Error(`Support document with id ${id} not found in tenant ${tenantId}`);
    }
    
    const updatedDocument: SupportDocument = {
      ...document,
      ...updates,
      updatedAt: new Date()
    };
    
    this.supportDocuments.set(id, updatedDocument);
    
    // Clear document from cache to ensure fresh data is retrieved next time
    this.supportDocumentCache.delete(`document:${id}`);
    
    return updatedDocument;
  }
  
  async deleteSupportDocument(id: number, tenantId?: number): Promise<boolean> {
    const document = this.supportDocuments.get(id);
    
    if (!document) {
      return false;
    }
    
    // If tenantId is provided, ensure the document belongs to that tenant
    if (tenantId && document.tenantId !== tenantId) {
      return false;
    }
    
    // Delete the document
    const result = this.supportDocuments.delete(id);
    
    // Clear document from cache
    this.supportDocumentCache.delete(`document:${id}`);
    
    return result;
  }
  
  async incrementDocumentViewCount(id: number): Promise<void> {
    const document = this.supportDocuments.get(id);
    
    if (!document) {
      throw new Error(`Support document with id ${id} not found`);
    }
    
    // Increment view count
    const updatedDocument: SupportDocument = {
      ...document,
      viewCount: (document.viewCount || 0) + 1,
      updatedAt: new Date()
    };
    
    this.supportDocuments.set(id, updatedDocument);
    
    // Update cache if document is cached
    const cacheKey = `document:${id}`;
    if (this.supportDocumentCache.has(cacheKey)) {
      this.supportDocumentCache.set(cacheKey, updatedDocument);
    }
    
    // Log document usage
    await this.logDocumentUsage({
      documentId: id,
      tenantId: document.tenantId,
      timestamp: new Date(),
      userId: null,
      context: 'view',
      metadata: null
    });
  }
  
  // Document usage operations
  async logDocumentUsage(usage: InsertDocumentUsage): Promise<DocumentUsage> {
    const id = this.documentUsageIdCounter++;
    const now = new Date();
    
    const newUsage: DocumentUsage = {
      ...usage,
      id,
      createdAt: now
    };
    
    this.documentUsageData.set(id, newUsage);
    return newUsage;
  }
  
  async getDocumentUsageById(id: number): Promise<DocumentUsage | undefined> {
    return this.documentUsageData.get(id);
  }
  
  async getDocumentUsageByDocumentId(documentId: number): Promise<DocumentUsage[]> {
    const usages = Array.from(this.documentUsageData.values());
    return usages.filter(usage => usage.documentId === documentId);
  }
  
  async getDocumentUsageAnalytics(startDate: Date, endDate: Date, tenantId?: number): Promise<any> {
    let usages = Array.from(this.documentUsageData.values());
    
    // Filter by date range
    usages = usages.filter(usage => 
      usage.timestamp >= startDate && 
      usage.timestamp <= endDate
    );
    
    // Filter by tenant if specified
    if (tenantId) {
      usages = usages.filter(usage => usage.tenantId === tenantId);
    }
    
    // Build analytics data
    const viewsByDocument = new Map<number, number>();
    const viewsByCategory = new Map<string, number>();
    const viewsByDay = new Map<string, number>();
    
    for (const usage of usages) {
      // Count by document
      const docViews = viewsByDocument.get(usage.documentId) || 0;
      viewsByDocument.set(usage.documentId, docViews + 1);
      
      // Count by category (needs document lookup)
      const document = await this.getSupportDocumentById(usage.documentId);
      if (document) {
        const categoryViews = viewsByCategory.get(document.category) || 0;
        viewsByCategory.set(document.category, categoryViews + 1);
      }
      
      // Count by day
      const day = usage.timestamp.toISOString().split('T')[0];
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
  
  // Team operations
  async getAllTeams(tenantId?: number): Promise<Team[]> {
    const teams = Array.from(this.teams.values());
    if (tenantId) {
      return teams.filter(team => team.tenantId === tenantId);
    }
    return teams;
  }
  
  async getTeamById(id: number, tenantId?: number): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    if (tenantId && team.tenantId !== tenantId) {
      return undefined;
    }
    
    return team;
  }
  
  async createTeam(team: InsertTeam): Promise<Team> {
    const id = this.teamIdCounter++;
    const now = new Date();
    
    const newTeam: Team = {
      ...team,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.teams.set(id, newTeam);
    return newTeam;
  }
  
  async updateTeam(id: number, updates: Partial<Team>, tenantId?: number): Promise<Team> {
    const team = await this.getTeamById(id, tenantId);
    if (!team) {
      throw new Error(`Team with ID ${id} not found`);
    }
    
    const updatedTeam: Team = {
      ...team,
      ...updates,
      id, // Ensure the ID doesn't change
      updatedAt: new Date()
    };
    
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }
  
  async deleteTeam(id: number, tenantId?: number): Promise<boolean> {
    const team = await this.getTeamById(id, tenantId);
    if (!team) {
      return false;
    }
    
    return this.teams.delete(id);
  }
  
  async getUsersByTeamId(teamId: number, tenantId?: number): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.filter(user => {
      if (user.teamId !== teamId) return false;
      if (tenantId && user.tenantId !== tenantId) return false;
      return true;
    });
  }
  
  async getTicketsByTeamId(teamId: number, tenantId?: number): Promise<Ticket[]> {
    const tickets = Array.from(this.tickets.values());
    return tickets.filter(ticket => {
      if (ticket.teamId !== teamId) return false;
      if (tenantId && ticket.tenantId !== tenantId) return false;
      return true;
    });
  }
}

// Database Storage implementation

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  private memoryStore: session.Store;
  private postgreStore: any;
  private useMemoryFallback: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  
  // Add memory caches for critical resources
  private userCache: Map<number, User> = new Map();
  private userByUsernameCache: Map<string, User> = new Map();
  private tenantCache: Map<number, Tenant> = new Map();
  private tenantByApiKeyCache: Map<string, Tenant> = new Map();
  private tenantBySubdomainCache: Map<string, Tenant> = new Map();
  private ticketCache: Map<string, Ticket> = new Map();
  
  // Helper method to clear all cached data for a user by ID
  private clearUserFromCache(userId: number): void {
    // First, get the user from cache to find username
    const cachedUser = this.userCache.get(userId);
    
    // Remove from ID cache
    this.userCache.delete(userId);
    
    // If we found the cached user, also remove by username
    if (cachedUser) {
      const usernameKey = cachedUser.tenantId 
        ? `${cachedUser.username}:${cachedUser.tenantId}` 
        : cachedUser.username;
      this.userByUsernameCache.delete(usernameKey);
    }
    
    console.log(`Cache entries cleared for user ID: ${userId}`);
  }
  
  // Helper method to clear all cached data for a tenant by ID
  private clearTenantFromCache(tenantId: number): void {
    // First, get the tenant from cache to find other keys
    const cachedTenant = this.tenantCache.get(tenantId);
    
    // Remove from ID cache
    this.tenantCache.delete(tenantId);
    
    // If we found the cached tenant, also remove by apiKey and subdomain
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
  
  // Default fallback user for admin account (used as last resort during severe database failures)
  private readonly FALLBACK_ADMIN_USER: User = {
    id: 1,
    tenantId: 1,
    username: 'admin',
    password: 'admin123', // This is hashed in a real implementation
    role: 'admin',
    name: 'Admin User',
    email: 'admin@example.com',
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: null,
    ssoEnabled: false,
    ssoProvider: null,
    ssoProviderId: null,
    ssoProviderData: {},
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  constructor() {
    // Always initialize memory store as fallback
    this.setupMemoryStore('Initialization');
    this.memoryStore = this.sessionStore;
    
    try {
      console.log('Setting up PostgreSQL session store - Environment:', isProduction ? 'Production' : 'Development');
      
      // Check if DATABASE_URL is available before attempting to connect
      if (process.env.DATABASE_URL) {
        try {
          // Initialize PostgreSQL session store with enhanced error handling and timeout settings
          const PostgresStore = connectPg(session);
          const postgresStoreOptions = {
            pool, 
            tableName: 'session',
            createTableIfMissing: true,
            // More aggressive timeouts for production
            ttl: 86400, // 24 hours in seconds
            disableTouch: false,
            // Enhanced error logging with more context
            errorLog: (err: any) => {
              console.error('PostgreSQL session store error:', err);
              
              // Check for connection-related errors
              const isConnectionError = 
                (err && typeof err === 'object' && 
                (err.code === 'ECONNREFUSED' || 
                 err.code === 'ETIMEDOUT' || 
                 err.code === 'ENOTFOUND' ||
                 err.code === '57P01' || // terminating connection due to administrator command
                 err.code === '08006' || // connection failure
                 err.code === '08001' || // unable to connect
                 (err.message && (
                   err.message.includes('Connection terminated') ||
                   err.message.includes('timeout')
                 ))
                ));
              
              // If this is a connection error, switch to memory store and start reconnect attempts
              if (isConnectionError && !this.useMemoryFallback) {
                console.log('Database connection error detected, switching to memory store temporarily');
                this.useMemoryFallback = true;
                this.sessionStore = this.memoryStore;
                
                // Start reconnection attempts if not already running
                this.startReconnectAttempts();
              }
            }
          };
          
          // Create the PostgreSQL store
          this.postgreStore = new PostgresStore(postgresStoreOptions);
          this.sessionStore = this.postgreStore;
          console.log('PostgreSQL session store initialized successfully');
          
          // Test the connection immediately
          this.testSessionStore();
        } catch (dbError) {
          console.error('Failed to initialize PostgreSQL session store:', dbError);
          this.useMemoryFallback = true;
        }
      } else {
        console.log('No DATABASE_URL provided, using memory session store');
        this.useMemoryFallback = true;
      }
    } catch (error) {
      console.error('Critical error during storage initialization:', error);
      this.useMemoryFallback = true;
    }
    
    // Set up periodic health check for the database
    setInterval(() => this.checkDatabaseHealth(), 30000); // Check every 30 seconds
  }
  
  // Helper method to test the session store connection
  private async testSessionStore() {
    try {
      // Simple test: try to set and get a test session
      const testSessionId = `test-${Date.now()}`;
      await new Promise<void>((resolve, reject) => {
        if (this.postgreStore) {
          this.postgreStore.set(testSessionId, { test: true }, (err: any) => {
            if (err) {
              reject(err);
            } else {
              this.postgreStore.get(testSessionId, (err: any, session: any) => {
                if (err) {
                  reject(err);
                } else if (!session || !session.test) {
                  reject(new Error('Test session not found or invalid'));
                } else {
                  this.postgreStore.destroy(testSessionId, () => {
                    resolve();
                  });
                }
              });
            }
          });
        } else {
          reject(new Error('PostgreSQL store not initialized'));
        }
      });
      console.log('Session store connection test successful');
      
      // If we were using the memory fallback, switch back to PostgreSQL
      if (this.useMemoryFallback && this.postgreStore) {
        console.log('Switching back to PostgreSQL session store after successful test');
        this.useMemoryFallback = false;
        this.sessionStore = this.postgreStore;
        this.reconnectAttempts = 0;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    } catch (error) {
      console.error('Session store connection test failed:', error);
      
      // If not already using memory fallback, switch to it
      if (!this.useMemoryFallback) {
        console.log('Switching to memory store fallback after failed connection test');
        this.useMemoryFallback = true;
        this.sessionStore = this.memoryStore;
        
        // Start reconnection attempts
        this.startReconnectAttempts();
      }
    }
  }
  
  // Start periodic reconnection attempts
  private startReconnectAttempts() {
    // Don't start multiple intervals
    if (this.reconnectInterval) return;
    
    this.reconnectAttempts = 0;
    this.reconnectInterval = setInterval(() => {
      this.reconnectAttempts++;
      console.log(`PostgreSQL reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
      
      // Try to reconnect
      this.testSessionStore();
      
      // If too many attempts or a successful reconnection occurred, stop trying
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS || !this.useMemoryFallback) {
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    }, 5000); // Try every 5 seconds
  }
  
  // Periodic health check
  private async checkDatabaseHealth() {
    // Only check if we should be using PostgreSQL but aren't
    if (process.env.DATABASE_URL && this.useMemoryFallback) {
      console.log('Running periodic database health check');
      await this.testSessionStore();
    }
  }
  
  // Helper method to set up memory session store
  private setupMemoryStore(reason: string) {
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    console.log(`Memory session store initialized as fallback. Reason: ${reason}`);
  }
  
  // AI provider operations
  async getAiProviders(tenantId: number): Promise<AiProvider[]> {
    return await db.select().from(aiProviders).where(eq(aiProviders.tenantId, tenantId));
  }
  
  async getAiProviderById(id: number, tenantId?: number): Promise<AiProvider | undefined> {
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
  
  async getAiProvidersByType(type: string, tenantId: number): Promise<AiProvider[]> {
    return await db.select().from(aiProviders).where(
      and(eq(aiProviders.type, type), eq(aiProviders.tenantId, tenantId))
    );
  }
  
  async getPrimaryAiProvider(tenantId: number): Promise<AiProvider | undefined> {
    const results = await db.select().from(aiProviders).where(
      and(
        eq(aiProviders.tenantId, tenantId),
        eq(aiProviders.isPrimary, true),
        eq(aiProviders.enabled, true)
      )
    );
    return results[0];
  }
  
  async createAiProvider(provider: InsertAiProvider): Promise<AiProvider> {
    // If this is marked as primary, clear any existing primary providers for this tenant
    if (provider.isPrimary) {
      await db.update(aiProviders)
        .set({ isPrimary: false })
        .where(
          and(
            eq(aiProviders.tenantId, provider.tenantId),
            eq(aiProviders.isPrimary, true)
          )
        );
    }
    
    const [result] = await db.insert(aiProviders).values(provider).returning();
    return result;
  }
  
  async updateAiProvider(id: number, updates: Partial<AiProvider>, tenantId?: number): Promise<AiProvider> {
    // Get the provider first to check tenantId if needed
    const provider = await this.getAiProviderById(id);
    
    if (!provider) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    
    // If tenantId is provided, ensure provider belongs to that tenant
    if (tenantId && provider.tenantId !== tenantId) {
      throw new Error(`AI provider with id ${id} does not belong to tenant ${tenantId}`);
    }
    
    try {
      // If this is being set as primary, we need to handle the unique constraint
      if (updates.isPrimary === true) {
        console.log(`Updating provider ${id} to be primary`);
        
        // First clear all primary providers for this tenant in a single transaction
        await db.transaction(async (tx) => {
          // Step 1: Clear primary flag on all providers except this one
          await tx.update(aiProviders)
            .set({ isPrimary: false })
            .where(
              and(
                eq(aiProviders.tenantId, provider.tenantId),
                eq(aiProviders.isPrimary, true)
              )
            );
            
          // Step 2: Set this provider as primary
          await tx.update(aiProviders)
            .set({ 
              ...updates, 
              isPrimary: true, 
              updatedAt: new Date() 
            })
            .where(eq(aiProviders.id, id));
        });
        
        // Get the updated provider
        const [updated] = await db
          .select()
          .from(aiProviders)
          .where(eq(aiProviders.id, id));
          
        return updated;
      } else {
        // Regular update without changing primary status
        const [updated] = await db
          .update(aiProviders)
          .set({ ...updates, updatedAt: new Date() })
          .where(
            tenantId
              ? and(eq(aiProviders.id, id), eq(aiProviders.tenantId, tenantId))
              : eq(aiProviders.id, id)
          )
          .returning();
          
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
  
  async deleteAiProvider(id: number, tenantId?: number): Promise<boolean> {
    const deleteResult = await db
      .delete(aiProviders)
      .where(
        tenantId
          ? and(eq(aiProviders.id, id), eq(aiProviders.tenantId, tenantId))
          : eq(aiProviders.id, id)
      );
      
    return (deleteResult.count ?? 0) > 0;
  }

  // Tenant operations with caching
  async getTenantById(id: number): Promise<Tenant | undefined> {
    // Check cache first for performance
    if (this.tenantCache.has(id)) {
      console.log(`Tenant cache hit for ID: ${id}`);
      return this.tenantCache.get(id);
    }
    
    // Use resilient query with cache update
    return executeQuery<Tenant | undefined>(
      async () => {
        try {
          const results = await db.select().from(tenants).where(eq(tenants.id, id));
          const tenant = results[0];
          
          if (tenant) {
            // Update all relevant caches
            this.tenantCache.set(id, tenant);
            if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
            if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
          }
          
          return tenant;
        } catch (error) {
          console.error(`Error fetching tenant with ID ${id}:`, error);
          throw error;
        }
      },
      // No fallback for tenant operations
      undefined,
      {
        retries: 2,
        initialDelay: 100,
        timeoutMs: 3000,
        logPrefix: `getTenantById(${id})`
      }
    );
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    // Check cache first
    if (this.tenantByApiKeyCache.has(apiKey)) {
      console.log(`Tenant cache hit for API key: ${apiKey}`);
      return this.tenantByApiKeyCache.get(apiKey);
    }
    
    // Use resilient query with cache update
    return executeQuery<Tenant | undefined>(
      async () => {
        try {
          const results = await db.select().from(tenants).where(eq(tenants.apiKey, apiKey));
          const tenant = results[0];
          
          if (tenant) {
            // Update all relevant caches
            this.tenantCache.set(tenant.id, tenant);
            this.tenantByApiKeyCache.set(apiKey, tenant);
            if (tenant.subdomain) this.tenantBySubdomainCache.set(tenant.subdomain, tenant);
          }
          
          return tenant;
        } catch (error) {
          console.error(`Error fetching tenant by API key ${apiKey}:`, error);
          throw error;
        }
      },
      // No fallback for tenant operations
      undefined,
      {
        retries: 2,
        initialDelay: 100,
        timeoutMs: 3000,
        logPrefix: `getTenantByApiKey(${apiKey})`
      }
    );
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    // Check cache first
    if (this.tenantBySubdomainCache.has(subdomain)) {
      console.log(`Tenant cache hit for subdomain: ${subdomain}`);
      return this.tenantBySubdomainCache.get(subdomain);
    }
    
    // Use resilient query with cache update
    return executeQuery<Tenant | undefined>(
      async () => {
        try {
          const results = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
          const tenant = results[0];
          
          if (tenant) {
            // Update all relevant caches
            this.tenantCache.set(tenant.id, tenant);
            if (tenant.apiKey) this.tenantByApiKeyCache.set(tenant.apiKey, tenant);
            this.tenantBySubdomainCache.set(subdomain, tenant);
          }
          
          return tenant;
        } catch (error) {
          console.error(`Error fetching tenant by subdomain ${subdomain}:`, error);
          throw error;
        }
      },
      // No fallback for tenant operations
      undefined,
      {
        retries: 2,
        initialDelay: 100,
        timeoutMs: 3000,
        logPrefix: `getTenantBySubdomain(${subdomain})`
      }
    );
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(asc(tenants.name));
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    const [updated] = await db
      .update(tenants)
      .set({...updates, updatedAt: new Date()})
      .where(eq(tenants.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Tenant with ID ${id} not found`);
    }
    
    return updated;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Check memory cache first
    if (this.userCache.has(id)) {
      console.log(`User cache hit for ID: ${id}`);
      return this.userCache.get(id);
    }
    
    // Special handling for admin user to ensure authentication works even during DB failures
    if (id === 1) {
      console.log('Special handling for admin user lookup by ID');
      
      // Use resilient query approach with admin fallback
      return executeQuery<User | undefined>(
        async () => {
          try {
            // Use sql query directly to avoid column name case issues
            const result = await db.execute(
              sql`SELECT * FROM users WHERE id = ${id}`
            );
            
            if (result.rows.length === 0) {
              console.log(`No user found for ID: ${id}`);
              return undefined;
            }
            
            // Get the first row of data from the result
            const user = result.rows[0];
            
            // Standardize field names by creating a consistent object
            const standardizedUser: User = {
              id: user.id,
              tenantId: user.tenantid || user.tenantId,
              username: user.username,
              password: user.password,
              role: user.role,
              name: user.name,
              email: user.email,
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
            
            // Cache the result for future lookups
            this.userCache.set(id, standardizedUser);
            if (standardizedUser.username) {
              const cacheKey = standardizedUser.tenantId 
                ? `${standardizedUser.username}:${standardizedUser.tenantId}` 
                : standardizedUser.username;
              this.userByUsernameCache.set(cacheKey, standardizedUser);
            }
            
            return standardizedUser;
          } catch (error) {
            console.error(`Error fetching user with ID ${id}:`, error);
            
            // For admin user (id=1), use fallback if error occurs
            if (id === 1) {
              console.warn('Using fallback admin user due to database error');
              return this.FALLBACK_ADMIN_USER;
            }
            
            throw error;
          }
        },
        // Fallback for admin user
        () => {
          if (id === 1) {
            console.warn('Database unavailable - Using fallback admin user');
            return Promise.resolve(this.FALLBACK_ADMIN_USER);
          }
          return Promise.resolve(undefined);
        },
        {
          retries: 3,
          initialDelay: 100,
          timeoutMs: 5000,
          logPrefix: `getUser(${id})`
        }
      );
    }
    
    // For non-admin users, use regular resilient query without fallback
    return executeQuery<User | undefined>(
      async () => {
        try {
          // Use sql query directly to avoid column name case issues
          const result = await db.execute(
            sql`SELECT * FROM users WHERE id = ${id}`
          );
          
          if (result.rows.length === 0) {
            console.log(`No user found for ID: ${id}`);
            return undefined;
          }
          
          // Get the first row of data from the result
          const user = result.rows[0];
          
          // Standardize field names by creating a consistent object
          const standardizedUser: User = {
            id: user.id,
            tenantId: user.tenantid || user.tenantId,
            username: user.username,
            password: user.password,
            role: user.role,
            name: user.name,
            email: user.email,
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
          
          // Cache the result for future lookups
          this.userCache.set(id, standardizedUser);
          if (standardizedUser.username) {
            const cacheKey = standardizedUser.tenantId 
              ? `${standardizedUser.username}:${standardizedUser.tenantId}` 
              : standardizedUser.username;
            this.userByUsernameCache.set(cacheKey, standardizedUser);
          }
          
          return standardizedUser;
        } catch (error) {
          console.error(`Error fetching user with ID ${id}:`, error);
          throw error;
        }
      },
      undefined, // No fallback for non-admin users
      {
        retries: 3,
        initialDelay: 100,
        timeoutMs: 5000,
        logPrefix: `getUser(${id})`
      }
    );
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    // Check cache first (this is super fast)
    const cacheKey = tenantId ? `${username}:${tenantId}` : username;
    if (this.userByUsernameCache.has(cacheKey)) {
      console.log(`User cache hit for username: ${username}`);
      return this.userByUsernameCache.get(cacheKey);
    }
    
    // Special handling for admin user to ensure authentication works even during DB failures
    if (username === 'admin' && (!tenantId || tenantId === 1)) {
      console.log('Special handling for admin user lookup');
      // Double check if admin exists in the database first with our resilient DB executor
      return await executeQuery<User | undefined>(
        async () => {
          // Regular database query with proper error handling
          try {
            // Use sql query with parameterized values to avoid column name case issues
            let query;
            if (tenantId) {
              query = sql`SELECT * FROM users WHERE username = ${username} AND "tenantId" = ${tenantId}`;
            } else {
              query = sql`SELECT * FROM users WHERE username = ${username}`;
            }
            
            console.log(`Executing getUserByUsername for: ${username}${tenantId ? ` in tenant ${tenantId}` : ''}`);
            
            const result = await db.execute(query);
            
            if (result.rows.length === 0) {
              return undefined;
            }
            
            // Get the first row of data from the result
            const user = result.rows[0];
            
            // Construct a well-formed User object
            const standardizedUser: User = {
              id: user.id,
              tenantId: user.tenantid || user.tenantId,
              username: user.username,
              password: user.password,
              role: user.role,
              name: user.name,
              email: user.email,
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
            
            // Cache the user object for future requests
            this.userByUsernameCache.set(cacheKey, standardizedUser);
            this.userCache.set(standardizedUser.id, standardizedUser);
            
            return standardizedUser;
          } catch (error) {
            console.error(`Error fetching user by username '${username}':`, error);
            
            // Critical authentication path - give special handling for admin user
            if (username === 'admin' && (!tenantId || tenantId === 1)) {
              console.warn('Using fallback admin user due to database error');
              return this.FALLBACK_ADMIN_USER;
            }
            
            throw error;
          }
        },
        // Use fallback for admin user when database is unavailable
        () => {
          console.warn('Database unavailable. Using fallback admin user');
          return Promise.resolve(this.FALLBACK_ADMIN_USER);
        },
        { 
          retries: 3,
          initialDelay: 100,
          timeoutMs: 5000,
          logPrefix: `getUserByUsername(${username})`
        }
      );
    }
    
    // For non-admin users, use a regular resilient query but with no fallback
    return executeQuery<User | undefined>(
      async () => {
        try {
          // Use sql query with parameterized values to avoid column name case issues
          let query;
          if (tenantId) {
            query = sql`SELECT * FROM users WHERE username = ${username} AND "tenantId" = ${tenantId}`;
          } else {
            query = sql`SELECT * FROM users WHERE username = ${username}`;
          }
          
          const result = await db.execute(query);
          
          if (result.rows.length === 0) {
            return undefined;
          }
          
          // Get the first row of data from the result
          const user = result.rows[0];
          
          // Construct a User object
          const standardizedUser: User = {
            id: user.id,
            tenantId: user.tenantid || user.tenantId,
            username: user.username,
            password: user.password,
            role: user.role,
            name: user.name,
            email: user.email,
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
          
          // Cache the user for future lookups
          this.userByUsernameCache.set(cacheKey, standardizedUser);
          this.userCache.set(standardizedUser.id, standardizedUser);
          
          return standardizedUser;
        } catch (error) {
          console.error(`Error in getUserByUsername for ${username}:`, error);
          throw error;
        }
      },
      undefined, // No fallback for regular users
      { 
        retries: 3,
        initialDelay: 100,
        timeoutMs: 5000,
        logPrefix: `getUserByUsername(${username})`
      }
    );
  }

  async getUsersByTenantId(tenantId: number): Promise<User[]> {
    try {
      // Use SQL directly to avoid case sensitivity issues
      const result = await db.execute(sql`
        SELECT * FROM users WHERE "tenantId" = ${tenantId}
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return [];
      }
      
      // Transform the database rows to match our User type
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenantid,
        username: row.username,
        password: row.password,
        role: row.role,
        name: row.name,
        email: row.email,
        mfaEnabled: row.mfaenabled || false,
        mfaSecret: row.mfasecret || null,
        mfaBackupCodes: row.mfabackupcodes || [],
        ssoEnabled: row.ssoenabled || false,
        ssoProvider: row.ssoprovider || null,
        ssoProviderId: row.ssoproviderid || null,
        ssoProviderData: row.ssoproviderdata || {},
        createdAt: row.createdat,
        updatedAt: row.updatedat
      })) as User[];
    } catch (error) {
      console.error("Error fetching users by tenant ID:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Create a SQL query that explicitly names the columns to avoid case sensitivity issues
      // Use drizzle SQL helpers instead of raw execute to properly handle parameter binding
      const result = await db.execute(sql`
        INSERT INTO users (
          username, password, role, name, email, "tenantId", 
          mfaenabled, mfabackupcodes, ssoenabled, ssoproviderdata
        ) 
        VALUES (
          ${insertUser.username},
          ${insertUser.password},
          ${insertUser.role || 'user'},
          ${insertUser.name || null},
          ${insertUser.email || null},
          ${insertUser.tenantId || 1},
          ${false}, 
          ${'[]'}, 
          ${false}, 
          ${'{}'}
        )
        RETURNING *
      `);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create user');
      }
      
      const rawUser = result.rows[0];
      
      // Map the database field names to match our expected User type
      const user = {
        id: rawUser.id,
        tenantId: rawUser.tenantid || 1,
        username: rawUser.username,
        password: rawUser.password,
        role: rawUser.role,
        name: rawUser.name,
        email: rawUser.email,
        mfaEnabled: rawUser.mfaenabled || false,
        mfaSecret: rawUser.mfasecret || null,
        mfaBackupCodes: rawUser.mfabackupcodes || [],
        ssoEnabled: rawUser.ssoenabled || false,
        ssoProvider: rawUser.ssoprovider || null,
        ssoProviderId: rawUser.ssoproviderid || null,
        ssoProviderData: rawUser.ssoproviderdata || {},
        createdAt: rawUser.createdat,
        updatedAt: rawUser.updatedat
      } as User;
      
      // Add the new user to the cache immediately for better performance
      try {
        // Cache by ID
        this.userCache.set(user.id, user);
        
        // Cache by username (with tenant ID if provided)
        const usernameKey = user.tenantId 
          ? `${user.username}:${user.tenantId}` 
          : user.username;
        this.userByUsernameCache.set(usernameKey, user);
        
        console.log(`New user ${user.username} (ID: ${user.id}) added to cache`);
      } catch (cacheError) {
        // Non-fatal error - just log it
        console.error(`Failed to add new user to cache:`, cacheError);
      }
      
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      // Create a dynamic SQL query with only the fields that need to be updated
      const updateFields = [];
      
      // Convert camelCase property names to lowercase for PostgreSQL
      if (updates.mfaEnabled !== undefined) {
        updateFields.push(sql`mfaenabled = ${updates.mfaEnabled}`);
      }
      
      if (updates.mfaSecret !== undefined) {
        updateFields.push(sql`mfasecret = ${updates.mfaSecret}`);
      }
      
      if (updates.mfaBackupCodes !== undefined) {
        updateFields.push(sql`mfabackupcodes = ${JSON.stringify(updates.mfaBackupCodes)}`);
      }
      
      if (updates.ssoEnabled !== undefined) {
        updateFields.push(sql`ssoenabled = ${updates.ssoEnabled}`);
      }
      
      if (updates.ssoProvider !== undefined) {
        updateFields.push(sql`ssoprovider = ${updates.ssoProvider}`);
      }
      
      if (updates.ssoProviderId !== undefined) {
        updateFields.push(sql`ssoproviderid = ${updates.ssoProviderId}`);
      }
      
      if (updates.ssoProviderData !== undefined) {
        updateFields.push(sql`ssoproviderdata = ${JSON.stringify(updates.ssoProviderData)}`);
      }
      
      // Add other fields that don't need case conversion
      if (updates.username !== undefined) {
        updateFields.push(sql`username = ${updates.username}`);
      }
      
      if (updates.password !== undefined) {
        updateFields.push(sql`password = ${updates.password}`);
      }
      
      if (updates.role !== undefined) {
        updateFields.push(sql`role = ${updates.role}`);
      }
      
      if (updates.name !== undefined) {
        updateFields.push(sql`name = ${updates.name}`);
      }
      
      if (updates.email !== undefined) {
        updateFields.push(sql`email = ${updates.email}`);
      }
      
      if (updates.tenantId !== undefined) {
        updateFields.push(sql`"tenantId" = ${updates.tenantId}`);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(sql`"updatedAt" = ${new Date()}`);
      
      // If there's nothing to update, return the existing user
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
          mfaEnabled: user.mfaenabled || false,
          mfaSecret: user.mfasecret || null,
          mfaBackupCodes: user.mfabackupcodes || [],
          ssoEnabled: user.ssoenabled || false,
          ssoProvider: user.ssoprovider || null,
          ssoProviderId: user.ssoproviderid || null,
          ssoProviderData: user.ssoproviderdata || {},
          createdAt: user.createdat || user.createdAt,
          updatedAt: user.updatedat || user.updatedAt
        } as User;
      }
      
      // Combine the update fields with commas
      const setClause = sql.join(updateFields, sql`, `);
      
      // Build the complete query with WHERE clause
      const query = sql`UPDATE users SET ${setClause} WHERE id = ${id} RETURNING *`;
      
      // Execute the query
      const result = await db.execute(query);
      
      if (result.rows.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      // Get the updated user
      const updated = result.rows[0];
      
      // Clear the user from cache to ensure fresh data on next fetch
      try {
        this.clearUserFromCache(id);
        console.log(`Cache cleared for updated user with ID: ${id}`);
      } catch (cacheError) {
        // Don't fail the update if cache clearing fails
        console.error(`Failed to clear cache for user ${id}:`, cacheError);
      }
      
      // Transform result to expected User type format
      return {
        id: updated.id,
        tenantId: updated.tenantid || updated.tenantId,
        username: updated.username,
        password: updated.password,
        role: updated.role,
        name: updated.name,
        email: updated.email,
        mfaEnabled: updated.mfaenabled || false,
        mfaSecret: updated.mfasecret || null,
        mfaBackupCodes: updated.mfabackupcodes || [],
        ssoEnabled: updated.ssoenabled || false,
        ssoProvider: updated.ssoprovider || null,
        ssoProviderId: updated.ssoproviderid || null,
        ssoProviderData: updated.ssoproviderdata || {},
        createdAt: updated.createdat || updated.createdAt,
        updatedAt: updated.updatedat || updated.updatedAt
      } as User;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    try {
      // First, ensure the user exists and get their data for cache cleanup
      const existingUserResult = await db.execute(sql`
        SELECT * FROM users WHERE id = ${id}
      `);
      
      if (!existingUserResult.rows || existingUserResult.rows.length === 0) {
        throw new Error(`User with id ${id} not found`);
      }
      
      const existingUser = existingUserResult.rows[0];
      
      // Delete the user from the database
      await db.execute(sql`
        DELETE FROM users WHERE id = ${id}
      `);
      
      // Clear cache entries for this user
      try {
        this.userCache.delete(id);
        
        // Clear username cache entries
        if (existingUser.username) {
          const tenantId = existingUser.tenantid || existingUser.tenantId;
          const usernameKey = tenantId 
            ? `${existingUser.username}:${tenantId}` 
            : existingUser.username;
          this.userByUsernameCache.delete(usernameKey);
        }
        
        console.log(`User with ID ${id} has been deleted and removed from cache`);
      } catch (cacheError) {
        // Non-fatal error - just log it
        console.error(`Failed to clear cache for deleted user ${id}:`, cacheError);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  async getUserBySsoId(provider: string, providerId: string, tenantId?: number): Promise<User | undefined> {
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
        return undefined;
      }
      
      // Get the first row of data from the result
      const user = result.rows[0];
      
      // Standardize field names by creating a consistent object
      return {
        id: user.id,
        tenantId: user.tenantid || user.tenantId,
        username: user.username,
        password: user.password,
        role: user.role,
        name: user.name,
        email: user.email,
        mfaEnabled: user.mfaenabled || false,
        mfaSecret: user.mfasecret || null,
        mfaBackupCodes: user.mfabackupcodes || [],
        ssoEnabled: user.ssoenabled || false,
        ssoProvider: user.ssoprovider || null,
        ssoProviderId: user.ssoproviderid || null,
        ssoProviderData: user.ssoproviderdata || {},
        createdAt: user.createdat || user.createdAt,
        updatedAt: user.updatedat || user.updatedAt
      } as User;
    } catch (error) {
      console.error("Error fetching user by SSO ID:", error);
      throw error;
    }
  }
  
  // Identity Provider operations
  async getIdentityProviders(tenantId: number): Promise<IdentityProvider[]> {
    try {
      // Using SQL directly due to column name inconsistency
      const result = await db.execute(
        sql`SELECT * FROM identity_providers WHERE "tenantid" = ${tenantId} ORDER BY name ASC`
      );
      
      if (!result.rows || result.rows.length === 0) {
        return [];
      }
      
      // Map the results to the expected format
      return result.rows.map((provider: any) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled ?? true,
        config: provider.config,
        tenantId: provider.tenantid || provider.tenantId,
        createdAt: provider.createdat || provider.createdAt,
        updatedAt: provider.updatedat || provider.updatedAt
      } as IdentityProvider));
    } catch (error) {
      console.error("Error fetching identity providers:", error);
      return [];
    }
  }
  
  async getIdentityProviderById(id: number, tenantId?: number): Promise<IdentityProvider | undefined> {
    try {
      let query;
      
      if (tenantId) {
        // Using SQL directly due to column name inconsistency
        query = sql`SELECT * FROM identity_providers WHERE id = ${id} AND "tenantid" = ${tenantId}`;
      } else {
        query = sql`SELECT * FROM identity_providers WHERE id = ${id}`;
      }
      
      const result = await db.execute(query);
      
      if (!result.rows || result.rows.length === 0) {
        return undefined;
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
      } as IdentityProvider;
    } catch (error) {
      console.error("Error fetching identity provider by ID:", error);
      return undefined;
    }
  }
  
  async createIdentityProvider(provider: InsertIdentityProvider): Promise<IdentityProvider> {
    try {
      // Ensure enabled is set to a boolean
      const providerWithDefaults = {
        ...provider,
        enabled: provider.enabled === undefined ? true : provider.enabled
      };
      
      // Using SQL directly due to column name inconsistency
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
      } as IdentityProvider;
    } catch (error) {
      console.error("Error creating identity provider:", error);
      throw error;
    }
  }
  
  async updateIdentityProvider(id: number, updates: Partial<IdentityProvider>, tenantId?: number): Promise<IdentityProvider> {
    try {
      // Create a dynamic SQL query with only the fields that need to be updated
      const updateFields = [];
      
      if (updates.name !== undefined) {
        updateFields.push(sql`name = ${updates.name}`);
      }
      
      if (updates.type !== undefined) {
        updateFields.push(sql`type = ${updates.type}`);
      }
      
      if (updates.enabled !== undefined) {
        updateFields.push(sql`enabled = ${updates.enabled}`);
      }
      
      if (updates.config !== undefined) {
        updateFields.push(sql`config = ${updates.config}`);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(sql`"updatedat" = ${new Date()}`);
      
      // Combine the update fields with commas
      const setClause = sql.join(updateFields, sql`, `);
      
      // Build the complete query with WHERE clause
      let query;
      if (tenantId) {
        query = sql`UPDATE identity_providers SET ${setClause} WHERE id = ${id} AND "tenantid" = ${tenantId} RETURNING *`;
      } else {
        query = sql`UPDATE identity_providers SET ${setClause} WHERE id = ${id} RETURNING *`;
      }
      
      // Execute the query
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
      } as IdentityProvider;
    } catch (error) {
      console.error("Error updating identity provider:", error);
      throw error;
    }
  }
  
  async deleteIdentityProvider(id: number, tenantId?: number): Promise<boolean> {
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
  async getAllTickets(tenantId?: number): Promise<Ticket[]> {
    if (tenantId) {
      return await db
        .select()
        .from(tickets)
        .where(eq(tickets.tenantId, tenantId))
        .orderBy(desc(tickets.createdAt));
    }
    return await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketById(id: number, tenantId?: number): Promise<Ticket | undefined> {
    if (tenantId) {
      const results = await db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.id, id),
          eq(tickets.tenantId, tenantId)
        ));
      return results[0];
    }
    const results = await db.select().from(tickets).where(eq(tickets.id, id));
    return results[0];
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>, tenantId?: number): Promise<Ticket> {
    let condition;
    if (tenantId) {
      condition = and(
        eq(tickets.id, id),
        eq(tickets.tenantId, tenantId)
      );
    } else {
      condition = eq(tickets.id, id);
    }
    
    const [updatedTicket] = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(condition)
      .returning();
    
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
  async getMessagesByTicketId(ticketId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.ticketId, ticketId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Attachment operations
  async getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.ticketId, ticketId))
      .orderBy(asc(attachments.createdAt));
  }

  async getAttachmentById(id: number): Promise<Attachment | undefined> {
    const results = await db.select().from(attachments).where(eq(attachments.id, id));
    return results[0];
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db.insert(attachments).values(insertAttachment).returning();
    return attachment;
  }

  // Data source operations
  async getAllDataSources(tenantId?: number): Promise<DataSource[]> {
    if (tenantId) {
      return await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.tenantId, tenantId))
        .orderBy(asc(dataSources.priority));
    }
    return await db
      .select()
      .from(dataSources)
      .orderBy(asc(dataSources.priority));
  }

  async getEnabledDataSources(tenantId?: number): Promise<DataSource[]> {
    if (tenantId) {
      return await db
        .select()
        .from(dataSources)
        .where(and(
          eq(dataSources.enabled, true),
          eq(dataSources.tenantId, tenantId)
        ))
        .orderBy(asc(dataSources.priority));
    } else {
      return await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.enabled, true))
        .orderBy(asc(dataSources.priority));
    }
  }

  async getDataSourceById(id: number, tenantId?: number): Promise<DataSource | undefined> {
    if (tenantId) {
      const results = await db
        .select()
        .from(dataSources)
        .where(and(
          eq(dataSources.id, id),
          eq(dataSources.tenantId, tenantId)
        ));
      return results[0];
    }
    const results = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return results[0];
  }

  async createDataSource(insertDataSource: InsertDataSource): Promise<DataSource> {
    // Ensure enabled is set to a boolean value (default true)
    const dataSourceWithDefaults = {
      ...insertDataSource,
      enabled: insertDataSource.enabled === undefined ? true : insertDataSource.enabled
    };
    
    const [dataSource] = await db.insert(dataSources).values(dataSourceWithDefaults).returning();
    return dataSource;
  }

  async updateDataSource(id: number, updates: Partial<DataSource>, tenantId?: number): Promise<DataSource> {
    let result;
    
    if (tenantId) {
      result = await db
        .update(dataSources)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(dataSources.id, id),
          eq(dataSources.tenantId, tenantId)
        ))
        .returning();
    } else {
      result = await db
        .update(dataSources)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dataSources.id, id))
        .returning();
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

  async deleteDataSource(id: number, tenantId?: number): Promise<boolean> {
    let result;
    
    if (tenantId) {
      result = await db
        .delete(dataSources)
        .where(and(
          eq(dataSources.id, id),
          eq(dataSources.tenantId, tenantId)
        ));
    } else {
      result = await db
        .delete(dataSources)
        .where(eq(dataSources.id, id));
    }
      
    return !!result;
  }
  
  // Widget analytics operations
  async getWidgetAnalyticsByApiKey(apiKey: string): Promise<WidgetAnalytics | undefined> {
    const results = await db
      .select()
      .from(widgetAnalytics)
      .where(eq(widgetAnalytics.apiKey, apiKey));
    
    return results[0];
  }
  
  async getWidgetAnalyticsByAdminId(adminId: number, tenantId?: number): Promise<WidgetAnalytics[]> {
    if (tenantId) {
      return await db
        .select()
        .from(widgetAnalytics)
        .where(and(
          eq(widgetAnalytics.adminId, adminId),
          eq(widgetAnalytics.tenantId, tenantId)
        ));
    } else {
      return await db
        .select()
        .from(widgetAnalytics)
        .where(eq(widgetAnalytics.adminId, adminId));
    }
  }
  
  async getAllWidgetAnalytics(tenantId?: number): Promise<WidgetAnalytics[]> {
    try {
      let result;
      // Use raw SQL query to handle column name difference between schema and actual database
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
      
      // Ensure we always return an array, even if result is not in the expected format
      if (!result || !Array.isArray(result.rows)) {
        console.warn('Unexpected result format from widget_analytics query:', result);
        return [];
      }
      
      // Return the rows array which contains the actual data
      return result.rows.map(row => {
        // Ensure metadata is parsed if it's a string
        if (row.metadata && typeof row.metadata === 'string') {
          try {
            row.metadata = JSON.parse(row.metadata);
          } catch (e) {
            console.warn('Failed to parse metadata JSON:', e);
          }
        }
        return row as unknown as WidgetAnalytics;
      });
    } catch (error) {
      console.error('Failed to get all widget analytics:', error);
      // Return empty array instead of throwing to avoid breaking the API
      return [];
    }
  }
  
  async createWidgetAnalytics(insertAnalytics: InsertWidgetAnalytics): Promise<WidgetAnalytics> {
    const analyticsToInsert = {
      ...insertAnalytics,
      clientWebsite: insertAnalytics.clientWebsite || null,
      interactions: insertAnalytics.interactions || 0,
      messagesReceived: insertAnalytics.messagesReceived || 0,
      messagesSent: insertAnalytics.messagesSent || 0,
      ticketsCreated: insertAnalytics.ticketsCreated || 0,
      metadata: insertAnalytics.metadata || {},
      lastActivity: insertAnalytics.lastActivity || new Date(),
      lastClientIp: insertAnalytics.lastClientIp || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [analytics] = await db
      .insert(widgetAnalytics)
      .values(analyticsToInsert)
      .returning();
      
    return analytics;
  }
  
  async updateWidgetAnalytics(id: number, updates: Partial<WidgetAnalytics>): Promise<WidgetAnalytics> {
    const [updated] = await db
      .update(widgetAnalytics)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(widgetAnalytics.id, id))
      .returning();
      
    if (!updated) {
      throw new Error(`Widget analytics with ID ${id} not found`);
    }
    
    return updated;
  }

  // Support document operations
  async getAllSupportDocuments(tenantId?: number): Promise<SupportDocument[]> {
    try {
      // Start with base query
      let query = db.select().from(supportDocuments);
      
      // Add tenant filter if provided
      if (tenantId) {
        query = query.where(eq(supportDocuments.tenantId, tenantId));
      }
      
      // Sort by creation date
      const documents = await query.orderBy(desc(supportDocuments.createdAt));
      return documents;
    } catch (error) {
      console.error('Error in getAllSupportDocuments():', error);
      throw error;
    }
  }
  
  async getSupportDocumentById(id: number, tenantId?: number): Promise<SupportDocument | undefined> {
    // Build query with conditions
    let conditions = [eq(supportDocuments.id, id)];
    
    // Add tenant filter if provided
    if (tenantId) {
      conditions.push(eq(supportDocuments.tenantId, tenantId));
    }
    
    const [document] = await db
      .select()
      .from(supportDocuments)
      .where(and(...conditions));
      
    return document;
  }
  
  async getSupportDocumentsByCategory(category: string, tenantId?: number): Promise<SupportDocument[]> {
    // Build query with conditions
    let conditions = [eq(supportDocuments.category, category)];
    
    // Add tenant filter if provided
    if (tenantId) {
      conditions.push(eq(supportDocuments.tenantId, tenantId));
    }
    
    const documents = await db
      .select()
      .from(supportDocuments)
      .where(and(...conditions));
      
    return documents;
  }
  
  async getSupportDocumentsByStatus(status: string, tenantId?: number): Promise<SupportDocument[]> {
    // Build query with conditions
    let conditions = [eq(supportDocuments.status, status)];
    
    // Add tenant filter if provided
    if (tenantId) {
      conditions.push(eq(supportDocuments.tenantId, tenantId));
    }
    
    const documents = await db
      .select()
      .from(supportDocuments)
      .where(and(...conditions));
      
    return documents;
  }
  
  async searchSupportDocuments(query: string, tenantId?: number): Promise<SupportDocument[]> {
    // If no query is provided, return all documents
    if (!query) {
      return this.getAllSupportDocuments(tenantId);
    }
    
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    
    // Build the base condition for search
    let searchCondition = sql`LOWER(${supportDocuments.title}) LIKE ${lowercaseQuery} OR 
                               LOWER(${supportDocuments.content}) LIKE ${lowercaseQuery} OR 
                               LOWER(${supportDocuments.category}) LIKE ${lowercaseQuery}`;
                               
    // Add tenant filter if provided
    if (tenantId) {
      const documents = await db
        .select()
        .from(supportDocuments)
        .where(
          sql`(${searchCondition}) AND ${supportDocuments.tenantId} = ${tenantId}`
        )
        .orderBy(desc(supportDocuments.viewCount), desc(supportDocuments.createdAt));
        
      return documents;
    } else {
      const documents = await db
        .select()
        .from(supportDocuments)
        .where(searchCondition)
        .orderBy(desc(supportDocuments.viewCount), desc(supportDocuments.createdAt));
        
      return documents;
    }
  }
  
  async createSupportDocument(document: InsertSupportDocument): Promise<SupportDocument> {
    const now = new Date();
    
    // Insert the document
    const [newDocument] = await db
      .insert(supportDocuments)
      .values({
        ...document,
        createdAt: now,
        updatedAt: now,
        publishedAt: document.status === 'published' ? now : null,
        viewCount: 0,
        status: document.status || "draft"
      })
      .returning();
    
    return newDocument;
  }
  
  async updateSupportDocument(id: number, updates: Partial<SupportDocument>, tenantId?: number): Promise<SupportDocument> {
    // Build conditions for the update
    let conditions = [eq(supportDocuments.id, id)];
    
    // Add tenant filter if provided
    if (tenantId) {
      conditions.push(eq(supportDocuments.tenantId, tenantId));
    }
    
    // Set publishedAt field if status is changing to published
    const updatesWithMetadata = {
      ...updates,
      updatedAt: new Date()
    };
    
    // If status is changing to published and publishedAt is not set, set it now
    if (updates.status === 'published') {
      updatesWithMetadata.publishedAt = updatesWithMetadata.publishedAt || new Date();
    }
    
    // Apply the update
    const [updated] = await db
      .update(supportDocuments)
      .set(updatesWithMetadata)
      .where(and(...conditions))
      .returning();
    
    if (!updated) {
      if (tenantId) {
        throw new Error(`Support document with id ${id} not found in tenant ${tenantId}`);
      } else {
        throw new Error(`Support document with id ${id} not found`);
      }
    }
    
    return updated;
  }
  
  async deleteSupportDocument(id: number, tenantId?: number): Promise<boolean> {
    // Build conditions for the delete
    let conditions = [eq(supportDocuments.id, id)];
    
    // Add tenant filter if provided
    if (tenantId) {
      conditions.push(eq(supportDocuments.tenantId, tenantId));
    }
    
    // Execute the delete
    const result = await db
      .delete(supportDocuments)
      .where(and(...conditions));
      
    // Check if a row was deleted
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  async incrementDocumentViewCount(id: number): Promise<void> {
    // Get the current document to ensure it exists
    const [document] = await db
      .select()
      .from(supportDocuments)
      .where(eq(supportDocuments.id, id));
    
    if (!document) {
      throw new Error(`Support document with id ${id} not found`);
    }
    
    // Increment view count
    await db
      .update(supportDocuments)
      .set({
        viewCount: (document.viewCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(supportDocuments.id, id));
    
    // Log document usage
    await this.logDocumentUsage({
      documentId: id,
      usageType: 'view',
      // Add any optional fields you need
      metadata: {}
    });
  }
  
  // Document usage operations
  async logDocumentUsage(usage: InsertDocumentUsage): Promise<DocumentUsage> {
    const now = new Date();
    
    // Insert the usage record with timestamp
    const usageWithDefaults = {
      ...usage,
      // Make sure any required fields have defaults
      metadata: usage.metadata || {}
    };
    
    const [newUsage] = await db
      .insert(documentUsage)
      .values(usageWithDefaults)
      .returning();
    
    return newUsage;
  }
  
  async getDocumentUsageById(id: number): Promise<DocumentUsage | undefined> {
    const [usage] = await db
      .select()
      .from(documentUsage)
      .where(eq(documentUsage.id, id));
    
    return usage;
  }
  
  async getDocumentUsageByDocumentId(documentId: number): Promise<DocumentUsage[]> {
    const usages = await db
      .select()
      .from(documentUsage)
      .where(eq(documentUsage.documentId, documentId))
      .orderBy(desc(documentUsage.timestamp));
    
    return usages;
  }
  
  async getDocumentUsageAnalytics(startDate: Date, endDate: Date, tenantId?: number): Promise<any> {
    // Get document usage within the date range
    let query = db
      .select()
      .from(documentUsage)
      .where(
        sql`${documentUsage.timestamp} >= ${startDate} AND ${documentUsage.timestamp} <= ${endDate}`
      );
    
    const usages = await query;
    
    // Get all documents
    let documentQuery = db.select().from(supportDocuments);
    if (tenantId) {
      documentQuery = documentQuery.where(eq(supportDocuments.tenantId, tenantId));
    }
    const documents = await documentQuery;
    
    // Build the document map for quick lookups
    const documentMap = new Map(documents.map(doc => [doc.id, doc]));
    
    // Filter usages by tenant if needed (matching document tenantId)
    const filteredUsages = tenantId 
      ? usages.filter(usage => {
          const doc = documentMap.get(usage.documentId);
          return doc && doc.tenantId === tenantId;
        })
      : usages;
    
    // Build analytics data
    const viewsByDocument = new Map<number, number>();
    const viewsByCategory = new Map<string, number>();
    const viewsByDay = new Map<string, number>();
    
    for (const usage of filteredUsages) {
      // Count by document
      const docViews = viewsByDocument.get(usage.documentId) || 0;
      viewsByDocument.set(usage.documentId, docViews + 1);
      
      // Count by category (if document exists)
      const document = documentMap.get(usage.documentId);
      if (document) {
        const categoryViews = viewsByCategory.get(document.category) || 0;
        viewsByCategory.set(document.category, categoryViews + 1);
      }
      
      // Count by day
      const day = usage.timestamp.toISOString().split('T')[0];
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
}

// Create a function to initialize storage with fallback to in-memory if database fails
function initializeStorage(): IStorage {
  try {
    console.log("Attempting to initialize database storage...");
    // Try database first
    return new DatabaseStorage();
  } catch (error) {
    console.error("Failed to initialize database storage:", error);
    console.log("Falling back to in-memory storage");
    // Fall back to memory storage
    return new MemStorage();
  }
}

// Export a wrapped storage instance that catches database errors and provides fallbacks
class StorageWrapper implements IStorage {
  private storageImpl: IStorage;
  public sessionStore: session.Store;
  
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
  async getTenantById(id: number): Promise<Tenant | undefined> {
    try {
      return await this.storageImpl.getTenantById(id);
    } catch (error) {
      console.error(`Error in getTenantById(${id}):`, error);
      throw error;
    }
  }
  
  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    try {
      return await this.storageImpl.getTenantByApiKey(apiKey);
    } catch (error) {
      console.error(`Error in getTenantByApiKey:`, error);
      throw error;
    }
  }
  
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    try {
      return await this.storageImpl.getTenantBySubdomain(subdomain);
    } catch (error) {
      console.error(`Error in getTenantBySubdomain(${subdomain}):`, error);
      throw error;
    }
  }
  
  async getAllTenants(): Promise<Tenant[]> {
    try {
      return await this.storageImpl.getAllTenants();
    } catch (error) {
      console.error(`Error in getAllTenants():`, error);
      throw error;
    }
  }
  
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    try {
      return await this.storageImpl.createTenant(tenant);
    } catch (error) {
      console.error(`Error in createTenant():`, error);
      throw error;
    }
  }
  
  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    try {
      return await this.storageImpl.updateTenant(id, updates);
    } catch (error) {
      console.error(`Error in updateTenant(${id}):`, error);
      throw error;
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      return await this.storageImpl.getUser(id);
    } catch (error) {
      console.error(`Error in getUser(${id}):`, error);
      throw error;
    }
  }
  
  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    try {
      return await this.storageImpl.getUserByUsername(username, tenantId);
    } catch (error) {
      console.error(`Error in getUserByUsername(${username}):`, error);
      throw error;
    }
  }
  
  async getUsersByTenantId(tenantId: number): Promise<User[]> {
    try {
      return await this.storageImpl.getUsersByTenantId(tenantId);
    } catch (error) {
      console.error(`Error in getUsersByTenantId(${tenantId}):`, error);
      throw error;
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    try {
      return await this.storageImpl.deleteUser(id);
    } catch (error) {
      console.error(`Error in deleteUser(${id}):`, error);
      throw error;
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      return await this.storageImpl.createUser(user);
    } catch (error) {
      console.error(`Error in createUser():`, error);
      throw error;
    }
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      return await this.storageImpl.updateUser(id, updates);
    } catch (error) {
      console.error(`Error in updateUser(${id}):`, error);
      throw error;
    }
  }
  
  async getUserBySsoId(provider: string, providerId: string, tenantId?: number): Promise<User | undefined> {
    try {
      return await this.storageImpl.getUserBySsoId(provider, providerId, tenantId);
    } catch (error) {
      console.error(`Error in getUserBySsoId():`, error);
      throw error;
    }
  }
  
  // Identity provider operations
  async getIdentityProviders(tenantId: number): Promise<IdentityProvider[]> {
    try {
      return await this.storageImpl.getIdentityProviders(tenantId);
    } catch (error) {
      console.error(`Error in getIdentityProviders():`, error);
      throw error;
    }
  }
  
  async getIdentityProviderById(id: number, tenantId?: number): Promise<IdentityProvider | undefined> {
    try {
      return await this.storageImpl.getIdentityProviderById(id, tenantId);
    } catch (error) {
      console.error(`Error in getIdentityProviderById():`, error);
      throw error;
    }
  }
  
  async createIdentityProvider(provider: InsertIdentityProvider): Promise<IdentityProvider> {
    try {
      return await this.storageImpl.createIdentityProvider(provider);
    } catch (error) {
      console.error(`Error in createIdentityProvider():`, error);
      throw error;
    }
  }
  
  async updateIdentityProvider(id: number, updates: Partial<IdentityProvider>, tenantId?: number): Promise<IdentityProvider> {
    try {
      return await this.storageImpl.updateIdentityProvider(id, updates, tenantId);
    } catch (error) {
      console.error(`Error in updateIdentityProvider():`, error);
      throw error;
    }
  }
  
  async deleteIdentityProvider(id: number, tenantId?: number): Promise<boolean> {
    try {
      return await this.storageImpl.deleteIdentityProvider(id, tenantId);
    } catch (error) {
      console.error(`Error in deleteIdentityProvider():`, error);
      throw error;
    }
  }
  
  // Ticket operations  
  async getAllTickets(tenantId?: number): Promise<Ticket[]> {
    try {
      return await this.storageImpl.getAllTickets(tenantId);
    } catch (error) {
      console.error(`Error in getAllTickets():`, error);
      throw error;
    }
  }
  
  async getTicketById(id: number, tenantId?: number): Promise<Ticket | undefined> {
    try {
      return await this.storageImpl.getTicketById(id, tenantId);
    } catch (error) {
      console.error(`Error in getTicketById():`, error);
      throw error;
    }
  }
  
  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    try {
      return await this.storageImpl.createTicket(ticket);
    } catch (error) {
      console.error(`Error in createTicket():`, error);
      throw error;
    }
  }
  
  async updateTicket(id: number, updates: Partial<Ticket>, tenantId?: number): Promise<Ticket> {
    try {
      return await this.storageImpl.updateTicket(id, updates, tenantId);
    } catch (error) {
      console.error(`Error in updateTicket():`, error);
      throw error;
    }
  }
  
  // Message operations
  async getMessagesByTicketId(ticketId: number): Promise<Message[]> {
    try {
      return await this.storageImpl.getMessagesByTicketId(ticketId);
    } catch (error) {
      console.error(`Error in getMessagesByTicketId():`, error);
      throw error;
    }
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      return await this.storageImpl.createMessage(message);
    } catch (error) {
      console.error(`Error in createMessage():`, error);
      throw error;
    }
  }
  
  // Attachment operations
  async getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]> {
    try {
      return await this.storageImpl.getAttachmentsByTicketId(ticketId);
    } catch (error) {
      console.error(`Error in getAttachmentsByTicketId():`, error);
      throw error;
    }
  }
  
  async getAttachmentById(id: number): Promise<Attachment | undefined> {
    try {
      return await this.storageImpl.getAttachmentById(id);
    } catch (error) {
      console.error(`Error in getAttachmentById():`, error);
      throw error;
    }
  }
  
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    try {
      return await this.storageImpl.createAttachment(attachment);
    } catch (error) {
      console.error(`Error in createAttachment():`, error);
      throw error;
    }
  }
  
  // Data source operations
  async getAllDataSources(tenantId?: number): Promise<DataSource[]> {
    try {
      return await this.storageImpl.getAllDataSources(tenantId);
    } catch (error) {
      console.error(`Error in getAllDataSources():`, error);
      throw error;
    }
  }
  
  async getEnabledDataSources(tenantId?: number): Promise<DataSource[]> {
    try {
      return await this.storageImpl.getEnabledDataSources(tenantId);
    } catch (error) {
      console.error(`Error in getEnabledDataSources():`, error);
      throw error;
    }
  }
  
  async getDataSourceById(id: number, tenantId?: number): Promise<DataSource | undefined> {
    try {
      return await this.storageImpl.getDataSourceById(id, tenantId);
    } catch (error) {
      console.error(`Error in getDataSourceById():`, error);
      throw error;
    }
  }
  
  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    try {
      return await this.storageImpl.createDataSource(dataSource);
    } catch (error) {
      console.error(`Error in createDataSource():`, error);
      throw error;
    }
  }
  
  async updateDataSource(id: number, updates: Partial<DataSource>, tenantId?: number): Promise<DataSource> {
    try {
      return await this.storageImpl.updateDataSource(id, updates, tenantId);
    } catch (error) {
      console.error(`Error in updateDataSource():`, error);
      throw error;
    }
  }
  
  async deleteDataSource(id: number, tenantId?: number): Promise<boolean> {
    try {
      return await this.storageImpl.deleteDataSource(id, tenantId);
    } catch (error) {
      console.error(`Error in deleteDataSource():`, error);
      throw error;
    }
  }
  
  // AI provider operations
  async getAiProviders(tenantId: number): Promise<AiProvider[]> {
    try {
      return await this.storageImpl.getAiProviders(tenantId);
    } catch (error) {
      console.error(`Error in getAiProviders():`, error);
      throw error;
    }
  }
  
  async getAiProviderById(id: number, tenantId?: number): Promise<AiProvider | undefined> {
    try {
      return await this.storageImpl.getAiProviderById(id, tenantId);
    } catch (error) {
      console.error(`Error in getAiProviderById():`, error);
      throw error;
    }
  }
  
  async getAiProvidersByType(type: string, tenantId: number): Promise<AiProvider[]> {
    try {
      return await this.storageImpl.getAiProvidersByType(type, tenantId);
    } catch (error) {
      console.error(`Error in getAiProvidersByType():`, error);
      throw error;
    }
  }
  
  async getPrimaryAiProvider(tenantId: number): Promise<AiProvider | undefined> {
    try {
      return await this.storageImpl.getPrimaryAiProvider(tenantId);
    } catch (error) {
      console.error(`Error in getPrimaryAiProvider():`, error);
      throw error;
    }
  }
  
  async createAiProvider(provider: InsertAiProvider): Promise<AiProvider> {
    try {
      return await this.storageImpl.createAiProvider(provider);
    } catch (error) {
      console.error(`Error in createAiProvider():`, error);
      throw error;
    }
  }
  
  async updateAiProvider(id: number, updates: Partial<AiProvider>, tenantId?: number): Promise<AiProvider> {
    try {
      return await this.storageImpl.updateAiProvider(id, updates, tenantId);
    } catch (error) {
      console.error(`Error in updateAiProvider():`, error);
      throw error;
    }
  }
  
  async deleteAiProvider(id: number, tenantId?: number): Promise<boolean> {
    try {
      return await this.storageImpl.deleteAiProvider(id, tenantId);
    } catch (error) {
      console.error(`Error in deleteAiProvider():`, error);
      throw error;
    }
  }
  
  // Widget analytics operations
  async getWidgetAnalyticsByApiKey(apiKey: string): Promise<WidgetAnalytics | undefined> {
    try {
      return await this.storageImpl.getWidgetAnalyticsByApiKey(apiKey);
    } catch (error) {
      console.error(`Error in getWidgetAnalyticsByApiKey():`, error);
      throw error;
    }
  }
  
  async getWidgetAnalyticsByAdminId(adminId: number, tenantId?: number): Promise<WidgetAnalytics[]> {
    try {
      return await this.storageImpl.getWidgetAnalyticsByAdminId(adminId, tenantId);
    } catch (error) {
      console.error(`Error in getWidgetAnalyticsByAdminId():`, error);
      throw error;
    }
  }
  
  async getAllWidgetAnalytics(tenantId?: number): Promise<WidgetAnalytics[]> {
    try {
      const analytics = await this.storageImpl.getAllWidgetAnalytics(tenantId);
      // Ensure we always return an array
      if (!analytics) {
        console.warn('getAllWidgetAnalytics() returned null or undefined, returning empty array');
        return [];
      }
      return analytics;
    } catch (error) {
      console.error(`Error in getAllWidgetAnalytics():`, error);
      // Return empty array instead of throwing to avoid breaking the API consumer
      return [];
    }
  }
  
  async createWidgetAnalytics(analytics: InsertWidgetAnalytics): Promise<WidgetAnalytics> {
    try {
      return await this.storageImpl.createWidgetAnalytics(analytics);
    } catch (error) {
      console.error(`Error in createWidgetAnalytics():`, error);
      throw error;
    }
  }
  
  async updateWidgetAnalytics(id: number, updates: Partial<WidgetAnalytics>): Promise<WidgetAnalytics> {
    try {
      return await this.storageImpl.updateWidgetAnalytics(id, updates);
    } catch (error) {
      console.error(`Error in updateWidgetAnalytics():`, error);
      throw error;
    }
  }

  // Support document operations
  async getAllSupportDocuments(tenantId?: number): Promise<SupportDocument[]> {
    try {
      return await this.storageImpl.getAllSupportDocuments(tenantId);
    } catch (error) {
      console.error(`Error in getAllSupportDocuments():`, error);
      throw error;
    }
  }

  async getSupportDocumentById(id: number, tenantId?: number): Promise<SupportDocument | undefined> {
    try {
      return await this.storageImpl.getSupportDocumentById(id, tenantId);
    } catch (error) {
      console.error(`Error in getSupportDocumentById():`, error);
      throw error;
    }
  }

  async getSupportDocumentsByCategory(category: string, tenantId?: number): Promise<SupportDocument[]> {
    try {
      return await this.storageImpl.getSupportDocumentsByCategory(category, tenantId);
    } catch (error) {
      console.error(`Error in getSupportDocumentsByCategory():`, error);
      throw error;
    }
  }

  async getSupportDocumentsByStatus(status: string, tenantId?: number): Promise<SupportDocument[]> {
    try {
      return await this.storageImpl.getSupportDocumentsByStatus(status, tenantId);
    } catch (error) {
      console.error(`Error in getSupportDocumentsByStatus():`, error);
      throw error;
    }
  }

  async searchSupportDocuments(query: string, tenantId?: number): Promise<SupportDocument[]> {
    try {
      return await this.storageImpl.searchSupportDocuments(query, tenantId);
    } catch (error) {
      console.error(`Error in searchSupportDocuments():`, error);
      throw error;
    }
  }

  async createSupportDocument(document: InsertSupportDocument): Promise<SupportDocument> {
    try {
      return await this.storageImpl.createSupportDocument(document);
    } catch (error) {
      console.error(`Error in createSupportDocument():`, error);
      throw error;
    }
  }

  async updateSupportDocument(id: number, updates: Partial<SupportDocument>, tenantId?: number): Promise<SupportDocument> {
    try {
      return await this.storageImpl.updateSupportDocument(id, updates, tenantId);
    } catch (error) {
      console.error(`Error in updateSupportDocument():`, error);
      throw error;
    }
  }

  async deleteSupportDocument(id: number, tenantId?: number): Promise<boolean> {
    try {
      return await this.storageImpl.deleteSupportDocument(id, tenantId);
    } catch (error) {
      console.error(`Error in deleteSupportDocument():`, error);
      throw error;
    }
  }

  // Document usage operations
  async logDocumentUsage(usage: InsertDocumentUsage): Promise<DocumentUsage> {
    try {
      return await this.storageImpl.logDocumentUsage(usage);
    } catch (error) {
      console.error(`Error in logDocumentUsage():`, error);
      throw error;
    }
  }

  async getDocumentUsageById(id: number): Promise<DocumentUsage | undefined> {
    try {
      return await this.storageImpl.getDocumentUsageById(id);
    } catch (error) {
      console.error(`Error in getDocumentUsageById():`, error);
      throw error;
    }
  }

  async getDocumentUsageByDocumentId(documentId: number): Promise<DocumentUsage[]> {
    try {
      return await this.storageImpl.getDocumentUsageByDocumentId(documentId);
    } catch (error) {
      console.error(`Error in getDocumentUsageByDocumentId():`, error);
      throw error;
    }
  }

  async getDocumentUsageAnalytics(startDate: Date, endDate: Date, tenantId?: number): Promise<any> {
    try {
      return await this.storageImpl.getDocumentUsageAnalytics(startDate, endDate, tenantId);
    } catch (error) {
      console.error(`Error in getDocumentUsageAnalytics():`, error);
      throw error;
    }
  }
  
  async incrementDocumentViewCount(id: number): Promise<void> {
    try {
      return await this.storageImpl.incrementDocumentViewCount(id);
    } catch (error) {
      console.error(`Error in incrementDocumentViewCount(${id}):`, error);
      throw error;
    }
  }
}

export const storage = new StorageWrapper();
