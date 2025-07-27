import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { AIProviderInterface, AIProviderConfig } from './AIProviderInterface';

export class BedrockProvider implements AIProviderInterface {
  name = 'aws-bedrock';
  private client: BedrockRuntimeClient;
  private model: string;
  private region: string;
  
  constructor(config: AIProviderConfig) {
    this.region = (config.settings?.region as string) || 'us-east-1';
    
    // Initialize AWS Bedrock client - require credentials in settings
    const accessKeyId = config.settings?.accessKeyId as string;
    const secretAccessKey = config.settings?.secretAccessKey as string;
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required in provider settings');
    }
    
    this.client = new BedrockRuntimeClient({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    
    // Use the specified model or default to anthropic.claude-3-sonnet-20240229
    this.model = config.model || "anthropic.claude-3-sonnet-20240229";
    
    console.log(`AWS Bedrock provider initialized with model: ${this.model} in region ${this.region}`);
  }
  
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Format messages based on the model type
      const formattedBody = this.formatRequestBody(
        this.model,
        messages,
        context,
        systemPrompt
      );
      
      // Create the model command
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      // Call the model
      const response = await this.client.send(command);
      
      // Parse the response based on model type
      const responseText = await this.parseResponseBody(response);
      
      return responseText;
    } catch (error) {
      console.error("Error calling AWS Bedrock for chat response:", error);
      throw new Error("Failed to generate chat response with AWS Bedrock");
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
      Respond with JSON only in this format (no other text):
      {
        "category": "category_name",
        "complexity": "complexity_level",
        "assignedTo": "department_name",
        "canAutoResolve": boolean,
        "aiNotes": "additional context" 
      }
      `;
      
      // Format the prompt based on model type
      const systemPrompt = "You are an AI support ticket classifier.";
      const formattedBody = this.formatRequestBody(
        this.model, 
        [{ role: 'user', content: prompt }],
        context,
        systemPrompt
      );
      
      // Create the model command
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      // Call the model
      const response = await this.client.send(command);
      
      // Parse the response
      const responseText = await this.parseResponseBody(response);
      
      // Extract JSON from the response (models might include additional text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error calling AWS Bedrock for ticket classification:", error);
      throw new Error("Failed to classify ticket with AWS Bedrock");
    }
  }
  
  async attemptAutoResolve(
    title: string,
    description: string,
    previousMessages?: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<{resolved: boolean; response: string}> {
    try {
      // Build system content
      let systemPrompt = `You are an AI support assistant for a SaaS product. 
          Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
          If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
          If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.`;
      
      // Create messages array with previous messages and current request
      const messages = [
        ...(previousMessages || []),
        { 
          role: 'user', 
          content: `Title: ${title}\nDescription: ${description}` 
        }
      ];
      
      // Format the request body
      const formattedBody = this.formatRequestBody(
        this.model,
        messages,
        context,
        systemPrompt
      );
      
      // Create the model command
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      // Call the model
      const response = await this.client.send(command);
      
      // Parse the response
      const responseText = await this.parseResponseBody(response);
      
      // Check if the response indicates resolution
      const resolved = responseText.includes("[ISSUE RESOLVED]");
      
      // Clean up the response by removing the resolution indicators
      const cleanResponse = responseText
        .replace("[ISSUE RESOLVED]", "")
        .replace("[REQUIRES HUMAN]", "")
        .trim();
      
      return { resolved, response: cleanResponse };
    } catch (error) {
      console.error("Error calling AWS Bedrock for ticket resolution:", error);
      throw new Error("Failed to auto-resolve ticket with AWS Bedrock");
    }
  }
  
  async summarizeConversation(
    messages: Array<{ role: string; content: string }>,
    context?: string
  ): Promise<string> {
    try {
      // Filter out system messages from conversation
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Create the prompt for summarization
      let prompt = `
      Please summarize the following support conversation in a concise paragraph. 
      Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
      
      ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Provide a clear, professional summary:
      `;
      
      // Build system message
      let systemPrompt = "You are an AI assistant that summarizes support conversations.";
      
      if (context) {
        systemPrompt += `\n\nUse this information to help understand the context of the conversation:\n${context}`;
      }
      
      // Format the request body
      const formattedBody = this.formatRequestBody(
        this.model,
        [{ role: 'user', content: prompt }],
        context,
        systemPrompt
      );
      
      // Create the model command
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      // Call the model
      const response = await this.client.send(command);
      
      // Parse the response
      const responseText = await this.parseResponseBody(response);
      
      return responseText;
    } catch (error) {
      console.error("Error calling AWS Bedrock for conversation summarization:", error);
      throw new Error("Failed to summarize conversation with AWS Bedrock");
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
      
      // Create the prompt for title generation
      let prompt = `
      Based on the following conversation, generate a concise, specific title (maximum 60 characters) 
      that accurately describes the technical issue. Focus on the actual problem, and include error codes if mentioned.
      The title should help support agents quickly understand the issue.
      
      ${messages.slice(-5).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
      
      Generate a clear, specific title:
      `;
      
      // Build system message
      let systemPrompt = "You are an AI assistant that generates concise ticket titles for support requests.";
      
      if (context) {
        systemPrompt += `\n\nUse this information to help understand the context of the conversation:\n${context}`;
      }
      
      // Format the request body
      const formattedBody = this.formatRequestBody(
        this.model,
        [{ role: 'user', content: prompt }],
        context,
        systemPrompt
      );
      
      // Create the model command
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      // Call the model
      const response = await this.client.send(command);
      
      // Parse the response
      const responseText = await this.parseResponseBody(response);
      
      // Get the title and make sure it's not too long
      let title = responseText.trim();
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      return title;
    } catch (error) {
      console.error("Error calling AWS Bedrock for ticket title generation:", error);
      return "Support Request"; // Fallback title
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check with a basic request
      const formattedBody = this.formatRequestBody(
        this.model,
        [{ role: 'user', content: 'Hello' }],
        undefined,
        'You are a helpful assistant.'
      );
      
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: Buffer.from(JSON.stringify(formattedBody)),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error("AWS Bedrock provider is not available:", error);
      return false;
    }
  }
  
  /**
   * Format request body based on model type
   */
  private formatRequestBody(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    context?: string,
    systemPrompt?: string
  ): any {
    // Check if model is Anthropic Claude
    if (modelId.startsWith('anthropic.claude')) {
      // Format for Anthropic Claude
      const anthropicMessages = messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'user' ? 'user' : 'assistant',
          content: [{ type: 'text', text: message.content }]
        }));
      
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt || '',
        messages: anthropicMessages
      };
    } 
    // Check if model is Amazon Titan
    else if (modelId.startsWith('amazon.titan')) {
      // Format for Amazon Titan
      let prompt = '';
      
      // Add system prompt if available
      if (systemPrompt) {
        prompt += `<system>${systemPrompt}</system>\n\n`;
      }
      
      // Add messages
      for (const message of messages) {
        const role = message.role === 'assistant' ? 'bot' : 'user';
        prompt += `<${role}>${message.content}</${role}>\n`;
      }
      
      return {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 1024,
          temperature: 0.7,
          topP: 0.9
        }
      };
    } 
    // Check if model is Cohere
    else if (modelId.startsWith('cohere')) {
      // Format for Cohere
      const chatHistory = messages.map(message => ({
        role: message.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: message.content
      }));
      
      return {
        message: messages[messages.length - 1].content,
        chat_history: chatHistory.slice(0, -1),
        temperature: 0.7,
        max_tokens: 1024,
        system: systemPrompt || ''
      };
    }
    // Default to Anthropic Claude format
    else {
      // Format for Anthropic Claude
      const anthropicMessages = messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'user' ? 'user' : 'assistant',
          content: [{ type: 'text', text: message.content }]
        }));
      
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt || '',
        messages: anthropicMessages
      };
    }
  }
  
  /**
   * Parse response body based on model type
   */
  private async parseResponseBody(response: any): Promise<string> {
    try {
      const responseBody = Buffer.from(response.body).toString('utf8');
      const parsedResponse = JSON.parse(responseBody);
      
      // Parse based on model
      if (this.model.startsWith('anthropic.claude')) {
        return parsedResponse.content?.[0]?.text || '';
      } else if (this.model.startsWith('amazon.titan')) {
        return parsedResponse.results?.[0]?.outputText || '';
      } else if (this.model.startsWith('cohere')) {
        return parsedResponse.text || '';
      } else {
        // Default fallback
        return JSON.stringify(parsedResponse);
      }
    } catch (error) {
      console.error("Error parsing Bedrock response:", error);
      throw new Error("Failed to parse AWS Bedrock response");
    }
  }
}