import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Initialize OpenAI client directly with the environment variable
// The SDK will automatically look for the OPENAI_API_KEY environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string; // Added to satisfy OpenAI SDK type requirements
};

/**
 * Classifies a support ticket using OpenAI
 */
export async function classifyTicketWithAI(title: string, description: string, knowledgeContext: string = '') {
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
    if (knowledgeContext) {
      prompt += `\nRelevant Knowledge Base Information:\n${knowledgeContext}`;
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error calling OpenAI for ticket classification:", error);
    // Fall back to local classification
    return {
      category: "other",
      complexity: "medium",
      assignedTo: "support",
      canAutoResolve: false,
      aiNotes: "AI classification failed, using default values"
    };
  }
}

/**
 * Attempts to automatically resolve a ticket using OpenAI
 */
export async function attemptAutoResolveWithAI(
  title: string, 
  description: string, 
  previousMessages: OpenAIMessage[] = [],
  knowledgeContext: string = ''
) {
  try {
    // Build system content with knowledge context if available
    let systemContent = `You are an AI support assistant for a SaaS product. 
        Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
        If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
        If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
        `;
    
    // Add knowledge context if available
    if (knowledgeContext) {
      systemContent += `\n\n${knowledgeContext}`;
    }
    
    // Convert previous messages to OpenAI format
    const messages = [
      {
        role: "system" as const,
        content: systemContent
      },
      ...previousMessages,
      {
        role: "user" as const,
        content: `Title: ${title}\nDescription: ${description}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
    // Fall back to a generic response
    return { 
      resolved: false, 
      response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly." 
    };
  }
}

/**
 * Generates a response to a chat message using OpenAI
 */
export async function generateChatResponseWithAI(
  ticketContext: { id: number; title: string; description: string; category: string; tenantId?: number },
  messageHistory: OpenAIMessage[],
  userMessage: string,
  knowledgeContext: string = ''
): Promise<string> {
  try {
    // Create a system message with ticket context and knowledge context if available
    let systemContent = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
      Ticket #${ticketContext.id}: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      
      Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
      If you need more information or the issue requires human intervention, make that clear as well.`;
    
    // Add knowledge context if available
    if (knowledgeContext) {
      systemContent += `\n\n${knowledgeContext}`;
    }
    
    const systemMessage = {
      role: "system" as const,
      content: systemContent
    };

    // Prepare the messages array with context and history
    const messages = [
      systemMessage,
      ...messageHistory,
      { role: "user" as const, content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Error calling OpenAI for chat response:", error);
    // Fall back to a generic response
    return "I apologize, but I'm experiencing difficulties processing your request right now. Let me connect you with a support representative who can assist you further.";
  }
}

/**
 * Generates a concise and accurate title for a support ticket based on conversation
 */
export async function generateTicketTitleWithAI(messages: OpenAIMessage[]): Promise<string> {
  try {
    console.log('Generating ticket title with OpenAI...');
    const systemPrompt = `
    You are an AI assistant tasked with creating a concise and descriptive title for a support ticket.
    Analyze the conversation and create a short, specific title that clearly identifies the main issue.
    
    Guidelines for creating the title:
    1. Focus on the core problem (error codes, specific failure points)
    2. Be specific rather than generic (e.g., "Login 500 Error" instead of "Login Problem")
    3. Include error codes if present (e.g., "404", "500", "INVALID_TOKEN")
    4. Keep the title under 50 characters if possible
    5. Do not use placeholders or generic titles like "Support Request" or "Help Needed"
    
    Return ONLY the title with no additional text, explanations or formatting.
    `;
    
    // Filter out any system messages from the conversation
    const conversationMessages = messages.filter(msg => msg.role !== 'system');
    
    const completionMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationMessages.map(msg => ({ 
        role: msg.role as 'system' | 'user' | 'assistant', 
        content: msg.content 
      })),
      { role: 'user' as const, content: 'Generate a concise, descriptive ticket title for this conversation.' }
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using the newest model for better title generation
      messages: completionMessages,
      temperature: 0.3, // Lower temperature for more focused, less creative responses
      max_tokens: 50 // Short response as we just want a title
    });
    
    const generatedTitle = completion.choices[0].message.content?.trim() || 'Support Request';
    console.log('OpenAI generated ticket title:', generatedTitle);
    
    return generatedTitle;
  } catch (error) {
    console.error('Error generating AI ticket title:', error);
    return 'Support Request'; // Fallback title
  }
}

/**
 * Summarizes a conversation using OpenAI
 */
export async function summarizeConversationWithAI(messages: OpenAIMessage[]): Promise<string> {
  try {
    // Check if there's a system message (knowledge context) at the beginning
    let systemMessage: OpenAIMessage | null = null;
    let conversationMessages = [...messages];
    
    if (messages.length > 0 && messages[0].role === 'system') {
      // Extract the system message
      systemMessage = messages[0];
      // Remove it from conversation messages to avoid displaying it as part of the conversation
      conversationMessages = messages.slice(1);
    }
    
    // Create the prompt for summarization
    let promptContent = `
    Please summarize the following support conversation in a concise paragraph. 
    Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
    
    ${conversationMessages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
    
    Provide a clear, professional summary:
    `;
    
    // Prepare messages array for the API call
    const apiMessages: OpenAIMessage[] = [];
    
    // Add the knowledge context as system message if available
    if (systemMessage) {
      apiMessages.push({
        role: 'system',
        content: `Use the following information to help you understand the context of the conversation: ${systemMessage.content}`
      });
    }
    
    // Add the main prompt as a user message
    apiMessages.push({ role: "user", content: promptContent });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: apiMessages,
      temperature: 0.3,
      max_tokens: 250
    });

    return response.choices[0].message.content || "Summary unavailable";
  } catch (error) {
    console.error("Error calling OpenAI for conversation summarization:", error);
    // Create a basic summary if AI fails
    const userMessages = messages.filter(m => m.role === 'user');
    return `Conversation with ${userMessages.length} user messages. Please review the full conversation for details.`;
  }
}