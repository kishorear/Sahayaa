import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

// Log to verify OpenAI initialization without exposing the key
console.log("OpenAI client initialized");

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type TicketClassification = {
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  assignedTo: string;
  canAutoResolve: boolean;
  aiNotes?: string;
};

// Analyze a support request and classify it
export async function classifyTicket(title: string, description: string): Promise<TicketClassification> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an AI support system that categorizes support tickets. 
      Analyze the ticket and respond with JSON containing:
      1. category (authentication, billing, feature_request, documentation, technical_issue, account, other)
      2. complexity (simple, medium, complex)
      3. assignedTo (support, engineering)
      4. canAutoResolve (boolean): whether this is a Level 1 ticket that can be resolved automatically
      5. aiNotes (string): your analysis and reasoning for the classification`
    },
    {
      role: 'user',
      content: `Title: ${title}\nDescription: ${description}`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as TicketClassification;
  } catch (error) {
    console.error("Error classifying ticket:", error);
    // Fallback classification if AI fails
    return {
      category: 'other',
      complexity: 'medium',
      assignedTo: 'support',
      canAutoResolve: false,
      aiNotes: 'Classification failed, defaulting to support team.'
    };
  }
}

// Attempt to resolve a ticket automatically
export async function attemptAutoResolve(title: string, description: string, previousMessages: ChatMessage[] = []): Promise<{resolved: boolean; response: string}> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an AI support system that attempts to resolve Level 1 support issues.
      Based on the ticket details and any conversation history, determine if you can resolve this issue.
      If you can resolve it, provide a clear solution. If not, explain why this requires human intervention.
      At the end, explicitly state whether this issue is resolved or needs to be escalated.`
    },
    {
      role: 'user',
      content: `Ticket: ${title}\n\nDescription: ${description}`
    },
    ...previousMessages
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages
    });

    const content = response.choices[0].message.content || '';
    const lowerContent = content.toLowerCase();
    const resolved = lowerContent.includes('resolved') && 
                    !lowerContent.includes('not resolved') && 
                    !lowerContent.includes('escalate') &&
                    !lowerContent.includes('human intervention');

    return {
      resolved,
      response: content
    };
  } catch (error) {
    console.error("Error attempting auto-resolve:", error);
    return {
      resolved: false,
      response: "I'm having trouble processing this request right now. Let me connect you with our support team."
    };
  }
}

// Generate a response to a user message in an ongoing chat
export async function generateChatResponse(
  ticketContext: { id: number; title: string; description: string; category: string },
  messageHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful support assistant for a ticket about: ${ticketContext.title} (Category: ${ticketContext.category})
      Original description: ${ticketContext.description}
      Be concise, helpful, and friendly. If you can't resolve the issue, explain you'll escalate it to the appropriate team.`
    },
    ...messageHistory,
    {
      role: 'user',
      content: userMessage
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm having trouble connecting right now. Please try again in a moment or I can escalate this to our support team.";
  }
}

// Generate a summary of multiple messages for ticket context
export async function summarizeConversation(messages: ChatMessage[]): Promise<string> {
  const prompt = `Please summarize the following support conversation concisely, highlighting key points, issues discussed, and any resolution reached:\n\n${
    messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    });

    return response.choices[0].message.content || "No summary available.";
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    return "Unable to generate summary at this time.";
  }
}
