import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import agentService from "../ai/agent-service.js";
import { buildAIContext } from "../data-source-service";
import { instructionLookupAgent } from "../ai/agents/instruction-lookup-agent.js";

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
      
      // Step 1: Preprocess message using Chat Preprocessor Agent
      const sessionIdForPreprocessing = sessionId || `widget_${tenantId}_${Date.now()}`;
      const preprocessorResult = await agentService.preprocessMessage(
        user_message,
        sessionIdForPreprocessing,
        {
          tenantId,
          pageContext: user_context,
          source: 'widget'
        }
      );
      
      console.log(`Widget Agent: Message preprocessed - Urgency: ${preprocessorResult.urgency}, Sentiment: ${preprocessorResult.sentiment}, PII masked: ${preprocessorResult.masked_pii.length}`);
      
      // Step 2: Build enhanced context for agent processing
      const aiContext = await buildAIContext(preprocessorResult.normalized_prompt, tenantId);
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
      
      // Add preprocessing insights to context
      const preprocessingContextStr = `
Message Analysis:
- Urgency Level: ${preprocessorResult.urgency}
- Sentiment: ${preprocessorResult.sentiment}
- Normalized Message: ${preprocessorResult.normalized_prompt}
- PII Detected: ${preprocessorResult.masked_pii.length > 0 ? 'Yes (masked)' : 'No'}
      `;
      enhancedContext += preprocessingContextStr;
      
      // Step 3: Process through agent workflow with preprocessed message
      const agentResponse = await agentService.processWorkflow({
        user_message: preprocessorResult.normalized_prompt,
        user_context: {
          tenantId,
          adminId,
          sessionId: sessionIdForPreprocessing,
          pageContext: user_context,
          aiContext: enhancedContext,
          preprocessing: preprocessorResult
        }
      });
      
      const processingTime = Date.now() - startTime;
      
      // Create ticket with preprocessing insights
      let ticketId = null;
      if (agentResponse.success && (agentResponse.ticket_id || preprocessorResult.urgency === 'CRITICAL' || preprocessorResult.urgency === 'HIGH')) {
        try {
          const ticket = await storage.createTicket({
            tenantId,
            title: agentResponse.ticket_title || `Chat Widget: ${preprocessorResult.normalized_prompt.substring(0, 50)}...`,
            description: user_message, // Keep original message for context
            category: agentResponse.category || 'support',
            urgency: preprocessorResult.urgency.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
            status: 'open',
            source: 'widget',
            metadata: {
              sessionId: sessionIdForPreprocessing,
              pageContext: user_context,
              agentProcessed: true,
              confidence: agentResponse.confidence_score,
              preprocessing: {
                normalizedMessage: preprocessorResult.normalized_prompt,
                originalMessage: preprocessorResult.original_message,
                urgencyDetected: preprocessorResult.urgency,
                sentimentDetected: preprocessorResult.sentiment,
                piiMasked: preprocessorResult.masked_pii.length > 0,
                maskedPiiCount: preprocessorResult.masked_pii.length
              }
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
      
      // Step 1: Preprocess message using Chat Preprocessor Agent
      const sessionIdForProcessing = context?.sessionId || `widget_simple_${tenantId}_${Date.now()}`;
      const preprocessorResult = await agentService.preprocessMessage(
        message,
        sessionIdForProcessing,
        {
          tenantId,
          pageContext: context,
          source: 'widget_simple'
        }
      );
      
      console.log(`Widget Simple: Message preprocessed - Urgency: ${preprocessorResult.urgency}, Sentiment: ${preprocessorResult.sentiment}`);
      
      // Step 2: Build context for agent processing
      const aiContext = await buildAIContext(preprocessorResult.normalized_prompt, tenantId);
      
      // Step 3: Process through simplified agent workflow with preprocessed message
      const agentResponse = await agentService.generateChatResponse({
        ticketContext: {
          id: 0, // No ticket for simple messages
          title: 'Widget Chat',
          description: preprocessorResult.normalized_prompt,
          category: 'chat',
          tenantId
        },
        messageHistory: [],
        userMessage: preprocessorResult.normalized_prompt,
        knowledgeContext: aiContext
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
        response: agentResponse || "I understand your message. How can I help you further?",
        confidence: 0.8,
        processing_time_ms: processingTime,
        suggested_actions: generateSuggestedActions(message, agentResponse || ""),
        session_id: sessionIdForProcessing,
        preprocessing: {
          urgency: preprocessorResult.urgency,
          sentiment: preprocessorResult.sentiment,
          normalized_message: preprocessorResult.normalized_prompt,
          pii_detected: preprocessorResult.masked_pii.length > 0,
          original_message: preprocessorResult.original_message
        }
      });
      
    } catch (error) {
      console.error('Error processing message request:', error);
      res.status(500).json({ 
        error: 'Failed to process message request',
        message: 'An internal error occurred while processing your message'
      });
    }
  });

  /**
   * Test InstructionLookupAgent endpoint
   * 
   * POST /api/test/instruction-lookup
   */
  app.post('/api/test/instruction-lookup', async (req: Request, res: Response) => {
    try {
      const { message, topK = 3 } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Message is required and must be a string'
        });
      }

      console.log(`InstructionLookup Test: Processing message: "${message}"`);
      
      const startTime = Date.now();
      
      // Test the instruction lookup agent
      const lookupResult = await instructionLookupAgent.lookupInstructions({
        normalizedPrompt: message,
        urgency: 'MEDIUM',
        sentiment: 'neutral',
        sessionId: `test_${Date.now()}`,
        topK
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`InstructionLookup Test: Found ${lookupResult.instructions.length} instructions in ${processingTime}ms`);
      
      return res.json({
        success: lookupResult.success,
        lookup_result: lookupResult,
        agent_status: instructionLookupAgent.getStatus(),
        test_info: {
          message,
          topK,
          processing_time_ms: processingTime,
          instructions_found: lookupResult.instructions.length,
          search_method: lookupResult.searchMethod
        }
      });
      
    } catch (error) {
      console.error('Error testing instruction lookup agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test instruction lookup agent',
        message: error instanceof Error ? error.message : 'Unknown error'
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

/**
 * Test endpoint for Chat Preprocessor Agent
 * 
 * POST /api/test/preprocessor
 */
export function registerPreprocessorTestRoute(app: Express): void {
  app.post('/api/test/preprocessor', async (req: Request, res: Response) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({
          error: 'Message is required'
        });
      }
      
      const testSessionId = sessionId || `test_${Date.now()}`;
      
      // Test the Chat Preprocessor Agent directly
      const preprocessorResult = await agentService.preprocessMessage(
        message,
        testSessionId,
        {
          tenantId: 1,
          source: 'test',
          test: true
        }
      );
      
      // Get preprocessor status
      const preprocessorStatus = agentService.getPreprocessorStatus();
      
      return res.json({
        success: true,
        preprocessing_result: preprocessorResult,
        preprocessor_status: preprocessorStatus,
        test_info: {
          message: 'Chat Preprocessor Agent test completed successfully',
          session_id: testSessionId,
          agent_available: agentService.isAvailable()
        }
      });
      
    } catch (error) {
      console.error('Error testing Chat Preprocessor Agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Chat Preprocessor Agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}