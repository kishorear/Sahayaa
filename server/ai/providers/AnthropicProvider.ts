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

      // Handle content response safely
      if (response.content[0]) {
        // Using type assertion to safely handle the response
        const contentBlock = response.content[0] as any;
        if (contentBlock.type === 'text' && contentBlock.text) {
          return contentBlock.text;
        }
      }
      return "Response content unavailable";
    } catch (error) {
      console.error("Error calling Anthropic for chat response:", error);
      // Return a fallback response instead of throwing an error
      return "I apologize, but I'm experiencing difficulties processing your request right now. A support representative will assist you shortly.";
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

      // Extract and parse the JSON response (handling content type safely)
      let content = "";
      if (response.content[0]) {
        // Using type assertion to safely handle the response
        const contentBlock = response.content[0] as any;
        if (contentBlock.type === 'text' && contentBlock.text) {
          content = contentBlock.text;
        }
      }
      
      try {
        // Find JSON content between curly braces
        const jsonRegex = /\{[\s\S]*\}/;
        const match = content.match(jsonRegex);
        
        // If we found a JSON-like pattern, use that; otherwise use the whole content
        const jsonContent = match ? match[0] : content;
        let result: any;
        
        try {
          result = JSON.parse(jsonContent);
        } catch (initialParseError) {
          // Try one more cleaning approach - sometimes there are unexpected characters
          const cleanedContent = jsonContent
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
            .replace(/\\(?!["\\/bfnrt])/g, "\\\\"); // Escape backslashes that aren't part of escape sequences
          
          console.warn("Initial JSON parse failed, trying with cleaned content");
          result = JSON.parse(cleanedContent);
        }
        
        // Validate the result structure and ensure all required fields exist
        if (!result || typeof result !== 'object') {
          throw new Error("Parsed result is not an object");
        }
        
        // Create a validated result with defaults for any missing fields
        const validatedResult = {
          category: result.category || "other",
          complexity: (result.complexity === 'simple' || result.complexity === 'medium' || result.complexity === 'complex') 
            ? result.complexity 
            : "medium",
          assignedTo: result.assignedTo || "support",
          canAutoResolve: !!result.canAutoResolve,
          aiNotes: result.aiNotes || "This ticket has been automatically classified"
        };
        
        if (!result.category || !result.complexity || !result.assignedTo) {
          console.warn("Anthropic returned incomplete classification, added missing fields");
        }
        
        return validatedResult;
      } catch (jsonError) {
        console.error("Failed to parse JSON response from Anthropic:", jsonError);
        console.log("Raw response content:", content);
        throw jsonError; // Re-throw to trigger the fallback in the outer catch block
      }
    } catch (error) {
      console.error("Error calling Anthropic for ticket classification:", error);
      // Return a default classification instead of throwing an error
      return {
        category: "other",
        complexity: "medium",
        assignedTo: "support",
        canAutoResolve: false,
        aiNotes: "This ticket requires support team attention"
      };
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

      // Handle content type safely
      let responseText = "";
      if (response.content[0]) {
        // Using type assertion to safely handle the response
        const contentBlock = response.content[0] as any;
        if (contentBlock.type === 'text' && contentBlock.text) {
          responseText = contentBlock.text;
        }
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
      // Return a fallback response instead of throwing an error
      return { 
        resolved: false, 
        response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly." 
      };
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
      Please provide a detailed and comprehensive summary of this support conversation.
      
      Include:
      - The main issue or request from the user
      - Key information exchanged during the conversation
      - Any solutions attempted or provided
      - Technical details mentioned
      - Current status (resolved or needs further action)
      - Next steps or follow-up items
      
      Your summary should be thorough while still being well-structured.
      Use proper paragraphs and organize information logically.
      Don't omit important details and don't impose any word count restrictions.
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Detailed summary:
      `;
      
      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000 // Increased to allow for more detailed summaries
      });

      // Handle content type safely
      if (response.content[0]) {
        // Using type assertion to safely handle the response
        const contentBlock = response.content[0] as any;
        if (contentBlock.type === 'text' && contentBlock.text) {
          return contentBlock.text;
        }
      }
      return "Response content unavailable";
    } catch (error) {
      console.error("Error calling Anthropic for conversation summarization:", error);
      // Create a basic summary instead of throwing an error
      const userMessages = messages.filter(m => m.role === 'user');
      return `This conversation includes ${userMessages.length} messages from the user and requires support team review.`;
    }
  }
  
  async generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Filter out system messages for title generation
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length === 0) {
        return "Support Request";
      }
      
      // Build system message
      let system = "You are an AI assistant that generates concise ticket titles for support requests.";
      
      if (context) {
        system += `\n\nUse this information to help understand the context of the conversation:\n${context}`;
      }
      
      // Create prompt for title generation
      let prompt = `
      You are an AI assistant tasked with creating a descriptive title for a support ticket.
      Analyze the conversation and create a specific title that clearly identifies the issue.
      
      Guidelines for creating the title:
      1. Focus on the core problem (error codes, specific failure points)
      2. Be specific rather than generic (e.g., "Login 500 Error" instead of "Login Problem")
      3. Include error codes if present (e.g., "404", "500", "INVALID_TOKEN")
      4. Create a title of appropriate length that captures the key aspects of the issue
      5. Do not use placeholders or generic titles like "Support Request" or "Help Needed"
      
      ${messages.slice(-5).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Generate a clear, specific title:
      `;
      
      const response = await this.client.messages.create({
        model: this.model,
        system: system,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
      });
      
      // Get the title and make sure it's not too long
      let title = "Support Request";
      if (response.content[0]) {
        // Using type assertion to safely handle the response
        const contentBlock = response.content[0] as any;
        if (contentBlock.type === 'text' && contentBlock.text) {
          title = contentBlock.text.trim();
          if (title.length > 60) {
            title = title.substring(0, 57) + '...';
          }
        }
      }
      
      return title;
    } catch (error) {
      console.error("Error calling Anthropic for ticket title generation:", error);
      return "Support Request"; // Fallback title
    }
  }
  
  async isAvailable(): Promise<boolean> {
    // If no API key was provided, don't even attempt the API call
    if (!this.client.apiKey || this.client.apiKey.trim() === '') {
      console.warn("Anthropic provider cannot be available: No API key provided");
      return false;
    }
    
    try {
      // Set strict timeout to prevent long-running operations
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Anthropic availability check timed out after 5000ms")), 5000);
      });
      
      // Simple availability check with a small message
      const apiPromise = this.client.messages.create({
        model: this.model,
        system: "You are a helpful assistant.",
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5 // Minimal tokens for faster response
      });
      
      // Race the API call against the timeout
      await Promise.race([apiPromise, timeoutPromise]);
      
      console.log("Anthropic provider is available");
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Anthropic provider is not available: ${error.message}`);
      } else {
        console.error("Anthropic provider is not available: Unknown error");
      }
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