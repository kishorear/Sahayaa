import { findRelevantKnowledgeBaseEntries } from './knowledgeBase';
import { 
  classifyTicketWithAI, 
  attemptAutoResolveWithAI, 
  generateChatResponseWithAI,
  generateTicketTitleWithAI,
  summarizeConversationWithAI 
} from './openai-service';
import { buildAIContext } from './data-source-service';
import { AIProviderFactory } from './ai/providers';
import { enhanceModelContextWithDocuments } from './model-context-protocol';

// This function checks if we should use AI providers from database
// Based on whether any provider is available for the tenant
async function shouldUseAIProvider(tenantId?: number): Promise<boolean> {
  if (!tenantId) return false;
  
  // Try to get a provider for chat from the factory
  const provider = AIProviderFactory.getProviderForOperation(tenantId, 'chat');
  return provider !== null;
}

// For backward compatibility, we keep the fallback only for development
const FALLBACK_TO_OPENAI = process.env.NODE_ENV === 'development' && 
                         typeof process.env.OPENAI_API_KEY === 'string' && 
                         process.env.OPENAI_API_KEY.startsWith('sk-');

console.log(FALLBACK_TO_OPENAI ? 
  "OpenAI fallback available for development" : 
  "Strict tenant-scoped AI providers enforced");

export type ChatMessage = {
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
export async function classifyTicket(title: string, description: string, tenantId?: number): Promise<TicketClassification> {
  // Use configured AI provider if available
  if (await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI) {
    try {
      // Get relevant knowledge from data sources with tenant context if available
      const combinedText = `${title} ${description}`;
      const knowledgeContext = await buildAIContext(combinedText, tenantId);
      
      // Log if knowledge context was found
      if (knowledgeContext) {
        console.log(`Using knowledge context for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      } else {
        console.log(`No relevant knowledge context found for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      }
      
      return await classifyTicketWithAI(title, description, knowledgeContext);
    } catch (error) {
      console.error("OpenAI classification failed, falling back to local:", error);
      // Fall back to local implementation
    }
  }
  
  // Local implementation as fallback
  // Simple rule-based classification
  const text = (title + " " + description).toLowerCase();
  
  // Categories based on keywords
  let category = 'other';
  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  let assignedTo = 'support';
  let canAutoResolve = false;
  let aiNotes = '';
  
  // Category classification
  if (text.includes('login') || text.includes('password') || text.includes('sign in') || text.includes('account access')) {
    category = 'authentication';
    aiNotes = 'User is experiencing authentication issues';
    
    // Simple password resets and basic login issues can be auto-resolved
    if (text.includes('forgot password') || text.includes('reset password')) {
      complexity = 'simple';
      canAutoResolve = true;
      aiNotes += '. This appears to be a password reset request which can be handled through automated flows.';
    } else {
      complexity = 'medium';
    }
  } 
  else if (text.includes('payment') || text.includes('charge') || text.includes('invoice') || text.includes('bill') || text.includes('subscription')) {
    category = 'billing';
    aiNotes = 'User has a billing-related inquiry';
    
    if (text.includes('refund') || text.includes('dispute') || text.includes('cancel')) {
      complexity = 'complex';
      assignedTo = 'support';
      aiNotes += '. This involves a refund or cancellation request requiring manual review.';
    } else {
      complexity = 'medium';
    }
  }
  else if (text.includes('feature') || text.includes('suggestion') || text.includes('improvement') || text.includes('add') || text.includes('enhance')) {
    category = 'feature_request';
    complexity = 'medium';
    assignedTo = 'engineering';
    aiNotes = 'User is requesting a new feature or enhancement';
  }
  else if (text.includes('guide') || text.includes('manual') || text.includes('help') || text.includes('documentation') || text.includes('how to')) {
    category = 'documentation';
    complexity = 'simple';
    aiNotes = 'User is requesting information or guidance';
    
    // Most documentation requests can be auto-resolved by providing links or guides
    canAutoResolve = true;
  }
  else if (text.includes('error') || text.includes('bug') || text.includes('crash') || text.includes('not working') || text.includes('issue')) {
    category = 'technical_issue';
    aiNotes = 'User is experiencing a technical problem';
    
    if (text.includes('data loss') || text.includes('critical') || text.includes('urgent') || text.includes('production')) {
      complexity = 'complex';
      assignedTo = 'engineering';
      aiNotes += '. This appears to be a critical issue requiring engineering attention.';
    } else {
      complexity = 'medium';
    }
  }
  else if (text.includes('profile') || text.includes('settings') || text.includes('account') || text.includes('update details')) {
    category = 'account';
    complexity = 'simple';
    aiNotes = 'User is requesting account management assistance';
    
    // Basic account management can often be auto-resolved
    canAutoResolve = true;
  }
  
  return {
    category,
    complexity,
    assignedTo,
    canAutoResolve,
    aiNotes
  };
}

// Attempt to resolve a ticket automatically
export async function attemptAutoResolve(title: string, description: string, previousMessages: ChatMessage[] = [], tenantId?: number): Promise<{resolved: boolean; response: string}> {
  // Use configured AI provider if available
  if (await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI) {
    try {
      // Get relevant knowledge from data sources
      const combinedText = `${title} ${description}`;
      const knowledgeContext = await buildAIContext(combinedText, tenantId);
      
      // Log if knowledge context was found
      if (knowledgeContext) {
        console.log(`Using knowledge context for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      } else {
        console.log(`No relevant knowledge context found for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      }
      
      return await attemptAutoResolveWithAI(title, description, previousMessages, knowledgeContext);
    } catch (error) {
      console.error("OpenAI auto-resolve failed, falling back to local:", error);
      // Fall back to local implementation
    }
  }
  
  // Local fallback implementation
  // Combine title and description for analysis
  const text = (title + " " + description).toLowerCase();
  let resolved = false;
  let response = "";
  
  // First check if we have a relevant knowledge base entry
  const knowledgeBaseEntry = findRelevantKnowledgeBaseEntries(text);
  
  if (knowledgeBaseEntry) {
    // If we have a good knowledge base match, use it for the response
    response = knowledgeBaseEntry.solution;
    
    // Determine if this type of issue can be auto-resolved
    if (knowledgeBaseEntry.category === 'authentication' && 
        (knowledgeBaseEntry.question.toLowerCase().includes('reset') || 
         knowledgeBaseEntry.question.toLowerCase().includes('forgot'))) {
      resolved = true;
      response += " Is there anything else I can help you with? This issue is now resolved.";
    } 
    else if (knowledgeBaseEntry.category === 'account' && 
             knowledgeBaseEntry.question.toLowerCase().includes('how')) {
      resolved = true;
      response += " Is there anything specific about your account you need help with? This issue is now resolved.";
    }
    else if (knowledgeBaseEntry.category === 'documentation') {
      resolved = true;
      response += " Is there anything specific within the documentation you're looking for? This issue is now resolved.";
    }
    else if (knowledgeBaseEntry.category === 'feature_request') {
      resolved = true;
      response += " Is there anything else I can help you with today? This issue is now resolved.";
    }
    else if (knowledgeBaseEntry.category === 'technical_issue' && 
            !knowledgeBaseEntry.question.toLowerCase().includes('error')) {
      // Only resolve simple technical issues, not error-related ones
      resolved = true;
      response += " Does this information help solve your problem? This issue is now resolved.";
    }
    else {
      // Complex issues that need human intervention
      resolved = false;
      response += " I've provided some initial information, but a support specialist will follow up with you for more detailed assistance.";
    }
  } 
  else {
    // Fall back to rule-based resolution if no knowledge base match
    if (text.includes('reset password') || text.includes('forgot password')) {
      resolved = true;
      response = "I can help you reset your password. Please check your email for a password reset link I've just sent. If you don't receive it within the next few minutes, please check your spam folder. The link will be valid for 24 hours. Is there anything else I can help you with? This issue is now resolved.";
    }
    else if (text.includes('how to') && text.includes('account')) {
      resolved = true;
      response = "Here's a guide on how to manage your account settings:\n\n1. Log in to your account\n2. Click on the profile icon in the top right corner\n3. Select 'Account Settings' from the dropdown menu\n4. Here you can update your personal information, notification preferences, and privacy settings\n\nI've also sent you an email with our comprehensive account management guide. Is there anything specific about your account you need help with? This issue is now resolved.";
    }
    else if (text.includes('login') && !text.includes('reset') && !text.includes('forgot')) {
      resolved = false;
      response = "I understand you're having trouble logging in. Could you please provide more details about the issue you're experiencing? Are you seeing any specific error messages? This would help us troubleshoot more effectively. This issue requires additional information to resolve.";
    }
    else if (text.includes('documentation') || text.includes('guide') || text.includes('how to')) {
      resolved = true;
      response = "I've found some documentation that should help with your question. You can find our complete user guide at our Help Center: https://help.example.com/guide\n\nSpecifically, the section on '" + (text.includes('account') ? 'Account Management' : 'Getting Started') + "' should address your question. Is there anything specific within the documentation you're looking for? This issue is now resolved.";
    }
    else if (text.includes('feature request') || text.includes('suggestion')) {
      resolved = true;
      response = "Thank you for your feature suggestion. I've recorded your request and forwarded it to our product team for consideration. We really appreciate user feedback as it helps us improve our product. While I can't promise when or if this specific feature will be implemented, please know that your input is valuable. Is there anything else I can help you with today? This issue is now resolved.";
    }
    else if (text.includes('billing') && (text.includes('question') || text.includes('information'))) {
      resolved = false;
      response = "I understand you have a billing question. To better assist you, can you please provide your account details and the specific information you're looking for? For security reasons, our billing team will need to verify your account. This issue requires human intervention to properly address your billing concern.";
    }
    else {
      resolved = false;
      response = "Thank you for contacting us. Based on your message, I'll need to escalate this to our support team for further assistance. A support representative will review your ticket and get back to you as soon as possible. This issue requires human intervention.";
    }
  }

  return { resolved, response };
}

// Generate a response to a user message in an ongoing chat
export async function generateChatResponse(
  ticketContext: { id: number; title: string; description: string; category: string; tenantId?: number },
  messageHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  // Use configured AI provider if available
  if (await shouldUseAIProvider(ticketContext.tenantId) || FALLBACK_TO_OPENAI) {
    try {
      // Base system prompt without context enhancements
      const baseSystemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
        Ticket #${ticketContext.id}: "${ticketContext.title}"
        Original description: "${ticketContext.description}"
        
        Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
        If you need more information or the issue requires human intervention, make that clear as well.`;
      
      // Use Model Context Protocol to enhance the system prompt with relevant document context
      const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
        userMessage,
        baseSystemPrompt,
        ticketContext.tenantId
      );
      
      // Log context information for debugging
      if (documents && documents.trim().length > 0) {
        console.log(`Using document context (MCP) for chat response. Ticket ID: ${ticketContext.id}, User message: "${userMessage.substring(0, 30)}${userMessage.length > 30 ? '...' : ''}"${ticketContext.tenantId ? ` (tenant: ${ticketContext.tenantId})` : ''}`);
        
        // If we have document context from MCP, create a modified message history with the enhanced prompt
        const systemMessage: ChatMessage = {
          role: 'system',
          content: enhancedPrompt
        };
        
        // Filter out any existing system messages and add our new enhanced one
        const filteredMessageHistory = messageHistory.filter(msg => msg.role !== 'system');
        const enhancedMessageHistory = [systemMessage, ...filteredMessageHistory];
        
        // Pass the document context as knowledge context parameter
        return await generateChatResponseWithAI(ticketContext, enhancedMessageHistory, userMessage, documents);
      } else {
        console.log(`No document context found (MCP). Trying data source context for chat response. Ticket ID: ${ticketContext.id}${ticketContext.tenantId ? ` (tenant: ${ticketContext.tenantId})` : ''}`);
        
        // Fall back to older buildAIContext method if no documents found (for backward compatibility)
        const knowledgeContext = await buildAIContext(userMessage, ticketContext.tenantId);
        
        // Log if the data source context was found
        if (knowledgeContext) {
          console.log(`Using data source context for chat response. Ticket ID: ${ticketContext.id}, User message: "${userMessage.substring(0, 30)}${userMessage.length > 30 ? '...' : ''}"${ticketContext.tenantId ? ` (tenant: ${ticketContext.tenantId})` : ''}`);
        } else {
          console.log(`No relevant context found from any source for chat response. Ticket ID: ${ticketContext.id}${ticketContext.tenantId ? ` (tenant: ${ticketContext.tenantId})` : ''}`);
        }
        
        return await generateChatResponseWithAI(ticketContext, messageHistory, userMessage, knowledgeContext);
      }
    } catch (error) {
      console.error("OpenAI chat response failed, falling back to local:", error);
      // Fall back to local implementation
    }
  }
  
  // Local fallback implementation
  // Basic chat management for simple responses
  const text = userMessage.toLowerCase();
  const category = ticketContext.category.toLowerCase();
  
  // Generic responses based on message content - handle these first
  if (text.includes('thank you') || text.includes('thanks')) {
    return "You're welcome! Is there anything else I can help you with today?";
  }
  
  if (text.includes('yes') && text.length < 10) {
    return "Great! Please let me know what other questions you have, and I'll do my best to assist you.";
  }
  
  if (text.includes('no') && text.length < 10) {
    return "Alright! If you need any further assistance in the future, don't hesitate to reach out. Have a great day!";
  }
  
  // Check if there's a match in our knowledge base for complex questions
  const knowledgeBaseEntry = findRelevantKnowledgeBaseEntries(userMessage);
  
  if (knowledgeBaseEntry) {
    // Use the knowledge base response if we have a good match
    return knowledgeBaseEntry.solution;
  }
  
  // Fall back to category-specific responses if no knowledge base match
  switch (category) {
    case 'authentication':
      if (text.includes('password') || text.includes('reset')) {
        return "I can help you reset your password. I've sent a password reset link to your registered email address. The link will expire in 24 hours. Please let me know if you don't receive the email within the next few minutes.";
      } else if (text.includes('login') || text.includes('sign in')) {
        return "If you're having trouble logging in, please try the following steps:\n\n1. Ensure caps lock is turned off\n2. Clear your browser cookies and cache\n3. Try using a different browser\n4. If you still can't log in, I can help you reset your password";
      } else if (text.includes('two-factor') || text.includes('2fa')) {
        return "Two-factor authentication provides an extra layer of security for your account. To enable it, go to Account Settings > Security and click 'Enable 2FA'. You can choose between SMS verification or using an authenticator app like Google Authenticator or Authy.";
      }
      break;
      
    case 'billing':
      if (text.includes('refund') || text.includes('money back')) {
        return "I understand you're requesting a refund. I'll need to transfer your ticket to our billing department who can better assist with this request. They typically respond within 1-2 business days. Is there any specific information about the refund you'd like me to include in the ticket?";
      } else if (text.includes('invoice') || text.includes('receipt')) {
        return "You can download all your invoices and receipts from the Billing section in your account settings. If you're having trouble locating a specific invoice, please provide the approximate date or transaction amount, and I can help you find it.";
      } else if (text.includes('update') || text.includes('change') || text.includes('edit')) {
        return "To update your billing information, go to Account Settings > Billing. Click 'Edit Payment Method' to update your credit card details. All changes are securely processed through our payment provider.";
      }
      break;
      
    case 'technical_issue':
      if (text.includes('error')) {
        return "I'm sorry you're experiencing this error. To help us troubleshoot, could you please provide the following information:\n\n1. What were you doing when the error occurred?\n2. Are you able to reproduce the error consistently?\n3. What device and browser are you using?\n\nThis information will help our technical team resolve the issue more quickly.";
      } else if (text.includes('bug') || text.includes('not working')) {
        return "I apologize for the inconvenience. Our engineering team will need to look into this issue. I've escalated your ticket with the details you've provided. In the meantime, is there a workaround you've tried that might help other users experiencing similar issues?";
      } else if (text.includes('slow') || text.includes('performance')) {
        return "Performance issues can be caused by several factors. Try these steps:\n\n1. Clear your browser cache and cookies\n2. Try a different browser\n3. Check your internet connection speed\n4. Disable browser extensions\n\nIf the problem persists, please provide details about your device and browser for further troubleshooting.";
      } else if (text.includes('integration') || text.includes('connect') || text.includes('api')) {
        return "We offer various integration options including a comprehensive REST API. Our API documentation is available at https://api.example.com/docs with authentication details, endpoints, and code examples. Is there a specific system you're trying to integrate with?";
      }
      break;
      
    case 'feature_request':
      return "Thank you for your feedback! We're always looking to improve our product based on user suggestions. I've forwarded your feature request to our product team for consideration. While I can't promise when or if this feature will be implemented, we truly appreciate your input. Would you like to be notified if we add this feature in the future?";
      
    case 'documentation':
      return "Our documentation team works hard to keep our guides up-to-date. You can find comprehensive information on this topic in our knowledge base at https://help.example.com. Is there something specific about the documentation that you're finding unclear or that you'd like more information on?";
      
    case 'account':
      if (text.includes('delete') || text.includes('remove')) {
        return "I understand you're looking to delete your account. Before proceeding, please be aware that this action is permanent and all your data will be removed. If you're sure you want to continue, please confirm, and I'll guide you through the account deletion process.";
      } else if (text.includes('update') || text.includes('change')) {
        return "You can update your account information from your Account Settings page. After logging in, click on your profile picture in the top-right corner and select 'Account Settings'. From there, you can modify your personal information, notification preferences, and privacy settings. Let me know if you have trouble finding any specific setting.";
      } else if (text.includes('team') || text.includes('add user') || text.includes('invite')) {
        return "To add team members, go to Settings > Team Members and click 'Invite New User'. Enter their email address and select their access level. They'll receive an invitation email with instructions to join your team. Note that additional users may affect your billing depending on your subscription plan.";
      }
      break;
  }
  
  // Check ticket context for any clues to generate a more relevant response
  if (ticketContext.description.toLowerCase().includes('api') && text.includes('document')) {
    return "You can find our API documentation at https://api.example.com/docs which includes authentication details, endpoints, and code examples in various languages. Is there a specific aspect of the API you need help with?";
  }
  
  if (ticketContext.description.toLowerCase().includes('export') && (text.includes('how') || text.includes('where'))) {
    return "To export your data, go to the Reports section. Select the data you want to export, click 'Export' and choose your preferred format (CSV, Excel, or PDF). For large data sets, the export will be processed in the background and you'll receive an email when it's ready to download.";
  }
  
  // Default response if none of the above patterns match
  return "Thank you for providing that information. I've updated your ticket with these details. A member of our support team will review this and get back to you soon. Is there anything else you'd like to add to your ticket in the meantime?";
}

// Generate a summary of multiple messages for ticket context
// Generate a title for a ticket based on conversation
export async function generateTicketTitle(messages: ChatMessage[], tenantId?: number): Promise<string> {
  // Check if we should use AI provider (either tenant-specific or global fallback)
  const useAI = await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI;
  
  if (useAI) {
    try {
      // Get all user message contents for context building
      const allText = messages.map(m => m.content).join(' ');
      const userMessages = messages.filter(m => m.role === 'user');
      
      // If no user messages, just return a default title
      if (userMessages.length === 0) {
        return "Support Request";
      }
      
      // Create a base system prompt for ticket title generation
      const baseSystemPrompt = `
      You are an AI assistant tasked with creating a descriptive title for a support ticket.
      Analyze the conversation and create a specific title that clearly identifies the issue.
      
      Guidelines for creating the title:
      1. Focus on the core problem (error codes, specific failure points)
      2. Be specific rather than generic (e.g., "Login 500 Error" instead of "Login Problem")
      3. Include error codes if present (e.g., "404", "500", "INVALID_TOKEN")
      4. Create a title of appropriate length that captures the key aspects of the issue
      5. Do not use placeholders or generic titles like "Support Request" or "Help Needed"
      
      Return ONLY the title with no additional text, explanations or formatting.
      `;
      
      // First try using the Model Context Protocol
      const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
        allText,
        baseSystemPrompt,
        tenantId
      );
      
      // If we found relevant documents using MCP
      if (documents && documents.trim().length > 0) {
        console.log(`Using document context (MCP) for ticket title generation. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        
        // Create enhanced system message using MCP result
        const systemMessage: ChatMessage = {
          role: 'system',
          content: enhancedPrompt
        };
        
        // Keep only non-system messages from original set
        const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
        
        // Build new messages array with enhanced system prompt
        const enhancedMessages = [systemMessage, ...userAndAssistantMessages];
        
        // Generate title using enhanced messages
        const aiTitle = await generateTicketTitleWithAI(enhancedMessages);
        console.log(`AI-generated ticket title (MCP): "${aiTitle}"`);
        
        // Validate title before returning
        if (aiTitle && aiTitle !== 'Support Request') {
          return aiTitle;
        } else {
          console.warn(`AI returned generic title "${aiTitle}" with MCP, trying data source context...`);
        }
      }
      
      // Fall back to the data source context method if MCP didn't work
      const knowledgeContext = await buildAIContext(allText, tenantId);
      
      // Log if knowledge context was found
      if (knowledgeContext) {
        console.log(`Using data source context for ticket title generation. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      } else {
        console.log(`No relevant context found from any source for ticket title generation. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      }
      
      // If we have knowledge context, add it as a system message
      let messagesToSend = messages;
      if (knowledgeContext) {
        const systemMessage: ChatMessage = {
          role: 'system',
          content: knowledgeContext
        };
        
        // Insert system message at the beginning
        messagesToSend = [systemMessage, ...messages];
      }
      
      const aiTitle = await generateTicketTitleWithAI(messagesToSend);
      console.log(`AI-generated ticket title (data source): "${aiTitle}"`);
      
      // Additional validation to prevent default title from being used
      if (aiTitle && aiTitle !== 'Support Request') {
        return aiTitle;
      } else {
        console.warn(`AI returned generic title "${aiTitle}", falling back to local title generation`);
      }
    } catch (error) {
      console.error("AI title generation failed, falling back to local:", error);
      // Continue to fallback implementation below
    }
  } else {
    console.log("No AI provider available for ticket title generation, using local implementation");
  }
  
  // Enhanced local fallback implementation for more descriptive titles in production
  // First, check if we have any user messages
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) {
    return "Support Request"; // No user messages to analyze
  }
  
  // Get the full text of all user messages to analyze patterns
  const allUserText = userMessages.map(m => m.content).join(' ');
  const firstMessage = userMessages[0].content;
  const lastMessage = userMessages[userMessages.length - 1].content;
  
  // Look for error codes or specific patterns in any user message
  const errorCodeMatch = allUserText.match(/(\b[45]\d{2}\b|error code:?\s*([a-z0-9_-]+))/i);
  if (errorCodeMatch) {
    return `${errorCodeMatch[0]} Error Issue`;
  }
  
  // Check for common issue types across all messages
  if (/password|login|sign[- ]in|account access|authentication/i.test(allUserText)) {
    return "Account Access Issue";
  }
  
  if (/payment|billing|charge|invoice|subscription|credit card/i.test(allUserText)) {
    return "Billing or Payment Issue";
  }
  
  if (/install|setup|configuration|getting started/i.test(allUserText)) {
    return "Installation/Setup Help";
  }
  
  if (/bug|error|crash|not working|fails?|failed|broken/i.test(allUserText)) {
    // Try to extract what specifically is broken
    const brokenMatch = allUserText.match(/(\w+(?:\s+\w+){0,4})\s+(?:is|are|not working|broken|fails)/i);
    if (brokenMatch) {
      return `${brokenMatch[1]} Issue`;
    }
    return "Technical Error";
  }
  
  if (/feature request|enhancement|suggestion|would be nice/i.test(allUserText)) {
    return "Feature Request";
  }
  
  if (/how (?:do|can|to)|where is|what is/i.test(allUserText)) {
    return "How-To Question";
  }
  
  // Try to extract an issue statement from the first or last user message
  // First try the first sentence of the last message (often most relevant)
  const lastFirstSentence = lastMessage.split(/[.!?]/)[0].trim();
  if (lastFirstSentence && lastFirstSentence.length > 10 && lastFirstSentence.length < 60) {
    return lastFirstSentence;
  }
  
  // Then try the first sentence of the first message if last message wasn't suitable
  const firstSentence = firstMessage.split(/[.!?]/)[0].trim();
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 60) {
    return firstSentence;
  }
  
  // If both failed, try to create a composite title using both first and last message
  if (firstMessage.length < 30 && lastMessage.length < 30 && firstMessage !== lastMessage) {
    return `${firstMessage.substring(0, 25)} – ${lastMessage.substring(0, 25)}`;
  }
  
  // Just truncate the most valuable message if still nothing
  const mostValuableMessage = lastMessage.length > firstMessage.length ? lastMessage : firstMessage;
  return mostValuableMessage.length > 50 
    ? mostValuableMessage.substring(0, 47) + '...'
    : mostValuableMessage;
}

export async function summarizeConversation(messages: ChatMessage[], tenantId?: number): Promise<string> {
  // Use configured AI provider if available
  if (await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI) {
    try {
      // Get conversation content to build context
      const conversationText = messages.map(m => m.content).join(' ');
      
      // Create base system prompt for summary
      const baseSystemPrompt = `
      Provide a detailed summary of this support conversation that captures:
      - The main issue or request from the user
      - Key information exchanged during the conversation
      - Current status (resolved or needs further action)
      - Any important technical details mentioned
      
      Your summary should be comprehensive while still being concise and well-structured.
      Use proper paragraphs instead of bullet points or markdown formatting.
      `;
      
      // First try using the Model Context Protocol
      const { enhancedPrompt, documents } = await enhanceModelContextWithDocuments(
        conversationText,
        baseSystemPrompt,
        tenantId
      );
      
      // If we found relevant documents using MCP
      if (documents && documents.trim().length > 0) {
        console.log(`Using document context (MCP) for conversation summary. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        
        // Create enhanced system message using MCP result
        const systemMessage: ChatMessage = {
          role: 'system',
          content: enhancedPrompt
        };
        
        // Keep only non-system messages from original set
        const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
        
        // Build new messages array with enhanced system prompt
        const enhancedMessages = [systemMessage, ...userAndAssistantMessages];
        
        // Generate summary using enhanced messages
        return await summarizeConversationWithAI(enhancedMessages);
      }
      
      // Fall back to the data source context method if MCP didn't work
      const knowledgeContext = await buildAIContext(conversationText, tenantId);
      
      // Log if knowledge context was found
      if (knowledgeContext) {
        console.log(`Using data source context for conversation summary. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      } else {
        console.log(`No relevant context found from any source for conversation summary. Message count: ${messages.length}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      }
      
      // If we have knowledge context, add it as a system message
      let messagesToSend = messages;
      if (knowledgeContext) {
        const systemMessage: ChatMessage = {
          role: 'system',
          content: knowledgeContext
        };
        
        // Insert system message at the beginning
        messagesToSend = [systemMessage, ...messages];
      }
      
      return await summarizeConversationWithAI(messagesToSend);
    } catch (error) {
      console.error("OpenAI summarization failed, falling back to local:", error);
      // Fall back to local implementation
    }
  }
  
  // Local fallback implementation
  // Simple conversation summarization
  if (messages.length === 0) {
    return "No conversation to summarize.";
  }
  
  // Count messages per sender
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;
  
  // Check for keywords in the conversation to understand the topic
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  let topic = "general inquiry";
  
  if (allText.includes('password') || allText.includes('login') || allText.includes('sign in')) {
    topic = "authentication issue";
  } else if (allText.includes('payment') || allText.includes('charge') || allText.includes('billing')) {
    topic = "billing question";
  } else if (allText.includes('error') || allText.includes('bug') || allText.includes('not working')) {
    topic = "technical problem";
  } else if (allText.includes('feature') || allText.includes('suggestion')) {
    topic = "feature request";
  } else if (allText.includes('account') || allText.includes('profile')) {
    topic = "account management";
  }
  
  // Check if the conversation appears to be resolved
  const lastMessages = messages.slice(-3).map(m => m.content.toLowerCase());
  const seemsResolved = lastMessages.some(msg => 
    (msg.includes('thank you') || msg.includes('thanks') || msg.includes('resolved')) && 
    !msg.includes('not resolved')
  );
  
  // Create a simple summary
  return `Conversation summary: This ticket contains a ${topic} with ${userMessages} customer messages and ${assistantMessages} support responses. The conversation ${seemsResolved ? 'appears to be resolved' : 'remains open and may require further assistance'}.`;
}
