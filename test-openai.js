// Simple test file to demonstrate OpenAI API interaction
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const OpenAI = require('openai');

// Since we can't directly import the TypeScript class, we'll recreate a simplified version
class TestOpenAIProvider {
  constructor(config) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = config.model || 'gpt-4o';
    console.log(`OpenAI provider initialized with model: ${this.model}`);
  }

  async generateChatResponse(messages, context, systemPrompt) {
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
        { role: "system", content: systemContent },
        ...messages.map(m => ({
          role: m.role,
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
        model: this.model, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
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
      throw new Error("Failed to generate chat response with OpenAI");
    }
  }
  
  async classifyTicket(title, description, context) {
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
            content: response.choices[0].message.content
          }
        }],
        usage: response.usage
      }, null, 2));
      
      // Parse the JSON response
      const content = response.choices[0].message.content || "{}";
      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error("Error calling OpenAI for ticket classification:", error);
      throw new Error("Failed to classify ticket with OpenAI");
    }
  }
  
  async attemptAutoResolve(title, description, previousMessages, context) {
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
          role: "system",
          content: systemContent
        },
        ...(previousMessages || []).map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`
        }
      ];
      
      console.log(`Using OpenAI model: ${this.model} for auto-resolve attempt`);
      console.log(`OpenAI API Request (attemptAutoResolve):`);
      console.log(JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.role === 'system' ? `[System prompt: ${m.content.substring(0, 50)}...]` : m.content.substring(0, 50) + '...'
        })),
        temperature: 0.7,
        max_tokens: 800
      }, null, 2));

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 800
      });
      
      console.log(`OpenAI API Response (attemptAutoResolve):`);
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
}

// Test function to demonstrate OpenAI requests and responses
async function testOpenAI() {
  try {
    // Create an instance of the OpenAI provider
    // Note: OPENAI_API_KEY should be set in your environment
    const provider = new TestOpenAIProvider({
      type: 'openai',
      name: 'OpenAI Provider',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o', // Using the latest model
      enabled: true,
      isDefault: true,
      contextLength: 16000,
      temperature: 0.7,
      tenantId: 1
    });

    console.log('Testing OpenAI provider with basic chat response...');
    
    // Test basic chat response
    const chatResponse = await provider.generateChatResponse([
      { role: 'user', content: 'What kind of AI models can I use with this support ticket system?' }
    ]);
    
    console.log('\nChat response received:');
    console.log(chatResponse);
    
    console.log('\n\nTesting ticket classification...');
    
    // Test ticket classification
    const classificationResult = await provider.classifyTicket(
      'Cannot log in to the system',
      'I tried to log in with my credentials but it keeps saying "invalid username or password". I\'ve reset my password twice but still can\'t get in.'
    );
    
    console.log('\nClassification result:');
    console.log(JSON.stringify(classificationResult, null, 2));
    
    console.log('\n\nTesting auto-resolve capability...');
    
    // Test auto-resolve capability with a common question that should be resolvable
    const autoResolveResult = await provider.attemptAutoResolve(
      'How do I change my password?',
      'I need to update my password for security reasons but I can\'t find where to do this in the dashboard.'
    );
    
    console.log('\nAuto-resolve result:');
    console.log(`Resolved: ${autoResolveResult.resolved}`);
    console.log(`Response: ${autoResolveResult.response}`);
    
    console.log('\nAll tests completed successfully.');
  } catch (error) {
    console.error('Error testing OpenAI provider:', error);
  }
}

testOpenAI().catch(console.error);