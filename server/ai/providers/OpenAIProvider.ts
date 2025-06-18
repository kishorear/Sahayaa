import OpenAI from "openai";
import { AIProviderInterface, AIProviderConfig } from "./AIProviderInterface";
import agentService from "../agent-service.js";

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
      // Try agent service first for chat responses
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      
      if (lastUserMessage) {
        console.log(`Using agent service for chat response: ${lastUserMessage.content.substring(0, 30)}...`);
        
        try {
          const result = await agentService.generateChatResponse({
            ticketContext: {
              id: 0, // Default for chat context
              title: "Chat Session",
              description: lastUserMessage.content,
              category: "general"
            },
            messageHistory: messages,
            userMessage: lastUserMessage.content,
            knowledgeContext: context
          });

          console.log(`Agent service chat response generated successfully`);
          return result;

        } catch (agentError) {
          console.warn("Agent service unavailable for chat, falling back to direct OpenAI:", agentError);
        }
      }
      
      // Fallback to direct OpenAI call
      let systemContent = systemPrompt || 
        `You are an AI support assistant for a SaaS product. Format your responses for maximum readability:

- Use bullet points for lists of steps or actions  
- Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
- Break complex information into clear paragraphs
- Highlight important information
- Use action-oriented language for troubleshooting

Provide helpful, well-structured responses that are easy to follow.`;
      
      if (context) {
        systemContent += `\n\n${context}`;
      }
      
      const apiMessages = [
        { role: "system" as const, content: systemContent },
        ...messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];

      console.log(`Fallback: Using OpenAI model: ${this.model} for chat response`);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      });
      
      return response.choices[0].message.content || "I couldn't generate a response at this time.";
      
    } catch (error) {
      console.error("Both agent service and OpenAI chat response failed:", error);
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
      // Try agent service first
      console.log(`Using agent service for ticket classification: ${title.substring(0, 30)}...`);
      
      const result = await agentService.classifyTicket({
        title,
        description,
        context
      });

      console.log(`Agent service classification result - Category: ${result.category}, Complexity: ${result.complexity}`);
      return result;

    } catch (agentError) {
      console.warn("Agent service unavailable, falling back to direct OpenAI:", agentError);
      
      // Fallback to direct OpenAI call
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

        console.log(`Fallback: Using OpenAI model: ${this.model} for ticket classification`);
        
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content || "{}";
        const jsonRegex = /\{[\s\S]*\}/;
        const match = content.match(jsonRegex);
        const jsonContent = match ? match[0] : content;
        
        let result: any;
        try {
          result = JSON.parse(jsonContent);
        } catch (parseError) {
          const cleanedContent = jsonContent
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            .replace(/\\(?!["\\/bfnrt])/g, "\\\\");
          result = JSON.parse(cleanedContent);
        }
        
        return {
          category: result.category || "other",
          complexity: (result.complexity === 'simple' || result.complexity === 'medium' || result.complexity === 'complex') 
            ? result.complexity : "medium",
          assignedTo: result.assignedTo || "support",
          canAutoResolve: !!result.canAutoResolve,
          aiNotes: result.aiNotes || "This ticket has been automatically classified"
        };
        
      } catch (openaiError) {
        console.error("Both agent service and OpenAI classification failed:", openaiError);
        return {
          category: "other", 
          complexity: "medium",
          assignedTo: "support",
          canAutoResolve: false,
          aiNotes: "This ticket requires support team attention"
        };
      }
    }
  }
  
  async attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}> {
    try {
      // Try agent service first
      console.log(`Using agent service for auto-resolve: ${title.substring(0, 30)}...`);
      
      const result = await agentService.attemptAutoResolve({
        title,
        description,
        previousMessages,
        context
      });

      console.log(`Agent service auto-resolve result - Resolved: ${result.resolved}`);
      return result;

    } catch (agentError) {
      console.warn("Agent service unavailable, falling back to direct OpenAI:", agentError);
      
      // Fallback to direct OpenAI call
      try {
        let systemContent = `You are an AI support assistant for a SaaS product. 
            Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
            If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
            If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
            `;
        
        if (context) {
          systemContent += `\n\n${context}`;
        }
        
        const messages = [
          { role: "system" as const, content: systemContent },
          ...(previousMessages || []).map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content
          })),
          { role: "user" as const, content: `Title: ${title}\nDescription: ${description}` }
        ];

        console.log(`Fallback: Using OpenAI model: ${this.model} for auto-resolve`);

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 800
        });

        const responseText = response.choices[0].message.content || "";
        const resolved = responseText.includes("[ISSUE RESOLVED]");
        const cleanResponse = responseText
          .replace("[ISSUE RESOLVED]", "")
          .replace("[REQUIRES HUMAN]", "")
          .trim();
        
        return { resolved, response: cleanResponse };
        
      } catch (openaiError) {
        console.error("Both agent service and OpenAI auto-resolve failed:", openaiError);
        return { 
          resolved: false, 
          response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly." 
        };
      }
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