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
};

/**
 * Classifies a support ticket using OpenAI
 */
export async function classifyTicketWithAI(title: string, description: string) {
  try {
    const prompt = `
    You are an AI support ticket classifier. Based on the following ticket information, 
    classify the ticket according to these criteria:
    
    1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
    2. Complexity (one of: simple, medium, complex)
    3. Department to assign to (one of: support, engineering, product, billing)
    4. Whether the ticket can be automatically resolved (true or false)
    5. Notes for additional context (optional)
    
    Ticket Title: ${title}
    Ticket Description: ${description}
    
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
export async function attemptAutoResolveWithAI(title: string, description: string, previousMessages: OpenAIMessage[] = []) {
  try {
    // Convert previous messages to OpenAI format
    const messages = [
      {
        role: "system" as const,
        content: `You are an AI support assistant for a SaaS product. 
        Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
        If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
        If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
        `
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
  ticketContext: { id: number; title: string; description: string; category: string },
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
 * Summarizes a conversation using OpenAI
 */
export async function summarizeConversationWithAI(messages: OpenAIMessage[]): Promise<string> {
  try {
    const prompt = `
    Please summarize the following support conversation in a concise paragraph. 
    Focus on the main issue, any solutions provided, and the current status (resolved or needs further action).
    
    ${messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}
    
    Provide a clear, professional summary:
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
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