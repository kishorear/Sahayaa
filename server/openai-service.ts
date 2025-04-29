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
    
    // Validate the result structure
    if (!result.category || !result.complexity || !result.assignedTo) {
      console.warn("OpenAI returned incomplete classification, adding missing fields");
      // Fix missing fields with sensible defaults
      result.category = result.category || "other";
      result.complexity = result.complexity || "medium";
      result.assignedTo = result.assignedTo || "support";
      result.canAutoResolve = !!result.canAutoResolve;
      result.aiNotes = result.aiNotes || "This ticket has been automatically classified";
    }
    
    return result;
  } catch (error) {
    console.error("Error calling OpenAI for ticket classification:", error);
    // Fall back to local classification with a more helpful message
    return {
      category: "other",
      complexity: "medium",
      assignedTo: "support",
      canAutoResolve: false,
      aiNotes: "This ticket has been automatically classified. The system has determined it requires support team attention."
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
      max_tokens: 800
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
 * with enhanced reliability and consistent formatting
 */
export async function generateTicketTitleWithAI(messages: OpenAIMessage[]): Promise<string> {
  const MAX_ATTEMPTS = 2; // Number of attempts to get a good title
  const API_TIMEOUT = 15000; // 15 second timeout for API call
  
  // Track metrics
  const startTime = Date.now();
  console.log(`Generating ticket title with OpenAI... (Messages: ${messages.length})`);
  
  // Create a more specific and structured system prompt for reliable title generation
  const systemPrompt = `
  You are an AI assistant specialized in creating concise, descriptive titles for support tickets.
  
  INSTRUCTIONS:
  Analyze the conversation carefully and extract the CORE issue or request.
  Create a title that clearly identifies the specific problem, feature request, or inquiry.
  
  TITLE REQUIREMENTS:
  1. Length: 5-10 words (absolute maximum 15 words)
  2. Structure: [Problem Area]: [Specific Issue] format (e.g., "Login System: Password Reset Email Not Arriving")
  3. Specificity: Include exact error codes, component names, or feature references (e.g., "API Error 403: Invalid Authentication Token")
  4. Clarity: Anyone reading the title should immediately understand what the ticket is about
  5. Objectivity: Focus on technical facts, not subjective assessments
  
  FORMAT RULES:
  - Use proper capitalization for the first letter of each significant word
  - Never use quotation marks or other formatting characters in the title
  - Do not include punctuation at the end of the title
  - Do not start with generic terms like "Issue with" or "Problem regarding"
  
  Return ONLY the title text with NO additional explanations, quotation marks, or formatting.
  `;
  
  try {
    // Extract the most relevant information from the conversation
    // Filter out system messages and keep only the meaningful conversation
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // If there are no messages to process, return a default title
    if (nonSystemMessages.length === 0) {
      console.log('No messages provided for title generation, returning default title');
      return 'Support Request';
    }
    
    // Prepare context by extracting key terms and phrases
    let userContent = nonSystemMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
    
    // Special case: if user content is very short, include assistant responses for context
    if (userContent.length < 50 && nonSystemMessages.length > 1) {
      userContent += ' ' + nonSystemMessages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join(' ');
    }
    
    // Identify key terms for title creation (errors, technical terms, product features)
    const errorPattern = /error|exception|fail|timeout|crash|bug|not working|isn't working|doesn't work/i;
    const hasErrorTerms = errorPattern.test(userContent);
    
    // Create a final instruction based on the content analysis
    let finalInstruction = 'Generate a concise, descriptive ticket title for this conversation.';
    
    if (hasErrorTerms) {
      finalInstruction = 'Generate a specific error-focused title that precisely identifies the technical issue.';
    } else if (userContent.includes('feature') || userContent.includes('add') || userContent.includes('improve')) {
      finalInstruction = 'Generate a title that clearly describes this feature request or enhancement.';
    } else if (userContent.includes('how') || userContent.includes('what') || userContent.includes('why')) {
      finalInstruction = 'Generate a title that frames this inquiry or question in a clear, searchable format.';
    }
    
    // Set up the complete messages array
    const completionMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...nonSystemMessages.map(msg => ({ 
        role: msg.role as 'system' | 'user' | 'assistant', 
        content: msg.content 
      })),
      { role: 'user' as const, content: finalInstruction }
    ];
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI title generation timed out after ${API_TIMEOUT}ms`)), API_TIMEOUT);
    });
    
    // Handle multiple attempts with validation
    let lastError = null;
    let bestTitle = 'Support Request';
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`Title generation attempt ${attempt}/${MAX_ATTEMPTS}`);
        
        // Set up the API request with stricter parameters for more consistent results
        const completionPromise = openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: completionMessages,
          temperature: attempt === 1 ? 0.2 : 0.4, // Start with low temperature, increase slightly on retry
          max_tokens: 50, // Limit tokens to encourage concise titles
          top_p: 0.8, // More deterministic responses
          frequency_penalty: 0.5 // Discourage repetitive language
        });
        
        // Race between completion and timeout
        const completion = await Promise.race([completionPromise, timeoutPromise]);
        
        // Extract and clean the generated title
        let generatedTitle = completion.choices[0].message.content?.trim() || '';
        
        // Post-processing to clean up the title
        generatedTitle = generatedTitle
          .replace(/^["'`]|["'`]$/g, '') // Remove surrounding quotes if present
          .replace(/^Title:?\s*/i, '') // Remove "Title:" prefix if present
          .replace(/[\n\r]+/g, ' ') // Replace any newlines with spaces
          .trim();
        
        // Title validation
        if (generatedTitle && 
            generatedTitle.length >= 5 && 
            generatedTitle.length <= 100 && 
            generatedTitle !== 'Support Request' &&
            !/^\s*issue|problem|request|inquiry\s*$/i.test(generatedTitle)) {
          
          console.log(`Successfully generated title on attempt ${attempt}: "${generatedTitle}"`);
          
          // Record performance metrics
          const duration = Date.now() - startTime;
          console.log(`Title generation completed in ${duration}ms`);
          
          return generatedTitle;
        } else {
          console.warn(`Generated title failed validation: "${generatedTitle}"`);
          // Save this title as a fallback if it's better than nothing
          if (generatedTitle && generatedTitle.length > 0 && generatedTitle !== 'Support Request') {
            bestTitle = generatedTitle;
          }
        }
      } catch (attemptError) {
        const errorMessage = attemptError instanceof Error ? attemptError.message : String(attemptError);
        console.error(`Title generation attempt ${attempt} failed: ${errorMessage}`);
        lastError = attemptError;
        
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // If we have a reasonable title from any attempt, use it even if not perfect
    if (bestTitle !== 'Support Request') {
      console.log(`Using best available title from attempts: "${bestTitle}"`);
      return bestTitle;
    }
    
    // All attempts failed or produced low-quality titles
    throw lastError || new Error('Failed to generate an acceptable title');
    
  } catch (error) {
    // Record performance metrics
    const duration = Date.now() - startTime;
    console.error(`Title generation failed after ${duration}ms:`, error);
    
    // Attempt to extract meaningful content for local fallback
    try {
      // Extract user query for fallback title
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        const firstUserMessage = userMessages[0].content.trim();
        // If the first user message is reasonably sized, use it as a basis for the title
        if (firstUserMessage.length > 5 && firstUserMessage.length < 100) {
          // Convert the message to a title-case format
          const titleCase = firstUserMessage
            .split(' ')
            .slice(0, 8) // Take first 8 words max
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          console.log(`Generated fallback title from user message: "${titleCase}"`);
          return titleCase;
        }
      }
    } catch (fallbackError) {
      console.error('Error generating fallback title:', fallbackError);
    }
    
    return 'Support Request'; // Ultimate fallback title
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
      max_tokens: 1000 // Increased to allow for more detailed summaries
    });

    return response.choices[0].message.content || "Summary unavailable";
  } catch (error) {
    console.error("Error calling OpenAI for conversation summarization:", error);
    // Create a basic summary if AI fails
    const userMessages = messages.filter(m => m.role === 'user');
    return `Conversation with ${userMessages.length} user messages. Please review the full conversation for details.`;
  }
}