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

      console.log(`Using OpenAI model: ${this.model} for chat response`);
      console.log(`OpenAI API Request (generateChatResponse):`);
      console.log(JSON.stringify({
        model: this.model,
        messages: apiMessages.map(m => ({
          role: m.role,
          content: m.role === 'system' ? `[System prompt: ${m.content.substring(0, 50)}...]` : m.content.substring(0, 50) + '...'
        })),
        temperature: 0.7,
        max_tokens: 500
      }, null, 2));
      
      const response = await this.client.chat.completions.create({
        model: this.model, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      });

      console.log(`OpenAI API Response (generateChatResponse):`);
      console.log(JSON.stringify({
        id: response.id,
        model: response.model,
        choices: [{
          message: {
            role: response.choices[0].message.role,
            content: response.choices[0].message.content?.substring(0, 100) + '...'
          }
        }],
        usage: response.usage
      }, null, 2));
      
      return response.choices[0].message.content || "I couldn't generate a response at this time.";
    } catch (error) {
      console.error("Error calling OpenAI for chat response:", error);
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

      console.log(`Using OpenAI model: ${this.model} for ticket classification`);
      console.log(`OpenAI API Request (classifyTicket):`);
      console.log(JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt.substring(0, 100) + '...' }],
        response_format: { type: "json_object" }
      }, null, 2));
      
      const response = await this.client.chat.completions.create({
        model: this.model, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      console.log(`OpenAI API Response (classifyTicket):`);
      console.log(JSON.stringify({
        id: response.id,
        model: response.model,
        choices: [{
          message: {
            role: response.choices[0].message.role,
            content: response.choices[0].message.content?.substring(0, 100) + '...'
          }
        }],
        usage: response.usage
      }, null, 2));

      // Parse the JSON response
      const content = response.choices[0].message.content || "{}";
      
      try {
        // Sometimes OpenAI might include backticks in response, try to extract JSON
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
          console.warn("OpenAI returned incomplete classification, added missing fields");
        }
        
        return validatedResult;
      } catch (jsonError) {
        console.error("Failed to parse JSON response from OpenAI:", jsonError);
        console.log("Raw response content:", content);
        // Return a default classification with a note about the parsing error
        return {
          category: "other",
          complexity: "medium",
          assignedTo: "support",
          canAutoResolve: false,
          aiNotes: "This ticket requires support team attention due to classification error"
        };
      }
    } catch (error) {
      console.error("Error calling OpenAI for ticket classification:", error);
      // Return a default classification instead of throwing an error
      // This ensures the API doesn't fail even if AI classification fails
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
      // Return a fallback response instead of throwing an error
      return { 
        resolved: false, 
        response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly." 
      };
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
      
      const prompt = [
        {
          role: "system" as const,
          content: "You are a support ticket assistant. Based on the conversation, generate a concise, specific title (maximum 60 characters) that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned. The title should help support agents quickly understand the issue."
        },
        ...messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-5).map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }))
      ];
      
      // Add context if provided
      if (context) {
        prompt.unshift({
          role: "system" as const,
          content: `Additional context: ${context}`
        });
      }
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: prompt,
        temperature: 0.3,
        max_tokens: 60
      });
      
      let title = response.choices[0].message.content?.trim() || "Support Request";
      
      // Ensure title is not too long
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      return title;
    } catch (error) {
      console.error("Error generating ticket title with OpenAI:", error);
      
      // Fallback to using first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const firstSentence = firstUserMessage.content.split(/[.!?]/)[0];
        return firstSentence.length > 60 
          ? firstSentence.substring(0, 57) + '...' 
          : firstSentence;
      }
      
      return "Support Request";
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
        max_tokens: 1000 // Increased to allow for more detailed summaries
      });

      return response.choices[0].message.content || "Summary unavailable";
    } catch (error) {
      console.error("Error calling OpenAI for conversation summarization:", error);
      // Create a basic summary instead of throwing an error
      const userMessages = messages.filter(m => m.role === 'user');
      return `This conversation includes ${userMessages.length} messages from the user and requires support team review.`;
    }
  }
  
  async isAvailable(): Promise<boolean> {
    // If no API key was provided, don't even attempt the API call
    if (!this.client.apiKey || typeof this.client.apiKey !== 'string' || this.client.apiKey.trim() === '') {
      console.warn("OpenAI provider cannot be available: No API key provided");
      return false;
    }
    
    try {
      // Set strict timeout to prevent long-running operations
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI availability check timed out after 5000ms")), 5000);
      });
      
      // Simple availability check using models.list which is lightweight
      const apiPromise = this.client.models.list();
      
      // Race the API call against the timeout
      await Promise.race([apiPromise, timeoutPromise]);
      
      console.log("OpenAI provider is available");
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`OpenAI provider is not available: ${error.message}`);
      } else {
        console.error("OpenAI provider is not available: Unknown error");
      }
      return false;
    }
  }
}