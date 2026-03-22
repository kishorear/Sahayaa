import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';
import fetch from 'node-fetch';

export class OllamaProvider implements AIProviderInterface {
  name = 'ollama';
  private baseUrl: string;
  private model: string;
  
  constructor(config: AIProviderConfig) {
    // Ollama requires a base URL but not an API key
    if (!config.baseUrl) {
      throw new Error('Ollama base URL is required (e.g., http://localhost:11434)');
    }
    
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = config.model || 'llama3.1';
    
    console.log(`Ollama provider initialized with endpoint: ${this.baseUrl}, model: ${this.model}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Build system message if provided
      const formattedMessages = [];
      
      if (systemPrompt || context) {
        let systemContent = systemPrompt || 
          `You are a support assistant helping quality analysts and software testers who have discovered issues. Your primary goal is to gather information for ticket creation and provide quick, non-technical recommendations.

Format your responses for maximum readability:
- Use bullet points for lists of steps or actions
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information

Key Guidelines:
- Users are QA analysts/testers who found issues
- Provide quick workarounds or information gathering steps only
- Keep recommendations simple and non-technical
- Don't provide code solutions or technical implementations
- Focus on ticket creation rather than complex troubleshooting
- Offer to create support tickets early in conversations

Provide helpful, non-technical guidance that leads to ticket creation.`;
        
        if (context) {
          systemContent += `\n\nUse the following information to help with your responses:\n${context}`;
        }
        
        formattedMessages.push({
          role: 'system',
          content: systemContent
        });
      }
      
      // Add conversation messages
      formattedMessages.push(...messages);
      
      // Call Ollama API
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: formattedMessages,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      return data.message?.content || 'No response generated';
    } catch (error) {
      console.error("Error calling Ollama for chat response:", error);
      return "I apologize, but I'm experiencing difficulties connecting to the AI service. Please ensure Ollama is running and accessible.";
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
      let prompt = `
      You are an AI support ticket classifier. Based on the following ticket information, 
      classify the ticket according to these criteria:
      
      1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. Complexity (one of: simple, medium, complex)
         - Use "complex" for: equipment/machines not working, broken systems, critical failures, complete service outages
         - Use "medium" for: partial issues, intermittent problems, performance degradation
         - Use "simple" for: questions, minor issues, documentation requests
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      IMPORTANT: If the ticket mentions machines, equipment, or systems "not working", "broken", "down", "offline", or "failed", classify as "complex".
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      `;
      
      if (context) {
        prompt += `\nRelevant Knowledge Base Information:\n${context}`;
      }
      
      prompt += `
      Respond with JSON only in this format:
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      const responseText = data.response || '{}';
      
      // Parse JSON response
      const parsed = JSON.parse(responseText);
      
      return {
        category: parsed.category || 'general',
        complexity: parsed.complexity || 'medium',
        assignedTo: parsed.assignedTo || 'support',
        canAutoResolve: parsed.canAutoResolve || false,
        aiNotes: parsed.aiNotes
      };
    } catch (error) {
      console.error("Error classifying ticket with Ollama:", error);
      // Return default classification
      return {
        category: 'general',
        complexity: 'medium',
        assignedTo: 'support',
        canAutoResolve: false,
        aiNotes: 'Classification failed, using defaults'
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
      let prompt = `Analyze this support ticket and attempt to provide a resolution.
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      `;
      
      if (context) {
        prompt += `\nRelevant Knowledge Base Information:\n${context}`;
      }
      
      if (previousMessages && previousMessages.length > 0) {
        prompt += `\nPrevious conversation:\n`;
        previousMessages.forEach(msg => {
          prompt += `${msg.role}: ${msg.content}\n`;
        });
      }
      
      prompt += `
      Provide a helpful resolution. If you can fully resolve this issue with the information provided, indicate that.
      Otherwise, provide guidance and indicate that human assistance may be needed.
      
      Respond with JSON only:
      {
        "resolved": boolean,
        "response": "detailed response text"
      }
      `;
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      const responseText = data.response || '{}';
      const parsed = JSON.parse(responseText);
      
      return {
        resolved: parsed.resolved || false,
        response: parsed.response || 'Unable to auto-resolve. Please contact support.'
      };
    } catch (error) {
      console.error("Error auto-resolving with Ollama:", error);
      return {
        resolved: false,
        response: 'Unable to auto-resolve this ticket. A support representative will assist you.'
      };
    }
  }
  
  async generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      let prompt = `Based on this conversation, generate a concise and descriptive ticket title (max 10 words):
      
      ${conversationText}
      `;
      
      if (context) {
        prompt += `\nContext: ${context}`;
      }
      
      prompt += `\n\nRespond with only the title text, nothing else.`;
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      const title = (data.response || 'Support Request').trim();
      
      // Clean up the title - remove quotes if present
      return title.replace(/^["']|["']$/g, '').substring(0, 100);
    } catch (error) {
      console.error("Error generating ticket title with Ollama:", error);
      return 'Support Request';
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      let prompt = `Summarize this support conversation in 2-3 sentences:
      
      ${conversationText}
      `;
      
      if (context) {
        prompt += `\nContext: ${context}`;
      }
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      return data.response || 'No summary available';
    } catch (error) {
      console.error("Error summarizing conversation with Ollama:", error);
      return 'Summary unavailable';
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Test connection with a simple request
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        console.error(`Ollama is not available: ${response.statusText}`);
        return false;
      }
      
      // Check if the specified model is available
      const data = await response.json() as any;
      const models = data.models || [];
      const modelExists = models.some((m: any) => m.name === this.model || m.name.startsWith(this.model));
      
      if (!modelExists) {
        console.warn(`Ollama model "${this.model}" not found. Available models:`, models.map((m: any) => m.name));
      }
      
      console.log("Ollama provider is available");
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Ollama provider is not available: ${error.message}`);
      } else {
        console.error("Ollama provider is not available: Unknown error");
      }
      return false;
    }
  }
}
