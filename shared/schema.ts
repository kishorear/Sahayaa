import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  name: text("name"),
  email: text("email"),
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
  });

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
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
