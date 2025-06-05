import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import agentService from "../ai/agent-service.js";
import { buildAIContext } from "../data-source-service";

/**
 * Agent workflow request validation schema
 */
const agentWorkflowRequestSchema = z.object({
  tenantId: z.number(),
  adminId: z.number().optional(),
  apiKey: z.string(),
  user_message: z.string(),
  user_context: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    userAgent: z.string().optional(),
    timestamp: z.string().optional()
  }).optional(),
  sessionId: z.string().optional()
});

/**
 * Process message request validation schema
 */
const processMessageRequestSchema = z.object({
  tenantId: z.number(),
  message: z.string(),
  context: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    sessionId: z.string().optional(),
    userAgent: z.string().optional()
  }).optional(),
  apiKey: z.string()
});

/**
 * Register routes for widget agent communication
 */
export function registerWidgetAgentRoutes(app: Express): void {
  
  /**
   * Agent workflow endpoint - Complete ticket resolution
   * 
   * POST /api/agent/workflow
   */
  app.post('/api/agent/workflow', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = agentWorkflowRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid agent workflow request',
          details: validationResult.error.format()
        });
      }
      
      const { tenantId, adminId, apiKey, user_message, user_context, sessionId } = validationResult.data;
      
      // Validate API key for the tenant
      const isValidApiKey = await validateWidgetApiKey(tenantId, apiKey);
      if (!isValidApiKey) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key for tenant'
        });
      }
      
      const startTime = Date.now();
      
      // Build enhanced context for agent processing
      const aiContext = await buildAIContext(user_message, tenantId);
      let enhancedContext = aiContext;
      
      if (user_context) {
        const pageContextStr = `
User Context:
- Page URL: ${user_context.url || 'Unknown'}
- Page Title: ${user_context.title || 'Unknown'}
- Timestamp: ${user_context.timestamp || new Date().toISOString()}
        `;
        enhancedContext += pageContextStr;
      }
      
      // Process through agent workflow
      const agentResponse = await agentService.processCompleteWorkflow({
        user_message,
        user_context: {
          tenantId,
          adminId,
          sessionId,
          pageContext: user_context,
          aiContext: enhancedContext
        }
      });
      
      const processingTime = Date.now() - startTime;
      
      // Create ticket if agent workflow suggests it
      let ticketId = null;
      if (agentResponse.shouldCreateTicket) {
        try {
          const ticket = await storage.createTicket({
            tenantId,
            title: agentResponse.ticket_title || `Chat Widget: ${user_message.substring(0, 50)}...`,
            description: user_message,
            category: agentResponse.category || 'support',
            urgency: agentResponse.urgency || 'medium',
            status: 'open',
            source: 'widget',
            metadata: {
              sessionId,
              pageContext: user_context,
              agentProcessed: true,
              confidence: agentResponse.confidence_score
            }
          });
          ticketId = ticket.id;
        } catch (ticketError) {
          console.error('Error creating ticket from agent workflow:', ticketError);
        }
      }
      
      // Log widget interaction for analytics
      if (sessionId) {
        try {
          await storage.recordWidgetInteraction({
            tenantId,
            sessionId,
            messageType: 'agent_workflow',
            message: user_message,
            timestamp: new Date(),
            url: user_context?.url || null,
            metadata: {
              processingTime,
              ticketCreated: !!ticketId,
              confidence: agentResponse.confidence_score,
              agentUsed: true
            }
          });
        } catch (logError) {
          console.error('Error logging widget interaction:', logError);
        }
      }
      
      return res.json({
        success: true,
        ticket_id: ticketId,
        ticket_title: agentResponse.ticket_title,
        status: agentResponse.status || 'processed',
        category: agentResponse.category || 'support',
        urgency: agentResponse.urgency || 'medium',
        resolution_steps: agentResponse.resolution_steps || [],
        resolution_steps_count: agentResponse.resolution_steps?.length || 0,
        confidence_score: agentResponse.confidence_score || 0.8,
        processing_time_ms: processingTime,
        created_at: new Date().toISOString(),
        source: 'widget',
        message: agentResponse.final_response || agentResponse.response
      });
      
    } catch (error) {
      console.error('Error processing agent workflow request:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process agent workflow request',
        message: 'An internal error occurred while processing your request'
      });
    }
  });

  /**
   * Process message endpoint - Simple agent response
   * 
   * POST /api/widget/process_message
   */
  app.post('/api/widget/process_message', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = processMessageRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid process message request',
          details: validationResult.error.format()
        });
      }
      
      const { tenantId, message, context, apiKey } = validationResult.data;
      
      // Validate API key for the tenant
      const isValidApiKey = await validateWidgetApiKey(tenantId, apiKey);
      if (!isValidApiKey) {
        return res.status(401).json({
          error: 'Invalid API key for tenant'
        });
      }
      
      const startTime = Date.now();
      
      // Build context for agent processing
      const aiContext = await buildAIContext(message, tenantId);
      
      // Process through simplified agent workflow
      const agentResponse = await agentService.processSimpleMessage({
        message,
        context: {
          tenantId,
          aiContext,
          pageContext: context
        }
      });
      
      const processingTime = Date.now() - startTime;
      
      // Log interaction for analytics
      if (context?.sessionId) {
        try {
          await storage.recordWidgetInteraction({
            tenantId,
            sessionId: context.sessionId,
            messageType: 'simple_message',
            message,
            timestamp: new Date(),
            url: context.url || null,
            metadata: {
              processingTime,
              agentUsed: true,
              responseLength: agentResponse.response?.length || 0
            }
          });
        } catch (logError) {
          console.error('Error logging widget interaction:', logError);
        }
      }
      
      return res.json({
        response: agentResponse.response || agentResponse.message,
        confidence: agentResponse.confidence_score || 0.8,
        processing_time_ms: processingTime,
        suggested_actions: generateSuggestedActions(message, agentResponse.response || agentResponse.message),
        session_id: context?.sessionId
      });
      
    } catch (error) {
      console.error('Error processing message request:', error);
      res.status(500).json({ 
        error: 'Failed to process message request',
        message: 'An internal error occurred while processing your message'
      });
    }
  });
}

/**
 * Validate widget API key for a specific tenant
 */
async function validateWidgetApiKey(tenantId: number, apiKey: string): Promise<boolean> {
  try {
    // Get widget API keys for the tenant
    const apiKeys = await storage.getWidgetApiKeys(tenantId);
    return apiKeys.some(key => key.key === apiKey && key.isActive);
  } catch (error) {
    console.error('Error validating widget API key:', error);
    return false;
  }
}

/**
 * Generate suggested actions based on message content and AI response
 */
function generateSuggestedActions(userMessage: string, aiResponse: string): any[] {
  const actions = [];
  
  // Check if the response suggests creating a ticket
  if (
    aiResponse.includes("create a ticket") || 
    aiResponse.includes("submit a ticket") || 
    aiResponse.includes("open a ticket") ||
    aiResponse.includes("file a support request")
  ) {
    actions.push({
      type: 'create_ticket',
      label: 'Create Support Ticket',
      message: 'I would like to create a support ticket for this issue'
    });
  }
  
  // Check if response mentions contacting support
  if (
    aiResponse.includes("contact support") || 
    aiResponse.includes("support team") || 
    aiResponse.includes("customer service") ||
    aiResponse.includes("speak with")
  ) {
    actions.push({
      type: 'contact_support',
      label: 'Contact Support Team',
      message: 'I need to speak with a support representative'
    });
  }
  
  // Check for documentation references
  if (
    aiResponse.includes("documentation") || 
    aiResponse.includes("user guide") || 
    aiResponse.includes("knowledge base") ||
    aiResponse.includes("help article")
  ) {
    actions.push({
      type: 'view_docs',
      label: 'View Documentation',
      message: 'Can you show me the documentation for this?'
    });
  }
  
  // Check for troubleshooting steps
  if (
    aiResponse.includes("troubleshoot") || 
    aiResponse.includes("follow these steps") || 
    aiResponse.includes("try the following")
  ) {
    actions.push({
      type: 'troubleshoot',
      label: 'Get More Help',
      message: 'I need additional troubleshooting assistance'
    });
  }
  
  return actions;
}