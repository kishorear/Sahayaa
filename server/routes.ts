import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { classifyTicket, attemptAutoResolve, generateChatResponse, generateTicketTitle, summarizeConversation } from "./ai";
import { reloadProvidersFromDatabase } from "./ai/service";
import { AIProviderFactory } from "./ai/providers";
import type { ChatMessage } from "./ai";
import { buildAIContext } from "./data-source-service";
import agentService from "./ai/agent-service";
// Removed LocalVectorStorage import - using agent service instead
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
import monitoringRoutes from "./routes/monitoring-routes.js";
import { registerEmailRoutes } from "./routes/email-routes";
import { registerEmailSupportRoutes } from "./routes/email-support-routes";
import { registerIntegrationRoutes } from "./routes/integration-routes";
import { registerDataSourceRoutes } from "./routes/data-source-routes";
import { getIntegrationService } from "./integrations";
import { registerMfaRoutes } from "./routes/mfa-routes";
import { registerSsoRoutes } from "./routes/sso-routes";
import { registerWidgetAnalyticsRoutes } from "./routes/widget-analytics-routes";
import { registerUserRoutes } from "./routes/user-routes";
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
import { registerWidgetAuthDownloadRoutes } from "./routes/widget-auth-download-routes";
import { registerWidgetAuthenticationRoutes } from "./routes/widget-authentication-routes";
// Import widget API key routes for managing API keys
import { registerWidgetApiKeyRoutes } from "./routes/widget-api-keys-routes";
// Import widget agent routes for agent communication
import { registerWidgetAgentRoutes, registerPreprocessorTestRoute } from "./routes/widget-agent-routes";
// Import widget chat routes for existing chat functionality
import { registerWidgetChatRoutes } from "./routes/widget-chat-routes";
// Import widget ticket creation routes
import { registerWidgetTicketRoutes } from "./routes/widget-ticket-routes";
// Import agent resources routes for agent-specific file uploads
import agentResourcesRoutes from "./routes/agent-resources";
// Import agent test routes
import agentTestRoutes from "./routes/agent-test-routes";
// Import MCP database routes for multi-database support
import { registerMcpDatabaseRoutes } from "./routes/mcp-database-routes";
// Import enhanced agent routes with MCP integration
import agentRoutes from "./routes/agent-routes";
// Import creator routes for multi-tenant management
import creatorRoutes from "./routes/creator-routes";
// Import AI provider availability routes
import aiAvailabilityRoutes from "./routes/ai-availability-routes";
// Import AI providers routes
import aiProvidersRoutes from "./routes/ai-providers-routes";
// Import knowledge sync routes
import { registerKnowledgeSyncRoutes } from "./routes/knowledge-sync-routes";
// Import tenant routes for creator role
import { tenantRoutes } from "./routes/tenant-routes";
// Import custom roles and industry type routes
import { registerCustomRolesRoutes } from "./routes/custom-roles-routes";
// Import permissions routes
import permissionsRoutes from "./routes/permissions-routes";
import { getSsoService } from "./sso-service";
import { getIntegrationService } from "./integrations";
import { healthCheckHandler, readinessHandler, livenessHandler } from "./health-check";

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
  
  // Register health check endpoints (before auth middleware)
  app.get('/health', healthCheckHandler);
  app.get('/healthz', healthCheckHandler);
  app.get('/ready', readinessHandler);
  app.get('/readiness', readinessHandler);
  app.get('/live', livenessHandler);
  app.get('/liveness', livenessHandler);
  
  // Add monitoring endpoints for system performance and health
  app.use('/api/monitoring', monitoringRoutes);
  
  // Register Chat Preprocessor Agent test route (before auth middleware)
  registerPreprocessorTestRoute(app);
  
  // Setup authentication routes and middleware
  const { requireAuth, requireRole } = await setupAuth(app);
  
  // Register email-related routes
  registerEmailRoutes(app, requireRole(['admin', 'support_agent']));
  
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
  
  // Register widget download routes
  registerWidgetDownloadRoutes(app);
  
  // Register widget auth download routes for enhanced client integration
  registerWidgetAuthDownloadRoutes(app);
  
  // Register widget authentication routes for user verification
  registerWidgetAuthenticationRoutes(app);
  
  // Register widget API key routes
  registerWidgetApiKeyRoutes(app);
  
  // Register widget chat routes (existing chat functionality)
  registerWidgetChatRoutes(app);
  registerWidgetTicketRoutes(app);
  
  // Register widget agent routes (new agent communication endpoints)
  registerWidgetAgentRoutes(app);

  // Agent system status endpoint
  app.get('/api/agent/status', async (req: Request, res: Response) => {
    try {
      // Check actual system components
      let agentServiceAvailable = false;
      let mcpServiceAvailable = false;
      let vectorStorageAvailable = false;
      let aiProvidersConfigured = [];

      // Test agent service availability
      try {
        agentServiceAvailable = await agentService.isAvailable();
      } catch (error) {
        console.log('Agent service check failed:', error);
      }

      // Check MCP service by trying to connect
      try {
        const mcpResponse = await fetch('http://localhost:8000/health');
        mcpServiceAvailable = mcpResponse.ok;
      } catch (error) {
        console.log('MCP service check failed:', error);
      }

      // Check vector storage (assume available if agent service is working)
      vectorStorageAvailable = agentServiceAvailable;

      // Check configured AI providers
      try {
        const tenantId = req.user?.tenantId || 1;
        await reloadProvidersFromDatabase(tenantId);
        const factory = AIProviderFactory.getInstance();
        
        // Try to get configured providers
        try {
          const googleAI = factory.getProvider('google', tenantId);
          if (googleAI) aiProvidersConfigured.push('Google AI');
        } catch (e) { /* Provider not configured */ }
        
        try {
          const openAI = factory.getProvider('openai', tenantId);
          if (openAI) aiProvidersConfigured.push('OpenAI');
        } catch (e) { /* Provider not configured */ }
        
        try {
          const anthropic = factory.getProvider('anthropic', tenantId);
          if (anthropic) aiProvidersConfigured.push('Anthropic');
        } catch (e) { /* Provider not configured */ }
      } catch (error) {
        console.log('AI provider check failed:', error);
      }

      const systemStatus = {
        orchestrator_available: agentServiceAvailable,
        sub_agents: {
          chat_preprocessor: agentServiceAvailable,
          instruction_lookup: agentServiceAvailable && mcpServiceAvailable,
          ticket_lookup: agentServiceAvailable && vectorStorageAvailable,
          ticket_formatter: agentServiceAvailable
        },
        external_services: {
          vector_storage: vectorStorageAvailable,
          mcp_service: mcpServiceAvailable,
          ai_providers: aiProvidersConfigured.length > 0 ? aiProvidersConfigured : ['None configured']
        },
        capabilities: [
          'message_preprocessing',
          'instruction_search', 
          'ticket_similarity',
          'llm_resolution',
          'ticket_formatting',
          'multi_tenant_isolation',
          'postgresql_storage',
          'session_management',
          'rbac_security'
        ]
      };
      
      res.json(systemStatus);
    } catch (error) {
      console.error('Failed to get agent system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status'
      });
    }
  });

  // Agent workflow test endpoint
  app.post('/api/agent/workflow-test', async (req: Request, res: Response) => {
    try {
      const { user_message, session_id, tenant_id, user_context } = req.body;
      
      if (!user_message) {
        return res.status(400).json({
          success: false,
          error: 'user_message is required'
        });
      }

      const startTime = Date.now();
      
      // Simulate full workflow processing
      const workflowSteps = {
        preprocessing: {
          urgency: 'MEDIUM',
          sentiment: 'neutral',
          normalized_message: user_message.trim(),
          pii_masked: 0
        },
        instruction_lookup: {
          knowledge_base_hits: Math.floor(Math.random() * 5) + 1,
          relevant_instructions: ['Standard troubleshooting', 'User account management']
        },
        ticket_lookup: {
          similar_tickets_found: Math.floor(Math.random() * 3) + 1,
          similarity_scores: [0.85, 0.72, 0.68]
        },
        llm_resolution: {
          resolution_steps: [
            'Verify user account status',
            'Check system logs for errors',
            'Apply standard resolution procedure',
            'Test solution and confirm resolution'
          ],
          confidence_score: Math.floor(Math.random() * 20) + 80
        },
        ticket_creation: {
          ticket_id: Math.floor(Math.random() * 10000) + 1000,
          status: 'open',
          category: 'technical_support'
        },
        formatting: {
          professional_format: true,
          step_count: 4
        }
      };

      const processingTime = Date.now() - startTime;
      
      const result = {
        success: true,
        ticket_id: workflowSteps.ticket_creation.ticket_id,
        ticket_title: `Support Request: ${user_message.substring(0, 50)}...`,
        status: 'open',
        category: 'technical_support',
        urgency: workflowSteps.preprocessing.urgency,
        resolution_steps: workflowSteps.llm_resolution.resolution_steps,
        resolution_steps_count: workflowSteps.llm_resolution.resolution_steps.length,
        confidence_score: workflowSteps.llm_resolution.confidence_score,
        processing_time_ms: processingTime,
        created_at: new Date().toISOString(),
        workflow_steps: workflowSteps,
        data_points: {
          knowledge_base_hits: workflowSteps.instruction_lookup.knowledge_base_hits,
          similar_tickets_found: workflowSteps.ticket_lookup.similar_tickets_found,
          pii_instances_masked: workflowSteps.preprocessing.pii_masked,
          ai_provider_used: 'Google AI',
          tenant_isolation_verified: true
        }
      };

      res.json(result);
    } catch (error) {
      console.error('Failed to process agent workflow test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process workflow test'
      });
    }
  });
  
  // Register widget analytics routes
  registerWidgetAnalyticsRoutes(app, requireAuth);
  
  // Register user routes
  registerUserRoutes(app, requireAuth, requireRole);
  
  // Register AI provider routes
  app.use('/api/creator', aiProviderRoutes);
  
  // Register team member routes
  registerTeamMemberRoutes(app, requireRole);
  
  // Register team routes
  app.use('/api/teams', teamRoutes);
  
  // Register creator routes for multi-tenant management
  app.use('/api/creators', creatorRoutes);
  
  // Register permissions routes
  app.use(permissionsRoutes);
  
  // Register profile routes
  registerProfileRoutes(app, requireAuth);
  
  // Register document routes
  registerDocumentRoutes(app, requireAuth, requireRole);
  
  // Register download routes (no auth required - public downloads)
  registerDownloadRoutes(app);
  
  // Register AI availability routes
  app.use('/api/ai', requireAuth, aiAvailabilityRoutes);
  
  // Register AI providers routes - this endpoint must match what the frontend expects: /api/ai-providers
  // Apply authentication middleware to ensure req.isAuthenticated is available
  app.use('/api/ai-providers', requireAuth, aiProvidersRoutes);
  
  // Register tenant routes - access restricted to creator role users only
  app.use('/api', requireAuth, tenantRoutes);
  
  // Register custom user roles and industry type routes - creator only
  registerCustomRolesRoutes(app, requireAuth);
  
  // Register MCP database routes for multi-database support
  registerMcpDatabaseRoutes(app, requireAuth, requireRole);
  
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

  // TICKET ROUTES - Protected routes with permission-based access control
  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      // CRITICAL SECURITY: Only creator users can access cross-tenant data
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      // Check if user has permission to view tickets
      const { userHasPermission } = await import("./permissions");
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      
      if (!canViewAllTickets && !canViewOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to view tickets" 
        });
      }
      
      // TENANT ISOLATION: All non-creator users MUST be restricted to their tenant
      let tenantId: number | undefined = undefined;
      
      if (isCreator && req.query.tenantId) {
        // Creators can optionally filter by specific tenant
        tenantId = parseInt(req.query.tenantId as string);
        if (isNaN(tenantId)) {
          tenantId = undefined;
        }
      } else if (!isCreator) {
        // SECURITY FIX: ALL non-creator users (admin, support_agent, engineer) are restricted to their tenant
        tenantId = req.user?.tenantId;
        console.log(`Non-creator user access - enforcing tenant isolation for user ${req.user?.username} (tenant: ${tenantId})`);
        
        // CRITICAL SECURITY CHECK: Reject if tenantId is null/undefined for non-creator users
        if (!tenantId) {
          console.error(`SECURITY VIOLATION: Non-creator user ${req.user?.username} (ID: ${req.user?.id}) has null tenantId - denying access`);
          return res.status(403).json({ 
            message: "Access denied: Invalid tenant configuration. Please contact administrator." 
          });
        }
      }
      
      // Add other optional filters
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;
      
      console.log(`Fetching tickets - User: ${req.user?.username} (ID: ${req.user?.id}), Role: ${req.user?.role}, IsCreator: ${isCreator}, CanViewAll: ${canViewAllTickets}, TenantId: ${tenantId}, Filters: {status: ${status}, category: ${category}, assignedTo: ${assignedTo}}`);
      
      // Get filtered tickets
      let tickets = await storage.getAllTickets(tenantId);
      
      // PERMISSION-BASED FILTERING: If user can't view all tickets, only show their own
      if (!canViewAllTickets && !isCreator) {
        tickets = tickets.filter(ticket => ticket.createdBy === req.user?.id);
        console.log(`User can only view own tickets - filtered to ${tickets.length} tickets`);
      }
      
      // Apply additional filters
      let filteredTickets = tickets;
      
      if (status) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
      }
      
      if (category) {
        filteredTickets = filteredTickets.filter(ticket => ticket.category === category);
      }
      
      if (assignedTo && !isNaN(assignedTo)) {
        // Convert assignedTo to string for comparison since the column is text type
        const assignedToString = String(assignedTo);
        filteredTickets = filteredTickets.filter(ticket => ticket.assignedTo === assignedToString);
      }
      
      res.status(200).json(filteredTickets);
    } catch (error) {
      handleDatabaseError(error, res);
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user has permission to view tickets
      const { userHasPermission } = await import("./permissions");
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canViewAllTickets && !canViewOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to view tickets" 
        });
      }
      
      // CRITICAL SECURITY: Only creator users can access cross-tenant data
      // TENANT ISOLATION: ALL non-creator users are restricted to their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      console.log(`Ticket access - User: ${req.user?.username}, Role: ${req.user?.role}, Tenant: ${tenantId}, Creator: ${isCreator}, CanViewAll: ${canViewAllTickets}, CanViewOwn: ${canViewOwnTickets}`);
      
      const ticket = await storage.getTicketById(id, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only view own tickets, verify they are assigned to or created this ticket
      if (canViewOwnTickets && !canViewAllTickets && !isCreator) {
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only view tickets assigned to you or created by you" 
          });
        }
      }
      
      const messages = await storage.getMessagesByTicketId(id);
      const attachments = await storage.getAttachmentsByTicketId(id);
      res.status(200).json({ ...ticket, messages, attachments });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team workload route
  app.get("/api/teams/:teamId/workload", requireAuth, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const tenantId = req.user?.tenantId;
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const workload = await storage.getTeamMemberWorkload(teamId, tenantId);
      res.status(200).json(workload);
    } catch (error) {
      console.error("Error fetching team workload:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check for similar/duplicate tickets before creation
  app.post("/api/tickets/check-duplicates", async (req, res) => {
    try {
      const { title, description } = req.body;
      const tenantId = req.tenant?.id || req.user?.tenantId || 1;
      
      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }
      
      // Search for similar open tickets using text matching
      const allTickets = await storage.getAllTickets(tenantId);
      
      // Filter for open/in-progress tickets only
      const openTickets = allTickets.filter(ticket => 
        ticket.status === 'new' || 
        ticket.status === 'open' || 
        ticket.status === 'in_progress'
      );
      
      // Simple text similarity scoring
      const searchTerms = `${title} ${description}`.toLowerCase().split(/\s+/);
      
      const similarTickets = openTickets.map(ticket => {
        const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
        
        // Count matching words
        const matchCount = searchTerms.filter(term => 
          term.length > 3 && ticketText.includes(term)
        ).length;
        
        // Calculate similarity score (0-1)
        const score = matchCount / Math.max(searchTerms.length, 1);
        
        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          category: ticket.category,
          createdAt: ticket.createdAt,
          score: score
        };
      })
      .filter(ticket => ticket.score > 0.3) // Only return tickets with >30% similarity
      .sort((a, b) => b.score - a.score) // Sort by similarity score
      .slice(0, 5); // Return top 5 matches
      
      console.log(`Found ${similarTickets.length} similar tickets for "${title}"`);
      
      res.status(200).json({
        hasDuplicates: similarTickets.length > 0,
        similarTickets: similarTickets
      });
    } catch (error) {
      console.error("Error checking for duplicate tickets:", error);
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
      
      // ENHANCEMENT: Generate proper AI title if the current title appears to be a raw user message
      let enhancedTitle = ticketData.title;
      if (ticketData.description && ticketData.description.length > ticketData.title.length) {
        // If description is longer than title, it suggests title might be a poor quality user input
        // Generate a better title using AI
        try {
          const titleMessages: ChatMessage[] = [
            { role: 'user', content: ticketData.description }
          ];
          const aiGeneratedTitle = await generateTicketTitle(titleMessages, tenantId || 1);
          if (aiGeneratedTitle && aiGeneratedTitle.length > 5 && aiGeneratedTitle !== 'Support Request') {
            enhancedTitle = aiGeneratedTitle;
            console.log(`Enhanced ticket title from "${ticketData.title}" to "${enhancedTitle}"`);
          }
        } catch (titleError) {
          console.warn('Failed to generate enhanced title, using original:', titleError);
        }
      }
      
      const classification = await classifyTicket(enhancedTitle, ticketData.description, tenantId);
      
      // Use workload-based assignment for fair distribution (assigns to least busy team member)
      let assignedUserId: string | null = null;
      let teamId = ticketData.teamId;
      
      // Try to assign based on ticket category with workload balancing
      try {
        const assignedUser = await storage.assignTicketRandomlyInDepartment(classification.category, tenantId);
        if (assignedUser) {
          assignedUserId = assignedUser.id.toString();
          console.log(`Ticket auto-assigned to ${assignedUser.name || assignedUser.username} (ID: ${assignedUser.id}) based on category "${classification.category}" (least busy eligible team member)`);
        } else {
          console.log(`No available users for category "${classification.category}" - ticket will remain unassigned`);
        }
      } catch (error) {
        console.error(`Error auto-assigning ticket:`, error);
      }
      
      const newTicket: InsertTicket = {
        ...ticketData,
        title: enhancedTitle, // Use the AI-enhanced title
        category: classification.category,
        complexity: classification.complexity,
        assignedTo: assignedUserId,
        aiNotes: classification.aiNotes,
        teamId: teamId,
        // Ensure the ticket is created by the logged-in user
        createdBy: req.user?.id || ticketData.createdBy || null,
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

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user has permission to edit tickets
      const { userHasPermission } = await import("./permissions");
      const canEditOwnTickets = await userHasPermission(req, 'canEditOwnTickets');
      const canEditAllTickets = await userHasPermission(req, 'canEditAllTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canEditOwnTickets && !canEditAllTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to edit tickets" 
        });
      }
      
      // For non-creator users, always filter by their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      // Get the ticket, respecting tenant isolation for non-creators
      const ticket = await storage.getTicketById(id, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only edit own tickets, verify ownership
      if (canEditOwnTickets && !canEditAllTickets && !isCreator) {
        if (ticket.createdBy !== req.user?.id) {
          return res.status(403).json({ 
            message: "Access denied: You can only edit your own tickets" 
          });
        }
      }
      
      // Special permission check for complexity field updates
      if (req.body.complexity !== undefined) {
        const userRole = req.user?.role;
        const canEditComplexity = userRole === 'admin' || userRole === 'chief_doctor' || userRole === 'doctor' || isCreator;
        
        if (!canEditComplexity) {
          return res.status(403).json({ 
            message: "Access denied: Only admin, chief_doctor, doctor, and creator roles can modify ticket complexity" 
          });
        }
      }
      
      // Update the ticket
      const updatedTicket = await storage.updateTicket(id, req.body, tenantId);
      res.status(200).json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assign ticket to team member (permission-based)
  app.patch("/api/tickets/:id/assign", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { assignedTo } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      // Check if user has permission to assign tickets
      const { userHasPermission } = await import("./permissions");
      const canAssignTickets = await userHasPermission(req, 'canAssignTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canAssignTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to assign tickets" 
        });
      }
      
      // Get the ticket first to ensure it exists and check tenant access
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      const ticket = await storage.getTicketById(id, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // For non-creator users, ensure they can only assign within their tenant
      if (!isCreator && ticket.tenantId !== req.user?.tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log(`Ticket assignment - Ticket ${id} to: ${assignedTo || 'unassigned'}`);
      
      // Update the ticket assignment
      const updatedTicket = await storage.updateTicket(id, { assignedTo }, tenantId);
      res.status(200).json(updatedTicket);
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // MESSAGE ROUTES
  app.get("/api/tickets/:ticketId/messages", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      // Check if user has permission to view tickets
      const { userHasPermission } = await import("./permissions");
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canViewAllTickets && !canViewOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to view ticket messages" 
        });
      }
      
      // For non-creator users, verify ticket belongs to their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      const ticket = await storage.getTicketById(ticketId, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only view own tickets, verify they are assigned to or created this ticket
      if (canViewOwnTickets && !canViewAllTickets && !isCreator) {
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only view messages for tickets assigned to you or created by you" 
          });
        }
      }
      
      // Get all messages for the ticket
      const messages = await storage.getMessagesByTicketId(ticketId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tickets/:ticketId/messages", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messageData = insertMessageSchema.parse({ ...req.body, ticketId });
      
      // Check if user has permission to comment on tickets
      const { userHasPermission } = await import("./permissions");
      const canCommentOnTickets = await userHasPermission(req, 'canCommentOnTickets');
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canCommentOnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to comment on tickets" 
        });
      }
      
      // For non-creator users, always filter by their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      
      // Get ticket with proper tenant filtering
      const ticket = await storage.getTicketById(ticketId, tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only view own tickets (not all tickets), verify they are assigned to or created this ticket
      if (canViewOwnTickets && !canViewAllTickets && !isCreator) {
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only comment on tickets assigned to you or created by you" 
          });
        }
      }
      
      // Create message in our system
      const newMessage = await storage.createMessage(messageData);
      
      // Log the message to chat logs
      try {
        await storage.createChatLog({
          tenantId: ticket.tenantId || 1,
          userId: req.user?.id || null,
          ticketId: ticket.id,
          sender: messageData.sender,
          content: messageData.content,
          metadata: {
            messageId: newMessage.id,
            ticketCategory: ticket.category,
            ticketStatus: ticket.status
          }
        });
      } catch (logError) {
        console.error('Failed to log ticket message:', logError);
      }
      
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

  // AGENT WORKFLOW API - Single endpoint for complete agent workflow
  app.post("/api/agent-workflow", async (req, res) => {
    try {
      const { user_message, user_context, tenant_id, user_id, team_id } = req.body;
      
      if (!user_message) {
        return res.status(400).json({ message: "user_message is required" });
      }
      
      // Get tenant context from request or middleware
      const resolvedTenantId = tenant_id || req.tenant?.id || req.user?.tenantId || 1;
      
      console.log(`Agent workflow request - Message: ${user_message.substring(0, 50)}...`);
      
      try {
        // Call agent service for complete workflow
        const result = await agentService.processWorkflow({
          user_message,
          user_context: {
            ...user_context,
            source: "node_api",
            request_id: `req_${Date.now()}`
          },
          tenant_id: resolvedTenantId,
          user_id: user_id || req.user?.id?.toString(),
          team_id
        });
        
        console.log(`Agent workflow completed - Ticket ID: ${result.ticket_id}, Status: ${result.status}`);
        
        // Return the complete workflow result
        return res.status(200).json({
          success: result.success,
          ticket: {
            id: result.ticket_id,
            title: result.ticket_title,
            status: result.status,
            category: result.category,
            urgency: result.urgency,
            resolution_steps: result.resolution_steps,
            resolution_steps_count: result.resolution_steps_count,
            confidence_score: result.confidence_score,
            created_at: result.created_at,
            source: result.source
          },
          processing_time_ms: result.processing_time_ms,
          error: result.error
        });
        
      } catch (agentError) {
        console.warn("Agent service unavailable, falling back to legacy workflow:", agentError);
        
        // Fallback to legacy ticket creation workflow
        const classification = await classifyTicket("Agent Request", user_message, resolvedTenantId);
        
        // Create ticket using legacy flow
        const ticketData: InsertTicket = {
          title: user_message.slice(0, 100) + (user_message.length > 100 ? '...' : ''),
          description: user_message,
          category: classification.category,
          urgency: classification.complexity === 'complex' ? 'high' : 
                   classification.complexity === 'simple' ? 'low' : 'medium',
          status: 'new',
          tenantId: resolvedTenantId,
          createdBy: user_id || req.user?.id || 1,
          source: 'agent_workflow_fallback'
        };
        
        const newTicket = await storage.createTicket(ticketData);
        
        // Try auto-resolve if possible
        let resolution_steps: string[] = [];
        let resolved = false;
        
        if (classification.canAutoResolve) {
          try {
            const autoResolveResult = await attemptAutoResolve(
              newTicket.title, 
              newTicket.description, 
              [], 
              resolvedTenantId
            );
            
            if (autoResolveResult.resolved) {
              resolution_steps = [autoResolveResult.response];
              resolved = true;
              
              // Update ticket status
              await storage.updateTicket(newTicket.id, { 
                status: "resolved",
                aiResolved: true,
                resolvedAt: new Date()
              });
            }
          } catch (resolveError) {
            console.warn("Auto-resolve failed in fallback workflow:", resolveError);
          }
        }
        
        return res.status(200).json({
          success: true,
          ticket: {
            id: newTicket.id,
            title: newTicket.title,
            status: resolved ? 'resolved' : newTicket.status,
            category: newTicket.category,
            urgency: newTicket.urgency,
            resolution_steps,
            resolution_steps_count: resolution_steps.length,
            confidence_score: resolved ? 0.8 : 0.5,
            created_at: newTicket.createdAt,
            source: 'fallback_workflow'
          },
          processing_time_ms: 0,
          error: null
        });
      }
      
    } catch (error) {
      console.error('Error processing agent workflow:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process agent workflow",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      const userId = req.user?.id || null;
      
      // Log user message
      try {
        await storage.createChatLog({
          tenantId,
          userId,
          ticketId: null,
          sender: 'user',
          content: message,
          metadata: {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            messageHistoryLength: messageHistory.length
          }
        });
      } catch (logError) {
        console.error('Failed to log user message:', logError);
        // Continue even if logging fails
      }
      
      // Helper function to log AI responses
      const logAIResponse = async (response: string, action?: any) => {
        try {
          await storage.createChatLog({
            tenantId,
            userId,
            ticketId: null,
            sender: 'ai',
            content: response,
            metadata: {
              action: action?.type || null,
              hasAction: !!action
            }
          });
        } catch (logError) {
          console.error('Failed to log AI response:', logError);
        }
      };
      
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
        const greetingMessage = "Hello! I'm your AI support assistant. How can I help you today?";
        await logAIResponse(greetingMessage);
        return res.status(200).json({
          message: greetingMessage,
          action: undefined
        });
      }
      
      // Try agent service first for chat responses
      try {
        const isAgentServiceAvailable = await agentService.isAvailable();
        
        if (isAgentServiceAvailable) {
          console.log("Using agent service for chat response");
          
          const agentResponse = await agentService.generateChatResponse({
            ticketContext: { title: "Chat Session", description: "Live chat interaction" },
            messageHistory: chatHistory,
            userMessage: message,
            knowledgeContext: "Chat session context",
            tenantId: tenantId
          });
          
          if (agentResponse && agentResponse.message) {
            await logAIResponse(agentResponse.message, agentResponse.action);
            return res.status(200).json({
              message: agentResponse.message,
              action: agentResponse.action || undefined
            });
          }
        }
      } catch (agentError) {
        console.warn("Agent service failed for chat, falling back to AI provider:", agentError);
      }
      
      // Fallback to AI provider if agent service unavailable
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
             
             IMPORTANT: You CANNOT create tickets directly. When a user asks you to create a ticket or when you need to escalate an issue:
             - Respond with phrases like "I can help you create a support ticket" or "Let me help you submit a ticket for this issue"
             - NEVER say "I have created a ticket" or "The ticket has been created" 
             - NEVER claim that a ticket is already created when it isn't
             - The user will see a button to confirm ticket creation after your response
             
             Be friendly, professional, and empathetic in your responses.
             When appropriate, ask if they would like to upload a screenshot or image to help explain their issue.
             Never make up information. If you don't know something, be honest about it.`;
          
          // Add the current message to the history
          const allMessages = [
            ...chatHistory,
            { role: 'user', content: message }
          ];
          
          // Get AI response
          const aiResponse = await provider.generateChatResponse(allMessages, knowledgeContext, systemPrompt);
          
          // Check if AI suggests creating a ticket or user explicitly requested one
          const lowerMessage = message.toLowerCase();
          const lowerResponse = aiResponse.toLowerCase();
          
          const userRequestedTicket = /\b(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                                     /\bi\s+(want|need|would\s+like)\s+(to\s+)?(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                                     /\bplease\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                                     /\bcan\s+you\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage);
          
          const aiSuggestsTicket = lowerResponse.includes("support ticket") || 
                                  lowerResponse.includes("contact support") ||
                                  lowerResponse.includes("help you create") ||
                                  lowerResponse.includes("submit a ticket") ||
                                  lowerResponse.includes("escalate") ||
                                  lowerResponse.includes("ticket for this");
          
          const needsTicket = userRequestedTicket || aiSuggestsTicket;
          
          if (needsTicket) {
            // Classify message to get appropriate category/complexity
            const classification = await classifyTicket("New chat request", message, tenantId);
            
            const ticketAction = {
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
            };
            
            await logAIResponse(aiResponse, ticketAction);
            return res.status(200).json({
              message: aiResponse,
              action: ticketAction
            });
          }
          
          // Standard response with no action
          await logAIResponse(aiResponse);
          return res.status(200).json({
            message: aiResponse,
            action: undefined
          });
        } catch (error) {
          console.error('Error processing conversation with AI:', error);
          // Fall through to legacy flow on error
        }
      }
      
      // For first messages, use conversational approach instead of immediately creating tickets
      try {
        // Get knowledge context for better responses
        const knowledgeContext = await buildAIContext(message, tenantId);
        
        // Check if user is explicitly requesting ticket creation
        const lowerMessage = message.toLowerCase();
        const isTicketRequest = /\b(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                               /\bi\s+(want|need|would\s+like)\s+(to\s+)?(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                               /\bplease\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage) ||
                               /\bcan\s+you\s+(create|make|open|start|submit|file|raise)\s+(a\s+)?(ticket|support\s+ticket|case|request)\b/.test(lowerMessage);

        if (isTicketRequest) {
          // User explicitly wants a ticket created
          console.log("User explicitly requested ticket creation");
          
          // Generate comprehensive ticket description based on entire conversation
          const conversationSummary = messageHistory.length > 0 
            ? messageHistory.map(m => `${m.sender}: ${m.content}`).join('\n')
            : message;

          const descriptionPrompt = `Based on this support conversation, create a comprehensive ticket description that summarizes the user's issue, context, and any errors they encountered:

Full conversation:
${conversationSummary}

Latest request: ${message}

Create a professional ticket description that includes:
1. Brief summary of the issue
2. Key details from the conversation
3. Any specific errors or problems mentioned
4. Current status/impact

Format as a clear, structured description:`;

          const titlePrompt = `Based on this support conversation, generate a concise, professional ticket title (max 60 characters) that captures the main error or issue:

Full conversation:
${conversationSummary}

Generate only the title, no quotes or extra text:`;

          try {
            // Generate AI-powered description
            const descriptionResponse = await provider.generateChatResponse([
              { role: 'user', content: descriptionPrompt }
            ], '', 'You are a support ticket description generator. Create clear, comprehensive descriptions.');
            
            const aiGeneratedDescription = descriptionResponse.trim();
            
            // Generate AI-powered title
            const titleResponse = await provider.generateChatResponse([
              { role: 'user', content: titlePrompt }
            ], '', 'You are a support ticket title generator. Create clear, concise titles that identify the main issue.');
            
            const generatedTitle = titleResponse.trim().replace(/^["']|["']$/g, '').slice(0, 60);
            
            const classification = await classifyTicket(generatedTitle, aiGeneratedDescription, tenantId);
            
            return res.status(200).json({
              message: "I'll help you create a support ticket for this issue. Let me gather the details...",
              action: {
                type: 'suggest_ticket',
                data: {
                  title: generatedTitle || message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                  description: aiGeneratedDescription,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId: tenantId
                }
              }
            });
          } catch (error) {
            console.error("Error generating AI ticket content:", error);
            
            // Fallback: Create basic description with conversation context
            const conversationContext = messageHistory.length > 0 
              ? messageHistory.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n')
              : '';
            
            const fallbackDescription = conversationContext 
              ? `**Latest Request:**\n${message}\n\n**Conversation Context:**\n${conversationContext}`
              : message;
            
            const classification = await classifyTicket("User Support Request", fallbackDescription, tenantId);
            
            return res.status(200).json({
              message: "I'll help you create a support ticket for this issue. Let me gather the details...",
              action: {
                type: 'suggest_ticket',
                data: {
                  title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                  description: fallbackDescription,
                  category: classification.category,
                  complexity: classification.complexity,
                  assignedTo: classification.assignedTo,
                  aiNotes: classification.aiNotes,
                  tenantId: tenantId
                }
              }
            });
          }
        }

        // Create a conversational system prompt
        const systemPrompt = `You are a support assistant helping quality analysts and software testers who have discovered issues or bugs. Your primary goal is to gather information for ticket creation and provide quick, non-technical recommendations.

Format your responses for maximum readability:
- Use bullet points for lists of steps or actions
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information or warnings

User Context:
- Users are QA analysts/testers who found issues
- They need practical, non-technical guidance
- They primarily want to create support tickets
- Avoid providing code solutions or technical implementations

Key Guidelines:
- Assume the user has found a legitimate issue that likely needs a ticket
- Provide quick workarounds or information gathering steps only
- Ask clarifying questions to help create better tickets
- Keep recommendations simple and non-technical
- Don't suggest complex troubleshooting - focus on ticket creation
- Offer to create a support ticket early in the conversation

Quick Fix Examples (Non-Technical):
- "Try refreshing the page"
- "Clear your browser cache"
- "Try using a different browser"
- "Check if other users are experiencing this"
- "Note the exact error message for the ticket"

Always Suggest Tickets For:
- Any bug reports or system errors
- UI/UX issues or inconsistencies  
- Performance problems
- Data discrepancies
- Feature requests or improvements
- Any issue that affects user experience

Your goal is to quickly gather issue details and create comprehensive support tickets rather than attempting complex fixes.`;

        // Generate conversational response
        const aiResponse = await provider.generateChatResponse([
          { role: 'user', content: message }
        ], knowledgeContext, systemPrompt);
        
        // Only suggest ticket creation if the AI explicitly mentions it
        const shouldSuggestTicket = aiResponse.toLowerCase().includes("create a ticket") || 
                                  aiResponse.toLowerCase().includes("support ticket") ||
                                  aiResponse.toLowerCase().includes("escalate") ||
                                  aiResponse.toLowerCase().includes("human support");
        
        let response;
        if (shouldSuggestTicket) {
          const classification = await classifyTicket("User inquiry", message, tenantId);
          response = {
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
          };
        } else {
          response = {
            message: aiResponse,
            action: undefined
          };
        }
      } catch (error) {
        console.error('Error in conversational flow:', error);
        // Fallback to simple response
        const response = {
          message: "Hello! I'm here to help you with any questions or issues you may have. What can I assist you with today?",
          action: undefined
        };
        return res.status(200).json(response);
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

  // DASHBOARD METRICS - Require analytics access permission
  app.get("/api/metrics/summary", requireAuth, async (req, res) => {
    try {
      // Check if user has permission to access analytics
      const hasAnalyticsPermission = await userHasPermission(req, 'canAccessAnalytics');
      if (!hasAnalyticsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access analytics' });
      }
      
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
      } else if (!isCreator && req.user) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user.tenantId;
        console.log(`Filtering metrics by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      
      // Safety check - if tenantId is still undefined but user is not a creator, use their tenant ID
      if (tenantId === undefined && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Fallback tenant filtering applied: ${tenantId}`);
      }
      
      // Get tickets with proper tenant filtering
      const tickets = await storage.getAllTickets(tenantId);
      
      // Filter tickets based on timePeriod
      const cutoffDate = getTimePeriodCutoff(timePeriod);
      const filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= cutoffDate;
      });
      
      console.log(`Summary metrics for ${timePeriod}:`, {
        totalTickets: tickets.length,
        cutoffDate: cutoffDate.toISOString(),
        filteredTickets: filteredTickets.length,
        resolvedInFilter: filteredTickets.filter(t => t.status === "resolved" || t.resolvedAt !== null).length
      });
      
      const totalTickets = filteredTickets.length;
      const resolvedTickets = filteredTickets.filter(t => t.status === "resolved" || t.resolvedAt !== null).length;
      
      // Calculate avg response time using filtered tickets based on time period
      let totalResponseTime = 0;
      let ticketsWithResponseTime = 0;
      
      for (const ticket of filteredTickets) {
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
      // Apply tenant filter for all users (creators can specify which tenant they want)
      const widgetAnalytics = await storage.getAllWidgetAnalytics(tenantId);
      
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
      
      // Count tickets resolved by AI from filtered tickets
      const aiResolvedTicketsCount = filteredTickets.filter(t => t.aiResolved).length;
      
      // Total of AI resolved interactions (tickets + auto-resolved chats)
      const totalAiResolved = aiResolvedTicketsCount + autoResolvedChatsCount;
      
      // Total interactions (filtered tickets + auto-resolved chats that didn't create tickets)
      const totalInteractions = filteredTickets.length + autoResolvedChatsCount;
      
      // Calculate the AI resolution percentage
      const aiResolvedPercentage = totalInteractions > 0 ? 
        Math.round((totalAiResolved / totalInteractions) * 100) + "%" : 
        "N/A";
      
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

  app.get("/api/metrics/categories", requireAuth, async (req, res) => {
    try {
      // Check if user has permission to access analytics
      const hasAnalyticsPermission = await userHasPermission(req, 'canAccessAnalytics');
      if (!hasAnalyticsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access analytics' });
      }
      
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
      } else if (!isCreator && req.user) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user.tenantId;
        console.log(`Categories metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      
      // Safety check - if tenantId is still undefined but user is not a creator, use their tenant ID
      if (tenantId === undefined && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Categories metrics: Fallback tenant filtering applied: ${tenantId}`);
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

  app.get("/api/metrics/recent", requireAuth, async (req, res) => {
    try {
      // Check if user has permission to access analytics
      const hasAnalyticsPermission = await userHasPermission(req, 'canAccessAnalytics');
      if (!hasAnalyticsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access analytics' });
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      
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
      } else if (!isCreator && req.user) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user.tenantId;
        console.log(`Recent metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      
      // Safety check - if tenantId is still undefined but user is not a creator, use their tenant ID
      if (tenantId === undefined && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Recent metrics: Fallback tenant filtering applied: ${tenantId}`);
      }
      
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
  app.get("/api/metrics/response-time", requireAuth, async (req, res) => {
    try {
      // Check if user has permission to access analytics
      const hasAnalyticsPermission = await userHasPermission(req, 'canAccessAnalytics');
      if (!hasAnalyticsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access analytics' });
      }
      
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
      } else if (!isCreator && req.user) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user.tenantId;
        console.log(`Response time metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      
      // Safety check - if tenantId is still undefined but user is not a creator, use their tenant ID
      if (tenantId === undefined && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Response time metrics: Fallback tenant filtering applied: ${tenantId}`);
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
  app.get("/api/metrics/ticket-volume", requireAuth, async (req, res) => {
    try {
      // Check if user has permission to access analytics
      const hasAnalyticsPermission = await userHasPermission(req, 'canAccessAnalytics');
      if (!hasAnalyticsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access analytics' });
      }
      
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
      } else if (!isCreator && req.user) {
        // Non-creator roles are always limited to their tenant
        tenantId = req.user.tenantId;
        console.log(`Ticket volume metrics: Filtering by tenant ID: ${tenantId} for user role: ${req.user.role}`);
      }
      
      // Safety check - if tenantId is still undefined but user is not a creator, use their tenant ID
      if (tenantId === undefined && !isCreator && req.user) {
        tenantId = req.user.tenantId;
        console.log(`Ticket volume metrics: Fallback tenant filtering applied: ${tenantId}`);
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
  app.get("/api/tickets/:ticketId/attachments", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      // Check if user has permission to view tickets (and their attachments)
      const { userHasPermission } = await import("./permissions");
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canViewAllTickets && !canViewOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to view ticket attachments" 
        });
      }
      
      // For non-creator users, verify ticket belongs to their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      const ticket = await storage.getTicketById(ticketId, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only view own tickets, verify they are assigned to or created this ticket
      if (canViewOwnTickets && !canViewAllTickets && !isCreator) {
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only view attachments for tickets assigned to you or created by you" 
          });
        }
      }
      
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
      
      // Check if user has permission to view tickets (and their attachments)
      const { userHasPermission } = await import("./permissions");
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canViewAllTickets && !canViewOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to view attachments" 
        });
      }
      
      // If user can only view own tickets, verify they have access to the ticket this attachment belongs to
      if (canViewOwnTickets && !canViewAllTickets && !isCreator && attachment.ticketId) {
        const tenantId = req.user?.tenantId;
        const ticket = await storage.getTicketById(attachment.ticketId, tenantId);
        
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }
        
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only view attachments for tickets assigned to you or created by you" 
          });
        }
      }
      
      res.status(200).json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/tickets/:ticketId/attachments", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      // Check if user has permission to add attachments (requires comment or edit permission)
      const { userHasPermission } = await import("./permissions");
      const canCommentOnTickets = await userHasPermission(req, 'canCommentOnTickets');
      const canEditAllTickets = await userHasPermission(req, 'canEditAllTickets');
      const canEditOwnTickets = await userHasPermission(req, 'canEditOwnTickets');
      const canViewAllTickets = await userHasPermission(req, 'canViewAllTickets');
      const canViewOwnTickets = await userHasPermission(req, 'canViewOwnTickets');
      const isCreator = req.user?.role === 'creator' || req.isCreatorUser;
      
      if (!canCommentOnTickets && !canEditAllTickets && !canEditOwnTickets && !isCreator) {
        return res.status(403).json({ 
          message: "Access denied: You don't have permission to add attachments to tickets" 
        });
      }
      
      // For non-creator users, verify ticket belongs to their tenant
      const tenantId = !isCreator ? req.user?.tenantId : undefined;
      const ticket = await storage.getTicketById(ticketId, tenantId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If user can only edit/view own tickets, verify they are assigned to or created this ticket
      if ((canEditOwnTickets || canViewOwnTickets) && !canEditAllTickets && !canViewAllTickets && !isCreator) {
        const userId = req.user?.id;
        const isAssigned = ticket.assignedTo === String(userId);
        const isCreatedBy = ticket.userId === userId;
        
        if (!isAssigned && !isCreatedBy) {
          return res.status(403).json({ 
            message: "Access denied: You can only add attachments to tickets assigned to you or created by you" 
          });
        }
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

  // TicketFormatterAgent test endpoint
  app.post("/api/test/ticket-formatter", requireRole(['admin', 'support_agent', 'engineer', 'creator']), async (req, res) => {
    try {
      console.log('TicketFormatter Test: Processing formatting request');
      
      // Extract input from request
      const input = req.body;
      
      // Default test values if not provided
      const formatterInput = {
        id: input.id || 12345,
        subject: input.subject || "VPN connectivity issue",
        steps: input.steps || "1. Restart your router\n2. Reinstall the VPN client\n3. Update VPN server address to vpn.example.com",
        category: input.category || "technical",
        urgency: input.urgency || "MEDIUM",
        customer_name: input.customer_name || "John Smith",
        additional_notes: input.additional_notes || "This issue has been escalated from Level 1 support."
      };
      
      console.log(`TicketFormatter Test: Formatting ticket #${formatterInput.id} - ${formatterInput.subject}`);
      
      // Use agent service to format the ticket
      const result = await agentService.formatTicket(formatterInput);
      const status = agentService.getTicketFormatterStatus();
      
      console.log(`TicketFormatter Test: Completed formatting in ${result.processing_time_ms}ms`);
      
      res.json({
        success: true,
        formatter_result: result,
        agent_status: status,
        test_info: {
          ticket_id: formatterInput.id,
          subject: formatterInput.subject,
          template_used: result.template_used,
          processing_time_ms: result.processing_time_ms,
          ai_enhanced: status.google_ai_configured
        }
      });
    } catch (error) {
      console.error('TicketFormatter Test: Error during formatting:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown formatting error'
      });
    }
  });

  // SupportTeam Orchestrator test endpoint - Complete five-agent pipeline
  app.post("/api/test/support-team-orchestrator", requireRole(['admin', 'support_agent', 'engineer', 'creator']), async (req, res) => {
    try {
      console.log('SupportTeam Orchestrator Test: Processing complete workflow');
      
      // Extract input from request
      const input = req.body;
      
      // Default test values if not provided
      const workflowInput = {
        user_message: input.user_message || "I need help with VPN connectivity issues, my credentials aren't working and it's urgent",
        user_context: input.user_context || {
          url: "https://example.com/support",
          title: "Support Request",
          userAgent: "Test Browser"
        },
        tenant_id: input.tenant_id || 1,
        user_id: input.user_id || "test_user"
      };
      
      console.log(`SupportTeam Orchestrator Test: Processing message: "${workflowInput.user_message.substring(0, 50)}..."`);
      
      // Use agent service to process the complete workflow
      const result = await agentService.processWorkflow(workflowInput);
      
      console.log(`SupportTeam Orchestrator Test: Completed workflow in ${result.processing_time_ms}ms with ${(result.confidence_score * 100).toFixed(1)}% confidence`);
      
      res.json({
        success: true,
        workflow_result: result,
        agent_status: {
          name: 'SupportTeamOrchestrator',
          pipeline_complete: true,
          agents_coordinated: ['ChatPreprocessor', 'InstructionLookup', 'TicketLookup', 'TicketFormatter'],
          processing_time_ms: result.processing_time_ms,
          confidence_score: result.confidence_score
        },
        test_info: {
          input_message: workflowInput.user_message,
          ticket_id: result.ticket_id,
          ticket_title: result.ticket_title,
          resolution_steps_count: result.resolution_steps_count,
          category: result.category,
          urgency: result.urgency
        }
      });
      
    } catch (error) {
      console.error('SupportTeam Orchestrator Test: Error processing workflow:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process complete workflow'
      });
    }
  });

  // Register knowledge sync routes
  registerKnowledgeSyncRoutes(app);
  
  // Register agent test routes
  app.use('/api/agent', agentTestRoutes);
  
  // Register agent resources routes for agent-specific file uploads
  app.use('/api/agent-resources', agentResourcesRoutes);
  
  // Register enhanced agent routes with MCP integration
  app.use('/api/agents', agentRoutes);

  // Admin-only endpoint to reset ticket IDs for proper tenant isolation
  app.post("/api/admin/reset-ticket-ids", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.resetTicketIdsForTenantIsolation();
      res.json({
        status: "success",
        message: "Ticket IDs have been reset for proper tenant isolation"
      });
    } catch (error) {
      console.error("Error resetting ticket IDs:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to reset ticket IDs"
      });
    }
  });

  // Chat Log Routes (Admin-only)
  
  // Get chat logs for the authenticated admin's tenant
  app.get("/api/admin/chat-logs", requireAuth, requireRole(['administrator']), async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
      const logs = await storage.getChatLogs(user.tenantId, limit);
      
      res.json({
        success: true,
        logs,
        count: logs.length
      });
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch chat logs"
      });
    }
  });

  // Clear all chat logs for the authenticated admin's tenant
  app.delete("/api/admin/chat-logs", requireAuth, requireRole(['administrator']), async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.clearChatLogs(user.tenantId);
      
      if (success) {
        res.json({
          success: true,
          message: "Chat logs cleared successfully"
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to clear chat logs"
        });
      }
    } catch (error) {
      console.error("Error clearing chat logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear chat logs"
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
