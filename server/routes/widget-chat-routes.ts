import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateChatResponse } from "../ai";
import type { ChatMessage } from "../ai";
import { buildAIContext } from "../data-source-service";
import agentService from "../ai/agent-service.js";

/**
 * Widget chat request validation schema
 */
const widgetChatRequestSchema = z.object({
  tenantId: z.number(),
  message: z.string(),
  context: z.object({
    url: z.string().optional(),
    title: z.string().optional()
  }).optional(),
  sessionId: z.string().optional(),
  url: z.string().optional()
});

/**
 * Register routes for widget chat API
 */
export function registerWidgetChatRoutes(app: Express): void {
  /**
   * Widget chat endpoint
   * 
   * POST /api/widget/chat
   */
  app.post('/api/widget/chat', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = widgetChatRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid widget chat request',
          details: validationResult.error.format()
        });
      }
      
      const { tenantId, message, context, sessionId } = validationResult.data;
      
      console.log(`Widget Chat: Processing message for tenant ${tenantId}: "${message.substring(0, 50)}..."`);
      
      // Use the SupportTeam Orchestrator for intelligent processing
      try {
        const workflowInput = {
          user_message: message,
          user_context: {
            url: context?.url || "Widget Chat",
            title: context?.title || "Support Request",
            userAgent: req.headers['user-agent'] || "Widget User"
          },
          tenant_id: tenantId,
          user_id: sessionId || `widget_${Date.now()}`
        };

        const orchestratorResult = await agentService.processWorkflow(workflowInput);
        
        if (orchestratorResult.success) {
          console.log(`Widget Chat: Orchestrator processed successfully - Ticket #${orchestratorResult.ticket_id}`);
          
          // Extract the formatted response from the ticket
          const response = extractResponseFromTicket(orchestratorResult);
          
          // Log successful interaction
          try {
            if (sessionId) {
              await storage.recordWidgetInteraction({
                tenantId,
                sessionId,
                messageType: 'user',
                message,
                timestamp: new Date(),
                url: req.body.url || null,
                metadata: {
                  ticketId: orchestratorResult.ticket_id,
                  confidence: orchestratorResult.confidence_score,
                  processingTimeMs: orchestratorResult.processing_time_ms,
                  category: orchestratorResult.category,
                  urgency: orchestratorResult.urgency,
                  agentPipeline: 'five_agent_orchestrator'
                }
              });
            }
          } catch (logError) {
            console.error('Error recording widget interaction:', logError);
          }
          
          return res.json({
            message: response,
            sessionId,
            ticketId: orchestratorResult.ticket_id,
            confidence: orchestratorResult.confidence_score,
            category: orchestratorResult.category,
            urgency: orchestratorResult.urgency,
            actions: generateSuggestedActions(message, response)
          });
        } else {
          console.warn(`Widget Chat: Orchestrator failed, falling back to standard AI: ${orchestratorResult.error}`);
          throw new Error(`Orchestrator failed: ${orchestratorResult.error}`);
        }
      } catch (orchestratorError) {
        console.warn(`Widget Chat: Orchestrator unavailable, using fallback AI: ${orchestratorError.message}`);
        
        // Fallback to original AI method
        const messages: ChatMessage[] = [
          { role: 'user', content: message }
        ];
        
        const aiContext = await buildAIContext(message, tenantId);
        
        let enhancedContext = aiContext;
        if (context) {
          const pageContextStr = `
            User is on page: ${context.url || 'Unknown'}
            Page title: ${context.title || 'Unknown'}
          `;
          enhancedContext += pageContextStr;
        }
        
        const widgetTicketContext = {
          id: 0,
          title: 'Widget Chat',
          description: message,
          category: 'support',
          tenantId
        };

        const messageText = messages.length > 0 && messages[0].role === 'user' 
          ? messages[0].content 
          : message;
          
        const response = await generateChatResponse(
          widgetTicketContext,
          [],
          messageText
        );
        
        // Log fallback interaction
        try {
          if (sessionId) {
            await storage.recordWidgetInteraction({
              tenantId,
              sessionId,
              messageType: 'user',
              message,
              timestamp: new Date(),
              url: req.body.url || null,
              metadata: {
                responseLength: response.length,
                aiUsed: true,
                fallbackMethod: 'standard_ai'
              }
            });
          }
        } catch (logError) {
          console.error('Error recording widget interaction:', logError);
        }
        
        return res.json({
          message: response,
          sessionId,
          actions: generateSuggestedActions(message, response)
        });
      }
      
    } catch (error) {
      console.error('Error processing widget chat request:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });
}

/**
 * Extract chat response from orchestrator ticket result
 */
function extractResponseFromTicket(orchestratorResult: any): string {
  // Try to extract resolution steps as a conversational response
  if (orchestratorResult.resolution_steps && orchestratorResult.resolution_steps.length > 0) {
    const steps = orchestratorResult.resolution_steps;
    
    // Create a conversational response from the resolution steps
    let response = "I can help you with that. Here's what I recommend:\n\n";
    
    steps.forEach((step: string, index: number) => {
      response += `${index + 1}. ${step}\n`;
    });
    
    response += "\nLet me know if you need any clarification on these steps!";
    return response;
  }
  
  // If we have a ticket title, use it as context
  if (orchestratorResult.ticket_title) {
    return `I understand you're having an issue with "${orchestratorResult.ticket_title}". I've created a support ticket (#${orchestratorResult.ticket_id}) for you. Our team will review this and provide detailed assistance shortly.`;
  }
  
  // Fallback response
  return "I've received your request and created a support ticket for you. Our team will review this and get back to you with assistance.";
}

/**
 * Generate suggested actions based on message content
 */
function generateSuggestedActions(userMessage: string, aiResponse: string): any[] {
  const actions = [];
  
  // Check if the response suggests creating a ticket
  if (
    aiResponse.includes("create a ticket") || 
    aiResponse.includes("submit a ticket") || 
    aiResponse.includes("open a ticket")
  ) {
    actions.push({
      type: 'message',
      label: 'Create Support Ticket',
      message: 'I would like to create a support ticket for this issue'
    });
  }
  
  // Check if response mentions contacting support
  if (
    aiResponse.includes("contact support") || 
    aiResponse.includes("support team") || 
    aiResponse.includes("customer service")
  ) {
    actions.push({
      type: 'message',
      label: 'Contact Support Team',
      message: 'I need to speak with a support representative'
    });
  }
  
  // Check for documentation references
  if (
    aiResponse.includes("documentation") || 
    aiResponse.includes("user guide") || 
    aiResponse.includes("knowledge base")
  ) {
    actions.push({
      type: 'message',
      label: 'View Documentation',
      message: 'Can you show me the documentation for this?'
    });
  }
  
  return actions;
}