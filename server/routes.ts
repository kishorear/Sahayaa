import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { classifyTicket, attemptAutoResolve, generateChatResponse, generateTicketTitle, summarizeConversation } from "./ai";
import { reloadProvidersFromDatabase } from "./ai/service";
import { AIProviderFactory } from "./ai/providers";
import type { ChatMessage } from "./ai";
import { buildAIContext } from "./data-source-service";
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
import { registerEmailSupportRoutes } from "./routes/email-support-routes";
import { registerIntegrationRoutes } from "./routes/integration-routes";
import { registerDataSourceRoutes } from "./routes/data-source-routes";
import { registerMfaRoutes } from "./routes/mfa-routes";
import { registerSsoRoutes } from "./routes/sso-routes";
import { registerWidgetAnalyticsRoutes } from "./routes/widget-analytics-routes";
import aiProviderRoutes from "./routes/ai-provider-routes";
import { registerTeamMemberRoutes } from "./routes/team-member-routes";
import teamRoutes from "./routes/team-routes";
import { registerProfileRoutes } from "./routes/profile-routes";
// Import the document routes registration function
import { registerDocumentRoutes } from "./routes/document-routes";
// Import the download routes registration function
import { registerDownloadRoutes } from "./routes/download-routes";
// Import the widget download routes registration function
import { registerWidgetDownloadRoutes } from "./routes/widget-download-routes";
// Import creator routes for multi-tenant management
import creatorRoutes from "./routes/creator-routes";
// Import AI provider availability routes
import aiAvailabilityRoutes from "./routes/ai-availability-routes";
// Import AI providers routes
import aiProvidersRoutes from "./routes/ai-providers-routes";
// Import tenant routes for creator role
import { tenantRoutes } from "./routes/tenant-routes";
import { getSsoService } from "./sso-service";
import { getIntegrationService } from "./integrations";

/**
 * Calculate the cutoff date based on the selected time period
 */
function getTimePeriodCutoff(timePeriod: string): Date {
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timePeriod) {
    case 'daily':
      cutoffDate.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    default:
      cutoffDate.setDate(now.getDate() - 7); // Default to weekly
  }
  
  return cutoffDate;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize email configuration from database 
  try {
    console.log("Attempting to load email configuration from database...");
    const defaultTenant = await storage.getTenantById(1);
    
    if (defaultTenant?.settings && typeof defaultTenant.settings === 'object' && 'emailConfig' in defaultTenant.settings) {
      const { setupEmailService } = await import('./email-service');
      const emailConfig = defaultTenant.settings.emailConfig as any;
      
      console.log("Found email configuration in database, initializing email service");
      const emailService = setupEmailService(emailConfig);
      
      // Start email monitoring if successfully loaded
      emailService.startEmailMonitoring();
      console.log("Email monitoring started successfully");
    } else {
      console.log("No email configuration found in tenant settings");
    }
  } catch (error) {
    console.error("Error loading email configuration:", error);
  }

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
  
  // Register email support routes (publicly accessible)
  registerEmailSupportRoutes(app);
  
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
  app.use('/api/creator', aiProviderRoutes);
  
  // Register team member routes
  registerTeamMemberRoutes(app, requireRole);
  
  // Register team routes
  app.use('/api/teams', teamRoutes);
  
  // Register creator routes for multi-tenant management
  app.use('/api/creators', creatorRoutes);
  
  // Register profile routes
  registerProfileRoutes(app, requireAuth);
  
  // Register document routes
  registerDocumentRoutes(app, requireAuth, requireRole);
  
  // Register download routes (no auth required - public downloads)
  registerDownloadRoutes(app);
  
  // Register widget download routes
  registerWidgetDownloadRoutes(app);
  
  // Register AI availability routes
  app.use('/api/ai', requireAuth, aiAvailabilityRoutes);
  
  // Register AI providers routes - this endpoint must match what the frontend expects: /api/ai-providers
  // Apply authentication middleware to ensure req.isAuthenticated is available
  app.use('/api/ai-providers', requireAuth, aiProvidersRoutes);
  
  // Register tenant routes - access restricted to creator role users only
  app.use('/api', requireAuth, tenantRoutes);
  
  // Initialize SSO service for all tenants
  try {
    const ssoService = getSsoService();
    await ssoService.initializeProviders(1); // Initialize for default tenant
  } catch (error) {
    console.error("Failed to initialize SSO providers:", error);
  }
  
  // Initialize AI providers cache during app startup
  try {
    console.log("Initializing AI providers cache...");
    await reloadProvidersFromDatabase();
    console.log("AI providers cache initialized successfully");
  } catch (error) {
    console.error("Failed to initialize AI providers cache:", error);
  }

  // TICKET ROUTES - Protected routes for support staff and admins
  app.get("/api/tickets", requireRole(['admin', 'support-agent', 'engineer', 'creator']), async (req, res) => {
    try {
      // Check if user is a creator to determine if we should include tenantId filtering
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // For creator users, allow filtering by tenantId if provided
      let tenantId: number | undefined = undefined;
      
      if (isCreator && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // For non-creator users, always filter by their tenant
        tenantId = req.user?.tenantId;
      }
      
      // Add other optional filters
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;
      
      console.log(`Fetching tickets with filters - isCreator: ${isCreator}, tenantId: ${tenantId}, status: ${status}, category: ${category}, assignedTo: ${assignedTo}`);
      
      // Get filtered tickets
      const tickets = await storage.getAllTickets(tenantId);
      
      // Apply additional filters
      let filteredTickets = tickets;
      
      if (status) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
      }
      
      if (category) {
        filteredTickets = filteredTickets.filter(ticket => ticket.category === category);
      }
      
      if (assignedTo && !isNaN(assignedTo)) {
        filteredTickets = filteredTickets.filter(ticket => ticket.assignedTo === assignedTo);
      }
      
      res.status(200).json(filteredTickets);
    } catch (error) {
      handleDatabaseError(error, res);
    }
  });

  app.get("/api/tickets/:id", requireRole(['admin', 'support-agent', 'engineer', 'creator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user is a creator to determine if we should include tenantId
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // For non-creator users, always filter by their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      const ticket = await storage.getTicketById(id, tenantId);
      
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
      // Validate the ticket data
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
      
      // Create ticket in our system
      const ticket = await storage.createTicket(newTicket);
      
      // Create ticket in third-party systems - this happens for ALL tickets
      // as we want tickets created in both our system and third-party systems simultaneously
      const externalTicketReferences: Record<string, any> = {};
      
      // Log the ticket creation
      console.log(`Ticket #${ticket.id} created, creating in third-party systems...`);
      
      // Always create ticket in third-party systems when they're configured
      try {
        // Get the integration service to handle third-party ticket creation
        const integrationService = getIntegrationService();
        
        // Add more detailed logging
        console.log(`Creating ticket #${ticket.id} "${newTicket.title}" in third-party systems...`);
        console.log(`Ticket details: category=${newTicket.category}, complexity=${newTicket.complexity}`);
        console.log(`Assigned to: ${newTicket.assignedTo || 'Unassigned'}`);
        
        // Create the ticket in any enabled third-party systems
        const thirdPartyResults = await integrationService.createTicketInThirdParty(newTicket);
        console.log(`Third-party ticket creation results:`, thirdPartyResults);
        
        // Save external references to metadata for future updates
        if (thirdPartyResults.jira) {
          if (!thirdPartyResults.jira.error) {
            externalTicketReferences.jira = thirdPartyResults.jira.key;
            console.log(`Ticket created in Jira with key: ${thirdPartyResults.jira.key}, url: ${thirdPartyResults.jira.url}`);
          } else {
            console.error(`Failed to create ticket in Jira: ${thirdPartyResults.jira.error}`);
            // Add error information to the ticket in our system for future reference/troubleshooting
            await storage.updateTicket(ticket.id, {
              clientMetadata: {
                ...(ticket.clientMetadata || {}),
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
            // Add error information to the ticket in our system for future reference/troubleshooting
            await storage.updateTicket(ticket.id, {
              clientMetadata: {
                ...(ticket.clientMetadata || {}),
                zendeskError: thirdPartyResults.zendesk.error
              }
            });
          }
        }
        
        // If we created any external tickets, update our ticket with the references
        if (Object.keys(externalTicketReferences).length > 0) {
          await storage.updateTicket(ticket.id, {
            externalIntegrations: externalTicketReferences
          });
          
          // Update our ticket object for the response
          ticket.externalIntegrations = externalTicketReferences;
        }
      } catch (integrationError) {
        console.error('Error creating ticket in third-party systems:', integrationError);
        // Continue processing - the ticket was already created in our system
      }
      
      // Attempt to auto-resolve if AI thinks it can
      if (classification.canAutoResolve) {
        // Double check that we have the latest AI provider config
        try {
          await reloadProvidersFromDatabase(ticket.tenantId || 1);
        } catch (error) {
          console.warn('Failed to reload AI providers before auto-resolve attempt:', error);
        }
        
        const { resolved, response } = await attemptAutoResolve(ticket.title, ticket.description, [], ticket.tenantId);
        
        // Create message in our system
        const aiMessage = {
          ticketId: ticket.id,
          sender: "ai",
          content: response,
          metadata: { isAutoResolved: resolved }
        };
        
        await storage.createMessage(aiMessage);
        
        // If ticket was resolved, update status in our system and third-party systems
        if (resolved) {
          // Update ticket as resolved by AI in our system
          await storage.updateTicket(ticket.id, { 
            status: "resolved",
            aiResolved: true,
            resolvedAt: new Date()
          });
          
          // Update status in third-party systems
          if (Object.keys(externalTicketReferences).length > 0) {
            try {
              const integrationService = getIntegrationService();
              await integrationService.updateStatusInThirdParty(
                externalTicketReferences, 
                "resolved"
              );
              
              // Also add the AI response as a comment in third-party systems
              // Create a proper InsertMessage type
              const messageForThirdParty: InsertMessage = {
                ticketId: aiMessage.ticketId,
                sender: aiMessage.sender,
                content: aiMessage.content,
                metadata: aiMessage.metadata as any
              };
              
              await integrationService.addCommentToThirdParty(
                externalTicketReferences,
                messageForThirdParty
              );
            } catch (updateError) {
              console.error('Error updating ticket status in third-party systems:', updateError);
            }
          }
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error('Error in ticket creation:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tickets/:id", requireRole(['admin', 'support-agent', 'engineer', 'creator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // For non-creator users, always filter by their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      // Get the ticket, respecting tenant isolation for non-creators
      const ticket = await storage.getTicketById(id, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Update the ticket
      const updatedTicket = await storage.updateTicket(id, req.body, tenantId);
      res.status(200).json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // MESSAGE ROUTES
  app.get("/api/tickets/:ticketId/messages", requireRole(['admin', 'support-agent', 'engineer', 'creator']), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      // Check if user is a creator to determine tenant filtering  
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // For non-creator users, verify ticket belongs to their tenant
      if (!isCreator) {
        const ticket = await storage.getTicketById(ticketId, req.user?.tenantId);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }
      }
      
      // Get all messages for the ticket
      const messages = await storage.getMessagesByTicketId(ticketId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tickets/:ticketId/messages", requireRole(['admin', 'support-agent', 'engineer', 'user', 'creator']), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messageData = insertMessageSchema.parse({ ...req.body, ticketId });
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // For non-creator users, always filter by their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      // Get ticket with proper tenant filtering
      const ticket = await storage.getTicketById(ticketId, tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Create message in our system
      const newMessage = await storage.createMessage(messageData);
      
      // Sync message to external ticketing systems if they exist
      try {
        if (ticket.externalIntegrations) {
          const externalTickets = ticket.externalIntegrations;
          if (Object.keys(externalTickets).length > 0) {
            // Get integration service to handle syncing
            const integrationService = getIntegrationService();
            
            // Add the message as a comment in third-party systems
            await integrationService.addCommentToThirdParty(
              externalTickets,
              messageData
            );
            
            console.log('Message synced to external ticketing systems:', 
              Object.keys(externalTickets).join(', '));
          }
        }
      } catch (syncError) {
        console.error('Error syncing message to external ticketing systems:', syncError);
        // Continue processing - the message was already created in our system
      }
      
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
          metadata: {} // Empty object instead of null
        });
        
        // Sync AI response to external ticketing systems
        try {
          if (ticket.externalIntegrations) {
            const externalTickets = ticket.externalIntegrations;
            if (Object.keys(externalTickets).length > 0) {
              const integrationService = getIntegrationService();
              
              // Add the AI response as a comment in third-party systems
              // Create a proper InsertMessage type from the aiMessage
              const messageForThirdParty: InsertMessage = {
                ticketId: aiMessage.ticketId,
                sender: aiMessage.sender,
                content: aiMessage.content,
                metadata: aiMessage.metadata as any
              };
              
              await integrationService.addCommentToThirdParty(
                externalTickets,
                messageForThirdParty
              );
              
              console.log('AI response synced to external ticketing systems');
            }
          }
        } catch (syncError) {
          console.error('Error syncing AI response to external ticketing systems:', syncError);
        }
        
        // Check if ticket should be marked as resolved
        const shouldResolve = aiResponse.toLowerCase().includes("resolved") && 
                           !aiResponse.toLowerCase().includes("not resolved");
        
        if (shouldResolve) {
          // Update status in our system
          await storage.updateTicket(ticketId, { 
            status: "resolved",
            aiResolved: true,
            resolvedAt: new Date()
          });
          
          // Update status in third-party systems
          try {
            if (ticket.externalIntegrations) {
              const externalTickets = ticket.externalIntegrations;
              if (Object.keys(externalTickets).length > 0) {
                const integrationService = getIntegrationService();
                
                // Update status in third-party systems
                await integrationService.updateStatusInThirdParty(
                  externalTickets, 
                  "resolved"
                );
                
                console.log('Ticket status updated to resolved in external systems');
              }
            }
          } catch (updateError) {
            console.error('Error updating status in external ticketing systems:', updateError);
          }
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
      console.error('Error handling message creation:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CHATBOT API - For direct interactions without creating a ticket first
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message, messageHistory = [] } = req.body;
      
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
      
      // Convert client message history to ChatMessage format
      const chatHistory: ChatMessage[] = messageHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Handle simple greetings only if it's the first message in the conversation
      const lowerMessage = message.toLowerCase().trim();
      const isSimpleGreeting = /^(hi|hello|hey|greetings|howdy|hola|what's up|sup|good (morning|afternoon|evening)|how are you|how's it going|how is it going|how are things)[\s\?\!\.]*$/i.test(lowerMessage);
      
      if (isSimpleGreeting && chatHistory.length === 0) {
        return res.status(200).json({
          message: "Hello! I'm your AI support assistant. How can I help you today?",
          action: undefined
        });
      }
      
      // Get the appropriate AI provider for chat
      const provider = AIProviderFactory.getProviderForOperation(tenantId, 'chat');
      
      if (!provider) {
        return res.status(500).json({ 
          message: "I'm having trouble connecting to our AI service right now. Please try again shortly."
        });
      }
      
      // If this is not a first message, use the full conversation context with the AI provider
      if (chatHistory.length > 0) {
        try {
          // Get knowledge context
          const knowledgeContext = await buildAIContext(message, tenantId);
          
          // Create a system message for the AI
          const systemPrompt = 
            `You are a helpful customer support agent. Engage conversationally to solve issues.
             Gather basic details and try to give a first-hand resolution to solve the issue.
             Only suggest creating a ticket if you cannot solve the problem directly.
             Be friendly, professional, and empathetic in your responses.
             When appropriate, ask if they would like to upload a screenshot or image to help explain their issue.
             Never make up information. If you don't know something, be honest about it.
             After creating a ticket, ALWAYS ask if the user needs more assistance with anything else. If they say no or indicate they're done, respond by saying you're ending the chat session and they can return anytime they need further help.`;
          
          // Add the current message to the history
          const allMessages = [
            ...chatHistory,
            { role: 'user', content: message }
          ];
          
          // Get AI response
          const aiResponse = await provider.generateChatResponse(allMessages, knowledgeContext, systemPrompt);
          
          // For complex issues not automatically handled in the chat flow, suggest creating a ticket
          const needsTicket = aiResponse.toLowerCase().includes("support ticket") || 
                             aiResponse.toLowerCase().includes("contact support") ||
                             aiResponse.toLowerCase().includes("create a ticket");
          
          if (needsTicket) {
            // Classify message to get appropriate category/complexity
            const classification = await classifyTicket("New chat request", message, tenantId);
            
            return res.status(200).json({
              message: aiResponse,
              action: {
                type: 'suggest_ticket',
                data: {
                  title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                  description: message,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId: tenantId
                }
              }
            });
          }
          
          // Standard response with no action
          return res.status(200).json({
            message: aiResponse,
            action: undefined
          });
        } catch (error) {
          console.error('Error processing conversation with AI:', error);
          // Fall through to legacy flow on error
        }
      }
      
      // Legacy flow for first messages or if conversation handling fails
      const initialClassification = await classifyTicket("New chat request", message, tenantId);
      
      let response: ChatbotResponse;
      
      if (initialClassification.canAutoResolve) {
        // Try to auto-resolve without creating a ticket
        const { resolved, response: aiResponse } = await attemptAutoResolve("New chat request", message, chatHistory, tenantId);
        
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

  // Endpoint for generating AI-powered ticket titles
  app.post("/api/chatbot/title", async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Messages array is required",
          title: "Support Request"
        });
      }
      
      // Get tenant context from middleware or request
      const tenantId = req.tenant?.id || req.user?.tenantId || 1; // Default to tenant 1 if not specified
      
      // Pre-load the AI providers to ensure we're using the latest configuration
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn('Failed to reload AI providers before title generation request:', error);
        // Continue with request even if provider reload fails
      }
      
      // Generate a title for the ticket based on conversation
      const title = await generateTicketTitle(messages, tenantId);
      
      return res.status(200).json({ 
        success: true, 
        title 
      });
    } catch (error) {
      console.error('Error generating ticket title:', error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to generate ticket title",
        title: "Support Request"
      });
    }
  });

  // Endpoint for generating AI-powered ticket summaries
  app.post("/api/chatbot/summarize", async (req, res) => {
    try {
      const { messages, purpose = "ticket_creation" } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Messages array is required",
          summary: "Support ticket created via chat. A summary could not be generated."
        });
      }
      
      // Get tenant context from middleware or request
      const tenantId = req.tenant?.id || req.user?.tenantId || 1; // Default to tenant 1 if not specified
      
      // Pre-load the AI providers to ensure we're using the latest configuration
      try {
        await reloadProvidersFromDatabase(tenantId);
      } catch (error) {
        console.warn('Failed to reload AI providers before summary request:', error);
        // Continue with request even if provider reload fails
      }
      
      // Get the appropriate AI provider for summarization
      const provider = AIProviderFactory.getProviderForOperation(tenantId, 'chat');
      
      if (!provider) {
        return res.status(500).json({ 
          success: false, 
          error: "AI provider not available",
          summary: "Support ticket created via chat. A summary could not be generated due to AI service unavailability."
        });
      }
      
      // Create a system prompt for summarization based on purpose
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
      
      // Convert client messages to ChatMessage format
      const formattedMessages: ChatMessage[] = messages.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add the system message at the beginning
      const promptedMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...formattedMessages,
        { role: 'user', content: 'Please summarize this conversation for a support ticket.' }
      ];
      
      // Get knowledge context
      const knowledgeContext = await buildAIContext("summarize conversation", tenantId);
      
      // Generate summary using the AI provider
      const summary = await provider.generateChatResponse(promptedMessages, knowledgeContext);
      
      console.log("AI generated summary:", summary);
      
      // Return the generated summary
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

  // DASHBOARD METRICS - Require admin or support-agent roles
  app.get("/api/metrics/summary", requireRole(['admin', 'support-agent', 'creator']), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod as string || 'weekly';
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator';
      
      // Get tenant ID based on role and query parameters
      let tenantId: number | undefined;
      
      if (isCreator && req.query.tenantId) {
        // Creator role can filter by tenant if provided
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user?.tenantId;
      }
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Filter tickets based on timePeriod
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      
      const totalTickets = filteredTickets.length;
      const resolvedTickets = filteredTickets.filter(t => t.status === "resolved" || t.resolvedAt !== null).length;
      
      // Calculate avg response time (placeholder calculation, would be more accurate in real app)
      let totalResponseTime = 0;
      let ticketsWithResponseTime = 0;
      
      for (const ticket of tickets) {
        // Account for tickets with status = 'resolved' even if resolvedAt is null
        if ((ticket.status === "resolved" || ticket.resolvedAt !== null) && ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          
          // Use resolvedAt if available, otherwise use updatedAt as a fallback for resolved tickets
          const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date(ticket.updatedAt);
          
          const responseTimeHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          totalResponseTime += responseTimeHours;
          ticketsWithResponseTime++;
        }
      }
      
      const avgResponseTime = ticketsWithResponseTime ? 
        (totalResponseTime / ticketsWithResponseTime).toFixed(1) + " hours" : 
        "N/A";
      
      // Calculate AI resolution percentage
      // Get widget analytics to count auto-resolved chats that didn't create tickets
      // Apply tenant filter for non-creator users
      const widgetAnalytics = isCreator ? 
        await storage.getAllWidgetAnalytics() : 
        await storage.getWidgetAnalyticsByTenantId(tenantId || 0);
      
      // Count auto-resolved conversations from widget analytics metadata
      let autoResolvedChatsCount = 0;
      
      try {
        // Use for of loop with Array.isArray for safety
        if (Array.isArray(widgetAnalytics)) {
          for (const analytics of widgetAnalytics) {
            // Field might be returned in snake_case from SQL query
            const metadata = (analytics.metadata || (analytics as any).metadata);
            
            if (metadata && typeof metadata === 'object') {
              // Check if metadata contains autoResolved conversations
              const metadataObj = metadata as Record<string, any>;
              if (metadataObj.autoResolvedConversations) {
                autoResolvedChatsCount += metadataObj.autoResolvedConversations;
              }
            }
          }
        } else {
          console.warn('Widget analytics is not an array:', widgetAnalytics);
        }
      } catch (err) {
        console.error('Error processing widget analytics:', err);
        // Continue with default value of 0 for autoResolvedChatsCount
      }
      
      // Count tickets resolved by AI
      const aiResolvedTicketsCount = tickets.filter(t => t.aiResolved).length;
      
      // Total of AI resolved interactions (tickets + auto-resolved chats)
      const totalAiResolved = aiResolvedTicketsCount + autoResolvedChatsCount;
      
      // Total interactions (tickets + auto-resolved chats that didn't create tickets)
      const totalInteractions = totalTickets + autoResolvedChatsCount;
      
      // Calculate the AI resolution percentage
      const aiResolvedPercentage = totalInteractions > 0 ? 
        Math.round((totalAiResolved / totalInteractions) * 100) + "%" : 
        "0%";
      
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

  app.get("/api/metrics/categories", requireRole(['admin', 'support-agent', 'creator']), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod as string || 'weekly';
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator';
      
      // Get tenant ID based on role and query parameters
      let tenantId: number | undefined;
      
      if (isCreator && req.query.tenantId) {
        // Creator role can filter by tenant if provided
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user?.tenantId;
      }
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Filter tickets based on timePeriod
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      
      // Count tickets by category
      const categoryCount: Record<string, number> = {};
      
      filteredTickets.forEach(ticket => {
        categoryCount[ticket.category] = (categoryCount[ticket.category] || 0) + 1;
      });
      
      // Calculate percentages
      const distribution = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / filteredTickets.length) * 100)
      }));
      
      res.status(200).json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/metrics/recent", requireRole(['admin', 'support-agent']), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator';
      
      // For non-creator users, filter by their tenant
      const tenantId = isCreator ? undefined : req.user?.tenantId;
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Sort by createdAt (descending) and take the most recent ones
      const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      res.status(200).json(recentTickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // API endpoint for response time metrics
  app.get("/api/metrics/response-time", requireRole(['admin', 'support-agent', 'creator']), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod as string || 'weekly';
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator';
      
      // Get tenant ID based on role and query parameters
      let tenantId: number | undefined;
      
      if (isCreator && req.query.tenantId) {
        // Creator role can filter by tenant if provided
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user?.tenantId;
      }
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Filter tickets based on timePeriod
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      
      // Group tickets by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeekData: Record<string, { count: number, totalHours: number }> = {};
      
      // Initialize all days
      dayNames.forEach(day => {
        dayOfWeekData[day] = { count: 0, totalHours: 0 };
      });
      
      // Calculate response time for each ticket and group by day
      filteredTickets.forEach(ticket => {
        if ((ticket.status === "resolved" || ticket.resolvedAt !== null) && ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date(ticket.updatedAt);
          
          const responseTimeHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          const dayOfWeek = dayNames[created.getDay()];
          
          dayOfWeekData[dayOfWeek].count++;
          dayOfWeekData[dayOfWeek].totalHours += responseTimeHours;
        }
      });
      
      // Calculate average response time for each day
      const responseTimeData = Object.entries(dayOfWeekData).map(([name, data]) => ({
        name,
        avg: data.count > 0 ? parseFloat((data.totalHours / data.count).toFixed(1)) : 0
      }));
      
      // Sort days of week correctly
      responseTimeData.sort((a, b) => {
        return dayNames.indexOf(a.name) - dayNames.indexOf(b.name);
      });
      
      res.status(200).json(responseTimeData);
    } catch (error) {
      console.error("Error getting response time metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // API endpoint for ticket volume metrics
  app.get("/api/metrics/ticket-volume", requireRole(['admin', 'support-agent', 'creator']), async (req, res) => {
    try {
      const timePeriod = req.query.timePeriod as string || 'weekly';
      
      // Check if user is a creator to determine tenant filtering
      const isCreator = req.user?.role === 'creator';
      
      // Get tenant ID based on role and query parameters
      let tenantId: number | undefined;
      
      if (isCreator && req.query.tenantId) {
        // Creator role can filter by tenant if provided
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user?.tenantId;
      }
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Filter tickets based on timePeriod
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      
      // Group tickets by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeekCounts: Record<string, number> = {};
      
      // Initialize all days to 0
      dayNames.forEach(day => {
        dayOfWeekCounts[day] = 0;
      });
      
      // Count tickets for each day
      filteredTickets.forEach(ticket => {
        if (ticket.createdAt) {
          const created = new Date(ticket.createdAt);
          const dayOfWeek = dayNames[created.getDay()];
          dayOfWeekCounts[dayOfWeek]++;
        }
      });
      
      // Format data for chart
      const volumeData = Object.entries(dayOfWeekCounts).map(([name, count]) => ({
        name,
        volume: count
      }));
      
      // Sort days of week correctly
      volumeData.sort((a, b) => {
        return dayNames.indexOf(a.name) - dayNames.indexOf(b.name);
      });
      
      res.status(200).json(volumeData);
    } catch (error) {
      console.error("Error getting ticket volume metrics:", error);
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
  
  // Add a direct MCP test endpoint
  app.post("/api/mcp-test", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      console.log("MCP Test Query:", query);
      
      // Use the Model Context Protocol to enhance the response
      const context = await import("./model-context-protocol").then(mcp => {
        return mcp.getContextForQuery(query);
      });
      
      console.log("MCP Context Found:", !!context);
      
      // Get the AI provider
      const aiProvider = AIProviderFactory.getProvider(1, "openai"); // Default tenant ID and provider
      
      // If we have context, use it to enhance the response
      let systemPrompt = `You are a helpful support assistant that provides accurate information about technical issues. `;
      
      if (context) {
        systemPrompt += `\nI'm providing you with relevant documentation that matches this query. Use this information to give a detailed, accurate response.\n\nRELEVANT DOCUMENTATION:\n${context}\n\nBased on this documentation, answer the user's question:`;
      }
      
      // Format as chat message
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ];
      
      // Generate response
      if (!aiProvider) {
        throw new Error("No AI provider available. Please configure an AI provider in settings.");
      }
      
      const response = await aiProvider.generateChatResponse(messages, context || "", systemPrompt);
      
      res.json({ response, hasContext: !!context });
    } catch (error) {
      console.error("Error in MCP test endpoint:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
