import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';

export class GeminiProvider implements AIProviderInterface {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;
  
  constructor(config: AIProviderConfig) {
    // Create Google Generative AI client with the provided API key
    this.client = new GoogleGenerativeAI(config.apiKey || process.env.GEMINI_API_KEY || '');
    
    // Use the specified model or default to gemini-pro
    this.model = config.model || "gemini-pro";
    
    console.log(`Gemini provider initialized with model: ${this.model}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
      
      // Create a chat session
      const chat = generativeModel.startChat({
        history: this.formatMessagesForGemini(messages),
        systemInstruction: this.buildSystemPrompt(systemPrompt, context),
      });
      
      // Get the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const messageContent = lastUserMessage?.content || "Hello";
      
      // Send the message and get the response
      const result = await chat.sendMessage(messageContent);
      const response = result.response;
      
      return response.text();
    } catch (error) {
      console.error("Error calling Gemini for chat response:", error);
      throw new Error("Failed to generate chat response with Gemini");
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
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      
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
      
      // Add knowledge context if available
      if (context) {
        prompt += `\nRelevant Knowledge Base Information:\n${context}`;
      }
      
      prompt += `
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();
      
      // Parse the JSON response - handle potential non-JSON format
      try {
        // Find JSON content between curly braces
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse ticket classification from Gemini response");
      }
    } catch (error) {
      console.error("Error calling Gemini for ticket classification:", error);
      throw new Error("Failed to classify ticket with Gemini");
    }
  }
  
  async attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}> {
    try {
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      
      // Build system instruction
      let systemPrompt = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.`;
      
      // Add knowledge context if available
      if (context) {
        systemPrompt += `\n\nUse this information to help with resolution:\n${context}`;
      }
      
      // Create a chat session
      const chat = generativeModel.startChat({
        history: previousMessages ? this.formatMessagesForGemini(previousMessages) : [],
        systemInstruction: systemPrompt,
      });
      
      // Send the message with title and description
      const result = await chat.sendMessage(`Title: ${title}\nDescription: ${description}`);
      const responseText = result.response.text();
      
      // Check if the response indicates resolution
      const resolved = responseText.includes("[ISSUE RESOLVED]");
      
      // Clean up the response by removing the resolution indicators
      const cleanResponse = responseText
        .replace("[ISSUE RESOLVED]", "")
        .replace("[REQUIRES HUMAN]", "")
        .trim();
      
      return { resolved, response: cleanResponse };
    } catch (error) {
      console.error("Error calling Gemini for ticket resolution:", error);
      throw new Error("Failed to auto-resolve ticket with Gemini");
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      
      // Filter out system messages from conversation
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Create the prompt for summarization
      let promptContent = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Provide a clear, professional summary:
      `;
      
      // Add context information if available
      if (context) {
        promptContent = `Use the following information to help you understand the context of the conversation:\n${context}\n\n${promptContent}`;
      }
      
      const result = await generativeModel.generateContent(promptContent);
      const response = result.response;
      
      return response.text();
    } catch (error) {
      console.error("Error calling Gemini for conversation summarization:", error);
      throw new Error("Failed to summarize conversation with Gemini");
    }
  }
  
  async generateTicketTitle(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      
      // Filter out system messages for title generation
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length === 0) {
        return "Support Request";
      }
      
      // Build prompt for title generation
      let promptContent = `
      Based on the following conversation, generate a concise, specific title (maximum 60 characters) 
      that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned.
      The title should help support agents quickly understand the issue.
      
      ${messages.slice(-5).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Generate a clear, specific title:
      `;
      
      // Add context information if available
      if (context) {
        promptContent = `Use the following information for additional context:\n${context}\n\n${promptContent}`;
      }
      
      const result = await generativeModel.generateContent(promptContent);
      const response = result.response;
      
      // Get the title and make sure it's not too long
      let title = response.text().trim();
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      return title;
    } catch (error) {
      console.error("Error calling Gemini for ticket title generation:", error);
      return "Support Request"; // Fallback title
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check - try to generate a simple response
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      await generativeModel.generateContent("Hello");
      return true;
    } catch (error) {
      console.error("Gemini provider is not available:", error);
      return false;
    }
  }
  
  /**
   * Helper function to build system prompt with context
   */
  private buildSystemPrompt(systemPrompt?: string, context?: string): string {
    let fullPrompt = systemPrompt || 
      `You are an AI support assistant. Provide helpful, concise responses.
      
IMPORTANT RULES:
- Never mention generic terms like "our SaaS product", "our platform", "our service", or "our company"
- Be specific about the actual service or feature being discussed
- If you don't know the specific product name, simply refer to "this service" or "the system"
- Focus on solving the user's specific issue rather than making generic product references`;
    
    if (context) {
      fullPrompt += `\n\nUse the following information to help with your responses:\n${context}`;
    }
    
    return fullPrompt;
  }
  
  /**
   * Helper function to convert message format for Gemini
   */
  private formatMessagesForGemini(messages: Array<{ role: string; content: string }>): Array<{ role: string, parts: Array<{ text: string }> }> {
    return messages
      .filter(message => message.role !== 'system') // Gemini uses systemInstruction instead
      .map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      }));
  }
}