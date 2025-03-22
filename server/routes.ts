import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { classifyTicket, attemptAutoResolve, generateChatResponse, summarizeConversation } from "./ai";
import type { ChatMessage } from "./ai";
import { z } from "zod";
import { 
  insertTicketSchema, 
  insertMessageSchema, 
  insertUserSchema,
  insertAttachmentSchema,
  type InsertTicket,
  type InsertMessage,
  type InsertAttachment,
  type ChatbotResponse
} from "@shared/schema";
import { setupAuth } from "./auth";
import { registerEmailRoutes } from "./routes/email-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes and middleware
  const { requireAuth } = setupAuth(app);

  // TICKET ROUTES - Protected admin routes
  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicketById(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const messages = await storage.getMessagesByTicketId(id);
      const attachments = await storage.getAttachmentsByTicketId(id);
      res.status(200).json({ ...ticket, messages, attachments });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // This route needs no auth since it can be created by the chatbot
  app.post("/api/tickets", async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      
      // Use AI to classify the ticket
      const classification = await classifyTicket(ticketData.title, ticketData.description);
      
      const newTicket: InsertTicket = {
        ...ticketData,
        category: classification.category,
        complexity: classification.complexity,
        assignedTo: classification.assignedTo,
        aiNotes: classification.aiNotes,
      };
      
      const ticket = await storage.createTicket(newTicket);
      
      // Attempt to auto-resolve if AI thinks it can
      if (classification.canAutoResolve) {
        const { resolved, response } = await attemptAutoResolve(ticket.title, ticket.description);
        
        // Store AI response as a message
        await storage.createMessage({
          ticketId: ticket.id,
          sender: "ai",
          content: response,
          metadata: { isAutoResolved: resolved }
        });
        
        if (resolved) {
          // Update ticket as resolved by AI
          await storage.updateTicket(ticket.id, { 
            status: "resolved",
            aiResolved: true,
            resolvedAt: new Date()
          });
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicketById(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const updatedTicket = await storage.updateTicket(id, req.body);
      res.status(200).json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // MESSAGE ROUTES
  app.get("/api/tickets/:ticketId/messages", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messages = await storage.getMessagesByTicketId(ticketId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tickets/:ticketId/messages", async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messageData = insertMessageSchema.parse({ ...req.body, ticketId });
      
      const ticket = await storage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const newMessage = await storage.createMessage(messageData);
      
      // If message is from user and ticket is still active, generate AI response
      if (messageData.sender === "user" && ticket.status !== "resolved") {
        const messages = await storage.getMessagesByTicketId(ticketId);
        
        // Convert to the format expected by the AI
        const messageHistory: ChatMessage[] = messages.map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        } as ChatMessage));
        
        // Generate AI response
        const aiResponse = await generateChatResponse(
          { id: ticket.id, title: ticket.title, description: ticket.description, category: ticket.category },
          messageHistory,
          messageData.content
        );
        
        // Store AI response
        const aiMessage = await storage.createMessage({
          ticketId,
          sender: "ai",
          content: aiResponse,
          metadata: null
        });
        
        // Check if ticket should be marked as resolved
        if (aiResponse.toLowerCase().includes("resolved") && 
            !aiResponse.toLowerCase().includes("not resolved")) {
          await storage.updateTicket(ticketId, { 
            status: "resolved",
            aiResolved: true,
            resolvedAt: new Date()
          });
        }
        
        return res.status(201).json({ 
          userMessage: newMessage, 
          aiMessage
        });
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CHATBOT API - For direct interactions without creating a ticket first
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Handle simple greetings and common phrases without creating a ticket
      const lowerMessage = message.toLowerCase().trim();
      const isSimpleGreeting = /^(hi|hello|hey|greetings|howdy|hola|what's up|sup|good (morning|afternoon|evening)|how are you|how's it going|how is it going|how are things)[\s\?\!\.]*$/i.test(lowerMessage);
      
      if (isSimpleGreeting) {
        return res.status(200).json({
          message: "Hello! I'm your AI support assistant. How can I help you today?",
          action: undefined
        });
      }
      
      // First determine if we need to create a ticket
      const initialClassification = await classifyTicket("New chat request", message);
      
      let response: ChatbotResponse;
      
      if (initialClassification.canAutoResolve) {
        // Try to auto-resolve without creating a ticket
        const { resolved, response: aiResponse } = await attemptAutoResolve("New chat request", message);
        
        response = {
          message: aiResponse,
          action: resolved ? { type: 'resolve_ticket', data: null } : undefined
        };
      } else {
        // Need to create a ticket
        response = {
          message: "I'll need to create a support ticket for this issue. Our team will follow up with you.",
          action: {
            type: 'create_ticket',
            data: {
              title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
              description: message,
              category: initialClassification.category,
              complexity: initialClassification.complexity,
              assignedTo: initialClassification.assignedTo,
              aiNotes: initialClassification.aiNotes
            }
          }
        };
      }
      
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ 
        message: "I'm having trouble processing your request right now. Please try again shortly."
      });
    }
  });

  // DASHBOARD METRICS - All require auth
  app.get("/api/metrics/summary", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      
      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.resolvedAt !== null).length;
      
      // Calculate avg response time (placeholder calculation, would be more accurate in real app)
      let totalResponseTime = 0;
      let ticketsWithResponseTime = 0;
      
      for (const ticket of tickets) {
        if (ticket.resolvedAt && ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const resolved = new Date(ticket.resolvedAt);
          const responseTimeHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          totalResponseTime += responseTimeHours;
          ticketsWithResponseTime++;
        }
      }
      
      const avgResponseTime = ticketsWithResponseTime ? 
        (totalResponseTime / ticketsWithResponseTime).toFixed(1) + " hours" : 
        "N/A";
      
      // Calculate AI resolution percentage
      const aiResolvedCount = tickets.filter(t => t.aiResolved).length;
      const aiResolvedPercentage = totalTickets ? 
        Math.round((aiResolvedCount / totalTickets) * 100) + "%" : 
        "0%";
      
      res.status(200).json({
        totalTickets,
        resolvedTickets,
        avgResponseTime,
        aiResolvedPercentage
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/metrics/categories", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      
      // Count tickets by category
      const categoryCount: Record<string, number> = {};
      
      tickets.forEach(ticket => {
        categoryCount[ticket.category] = (categoryCount[ticket.category] || 0) + 1;
      });
      
      // Calculate percentages
      const distribution = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / tickets.length) * 100)
      }));
      
      res.status(200).json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/metrics/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const tickets = await storage.getAllTickets();
      
      // Sort by createdAt (descending) and take the most recent ones
      const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      res.status(200).json(recentTickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ATTACHMENT ROUTES
  app.get("/api/tickets/:ticketId/attachments", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const attachments = await storage.getAttachmentsByTicketId(ticketId);
      res.status(200).json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/attachments/:id", requireAuth, async (req, res) => {
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
  
  app.post("/api/tickets/:ticketId/attachments", async (req, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
