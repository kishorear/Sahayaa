import OpenAI from "openai";
import { AIProviderInterface, AIProviderConfig } from "./AIProviderInterface";

export class OpenAIProvider implements AIProviderInterface {
  name = 'openai';
  private client: OpenAI;
  private model: string;
  
  constructor(config: AIProviderConfig) {
    // Create OpenAI client with the provided API key
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
    
    // Use the specified model or default to gpt-4o
    this.model = config.model || "gpt-4o";
    
    console.log(`OpenAI provider initialized with model: ${this.model}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Build the system message with context if provided
      let systemContent = systemPrompt || 
        `You are an AI support assistant for a SaaS product. Provide helpful, concise responses.`;
      
      // Add knowledge context if available
      if (context) {
        systemContent += `\n\n${context}`;
      }
      
      // Prepare the messages array with context and history
      const apiMessages = [
        { role: "system" as const, content: systemContent },
        ...messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content || "I couldn't generate a response at this time.";
    } catch (error) {
      console.error("Error calling OpenAI for chat response:", error);
      throw new Error("Failed to generate chat response with OpenAI");
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
      3. Department to assign to (one of: support, engineering, product, billing)
      4. Whether the ticket can be automatically resolved (true or false)
      5. Notes for additional context (optional)
      
      Ticket Title: ${title}
      Ticket Description: ${description}
      `;
      
      // Add knowledge context if available to help with classification accuracy
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

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      // Parse the JSON response
      const content = response.choices[0].message.content || "{}";
      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error("Error calling OpenAI for ticket classification:", error);
      throw new Error("Failed to classify ticket with OpenAI");
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
      let systemContent = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
          `;
      
      // Add knowledge context if available
      if (context) {
        systemContent += `\n\n${context}`;
      }
      
      // Convert previous messages to OpenAI format
      const messages = [
        {
          role: "system" as const,
          content: systemContent
        },
        ...(previousMessages || []).map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        })),
        {
          role: "user" as const,
          content: `Title: ${title}\nDescription: ${description}`
        }
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 800
      });

      const responseText = response.choices[0].message.content || "";
      
      // Check if the response indicates resolution
      const resolved = responseText.includes("[ISSUE RESOLVED]");
      
      // Clean up the response by removing the resolution indicators
      const cleanResponse = responseText
        .replace("[ISSUE RESOLVED]", "")
        .replace("[REQUIRES HUMAN]", "")
        .trim();
      
      return { resolved, response: cleanResponse };
    } catch (error) {
      console.error("Error calling OpenAI for ticket resolution:", error);
      throw new Error("Failed to auto-resolve ticket with OpenAI");
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Extract any system message
      let systemMessage = messages.find(m => m.role === 'system');
      let conversationMessages = systemMessage 
        ? messages.filter(m => m.role !== 'system')
        : messages;
      
      // Create the prompt for summarization
      let promptContent = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Provide a clear, professional summary:
      `;
      
      // Prepare messages array for the API call
      const apiMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [];
      
      // Add the knowledge context as system message if available
      if (context) {
        apiMessages.push({
          role: 'system',
          content: `Use the following information to help you understand the context of the conversation: ${context}`
        });
      } else if (systemMessage) {
        apiMessages.push({
          role: 'system',
          content: `Use the following information to help you understand the context of the conversation: ${systemMessage.content}`
        });
      }
      
      // Add the main prompt as a user message
      apiMessages.push({ role: "user", content: promptContent });
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 250
      });

      return response.choices[0].message.content || "Summary unavailable";
    } catch (error) {
      console.error("Error calling OpenAI for conversation summarization:", error);
      throw new Error("Failed to summarize conversation with OpenAI");
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error("OpenAI provider is not available:", error);
      return false;
    }
  }
}