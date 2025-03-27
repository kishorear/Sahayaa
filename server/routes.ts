import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { classifyTicket, attemptAutoResolve, generateChatResponse, summarizeConversation } from "./ai";
import { reloadProvidersFromDatabase } from "./ai/service";
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
import { registerIntegrationRoutes } from "./routes/integration-routes";
import { registerDataSourceRoutes } from "./routes/data-source-routes";
import { registerMfaRoutes } from "./routes/mfa-routes";
import { registerSsoRoutes } from "./routes/sso-routes";
import { registerWidgetAnalyticsRoutes } from "./routes/widget-analytics-routes";
import { registerAiProviderRoutes } from "./routes/ai-provider-routes";
import { getSsoService } from "./sso-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add enhanced error handlers for database-related errors in all routes
  const handleDatabaseError = (error: any, res: Response) => {
    console.error("Route handler database error:", error);
    
    // Check if this is a database connection error
    if (error && typeof error === 'object' && 
        (error.code === 'ECONNREFUSED' || error.code === '57P01' || 
         error.code === '08006' || error.code === 'ETIMEDOUT' || 
         error.code === '08001')) {
      
      console.error("Database connection error in route handler:", error);
      
      // Try to reconnect the database
      import('./db').then(db => {
        db.reconnectDb().catch(e => console.error("Failed to reconnect DB:", e));
      }).catch(e => console.error("Failed to import db module:", e));
      
      return res.status(503).json({
        message: "Database service temporarily unavailable",
        error_type: "database_connection",
        retry_after: 5 // Suggest client to retry after 5 seconds
      });
    }
    
    // Default error response for non-database errors
    return res.status(500).json({ 
      message: "Internal server error",
      error_type: "server_error"
    });
  };
  
  // Setup authentication routes and middleware
  const { requireAuth, requireRole } = await setupAuth(app);
  
  // Register email-related routes
  registerEmailRoutes(app, requireRole(['admin', 'support-agent']));
  
  // Register third-party integration routes
  registerIntegrationRoutes(app, requireRole(['admin']));
  
  // Register data source routes
  registerDataSourceRoutes(app, requireRole(['admin']));
  
  // Register MFA routes
  registerMfaRoutes(app, requireAuth);
  
  // Register SSO routes
  registerSsoRoutes(app, requireAuth, requireRole);
  
  // Register widget analytics routes
  registerWidgetAnalyticsRoutes(app, requireAuth);
  
  // Register AI provider routes
  registerAiProviderRoutes(app, requireAuth, requireRole);
  
  // Initialize SSO service for all tenants
  try {
    const ssoService = getSsoService();
    await ssoService.initializeProviders(1); // Initialize for default tenant
  } catch (error) {
    console.error("Failed to initialize SSO providers:", error);
  }

  // TICKET ROUTES - Protected routes for support staff and admins
  app.get("/api/tickets", requireRole(['admin', 'support-agent', 'engineer']), async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.status(200).json(tickets);
    } catch (error) {
      handleDatabaseError(error, res);
    }
  });

  app.get("/api/tickets/:id", requireRole(['admin', 'support-agent', 'engineer']), async (req, res) => {
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
      // Pass tenant context if available (from middleware or user)
      const tenantId = req.tenant?.id || req.user?.tenantId;
      
      // Pre-load the AI providers to ensure we're using the latest configuration
      try {
        await reloadProvidersFromDatabase(tenantId || 1);
      } catch (error) {
        console.warn('Failed to reload AI providers before ticket classification:', error);
        // Continue with request even if provider reload fails
      }
      
      const classification = await classifyTicket(ticketData.title, ticketData.description, tenantId);
      
      const newTicket: InsertTicket = {
        ...ticketData,
        category: classification.category,
        complexity: classification.complexity,
        assignedTo: classification.assignedTo,
        aiNotes: classification.aiNotes,
        // Ensure the ticket is associated with the correct tenant
        tenantId: tenantId || ticketData.tenantId
      };
      
      const ticket = await storage.createTicket(newTicket);
      
      // Attempt to auto-resolve if AI thinks it can
      if (classification.canAutoResolve) {
        // Double check that we have the latest AI provider config
        try {
          await reloadProvidersFromDatabase(ticket.tenantId || 1);
        } catch (error) {
          console.warn('Failed to reload AI providers before auto-resolve attempt:', error);
        }
        
        const { resolved, response } = await attemptAutoResolve(ticket.title, ticket.description, [], ticket.tenantId);
        
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

  app.patch("/api/tickets/:id", requireRole(['admin', 'support-agent', 'engineer']), async (req, res) => {
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
  app.get("/api/tickets/:ticketId/messages", requireRole(['admin', 'support-agent', 'engineer']), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messages = await storage.getMessagesByTicketId(ticketId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tickets/:ticketId/messages", requireRole(['admin', 'support-agent', 'engineer', 'user']), async (req, res) => {
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
        // Pre-load the AI providers to ensure we're using the latest configuration
        try {
          await reloadProvidersFromDatabase(ticket.tenantId || 1);
        } catch (error) {
          console.warn('Failed to reload AI providers before generating response:', error);
          // Continue with request even if provider reload fails
        }
        
        const messages = await storage.getMessagesByTicketId(ticketId);
        
        // Convert to the format expected by the AI
        const messageHistory: ChatMessage[] = messages.map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        } as ChatMessage));
        
        // Generate AI response
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
      
      // Get tenant context from middleware or request
      const tenantId = req.tenant?.id || req.user?.tenantId || 1; // Default to tenant 1 if not specified
      
      // Pre-load the AI providers to ensure we're using the latest configuration
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn('Failed to reload AI providers before chatbot request:', error);
        // Continue with request even if provider reload fails
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
      const initialClassification = await classifyTicket("New chat request", message, tenantId);
      
      let response: ChatbotResponse;
      
      if (initialClassification.canAutoResolve) {
        // Make sure we have the latest provider config before attempting auto-resolve
        try {
          await reloadProvidersFromDatabase(tenantId);
        } catch (error) {
          console.warn('Failed to reload AI providers before auto-resolve attempt:', error);
        }
        
        // Try to auto-resolve without creating a ticket
        const { resolved, response: aiResponse } = await attemptAutoResolve("New chat request", message, [], tenantId);
        
        response = {
          message: aiResponse,
          action: resolved ? { type: 'resolve_ticket', data: null } : undefined
        };
      } else {
        // Suggest creating a ticket (ask for user confirmation first)
        response = {
          message: "It looks like this issue needs our support team's assistance. I can help you create a support ticket for faster resolution.",
          action: {
            type: 'suggest_ticket',
            data: {
              title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
              description: message,
              category: initialClassification.category,
              complexity: initialClassification.complexity,
              assignedTo: initialClassification.assignedTo,
              aiNotes: initialClassification.aiNotes,
              tenantId: tenantId
            }
          }
        };
      }
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error processing chatbot request:', error);
      res.status(500).json({ 
        message: "I'm having trouble processing your request right now. Please try again shortly."
      });
    }
  });

  // DASHBOARD METRICS - Require admin or support-agent roles
  app.get("/api/metrics/summary", requireRole(['admin', 'support-agent']), async (req, res) => {
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

  app.get("/api/metrics/categories", requireRole(['admin', 'support-agent']), async (req, res) => {
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

  app.get("/api/metrics/recent", requireRole(['admin', 'support-agent']), async (req, res) => {
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
  app.get("/api/tickets/:ticketId/attachments", requireRole(['admin', 'support-agent', 'engineer', 'user']), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const attachments = await storage.getAttachmentsByTicketId(ticketId);
      res.status(200).json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/attachments/:id", requireRole(['admin', 'support-agent', 'engineer', 'user']), async (req, res) => {
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
  
  app.post("/api/tickets/:ticketId/attachments", requireRole(['admin', 'support-agent', 'engineer', 'user']), async (req, res) => {
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
