import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateChatResponse } from "../ai";
import type { ChatMessage } from "../ai";
import { buildAIContext } from "../data-source-service";

/**
 * Widget chat request validation schema
 */
const widgetChatRequestSchema = z.object({
  tenantId: z.number(),
  message: z.string(),
  context: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    activeField: z.object({
      type: z.string().optional(),
      name: z.string().optional(),
      value: z.string().optional()
    }).optional()
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
      
      // Convert request into chat messages format
      const messages: ChatMessage[] = [
        { role: 'user', content: message }
      ];
      
      // Build context for AI
      const aiContext = await buildAIContext(message, tenantId);
      
      // Include page context if available
      let enhancedContext = aiContext;
      if (context) {
        const pageContextStr = `
          User is on page: ${context.url || 'Unknown'}
          Page title: ${context.title || 'Unknown'}
        `;
        
        if (context.activeField) {
          enhancedContext += `
            User is interacting with a ${context.activeField.type || 'form field'} 
            named "${context.activeField.name || 'Unknown'}"
            Current content: "${context.activeField.value || ''}"
          `;
        }
        
        enhancedContext += pageContextStr;
      }
      
      // Generate response using AI
      const response = await generateChatResponse(
        messages,
        enhancedContext,
        undefined, // assistant role (default)
        tenantId
      );
      
      // Log interaction for analytics if reporting is enabled
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
              hasContext: !!context,
              responseLength: response.length,
              aiUsed: true,
            }
          });
        }
      } catch (logError) {
        // Non-critical error, log but continue
        console.error('Error recording widget interaction:', logError);
      }
      
      return res.json({
        message: response,
        sessionId,
        actions: generateSuggestedActions(message, response)
      });
      
    } catch (error) {
      console.error('Error processing widget chat request:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });
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