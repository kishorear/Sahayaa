import { ChatMessage } from '../../ai';
import { AIProviderInterface } from './AIProviderInterface';

export class PerplexityProvider implements AIProviderInterface {
  name: string = 'perplexity';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    if (!apiKey) {
      throw new Error('Perplexity API key is required');
    }
  }

  async generateChatResponse(messages: ChatMessage[], context?: string, systemPrompt?: string): Promise<string> {
    try {
      // Prepare the messages array with the system message if provided
      const apiMessages = [];
      
      if (systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add context as a system message if provided
      if (context) {
        apiMessages.push({
          role: 'system',
          content: `Additional context: ${context}`
        });
      }
      
      // Add the conversation messages
      messages.forEach(message => {
        apiMessages.push({
          role: message.role,
          content: message.content
        });
      });

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: apiMessages,
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 2000,
          frequency_penalty: 1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Perplexity API error:', errorData);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error in Perplexity provider:', error);
      throw error;
    }
  }

  async classifyTicket(title: string, description: string, context?: string): Promise<{
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
    assignedTo: string;
    canAutoResolve: boolean;
    aiNotes?: string;
  }> {
    try {
      const prompt = `Please analyze this support ticket and classify it according to the following criteria:
      
      Title: ${title}
      Description: ${description}
      ${context ? `\nContext: ${context}` : ''}
      
      Provide your response in JSON format with the following fields:
      - category: The primary category of the issue (e.g., "billing", "technical", "account", etc.)
      - complexity: How complex this issue is ("simple", "medium", or "complex" only)
      - assignedTo: Who should handle this ticket (a role like "support", "engineering", "billing", etc.)
      - canAutoResolve: true or false, indicating if this can be automatically resolved
      - aiNotes: Optional notes about handling this ticket`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Perplexity API error:', errorData);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;
      
      try {
        const classification = JSON.parse(content);
        return {
          category: classification.category,
          complexity: classification.complexity as 'simple' | 'medium' | 'complex',
          assignedTo: classification.assignedTo,
          canAutoResolve: Boolean(classification.canAutoResolve),
          aiNotes: classification.aiNotes
        };
      } catch (parseError) {
        console.error('Error parsing Perplexity response:', parseError);
        throw new Error('Failed to parse Perplexity response as JSON');
      }
    } catch (error) {
      console.error('Error in Perplexity ticket classification:', error);
      throw error;
    }
  }

  async attemptAutoResolve(title: string, description: string, previousMessages: ChatMessage[] = [], context?: string): Promise<{ resolved: boolean; response: string }> {
    try {
      // First, create a determination if this can be auto-resolved
      const classificationResult = await this.classifyTicket(title, description, context);
      
      if (!classificationResult.canAutoResolve) {
        return {
          resolved: false,
          response: "This issue requires human assistance and cannot be automatically resolved."
        };
      }
      
      // If auto-resolvable, generate a helpful response
      const apiMessages = [
        {
          role: 'system',
          content: `You are an automated support system. Your goal is to resolve the following customer issue completely and accurately.
          ${context ? `\nContext information that may be helpful: ${context}` : ''}`
        }
      ];
      
      // Add previous conversation if available
      previousMessages.forEach(message => {
        apiMessages.push({
          role: message.role,
          content: message.content
        });
      });
      
      // Add the current issue
      apiMessages.push({
        role: 'user',
        content: `Title: ${title}\nDescription: ${description}\n\nPlease provide a complete solution to resolve this issue.`
      });

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: apiMessages,
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 2000,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Perplexity API error:', errorData);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        resolved: true,
        response: result.choices[0].message.content
      };
    } catch (error) {
      console.error('Error in Perplexity auto-resolve:', error);
      return {
        resolved: false,
        response: "An error occurred while attempting to automatically resolve this issue."
      };
    }
  }

  /**
   * Generate a concise and descriptive title for a support ticket
   */
  async generateTicketTitle(messages: ChatMessage[], context?: string): Promise<string> {
    try {
      const apiMessages = [];
      
      // Add system prompt
      apiMessages.push({
        role: 'system',
        content: `You are responsible for creating concise, descriptive titles for customer support tickets. 
        Create a short but informative title (maximum 10 words) that accurately summarizes the main issue.
        ${context ? `\nAdditional context: ${context}` : ''}`
      });
      
      // Add the conversation messages
      messages.forEach(message => {
        apiMessages.push({
          role: message.role,
          content: message.content
        });
      });

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: apiMessages,
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 50,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Perplexity API error:', errorData);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const title = result.choices[0].message.content.trim();
      
      // Limit title length and remove any quotes that might be around it
      return title.replace(/^["'](.*)["']$/, '$1').slice(0, 100);
    } catch (error) {
      console.error('Error generating ticket title with Perplexity:', error);
      // Provide a generic fallback title
      return "Support Request";
    }
  }

  /**
   * Summarize a conversation thread
   */
  async summarizeConversation(messages: ChatMessage[], context?: string): Promise<string> {
    try {
      const apiMessages = [];
      
      // Add system prompt
      apiMessages.push({
        role: 'system',
        content: `You are tasked with summarizing customer support conversations.
        Create a concise yet comprehensive summary that captures the main issue, key discussion points, and resolution (if any).
        ${context ? `\nAdditional context: ${context}` : ''}`
      });
      
      // Add the conversation messages
      messages.forEach(message => {
        apiMessages.push({
          role: message.role,
          content: message.content
        });
      });
      
      // Final instruction to summarize
      apiMessages.push({
        role: 'user',
        content: 'Please provide a summary of this conversation that highlights the key points discussed and any resolution reached.'
      });

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: apiMessages,
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 500,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Perplexity API error:', errorData);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error summarizing conversation with Perplexity:', error);
      return "Unable to generate summary at this time.";
    }
  }

  /**
   * Check if the provider is properly configured and available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple test query to check if the API is responsive
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'Respond with "ok" if you can read this message.'
            },
            {
              role: 'user',
              content: 'System check'
            }
          ],
          max_tokens: 10,
          stream: false
        })
      });

      // Just check if the API responds correctly
      return response.ok;
    } catch (error) {
      console.error('Perplexity provider availability check failed:', error);
      return false;
    }
  }
}