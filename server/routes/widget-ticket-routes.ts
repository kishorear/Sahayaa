import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateChatResponse, generateTicketTitle } from "../ai";
import type { ChatMessage } from "../ai";
import agentService from "../ai/agent-service";

/**
 * Widget ticket creation request validation schema
 */
const widgetTicketSchema = z.object({
  tenantId: z.number(),
  sessionId: z.string().optional(),
  conversation: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string()
  })),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(), // base64 encoded
    mimeType: z.string()
  })).optional(),
  context: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    userAgent: z.string().optional()
  }).optional()
});

/**
 * Register routes for widget ticket creation
 */
export function registerWidgetTicketRoutes(app: Express): void {
  /**
   * Widget ticket creation endpoint
   * 
   * POST /api/widget/create-ticket
   */
  app.post('/api/widget/create-ticket', async (req: Request, res: Response) => {
    try {
      const validationResult = widgetTicketSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error('Widget ticket validation failed:', validationResult.error);
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }
      
      const { tenantId, sessionId, conversation, attachments, context } = validationResult.data;
      
      console.log(`Widget Ticket: Creating ticket for tenant ${tenantId} with ${conversation.length} messages`);
      
      // Step 1: Generate sophisticated ticket title using the AI title generation service
      const conversationForTitle: ChatMessage[] = conversation.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      const ticketTitle = await generateTicketTitle(conversationForTitle, tenantId);
      
      // Step 2: Generate comprehensive ticket description from conversation using LLM
      const conversationText = conversation.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      
      const descriptionPrompt = `Summarize this support conversation into a professional ticket description. Include the user's issue, any provided context, and conversation progression:

      CONVERSATION:
      ${conversationText}
      
      ${context?.url ? `\nUser was on page: ${context.url}` : ''}
      ${context?.title ? `Page title: ${context.title}` : ''}
      
      Create a comprehensive, professional ticket description that captures all important details.`;
      
      const descriptionResponse = await generateChatResponse(
        { id: 0, title: 'Description Generation', description: conversationText, category: 'support', tenantId },
        [{ role: 'user', content: descriptionPrompt }],
        descriptionPrompt
      );
      
      // Step 3: Get agent insights for additional suggestions
      let agentInsights = null;
      try {
        const latestUserMessage = conversation.filter(msg => msg.role === 'user').pop()?.content || '';
        const workflowInput = {
          user_message: latestUserMessage,
          user_context: {
            url: context?.url || "Widget Chat",
            title: context?.title || "Support Request",
            userAgent: context?.userAgent || "Widget User"
          },
          tenant_id: tenantId,
          user_id: sessionId || `widget_${Date.now()}`
        };

        const orchestratorResult = await agentService.processWorkflow(workflowInput);
        
        if (orchestratorResult.success) {
          agentInsights = {
            category: orchestratorResult.category,
            urgency: orchestratorResult.urgency,
            confidence: orchestratorResult.confidence_score,
            suggestions: orchestratorResult.resolution_steps || [],
            processingTime: orchestratorResult.processing_time_ms
          };
          console.log(`Widget Ticket: Agent analysis - Category: ${orchestratorResult.category}, Urgency: ${orchestratorResult.urgency}`);
        }
      } catch (agentError: any) {
        console.warn(`Widget Ticket: Agent analysis unavailable: ${agentError.message}`);
      }
      
      // Step 4: Create the ticket in storage
      const ticketData = {
        title: ticketTitle,
        description: descriptionResponse.trim(),
        category: agentInsights?.category || 'support',
        complexity: agentInsights?.urgency || 'medium', // Map urgency to complexity
        status: 'new',
        tenantId,
        createdBy: 1, // Widget user - could be enhanced with proper user tracking
        source: 'widget',
        clientMetadata: {
          sessionId,
          conversationLength: conversation.length,
          agentCategory: agentInsights?.category,
          agentUrgency: agentInsights?.urgency,
          agentConfidence: agentInsights?.confidence,
          context: context,
          hasAttachments: attachments && attachments.length > 0
        }
      };
      
      const ticket = await storage.createTicket(ticketData);
      
      // Step 5: Handle attachments if provided
      let attachmentResults = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            // Convert base64 to buffer and save
            const buffer = Buffer.from(attachment.data, 'base64');
            // In a real implementation, you'd save to file system or cloud storage
            // For now, we'll log the attachment info
            console.log(`Widget Ticket: Attachment ${attachment.filename} (${attachment.mimeType}) - ${buffer.length} bytes`);
            
            attachmentResults.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: buffer.length,
              status: 'saved'
            });
          } catch (attachError) {
            console.error(`Widget Ticket: Failed to process attachment ${attachment.filename}:`, attachError);
            attachmentResults.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              status: 'failed',
              error: 'Processing failed'
            });
          }
        }
      }
      
      // Step 6: Generate ulterior suggestions
      const latestUserMessageForSuggestions = conversation.filter(msg => msg.role === 'user').pop()?.content || '';
      const suggestions = generateUlteriorSuggestions(latestUserMessageForSuggestions, agentInsights, ticket);
      
      console.log(`Widget Ticket: Successfully created ticket #${ticket.id} - "${ticketTitle}"`);
      
      return res.json({
        success: true,
        ticket: {
          id: ticket.id,
          title: ticketTitle,
          description: descriptionResponse.trim(),
          category: ticket.category,
          complexity: ticket.complexity,
          status: ticket.status,
          createdAt: ticket.createdAt
        },
        attachments: attachmentResults,
        agentInsights: agentInsights ? {
          category: agentInsights.category,
          urgency: agentInsights.urgency,
          confidence: agentInsights.confidence,
          processingTime: agentInsights.processingTime
        } : null,
        suggestions: suggestions
      });
      
    } catch (error) {
      console.error('Error creating widget ticket:', error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  });
}

/**
 * Generate ulterior suggestions based on ticket content and agent insights
 */
function generateUlteriorSuggestions(userMessage: string, agentInsights: any, ticket: any): any[] {
  const suggestions = [];
  
  // Agent-driven suggestions
  if (agentInsights?.suggestions && agentInsights.suggestions.length > 0) {
    suggestions.push({
      type: 'agent_resolution',
      title: 'Recommended Solution Steps',
      description: 'AI-generated resolution steps based on similar issues',
      steps: agentInsights.suggestions.slice(0, 5),
      confidence: agentInsights.confidence
    });
  }
  
  // Category-based suggestions
  if (agentInsights?.category) {
    switch (agentInsights.category.toLowerCase()) {
      case 'billing':
        suggestions.push({
          type: 'billing_resources',
          title: 'Billing Resources',
          description: 'Access billing documentation and payment options',
          actions: [
            'View billing FAQ',
            'Update payment method',
            'Download invoices',
            'Contact billing specialist'
          ]
        });
        break;
      case 'technical':
        suggestions.push({
          type: 'technical_resources',
          title: 'Technical Documentation',
          description: 'Relevant technical guides and troubleshooting',
          actions: [
            'View API documentation',
            'Check system status',
            'Browse troubleshooting guides',
            'Access developer tools'
          ]
        });
        break;
      case 'account':
        suggestions.push({
          type: 'account_resources',
          title: 'Account Management',
          description: 'Account settings and security options',
          actions: [
            'Update profile settings',
            'Manage security settings',
            'View login history',
            'Reset password'
          ]
        });
        break;
    }
  }
  
  // Urgency-based suggestions
  if (agentInsights?.urgency === 'high') {
    suggestions.push({
      type: 'escalation',
      title: 'Priority Support',
      description: 'Your issue has been marked as high priority',
      actions: [
        'Escalate to senior support',
        'Request phone callback',
        'Access emergency support',
        'View SLA commitments'
      ]
    });
  }
  
  // General suggestions
  suggestions.push({
    type: 'self_service',
    title: 'Self-Service Options',
    description: 'Resources that might help resolve your issue quickly',
    actions: [
      'Search knowledge base',
      'Watch tutorial videos',
      'Join community forum',
      'Submit feature request'
    ]
  });
  
  // Follow-up suggestions
  suggestions.push({
    type: 'follow_up',
    title: 'Next Steps',
    description: 'What to expect and how to track progress',
    actions: [
      `Track ticket #${ticket.id} status`,
      'Set up email notifications',
      'Rate your support experience',
      'Provide additional information'
    ]
  });
  
  return suggestions;
}