import { 
  users, 
  tickets, 
  messages,
  attachments,
  type User, 
  type InsertUser, 
  type Ticket, 
  type InsertTicket, 
  type Message, 
  type InsertMessage,
  type Attachment,
  type InsertAttachment
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ticket operations
  getAllTickets(): Promise<Ticket[]>;
  getTicketById(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<Ticket>): Promise<Ticket>;
  
  // Message operations
  getMessagesByTicketId(ticketId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Attachment operations
  getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]>;
  getAttachmentById(id: number): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private messages: Map<number, Message>;
  private attachments: Map<number, Attachment>;
  private userIdCounter: number;
  private ticketIdCounter: number;
  private messageIdCounter: number;
  private attachmentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.messages = new Map();
    this.attachments = new Map();
    this.userIdCounter = 1;
    this.ticketIdCounter = 1;
    this.messageIdCounter = 1;
    this.attachmentIdCounter = 1;
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@example.com",
      role: "admin",
      name: "Admin User"
    });
    
    // Initialize with sample tickets
    this.initSampleTickets();
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
}

// Create and export a singleton instance
export const storage = new MemStorage();
