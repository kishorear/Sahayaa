import Anthropic from '@anthropic-ai/sdk';
import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';

export class AnthropicProvider implements AIProviderInterface {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;
  
  constructor(config: AIProviderConfig) {
    // Create Anthropic client with the provided API key
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || ''
    });
    
    // Use the specified model or default to claude-3-opus-20240229
    this.model = config.model || "claude-3-opus-20240229";
    
    console.log(`Anthropic provider initialized with model: ${this.model}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Build the system prompt with context if provided
      let system = systemPrompt || 
        `You are an AI support assistant for a SaaS product. Provide helpful, concise responses.`;
      
      // Add knowledge context if available
      if (context) {
        system += `\n\n${context}`;
      }
      
      // Convert message format for Anthropic
      const anthropicMessages = this.formatMessagesForAnthropic(messages);
      
      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: anthropicMessages,
        max_tokens: 1024
      });

      // Handle different content types in the Anthropic API response
      if (response.content && response.content.length > 0) {
        const content = response.content[0];
        return typeof content.text === 'string' ? content.text : '';
      }
      return '';
    } catch (error) {
      console.error("Error calling Anthropic for chat response:", error);
      throw new Error("Failed to generate chat response with Anthropic");
    }
  }
  
  async classifyTicket(
    title: string,
    description: string,
    context?: string
  ): Promise<{
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
    assignedTo: string;
    canAutoResolve: boolean;
    aiNotes?: string;
  }> {
    try {
      let system = "You are an AI support ticket classifier.";
      
      // Add knowledge context to system message if available
      if (context) {
        system += `\n\nUse this information to help with classification:\n${context}`;
      }
      
      let prompt = `
      Based on the following ticket information, 
      classify the ticket according to these criteria:
      
      1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. Complexity (one of: simple, medium, complex)
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;

      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      });

      // Extract and parse the JSON response
      let content = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        content = typeof contentBlock.text === 'string' ? contentBlock.text : '';
      }
      
      // Find JSON content between curly braces
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error calling Anthropic for ticket classification:", error);
      throw new Error("Failed to classify ticket with Anthropic");
    }
  }
  
  async attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}> {
    try {
      // Build system content with knowledge context if available
      let system = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
          `;
      
      // Add knowledge context if available
      if (context) {
        system += `\n\nUse this information to help with resolution:\n${context}`;
      }
      
      // Convert previous messages to Anthropic format
      const anthropicMessages = previousMessages ? 
        this.formatMessagesForAnthropic(previousMessages) : [];
      
      // Add the current query as the last message
      anthropicMessages.push({
        role: 'user',
        content: `Title: ${title}\nDescription: ${description}`
      });

      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: anthropicMessages,
        max_tokens: 1024
      });

      // Extract text from response
      let responseText = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        responseText = typeof contentBlock.text === 'string' ? contentBlock.text : '';
      }
      
      // Check if the response indicates resolution
      const resolved = responseText.includes("[ISSUE RESOLVED]");
      
      // Clean up the response by removing the resolution indicators
      const cleanResponse = responseText
        .replace("[ISSUE RESOLVED]", "")
        .replace("[REQUIRES HUMAN]", "")
        .trim();
      
      return { resolved, response: cleanResponse };
    } catch (error) {
      console.error("Error calling Anthropic for ticket resolution:", error);
      throw new Error("Failed to auto-resolve ticket with Anthropic");
    }
  }
  
  async generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Build system message with context if available
      let system = "You are an AI assistant that creates concise, descriptive titles for support tickets based on conversation context.";
      
      if (context) {
        system += `\n\nUse this information to help understand the context of the conversation:\n${context}`;
      }
      
      // Filter out system messages from conversation
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Create the prompt for title generation
      let prompt = `
      Based on the following support conversation, generate a concise and descriptive title for the support ticket.
      The title should be clear, specific, and capture the main issue being discussed.
      Keep it under 10 words and make it professional.
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Support Ticket Title:
      `;
      
      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      });

      // Extract text and clean up any quotes or extra whitespace
      let title = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        title = typeof contentBlock.text === 'string' ? contentBlock.text : '';
      }
      return title.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error("Error calling Anthropic for ticket title generation:", error);
      throw new Error("Failed to generate ticket title with Anthropic");
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Build system message with context if available
      let system = "You are an AI assistant that summarizes support conversations.";
      
      if (context) {
        system += `\n\nUse this information to help understand the context of the conversation:\n${context}`;
      }
      
      // Filter out system messages from conversation
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Create the prompt for summarization
      let prompt = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Provide a clear, professional summary:
      `;
      
      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      });

      // Extract text from response
      let summary = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        summary = typeof contentBlock.text === 'string' ? contentBlock.text : '';
      }
      return summary;
    } catch (error) {
      console.error("Error calling Anthropic for conversation summarization:", error);
      throw new Error("Failed to summarize conversation with Anthropic");
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check
      await this.client.messages.create({
        model: this.model,
        system: "You are a helpful assistant.",
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      return true;
    } catch (error) {
      console.error("Anthropic provider is not available:", error);
      return false;
    }
  }
  
  /**
   * Helper function to convert message format for Anthropic
   */
  private formatMessagesForAnthropic(messages: Array<{ role: string; content: string }>): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .filter(message => message.role !== 'system') // Anthropic uses system parameter separately
      .map(message => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content
      })) as Array<{ role: 'user' | 'assistant'; content: string }>;
  }
}