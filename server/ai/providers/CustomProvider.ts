import axios from 'axios';
import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';

/**
 * CustomProvider allows customers to use their own AI service implementation
 * through a standardized REST API
 */
export class CustomProvider implements AIProviderInterface {
  name = 'custom';
  private baseUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;
  
  constructor(config: AIProviderConfig) {
    // Get base URL from config
    this.baseUrl = config.baseUrl || '';
    if (!this.baseUrl) {
      throw new Error('Custom AI provider requires a baseUrl');
    }
    
    // Remove trailing slash if present
    this.baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    
    // Set up authorization headers
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    // Add any custom headers from config
    if (config.settings?.headers) {
      this.headers = { ...this.headers, ...(config.settings.headers as Record<string, string>) };
    }
    
    console.log(`Custom AI provider initialized with endpoint: ${this.baseUrl}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat`, 
        {
          messages,
          context,
          systemPrompt
        },
        { headers: this.headers }
      );
      
      // Validate that the response has the expected format
      if (!response.data || typeof response.data.response !== 'string') {
        throw new Error('Invalid response format from custom AI provider');
      }
      
      return response.data.response;
    } catch (error) {
      console.error("Error calling custom AI provider for chat response:", error);
      throw new Error(`Failed to generate chat response with custom AI provider: ${error.message}`);
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
      const response = await axios.post(
        `${this.baseUrl}/classify`, 
        {
          title,
          description,
          context
        },
        { headers: this.headers }
      );
      
      // Validate the response
      const result = response.data;
      if (!result || 
          !result.category ||
          !result.complexity ||
          !result.assignedTo ||
          typeof result.canAutoResolve !== 'boolean') {
        throw new Error('Invalid classification response from custom AI provider');
      }
      
      return result;
    } catch (error) {
      console.error("Error calling custom AI provider for ticket classification:", error);
      throw new Error(`Failed to classify ticket with custom AI provider: ${error.message}`);
    }
  }
  
  async attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/resolve`, 
        {
          title,
          description,
          previousMessages,
          context
        },
        { headers: this.headers }
      );
      
      // Validate the response
      const result = response.data;
      if (!result || 
          typeof result.resolved !== 'boolean' ||
          typeof result.response !== 'string') {
        throw new Error('Invalid auto-resolve response from custom AI provider');
      }
      
      return result;
    } catch (error) {
      console.error("Error calling custom AI provider for ticket resolution:", error);
      throw new Error(`Failed to auto-resolve ticket with custom AI provider: ${error.message}`);
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/summarize`, 
        {
          messages,
          context
        },
        { headers: this.headers }
      );
      
      // Validate the response
      if (!response.data || typeof response.data.summary !== 'string') {
        throw new Error('Invalid summarization response from custom AI provider');
      }
      
      return response.data.summary;
    } catch (error) {
      console.error("Error calling custom AI provider for conversation summarization:", error);
      throw new Error(`Failed to summarize conversation with custom AI provider: ${error.message}`);
    }
  }
  
  async generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/generate-title`, 
        {
          messages,
          context
        },
        { headers: this.headers }
      );
      
      // Validate the response
      if (!response.data || typeof response.data.title !== 'string') {
        throw new Error('Invalid title generation response from custom AI provider');
      }
      
      // Get the title and make sure it's not too long
      let title = response.data.title.trim();
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      return title;
    } catch (error) {
      console.error("Error calling custom AI provider for title generation:", error);
      // Return a default title in case of error
      return "Support Request";
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Check if the service is available by pinging the health endpoint
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { headers: this.headers, timeout: 5000 }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error("Custom AI provider is not available:", error);
      return false;
    }
  }
}