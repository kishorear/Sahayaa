import { 
  users, 
  tickets, 
  messages,
  attachments,
  dataSources,
  type User, 
  type InsertUser, 
  type Ticket, 
  type InsertTicket, 
  type Message, 
  type InsertMessage,
  type Attachment,
  type InsertAttachment,
  type DataSource,
  type InsertDataSource
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { eq, and, desc, asc } from "drizzle-orm";
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
  
  // Session management
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private messages: Map<number, Message>;
  private attachments: Map<number, Attachment>;
  private dataSources: Map<number, DataSource>;
  private userIdCounter: number;
  private ticketIdCounter: number;
  private messageIdCounter: number;
  private attachmentIdCounter: number;
  private dataSourceIdCounter: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.messages = new Map();
    this.attachments = new Map();
    this.dataSources = new Map();
    this.userIdCounter = 1;
    this.ticketIdCounter = 1;
    this.messageIdCounter = 1;
    this.attachmentIdCounter = 1;
    this.dataSourceIdCounter = 1;
    
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@example.com",
      role: "admin",
      name: "Admin User"
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
      priority: 1
    });
    
    // Create other sample data sources
    await this.createDataSource({
      name: "Product Documentation",
      type: "url",
      description: "Official product documentation",
      content: "https://docs.example.com/api",
      enabled: true,
      priority: 2
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
      priority: 3
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
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
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }
  
  // Ticket operations
  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }
  
  async getTicketById(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }
  
  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.ticketIdCounter++;
    const now = new Date();
    
    // Ensure all required properties have values
    const ticket = {
      ...insertTicket,
      id,
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
  
  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new Error(`Ticket with id ${id} not found`);
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
  async getAllDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSources.values())
      .sort((a, b) => a.priority - b.priority);
  }

  async getEnabledDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSources.values())
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async getDataSourceById(id: number): Promise<DataSource | undefined> {
    return this.dataSources.get(id);
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
      createdAt: now,
      updatedAt: now
    };
    this.dataSources.set(id, dataSource);
    return dataSource;
  }

  async updateDataSource(id: number, updates: Partial<DataSource>): Promise<DataSource> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source with id ${id} not found`);
    }
    
    const updatedDataSource: DataSource = {
      ...dataSource,
      ...updates,
      updatedAt: new Date()
    };
    
    this.dataSources.set(id, updatedDataSource);
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<boolean> {
    if (!this.dataSources.has(id)) {
      return false;
    }
    return this.dataSources.delete(id);
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Ticket operations
  async getAllTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicketById(id: number): Promise<Ticket | undefined> {
    const results = await db.select().from(tickets).where(eq(tickets.id, id));
    return results[0];
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
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
  async getAllDataSources(): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .orderBy(asc(dataSources.priority));
  }

  async getEnabledDataSources(): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.enabled, true))
      .orderBy(asc(dataSources.priority));
  }

  async getDataSourceById(id: number): Promise<DataSource | undefined> {
    const results = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return results[0];
  }

  async createDataSource(insertDataSource: InsertDataSource): Promise<DataSource> {
    const [dataSource] = await db.insert(dataSources).values(insertDataSource).returning();
    return dataSource;
  }

  async updateDataSource(id: number, updates: Partial<DataSource>): Promise<DataSource> {
    const [updatedDataSource] = await db
      .update(dataSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dataSources.id, id))
      .returning();
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<boolean> {
    const result = await db.delete(dataSources).where(eq(dataSources.id, id));
    return !!result;
  }
}

// Create a PostgreSQL storage implementation for production
export const storage = new DatabaseStorage();

// If you need to use in-memory storage for development, uncomment this line
// export const storage = new MemStorage();
