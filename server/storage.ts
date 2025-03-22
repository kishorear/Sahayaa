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
  type InsertAiProvider
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db, pool } from "./db";

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
  createWidgetAnalytics(analytics: InsertWidgetAnalytics): Promise<WidgetAnalytics>;
  updateWidgetAnalytics(id: number, updates: Partial<WidgetAnalytics>): Promise<WidgetAnalytics>;
  
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
  private tenantIdCounter: number;
  private userIdCounter: number;
  private ticketIdCounter: number;
  private messageIdCounter: number;
  private attachmentIdCounter: number;
  private dataSourceIdCounter: number;
  private widgetAnalyticsIdCounter: number;
  private aiProviderIdCounter: number;
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
    this.tenantIdCounter = 1;
    this.userIdCounter = 1;
    this.ticketIdCounter = 1;
    this.messageIdCounter = 1;
    this.attachmentIdCounter = 1;
    this.dataSourceIdCounter = 1;
    this.widgetAnalyticsIdCounter = 1;
    this.aiProviderIdCounter = 1;
    
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
    
    // Initialize with sample tickets and data sources
    this.initSampleTickets();
    this.initSampleDataSources();
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
    return this.tenants.get(id);
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(
      (tenant) => tenant.apiKey === apiKey
    );
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(
      (tenant) => tenant.subdomain === subdomain
    );
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
    
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
    if (tenantId) {
      return Array.from(this.users.values()).find(
        (user) => user.username === username && user.tenantId === tenantId
      );
    } else {
      return Array.from(this.users.values()).find(
        (user) => user.username === username
      );
    }
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
    
    this.users.set(id, updatedUser);
    return updatedUser;
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
    const ticket = this.tickets.get(id);
    if (tenantId && ticket && ticket.tenantId !== tenantId) {
      return undefined; // Don't return tickets from other tenants
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
    
    this.tickets.set(id, ticket);
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
    
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }
  
  // Message operations
  async getMessagesByTicketId(ticketId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
    this.messages.set(id, message);
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
}

// Database Storage implementation

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Initialize PostgreSQL session store
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session', // Default table name for sessions
      createTableIfMissing: true
    });
  }

  // Tenant operations
  async getTenantById(id: number): Promise<Tenant | undefined> {
    const results = await db.select().from(tenants).where(eq(tenants.id, id));
    return results[0];
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | undefined> {
    const results = await db.select().from(tenants).where(eq(tenants.apiKey, apiKey));
    return results[0];
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const results = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return results[0];
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
    try {
      // Use sql query directly to avoid column name case issues
      const result = await db.execute(
        sql`SELECT * FROM users WHERE id = ${id}`
      );
      
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
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string, tenantId?: number): Promise<User | undefined> {
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
      console.error("Error fetching user by username:", error);
      throw error;
    }
  }

  async getUsersByTenantId(tenantId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Use raw SQL to insert the user with lowercase column names
      const result = await db.execute(sql`
        INSERT INTO users 
        (username, password, role, name, email, "tenantId", mfaenabled, mfabackupcodes, ssoenabled, ssoproviderdata)
        VALUES 
        (
          ${insertUser.username}, 
          ${insertUser.password}, 
          ${insertUser.role || 'user'}, 
          ${insertUser.name || null}, 
          ${insertUser.email || null}, 
          ${insertUser.tenantId || 1}, 
          false, 
          '[]', 
          false, 
          '{}'
        )
        RETURNING *
      `);
      
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
      console.error("Error creating user:", error);
      throw error;
    }
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      // Instead of using Drizzle's update and set, we'll use SQL directly
      // Build the SET part of the query manually
      let setClauses = [];
      const params = [];
      let paramIndex = 1;
      
      // Convert camelCase property names to lowercase for PostgreSQL
      if (updates.mfaEnabled !== undefined) {
        setClauses.push(`mfaenabled = $${paramIndex++}`);
        params.push(updates.mfaEnabled);
      }
      
      if (updates.mfaSecret !== undefined) {
        setClauses.push(`mfasecret = $${paramIndex++}`);
        params.push(updates.mfaSecret);
      }
      
      if (updates.mfaBackupCodes !== undefined) {
        setClauses.push(`mfabackupcodes = $${paramIndex++}`);
        params.push(JSON.stringify(updates.mfaBackupCodes));
      }
      
      if (updates.ssoEnabled !== undefined) {
        setClauses.push(`ssoenabled = $${paramIndex++}`);
        params.push(updates.ssoEnabled);
      }
      
      if (updates.ssoProvider !== undefined) {
        setClauses.push(`ssoprovider = $${paramIndex++}`);
        params.push(updates.ssoProvider);
      }
      
      if (updates.ssoProviderId !== undefined) {
        setClauses.push(`ssoproviderid = $${paramIndex++}`);
        params.push(updates.ssoProviderId);
      }
      
      if (updates.ssoProviderData !== undefined) {
        setClauses.push(`ssoproviderdata = $${paramIndex++}`);
        params.push(JSON.stringify(updates.ssoProviderData));
      }
      
      // Add other fields that don't need case conversion
      if (updates.username !== undefined) {
        setClauses.push(`username = $${paramIndex++}`);
        params.push(updates.username);
      }
      
      if (updates.password !== undefined) {
        setClauses.push(`password = $${paramIndex++}`);
        params.push(updates.password);
      }
      
      if (updates.role !== undefined) {
        setClauses.push(`role = $${paramIndex++}`);
        params.push(updates.role);
      }
      
      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }
      
      if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        params.push(updates.email);
      }
      
      if (updates.tenantId !== undefined) {
        setClauses.push(`"tenantId" = $${paramIndex++}`);
        params.push(updates.tenantId);
      }
      
      // Add updatedAt timestamp
      setClauses.push(`"updatedAt" = $${paramIndex++}`);
      params.push(new Date());
      
      // If there's nothing to update, return the existing user
      if (setClauses.length === 0) {
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
      
      // Execute the update
      const updateQuery = `
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      params.push(id);
      const result = await db.execute(sql.raw(updateQuery).params(params));
      
      if (result.rows.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      // Get the updated user
      const updated = result.rows[0];
      
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
}

// Create a PostgreSQL storage implementation for production
export const storage = new DatabaseStorage();

// If you need to use in-memory storage for development, uncomment this line
// export const storage = new MemStorage();
