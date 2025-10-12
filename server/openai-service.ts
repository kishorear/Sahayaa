import OpenAI from "openai";
import agentService from "./ai/agent-service";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Legacy OpenAI service - only used for fallback scenarios when no tenant-specific provider is available
// This should be phased out in favor of tenant-specific AI providers
let openai: OpenAI | null = null;

// Only initialize if environment key exists (for backward compatibility)
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.warn("Legacy OpenAI service initialized - consider migrating to tenant-specific AI providers");
} else {
  console.log("No legacy OpenAI key found - strict tenant provider mode");
}

export type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string; // Added to satisfy OpenAI SDK type requirements
};

/**
 * Helper function to identify component from text for title generation
 * This function is used across multiple places to ensure consistent title formatting
 */
function identifyComponent(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/login|password|auth|sign[- ]in|account access/i.test(lowerText)) {
    return "Authentication";
  } 
  if (/payment|billing|charge|invoice|subscription|credit card/i.test(lowerText)) {
    return "Billing";
  }
  if (/data|database|record|entry|lost|missing/i.test(lowerText)) {
    return "Database";
  }
  if (/ui|interface|button|screen|display|page|website/i.test(lowerText)) {
    return "User Interface";
  }
  if (/api|request|endpoint|integration|service/i.test(lowerText)) {
    return "API";
  }
  if (/error|bug|crash|fail|broken|not working/i.test(lowerText)) {
    return "System Error";
  }
  if (/slow|performance|timeout|delay/i.test(lowerText)) {
    return "Performance";
  }
  if (/install|setup|configure|deployment/i.test(lowerText)) {
    return "Installation";
  }
  if (/report|analytics|stats|numbers|metric/i.test(lowerText)) {
    return "Reporting";
  }
  if (/admin|permission|access|role|privilege/i.test(lowerText)) {
    return "Administration";
  }
  
  // Default component if no match
  return "Support";
}

/**
 * Classifies a support ticket using OpenAI
 */
export async function classifyTicketWithAI(title: string, description: string, knowledgeContext: string = '') {
  if (!openai) {
    throw new Error('OpenAI client not available - no API key configured');
  }
  
  try {
    let prompt = `
    You are an AI support ticket classifier that accurately categorizes customer issues. 
    Based on the following ticket information, classify the ticket according to these criteria:
    
    1. Category (one of: authentication, billing, feature_request, documentation, technical_issue, account, other)
    
    2. Complexity (one of: simple, medium, complex) based on these guidelines:
       - "simple": Straightforward issues with clear solutions, minimal technical knowledge needed, can be solved quickly
       - "medium": Issues requiring some investigation, moderate technical knowledge, or multiple steps to resolve
       - "complex": Complicated issues requiring in-depth technical analysis, code changes, database work, or specialist knowledge
    
    3. Department to assign to (one of: support, engineering, product, billing)
    
    4. Whether the ticket can be automatically resolved (true or false)
    
    5. Notes for additional context (optional)
    
    Make sure to carefully assess the complexity based on the technical nature of the problem, not just the length of the description.
    
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
    
    // Analyze the title and description to make a better fallback decision about complexity
    const text = (title + " " + description).toLowerCase();
    let complexity: 'simple' | 'medium' | 'complex' = 'medium';
    
    // Check for indicators of complex issues
    if (text.includes('critical') || 
        text.includes('urgent') || 
        text.includes('security') || 
        text.includes('breach') || 
        text.includes('production down') ||
        text.includes('data loss') ||
        text.includes('server crash')) {
      complexity = 'complex';
    } 
    // Check for indicators of simple issues
    else if ((text.includes('how to') || 
              text.includes('where is') || 
              text.includes('guide') || 
              text.includes('documentation') ||
              text.includes('password reset')) && 
             text.length < 200) {
      complexity = 'simple';
    }
    
    // Fall back to local classification with a more helpful message
    return {
      category: "other",
      complexity,
      assignedTo: "support",
      canAutoResolve: false,
      aiNotes: "This ticket has been automatically classified based on content analysis. The system has determined the complexity to be " + complexity + "."
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
  if (!openai) {
    throw new Error('OpenAI client not available - no API key configured');
  }
  
  try {
    // Build system content with knowledge context if available
    let systemContent = `You are an AI support assistant for a SaaS product. 
        Your goal is to provide helpful, accurate responses to user queries and resolve issues when possible.
        If you can fully resolve the issue, indicate this by including "[ISSUE RESOLVED]" at the end of your response.
        If the issue requires human intervention, indicate this by including "[REQUIRES HUMAN]" at the end of your response.
        
        IMPORTANT PRIVACY AND SECURITY GUIDELINES:
        - DO NOT ask for personal information such as: zipcode/pincode, physical location, home address, phone numbers, social security numbers, or other sensitive personal data
        - DO NOT request credentials, passwords, or access tokens
        - If you need user-specific information, use generic placeholders or recommend creating a support ticket
        - Always respect user privacy and data protection
        
        ESCALATION RULES:
        - If the initial solution doesn't resolve the issue, recommend creating a support ticket for personalized assistance
        - For complex or unclear issues, suggest ticket creation upfront
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
  if (!openai) {
    throw new Error('OpenAI client not available - no API key configured');
  }
  
  try {
    // Create a system message with ticket context and knowledge context if available
    let systemContent = `You are a support assistant helping quality analysts and software testers with ticket "${ticketContext.title}" in the "${ticketContext.category}" category.
      Ticket #${ticketContext.companyTicketId || ticketContext.id}: "${ticketContext.title}"
      Original description: "${ticketContext.description}"
      
      Format your responses for maximum readability:
      - Use bullet points for lists of steps or actions
      - Use numbered lists for sequential instructions (Step 1:, Step 2:, etc.)
      - Break complex information into clear paragraphs
      - Highlight important information or warnings
      
      Key Guidelines:
      - User is a QA analyst/tester who found this issue
      - Provide quick workarounds or information gathering steps only
      - Keep recommendations simple and non-technical
      - Don't provide code solutions or technical implementations
      - Focus on ticket resolution rather than complex troubleshooting
      
      IMPORTANT PRIVACY AND SECURITY GUIDELINES:
      - DO NOT ask for personal information such as: zipcode/pincode, physical location, home address, phone numbers, social security numbers, or other sensitive personal data
      - DO NOT request credentials, passwords, or access tokens
      - If you need user-specific information, use generic placeholders or recommend contacting support
      - Always respect user privacy and data protection
      
      ESCALATION RULES:
      - If the initial solution doesn't resolve the issue, recommend escalating to a developer or support team
      - For complex or unclear issues, suggest that additional investigation may be needed
      
      Provide helpful, non-technical guidance based on this ticket context. If you can provide a simple workaround, indicate this clearly.
      If the issue requires developer intervention, make that clear as well.`;
    
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
  if (!openai) {
    throw new Error('OpenAI client not available - no API key configured');
  }
  
  const MAX_ATTEMPTS = 2; // Number of attempts to get a good title
  const API_TIMEOUT = 15000; // 15 second timeout for API call
  
  // Track metrics
  const startTime = Date.now();
  console.log(`Generating ticket title with OpenAI... (Messages: ${messages.length})`);
  
  // Create a more specific and structured system prompt for reliable title generation
  const systemPrompt = `
  You are an AI specialist focused exclusively on creating concise, accurate technical support ticket titles.
  
  CRITICAL INSTRUCTIONS:
  1. Analyze the conversation to identify the primary technical issue or request
  2. Focus on ERROR CODES, specific components, or technical terms mentioned
  3. Titles MUST follow the format: "[System/Component]: [Specific Technical Issue]"
  4. ALWAYS include error codes when present (e.g., "Error 404", "API Error", "Database Exception")
  
  MANDATORY TITLE STRUCTURE:
  - First part: The system, component, or area affected (Dashboard, API, Login System, Database, etc.)
  - Second part: The specific technical issue or request (after the colon)
  - Example good titles:
     * "Login System: Password Reset Emails Not Delivered"
     * "Payment API: Error 403 During Transaction Processing"
     * "Database: Connection Timeout During High Traffic"
     * "User Dashboard: Data Visualization Not Rendering"
     * "Mobile App: Crash on Profile Image Upload"
  
  FORMAT REQUIREMENTS:
  - Length: 5-10 words maximum
  - Always include a colon separating the component from the issue
  - Capitalize first letter of each significant word
  - No quotation marks, no ending punctuation, no generic terms like "issue with"
  
  You MUST ONLY return the title text itself, nothing else. No explanations, no quotation marks.
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
        
        // Enhanced title validation with focus on required format
        // Check if title contains a colon (required format)
        const hasColon = generatedTitle.includes(':');
        
        // Basic validation criteria
        const basicValidation = generatedTitle && 
            generatedTitle.length >= 5 && 
            generatedTitle.length <= 100 && 
            generatedTitle !== 'Support Request' &&
            !/^\s*issue|problem|request|inquiry\s*$/i.test(generatedTitle);
            
        if (basicValidation && hasColon) {
          // Perfect - title meets all criteria
          console.log(`Successfully generated title on attempt ${attempt}: "${generatedTitle}"`);
          
          // Record performance metrics
          const duration = Date.now() - startTime;
          console.log(`Title generation completed in ${duration}ms`);
          
          return generatedTitle;
        } else if (basicValidation && !hasColon) {
          // Title is good but missing colon - fix it
          console.log(`Title missing colon, attempting to fix: "${generatedTitle}"`);
          
          // Try to identify a component/category to add before the title
          const components = [
            'System', 'Application', 'UI', 'API', 'Database', 'Login', 'Dashboard',
            'User Interface', 'Backend', 'Account', 'Performance', 'Security'
          ];
          
          // Check if we can identify an appropriate component from the content
          const lcTitle = generatedTitle.toLowerCase();
          let component = '';
          
          if (lcTitle.includes('login') || lcTitle.includes('password') || lcTitle.includes('auth')) {
            component = 'Authentication';
          } else if (lcTitle.includes('data') || lcTitle.includes('database') || lcTitle.includes('query')) {
            component = 'Database';
          } else if (lcTitle.includes('ui') || lcTitle.includes('interface') || lcTitle.includes('display')) {
            component = 'User Interface';
          } else if (lcTitle.includes('api') || lcTitle.includes('endpoint') || lcTitle.includes('request')) {
            component = 'API';
          } else if (lcTitle.includes('error') || lcTitle.includes('crash') || lcTitle.includes('bug')) {
            component = 'System Error';
          } else {
            // Use a generic component if we can't determine one
            component = 'Support';
          }
          
          // Construct a properly formatted title
          const fixedTitle = `${component}: ${generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1)}`;
          console.log(`Fixed title: "${fixedTitle}"`);
          
          // Record performance metrics
          const duration = Date.now() - startTime;
          console.log(`Title generation completed in ${duration}ms`);
          
          return fixedTitle;
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
    
    // Enhanced local fallback mechanism for more descriptive titles when AI fails
    try {
      // Get all user messages to analyze
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length === 0) {
        return "Support Request"; // No user messages to analyze
      }
      
      // Extract key content from user messages
      const firstMessage = userMessages[0].content.trim();
      const lastMessage = userMessages[userMessages.length - 1].content.trim();
      const allUserContent = userMessages.map(m => m.content).join(' ');
      
      // Look for error codes or specific patterns in any user message
      const errorCodeMatch = allUserContent.match(/(\b[45]\d{2}\b|error code:?\s*([a-z0-9_-]+))/i);
      if (errorCodeMatch) {
        return `System Error: ${errorCodeMatch[0]} Issue`;
      }
      
      // Check for common issue types
      if (/password|login|sign[- ]in|account access|authentication/i.test(allUserContent)) {
        return "Authentication: Account Access Issue";
      }
      
      if (/payment|billing|charge|invoice|subscription|credit card/i.test(allUserContent)) {
        return "Billing: Payment Processing Issue";
      }
      
      if (/install|setup|configuration|getting started/i.test(allUserContent)) {
        return "Configuration: Setup Assistance";
      }
      
      if (/bug|error|crash|not working|fails?|failed|broken/i.test(allUserContent)) {
        // Try to extract what specifically is broken
        const brokenMatch = allUserContent.match(/(\w+(?:\s+\w+){0,4})\s+(?:is|are|not working|broken|fails)/i);
        if (brokenMatch) {
          return `Technical Issue: ${brokenMatch[1]} Problem`;
        }
        return "System Error: Technical Malfunction";
      }
      
      if (/feature request|enhancement|suggestion|would be nice/i.test(allUserContent)) {
        return "Feature Request: New Functionality";
      }
      
      if (/how (?:do|can|to)|where is|what is/i.test(allUserContent)) {
        return "Documentation: Usage Instructions";
      }
      
      // Try to extract a meaningful title from the first or last message
      if (firstMessage.length > 5 && firstMessage.length < 60) {
        // Process the first message into a title format
        const wordLimit = 10;
        const firstMessageWords = firstMessage.split(/\s+/).slice(0, wordLimit);
        const component = identifyComponent(firstMessage);
        
        const processedTitle = firstMessageWords
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
          
        return `${component}: ${processedTitle}`;
      }
      
      // Create a composite title using both messages if they're different
      if (firstMessage !== lastMessage && 
          firstMessage.length < 30 && 
          lastMessage.length < 30) {
        return `Support: ${firstMessage.split(/\s+/).slice(0, 4).join(' ')} - ${lastMessage.split(/\s+/).slice(0, 4).join(' ')}`;
      }
      
      // Return a simple formatted version of the first user message
      return `Support: ${firstMessage.split(/\s+/).slice(0, 8).join(' ')}`;
    } catch (fallbackError) {
      console.error('Error generating fallback title:', fallbackError);
      return 'Technical Support Request'; // Ultimate fallback title
    }
    
    // Reference the helper function defined outside this function
  }
}

/**
 * Summarizes a conversation using OpenAI
 */
export async function summarizeConversationWithAI(messages: OpenAIMessage[]): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not available - no API key configured');
  }
  
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