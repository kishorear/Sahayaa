import { AIProviderFactory } from './providers';
import { buildAIContext } from '../data-source-service';

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
    const knowledgeContext = await buildAIContext(`${title} ${description}`, tenantId);
    
    // Call the provider's classification method
    return await provider.classifyTicket(title, description, knowledgeContext);
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
    const knowledgeContext = await buildAIContext(`${title} ${description}`, tenantId);
    
    // Call the provider's auto-resolve method
    return await provider.attemptAutoResolve(title, description, previousMessages, knowledgeContext);
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
    
    // Get knowledge context for this query
    const knowledgeContext = await buildAIContext(userMessage, tenantId);
    
    // Create a system message with ticket context
    const systemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
      Ticket #${ticketContext.id}: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      
      Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
      If you need more information or the issue requires human intervention, make that clear as well.`;
    
    // Prepare the messages array with history and current message
    const allMessages = [
      ...messageHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Call the provider's chat response method
    return await provider.generateChatResponse(allMessages, knowledgeContext, systemPrompt);
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
    
    // Get knowledge context for this query
    const knowledgeContext = await buildAIContext(userMessage, tenantId);
    
    // Create a system message with ticket context
    const systemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a support ticket #${ticketContext.id}.
      Ticket title: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      Category: "${ticketContext.category}"
      
      Provide a professional, helpful email response that addresses the customer's query.
      Format your response properly for an email with a greeting and sign-off.
      If you can fully resolve the issue, provide a complete solution.
      If you need more information or the issue requires human intervention, explain what next steps will be taken.`;
    
    // Prepare the messages array with history and current message
    const allMessages = [
      ...messageHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Call the provider's chat response method - email uses the same underlying method
    return await provider.generateChatResponse(allMessages, knowledgeContext, systemPrompt);
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
    const knowledgeContext = await buildAIContext(conversationText, tenantId);
    
    // Call the provider's summarize method
    return await provider.summarizeConversation(messages, knowledgeContext);
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
 */
export async function reloadProvidersFromDatabase(tenantId: number): Promise<void> {
  try {
    // Import storage directly to avoid circular dependencies
    const { storage } = await import('../storage');
    
    // Get providers for this tenant
    const providers = await storage.getAiProviders(tenantId);
    
    // Initialize the factory with these configurations
    AIProviderFactory.loadProvidersFromDatabase(tenantId, providers);
    
    console.log(`Reloaded ${providers.length} AI providers from database for tenant ${tenantId}`);
  } catch (error) {
    console.error(`Failed to reload AI providers for tenant ${tenantId}:`, error);
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