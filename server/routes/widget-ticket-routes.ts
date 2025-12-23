import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateChatResponse, generateTicketTitle, classifyTicket } from "../ai";
import type { ChatMessage } from "../ai";
import agentService from "../ai/agent-service";
import { getIntegrationService } from "../integrations";
import { checkTrialTicketLimit, incrementTrialTicketCounter } from "../auth";

/**
 * Widget ticket creation request validation schema
 */
const widgetTicketSchema = z.object({
  tenantId: z.number(),
  userId: z.number().optional(), // User ID for authenticated chatbot usage
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
      
      const { tenantId, userId, sessionId, conversation, attachments, context } = validationResult.data;
      
      console.log(`Widget Ticket: Creating ticket for tenant ${tenantId} with ${conversation.length} messages`);
      
      // Step 1: Generate sophisticated ticket title using the AI title generation service
      // Filter out attachment messages from conversation for AI title generation
      const conversationForTitle: ChatMessage[] = conversation
        .filter(msg => 
          !msg.content.includes('[ATTACHMENT]') && 
          !msg.content.includes('I\'ve shared') && 
          !msg.content.includes('attachment')
        )
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
      
      const ticketTitle = await generateTicketTitle(conversationForTitle.length > 0 ? conversationForTitle : conversation.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })), tenantId);
      
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
          user_id: "1" // Default to user ID 1 for widget users
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
      
      // Step 3.5: Check trial ticket limit (only enforces for trial tenants)
      const limitCheck = await checkTrialTicketLimit(tenantId);
      if (!limitCheck.canCreate) {
        console.log(`Widget Ticket: Trial tenant ${tenantId} ticket limit reached`);
        return res.status(403).json({
          error: limitCheck.reason || 'Ticket creation limit reached',
          ticketsCreated: limitCheck.ticketsCreated,
          ticketLimit: limitCheck.ticketLimit,
          isTrial: true
        });
      }
      
      // Step 4: Use AI classifier for proper complexity analysis
      const classification = await classifyTicket(ticketTitle, descriptionResponse.trim(), tenantId);
      console.log(`Widget Ticket: AI Classification - Category: ${classification.category}, Complexity: ${classification.complexity} (${classification.complexityConfidence}% confidence)`);
      
      // Step 4.1: Create the ticket in storage with enhanced classification
      const ticketData = {
        title: ticketTitle,
        description: descriptionResponse.trim(),
        category: classification.category || agentInsights?.category || 'support',
        complexity: classification.complexity || 'medium',
        complexityConfidence: classification.complexityConfidence,
        complexityReason: classification.complexityReason,
        status: 'new',
        tenantId,
        createdBy: userId || 1, // Use authenticated user ID or default to 1 for widget users
        source: 'widget',
        aiNotes: classification.aiNotes,
        clientMetadata: {
          sessionId,
          conversationLength: conversation.length,
          agentCategory: agentInsights?.category,
          agentUrgency: agentInsights?.urgency,
          agentConfidence: agentInsights?.confidence,
          aiClassification: {
            category: classification.category,
            complexity: classification.complexity,
            confidence: classification.complexityConfidence,
            reason: classification.complexityReason
          },
          context: context,
          hasAttachments: attachments && attachments.length > 0
        }
      };
      
      const ticket = await storage.createTicket(ticketData);
      
      // Step 4.3: Increment ticket counter for trial tenants only
      await incrementTrialTicketCounter(tenantId);
      
      // Step 4.5: Automatic ticket assignment after creation using workload-based routing
      try {
        // Use workload-based assignment for fair distribution (assigns to least busy eligible team member)
        const assignedUser = await storage.assignTicketRandomlyInDepartment(ticket.category, tenantId);
        
        if (assignedUser) {
          const updatedTicket = await storage.updateTicket(ticket.id, {
            assignedTo: assignedUser.id.toString()
          });
          console.log(`Widget Ticket: Auto-assigned ticket #${ticket.id} to ${assignedUser.name || assignedUser.username} (ID: ${assignedUser.id}) based on category "${ticket.category}" (least busy eligible team member)`);
        } else {
          console.warn(`Widget Ticket: No available users for category "${ticket.category}" - ticket #${ticket.id} remains unassigned`);
        }
      } catch (assignmentError) {
        console.error(`Widget Ticket: Assignment failed for ticket #${ticket.id}:`, assignmentError);
        // Continue without failing the entire ticket creation
      }
      
      // Step 5: Handle attachments if provided
      let attachmentResults = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            // Convert base64 to buffer and save
            const buffer = Buffer.from(attachment.data, 'base64');
            console.log(`Widget Ticket: Processing attachment ${attachment.filename} (${attachment.mimeType}) - ${buffer.length} bytes`);
            
            // Create attachment in database
            const attachmentData = {
              ticketId: ticket.id,
              type: attachment.mimeType.startsWith('image/') ? 'image' : 'file',
              filename: attachment.filename,
              contentType: attachment.mimeType,
              data: attachment.data // Store base64 data directly
            };
            
            const savedAttachment = await storage.createAttachment(attachmentData);
            console.log(`Widget Ticket: Successfully saved attachment ${savedAttachment.id} for ticket ${ticket.id}`);
            
            attachmentResults.push({
              id: savedAttachment.id,
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
      
      // Step 6: Automatically create ticket in JIRA if integration is enabled
      try {
        const integrationService = getIntegrationService();
        const jiraService = integrationService?.getService('jira');
        
        if (jiraService && jiraService.isEnabled()) {
          console.log(`Widget Ticket: Creating JIRA issue for ticket #${ticket.id}...`);
          
          const jiraResult = await jiraService.createIssue({
            title: ticketTitle,
            description: descriptionResponse.trim(),
            category: ticket.category,
            complexity: ticket.complexity,
            assignedTo: ticket.assignedTo,
            aiNotes: agentInsights?.aiNotes || '',
            tenantId: ticket.tenantId
          });
          
          if (jiraResult && !jiraResult.error) {
            console.log(`Widget Ticket: Successfully created JIRA issue ${jiraResult.key} for ticket #${ticket.id}`);
            
            // Update the ticket with JIRA reference
            await storage.updateTicket(ticket.id, {
              externalIntegrations: JSON.stringify({
                jira: jiraResult.key,
                jiraUrl: jiraResult.url
              })
            });
          } else {
            console.error(`Widget Ticket: Failed to create JIRA issue for ticket #${ticket.id}:`, jiraResult?.error);
          }
        } else {
          console.log(`Widget Ticket: JIRA integration not enabled or configured, skipping JIRA issue creation`);
        }
      } catch (jiraError) {
        console.error(`Widget Ticket: Error during JIRA integration for ticket #${ticket.id}:`, jiraError);
        // Continue without failing the entire ticket creation
      }
      
      // Step 7: Generate ulterior suggestions
      const latestUserMessageForSuggestions = conversation.filter(msg => msg.role === 'user').pop()?.content || '';
      const suggestions = generateUlteriorSuggestions(latestUserMessageForSuggestions, agentInsights, ticket);
      
      console.log(`Widget Ticket: Successfully created ticket #${ticket.id} - "${ticketTitle}"`);
      
      return res.json({
        success: true,
        ticket: {
          id: ticket.id,
          companyTicketId: ticket.companyTicketId, // Include company-specific ticket ID
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