import { 
  users, 
  tickets, 
  messages, 
  type User, 
  type InsertUser, 
  type Ticket, 
  type InsertTicket, 
  type Message, 
  type InsertMessage 
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private messages: Map<number, Message>;
  private userIdCounter: number;
  private ticketIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.messages = new Map();
    this.userIdCounter = 1;
    this.ticketIdCounter = 1;
    this.messageIdCounter = 1;
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@example.com",
      role: "admin",
      name: "Admin User"
    });
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
      status: "new",
      aiResolved: false,
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
}

// Create and export a singleton instance
export const storage = new MemStorage();
