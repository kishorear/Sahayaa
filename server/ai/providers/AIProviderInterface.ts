/**
 * Interface defining the common API for all AI providers
 */
export interface AIProviderInterface {
  /**
   * Provider name (openai, gemini, anthropic, aws-bedrock, bedrock, custom)
   */
  name: string;
  
  /**
   * Generate a chat response based on provided messages and context
   * 
   * @param messages Previous conversation messages
   * @param context Additional knowledge context to inform the AI
   * @param systemPrompt Optional system prompt to guide AI behavior
   * @returns Generated response text
   */
  generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string>;
  
  /**
   * Classify a ticket based on its title and description
   * 
   * @param title Ticket title
   * @param description Ticket description
   * @param context Additional context to help with classification
   * @returns Classification object with category, complexity, etc.
   */
  classifyTicket(
    title: string,
    description: string,
    context?: string
  ): Promise<{
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
    assignedTo: string;
    canAutoResolve: boolean;
    aiNotes?: string;
  }>;
  
  /**
   * Attempt to automatically resolve a support issue
   * 
   * @param title Ticket title
   * @param description Ticket description
   * @param previousMessages Optional previous conversation messages
   * @param context Additional context to help with resolution
   * @returns Resolution status and response
   */
  attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}>;
  
  /**
   * Generate a concise and descriptive title for a support ticket
   * 
   * @param messages Conversation messages to analyze
   * @param context Additional context to help with title generation
   * @returns A concise title that accurately describes the issue
   */
  generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string>;
  
  /**
   * Summarize a conversation thread
   * 
   * @param messages Conversation messages to summarize
   * @param context Additional context to help with summarization
   * @returns Summary text
   */
  summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string>;
  
  /**
   * Check if the provider is properly configured and available
   * 
   * @returns Boolean indicating if provider is ready for use
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Configuration for an AI provider
 */
export interface AIProviderConfig {
  /**
   * Provider type
   */
  type: 'openai' | 'gemini' | 'anthropic' | 'aws-bedrock' | 'bedrock' | 'perplexity' | 'custom';
  
  /**
   * API key for the service
   */
  apiKey?: string;
  
  /**
   * Base URL for custom API implementations
   */
  baseUrl?: string;
  
  /**
   * Model to use (varies by provider)
   */
  model?: string;
  
  /**
   * Additional provider-specific settings
   */
  settings?: Record<string, any>;
  
  /**
   * Whether this is the primary provider (fallback to others if false)
   */
  isPrimary?: boolean;
  
  /**
   * Whether to use this provider for ticket classification
   */
  useForClassification?: boolean;
  
  /**
   * Whether to use this provider for auto-resolving tickets
   */
  useForAutoResolve?: boolean;
  
  /**
   * Whether to use this provider for chat responses
   */
  useForChat?: boolean;
  
  /**
   * Whether to use this provider for email responses
   */
  useForEmail?: boolean;
}