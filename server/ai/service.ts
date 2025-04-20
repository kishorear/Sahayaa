import { AIProviderFactory } from './providers';
import { buildAIContext } from '../data-source-service';
import { enhanceModelContextWithDocuments } from '../model-context-protocol';

// Common type for message objects across all providers
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Ticket classification result type
export type TicketClassification = {
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  assignedTo: string;
  canAutoResolve: boolean;
  aiNotes?: string;
};

/**
 * Classify a support ticket using AI
 * 
 * @param title Ticket title
 * @param description Ticket description
 * @param tenantId Optional tenant ID
 * @returns Classification result
 */
export async function classifyTicket(
  title: string, 
  description: string, 
  tenantId: number = 1
): Promise<TicketClassification> {
  try {
    // Get the provider for classification
    const provider = AIProviderFactory.getProviderForOperation(tenantId, 'classification');
    
    if (!provider) {
      throw new Error('No AI provider available for ticket classification');
    }
    
    // Get knowledge context for this query
    const query = `${title} ${description}`;
    const baseContext = await buildAIContext(query, tenantId);
    
    // Enhance with document context using Model Context Protocol
    const { documents } = await enhanceModelContextWithDocuments(query, '', tenantId);
    
    // Combine contexts
    const enhancedContext = documents ? `${baseContext}\n\n${documents}` : baseContext;
    
    // Call the provider's classification method
    return await provider.classifyTicket(title, description, enhancedContext);
  } catch (error) {
    console.error('Error in ticket classification:', error);
    
    // Fall back to basic classification
    return {
      category: 'other',
      complexity: 'medium',
      assignedTo: 'support',
      canAutoResolve: false,
      aiNotes: 'AI classification failed, using default values'
    };
  }
}

/**
 * Attempt to automatically resolve a ticket using AI
 * 
 * @param title Ticket title
 * @param description Ticket description
 * @param previousMessages Optional previous conversation messages
 * @param tenantId Optional tenant ID
 * @returns Resolution status and response
 */
export async function attemptAutoResolve(
  title: string, 
  description: string, 
  previousMessages: ChatMessage[] = [], 
  tenantId: number = 1
): Promise<{resolved: boolean; response: string}> {
  try {
    // Get the provider for auto-resolution
    const provider = AIProviderFactory.getProviderForOperation(tenantId, 'autoResolve');
    
    if (!provider) {
      throw new Error('No AI provider available for ticket auto-resolution');
    }
    
    // Get knowledge context for this query
    const query = `${title} ${description}`;
    const baseContext = await buildAIContext(query, tenantId);
    
    // Enhance with document context using Model Context Protocol
    const { documents } = await enhanceModelContextWithDocuments(query, '', tenantId);
    
    // Combine contexts
    const enhancedContext = documents ? `${baseContext}\n\n${documents}` : baseContext;
    
    // Call the provider's auto-resolve method
    return await provider.attemptAutoResolve(title, description, previousMessages, enhancedContext);
  } catch (error) {
    console.error('Error in ticket auto-resolution:', error);
    
    // Fall back to a generic response
    return { 
      resolved: false, 
      response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly." 
    };
  }
}

/**
 * Generate a response to a chat message using AI
 * 
 * @param ticketContext Ticket context information
 * @param messageHistory Previous conversation messages
 * @param userMessage Current user message
 * @param tenantId Optional tenant ID
 * @returns Generated response text
 */
export async function generateChatResponse(
  ticketContext: { id: number; title: string; description: string; category: string },
  messageHistory: ChatMessage[],
  userMessage: string,
  tenantId: number = 1
): Promise<string> {
  try {
    // Get the provider for chat
    const provider = AIProviderFactory.getProviderForOperation(tenantId, 'chat');
    
    if (!provider) {
      throw new Error('No AI provider available for chat response');
    }
    
    // Create a system message with ticket context
    const systemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
      Ticket #${ticketContext.id}: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      
      Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
      If you need more information or the issue requires human intervention, make that clear as well.`;
    
    // Get basic knowledge context
    const baseContext = await buildAIContext(userMessage, tenantId);
    
    // Enhance with document context using Model Context Protocol
    const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
      userMessage,
      systemPrompt,
      tenantId
    );
    
    // Prepare the messages array with history and current message
    const allMessages = [
      ...messageHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Combine contexts
    const enhancedContext = documents ? `${baseContext}\n\n${documents}` : baseContext;
    
    // Call the provider's chat response method with enhanced prompt
    return await provider.generateChatResponse(allMessages, enhancedContext, enhancedPrompt);
  } catch (error) {
    console.error('Error generating chat response:', error);
    
    // Fall back to a generic response
    return "I apologize, but I'm experiencing difficulties processing your request right now. Let me connect you with a support representative who can assist you further.";
  }
}

/**
 * Generate a response for an email message using AI
 * 
 * @param ticketContext Ticket context information
 * @param messageHistory Previous conversation messages
 * @param userMessage Current user message
 * @param tenantId Optional tenant ID
 * @returns Generated response text
 */
export async function generateEmailResponse(
  ticketContext: { id: number; title: string; description: string; category: string },
  messageHistory: ChatMessage[],
  userMessage: string,
  tenantId: number = 1
): Promise<string> {
  try {
    // Get the provider for email
    const provider = AIProviderFactory.getProviderForOperation(tenantId, 'email');
    
    if (!provider) {
      throw new Error('No AI provider available for email response');
    }
    
    // Create a system message with ticket context
    const systemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a support ticket #${ticketContext.id}.
      Ticket title: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      Category: "${ticketContext.category}"
      
      Provide a professional, helpful email response that addresses the customer's query.
      Format your response properly for an email with a greeting and sign-off.
      If you can fully resolve the issue, provide a complete solution.
      If you need more information or the issue requires human intervention, explain what next steps will be taken.`;
    
    // Get basic knowledge context
    const baseContext = await buildAIContext(userMessage, tenantId);
    
    // Enhance with document context using Model Context Protocol
    const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
      userMessage,
      systemPrompt,
      tenantId
    );
    
    // Prepare the messages array with history and current message
    const allMessages = [
      ...messageHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Combine contexts
    const enhancedContext = documents ? `${baseContext}\n\n${documents}` : baseContext;
    
    // Call the provider's chat response method with enhanced prompt
    return await provider.generateChatResponse(allMessages, enhancedContext, enhancedPrompt);
  } catch (error) {
    console.error('Error generating email response:', error);
    
    // Fall back to a generic response
    return "Thank you for contacting our support team. We've received your message and one of our representatives will review your case and respond shortly. We appreciate your patience.";
  }
}

/**
 * Summarize a conversation using AI
 * 
 * @param messages Conversation messages to summarize
 * @param tenantId Optional tenant ID
 * @returns Summary text
 */
export async function summarizeConversation(
  messages: ChatMessage[], 
  tenantId: number = 1
): Promise<string> {
  try {
    // Get the primary provider
    const provider = AIProviderFactory.getPrimaryProvider(tenantId);
    
    if (!provider) {
      throw new Error('No AI provider available for conversation summarization');
    }
    
    // Get relevant context for the conversation
    const conversationText = messages.map(m => m.content).join(' ');
    const baseContext = await buildAIContext(conversationText, tenantId);
    
    // Basic system prompt for summarization
    const systemPrompt = `Please summarize the provided conversation concisely, 
    highlighting key points, questions, and resolutions. Identify any outstanding issues 
    or action items that need follow-up.`;
    
    // Enhance with document context using Model Context Protocol
    const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
      conversationText,
      systemPrompt,
      tenantId
    );
    
    // Combine contexts
    const enhancedContext = documents ? `${baseContext}\n\n${documents}` : baseContext;
    
    // Call the provider's summarize method with enhanced context
    return await provider.summarizeConversation(messages, enhancedContext);
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    
    // Create a basic summary if AI fails
    const userMessages = messages.filter(m => m.role === 'user');
    return `Conversation with ${userMessages.length} user messages. Please review the full conversation for details.`;
  }
}

/**
 * Load AI providers for a tenant from the database
 * Similar to the function in routes, but kept here to avoid circular dependencies
 * 
 * @param tenantId The tenant ID to load providers for
 * @param teamId Optional team ID to filter providers by
 */
export async function reloadProvidersFromDatabase(tenantId: number, teamId?: number | null): Promise<void> {
  try {
    // Import storage directly to avoid circular dependencies
    const { storage } = await import('../storage');
    
    // Get providers for this tenant
    let providers = await storage.getAiProviders(tenantId);
    
    // Filter by team ID if provided
    if (teamId !== undefined) {
      // Include both team-specific providers and tenant-wide providers (null teamId)
      providers = providers.filter(p => p.teamId === teamId || p.teamId === null);
    }
    
    // Initialize the factory with these configurations
    AIProviderFactory.loadProvidersFromDatabase(tenantId, providers);
    
    const teamLog = teamId !== undefined ? ` for team ${teamId}` : '';
    console.log(`Reloaded ${providers.length} AI providers from database for tenant ${tenantId}${teamLog}`);
  } catch (error) {
    console.error(`Failed to reload AI providers for tenant ${tenantId}:`, error);
  }
}

/**
 * Check if a user has access to AI providers
 * 
 * @param tenantId The tenant ID
 * @param teamId The team ID (can be null)
 * @returns True if the user has access to any AI providers
 */
export async function getAiProviderAccessForUser(tenantId: number, teamId: number | null): Promise<boolean> {
  try {
    // Import storage directly to avoid circular dependencies
    const { storage } = await import('../storage');
    
    // Get all enabled AI providers for the tenant
    const providers = await storage.getAiProviders(tenantId);
    
    if (!providers || providers.length === 0) {
      return false;
    }
    
    // If user is not in a team, they can only access tenant-wide providers
    if (!teamId) {
      return providers.some(p => p.teamId === null);
    }
    
    // Check for team-specific or tenant-wide providers
    return providers.some(p => p.teamId === teamId || p.teamId === null);
  } catch (error) {
    console.error(`Error checking AI provider access for tenant ${tenantId}, team ${teamId}:`, error);
    return false;
  }
}

/**
 * Get the status of all configured AI providers for a tenant
 * 
 * @param tenantId Tenant ID
 * @returns Status of each provider
 */
export async function getAIProviderStatus(tenantId: number = 1): Promise<Record<string, boolean>> {
  try {
    // Reload providers before checking - this ensures we have the latest configurations
    await reloadProvidersFromDatabase(tenantId);
    
    // Now check the providers
    return await AIProviderFactory.checkAllProviders(tenantId);
  } catch (error) {
    console.error('Error checking AI provider status:', error);
    return {};
  }
}