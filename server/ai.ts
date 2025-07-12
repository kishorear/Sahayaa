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
      let knowledgeContext = '';
      
      try {
        knowledgeContext = await buildAIContext(combinedText, tenantId);
        
        // Log if knowledge context was found
        if (knowledgeContext) {
          console.log(`Using knowledge context for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        } else {
          console.log(`No relevant knowledge context found for ticket classification. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        }
      } catch (contextError) {
        console.error("Error building AI context, will proceed without context:", contextError);
        // Continue without context
      }
      
      // Try classifying with AI up to 3 times with increasing backoff
      const maxRetries = 3;
      let lastError = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`Retry attempt ${attempt+1}/${maxRetries} for AI classification with ${backoffMs}ms backoff...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
          
          const result = await classifyTicketWithAI(title, description, knowledgeContext);
          
          // Verify the AI notes field is present and not empty
          if (!result.aiNotes || result.aiNotes.trim() === '') {
            console.warn('AI classification returned empty aiNotes, adding default notes');
            result.aiNotes = 'This ticket has been automatically classified by the AI system.';
          }
          
          console.log(`Successfully classified ticket with AI on attempt ${attempt+1}, aiNotes length: ${result.aiNotes?.length || 0}`);
          return result;
        } catch (error) {
          const retryError = error as Error;
          lastError = retryError;
          console.error(`AI classification attempt ${attempt+1} failed:`, retryError);
          
          // Only continue retrying for connection issues, not for other errors
          if (retryError && retryError.message && (
              retryError.message.includes('timeout') || 
              retryError.message.includes('network') ||
              retryError.message.includes('connection') ||
              retryError.message.includes('ECONNRESET')
            )) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to local implementation`);
            break;
          }
          
          // On last attempt, fallback to local
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at AI classification failed, falling back to local method`);
            break;
          }
        }
      }
      
      console.error("AI classification failed after all retries, falling back to local:", lastError);
      // Fall back to local implementation
    } catch (error) {
      console.error("AI classification failed, falling back to local:", error);
      // Fall back to local implementation
    }
  }
  
  // Local implementation as fallback with improved complexity classification
  // Rule-based classification with smarter complexity determination
  const text = (title + " " + description).toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  // Categories based on keywords
  let category = 'other';
  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  let assignedTo = 'support';
  let canAutoResolve = false;
  let aiNotes = '';
  
  // Analyze the complexity of the issue based on multiple factors
  const hasComplexTerms = /database|server|infrastructure|outage|security|breach|urgent|critical|production|down|broken|data loss|performance|slow/i.test(text);
  const hasTechnicalTerms = /api|endpoint|code|function|error|exception|bug|crash|server|database|query|authentication|token|backend|frontend|interface/i.test(text);
  const hasSimpleTerms = /reset password|how to|where is|can't find|looking for|documentation|guide|tutorial|help me|simple question/i.test(text);
  
  // Determine complexity based on content analysis
  if (hasComplexTerms || (hasTechnicalTerms && wordCount > 100)) {
    complexity = 'complex';
  } else if (hasSimpleTerms && wordCount < 75) {
    complexity = 'simple';
  }
  
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
      let knowledgeContext = '';
      
      try {
        knowledgeContext = await buildAIContext(combinedText, tenantId);
        
        // Log if knowledge context was found
        if (knowledgeContext) {
          console.log(`Using knowledge context for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        } else {
          console.log(`No relevant knowledge context found for auto-resolve. Title: "${title.substring(0, 30)}${title.length > 30 ? '...' : ''}"${tenantId ? ` (tenant: ${tenantId})` : ''}`);
        }
      } catch (contextError) {
        console.error("Error building AI context for auto-resolve, will proceed without context:", contextError);
        // Continue without context
      }
      
      // Try auto-resolving with AI up to 3 times with increasing backoff
      const maxRetries = 3;
      let lastError = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`Retry attempt ${attempt+1}/${maxRetries} for AI auto-resolve with ${backoffMs}ms backoff...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
          
          const result = await attemptAutoResolveWithAI(title, description, previousMessages, knowledgeContext);
          console.log(`Successfully attempted auto-resolve with AI on attempt ${attempt+1}, resolved: ${result.resolved}`);
          return result;
        } catch (error) {
          const retryError = error as Error;
          lastError = retryError;
          console.error(`AI auto-resolve attempt ${attempt+1} failed:`, retryError);
          
          // Only continue retrying for connection issues, not for other errors
          if (retryError && retryError.message && (
              retryError.message.includes('timeout') || 
              retryError.message.includes('network') ||
              retryError.message.includes('connection') ||
              retryError.message.includes('ECONNRESET')
            )) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to local implementation`);
            break;
          }
          
          // On last attempt, fallback to local
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at AI auto-resolve failed, falling back to local method`);
            break;
          }
        }
      }
      
      console.error("AI auto-resolve failed after all retries, falling back to local:", lastError);
      // Fall back to local implementation
    } catch (error) {
      console.error("AI auto-resolve failed, falling back to local:", error);
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
  // Log request details for tracing
  console.log(`Generating chat response for ticket #${ticketContext.id}, category: ${ticketContext.category}${ticketContext.tenantId ? `, tenant: ${ticketContext.tenantId}` : ''}`);
  
  // Start a timer to measure performance
  const startTime = Date.now();
  
  // Attempt to use configured AI provider if available
  let usedProvider = false;
  try {
    // Check if we can use an AI provider
    const canUseProvider = await shouldUseAIProvider(ticketContext.tenantId);
    usedProvider = canUseProvider || FALLBACK_TO_OPENAI;
    
    if (usedProvider) {
      // Base system prompt without context enhancements
      const baseSystemPrompt = `You are an AI support assistant for a SaaS product. You're currently helping with a ticket in the "${ticketContext.category}" category.
        Ticket #${ticketContext.id}: "${ticketContext.title}"
        Original description: "${ticketContext.description}"
        
        Provide helpful, concise responses based on this context. If you can fully resolve the issue, indicate this clearly in your response.
        If you need more information or the issue requires human intervention, make that clear as well.`;
      
      let enhancedPrompt = baseSystemPrompt;
      let documents = '';
      let knowledgeContext = '';
      
      // Create a multi-layered approach with fallbacks:
      // 1. First try Model Context Protocol (most advanced)
      // 2. Fall back to data source context if MCP fails
      // 3. If both fail, proceed with basic conversation
      
      // Layer 1: Model Context Protocol
      try {
        console.log(`Attempting to enhance prompt with MCP for ticket #${ticketContext.id}`);
        const mcpResult = await enhanceModelContextWithDocuments(
          userMessage,
          baseSystemPrompt,
          ticketContext.tenantId
        );
        
        enhancedPrompt = mcpResult.enhancedPrompt;
        documents = mcpResult.documents || '';
        
        // Log context information for debugging
        if (documents && documents.trim().length > 0) {
          console.log(`Successfully obtained MCP document context (${documents.length} chars) for ticket #${ticketContext.id}`);
        } else {
          console.log(`MCP returned no documents for ticket #${ticketContext.id}, will try alternative context sources`);
        }
      } catch (mcpError) {
        if (mcpError instanceof Error) {
          console.error(`MCP enhancement failed for ticket #${ticketContext.id}: ${mcpError.message}`);
        } else {
          console.error(`MCP enhancement failed for ticket #${ticketContext.id} with non-Error object:`, mcpError);
        }
      }
      
      // Layer 2: If MCP didn't provide context, fall back to legacy data source context
      if (!documents || documents.trim().length === 0) {
        try {
          console.log(`Attempting to build context from data sources for ticket #${ticketContext.id}`);
          // Fall back to older buildAIContext method if no documents found (for backward compatibility)
          knowledgeContext = await buildAIContext(userMessage, ticketContext.tenantId);
          
          // Log if the data source context was found
          if (knowledgeContext && knowledgeContext.trim().length > 0) {
            console.log(`Successfully obtained data source context (${knowledgeContext.length} chars) for ticket #${ticketContext.id}`);
          } else {
            console.log(`Data sources returned no context for ticket #${ticketContext.id}, will proceed with basic conversation`);
          }
        } catch (contextError) {
          if (contextError instanceof Error) {
            console.error(`Data source context generation failed for ticket #${ticketContext.id}: ${contextError.message}`);
          } else {
            console.error(`Data source context generation failed for ticket #${ticketContext.id} with non-Error object:`, contextError);
          }
        }
      }
      
      // Prepare to call the AI with the best available context
      let responseFromAI: string = "";
      
      // Try generating chat response with AI up to 3 times with increasing backoff
      const maxRetries = 3;
      let lastError = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(`Retry attempt ${attempt+1}/${maxRetries} for chat response generation with ${backoffMs}ms backoff...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
          
          // Determine which context to use (prioritize MCP over data sources)
          if (documents && documents.trim().length > 0) {
            console.log(`Using MCP documents for AI response generation for ticket #${ticketContext.id} (attempt ${attempt+1})`);
            // Create a modified message history with the enhanced prompt if we have document context
            const systemMessage: ChatMessage = {
              role: 'system',
              content: enhancedPrompt
            };
            
            // Filter out any existing system messages and add our new enhanced one
            const filteredMessageHistory = messageHistory.filter(msg => msg.role !== 'system');
            const enhancedMessageHistory = [systemMessage, ...filteredMessageHistory];
            
            // Pass the document context as knowledge context parameter
            responseFromAI = await generateChatResponseWithAI(ticketContext, enhancedMessageHistory, userMessage, documents);
          } else if (knowledgeContext && knowledgeContext.trim().length > 0) {
            console.log(`Using data source knowledge for AI response generation for ticket #${ticketContext.id} (attempt ${attempt+1})`);
            // If no MCP documents but we have knowledge context, use that
            responseFromAI = await generateChatResponseWithAI(ticketContext, messageHistory, userMessage, knowledgeContext);
          } else {
            console.log(`No context available, using basic conversation for ticket #${ticketContext.id} (attempt ${attempt+1})`);
            // If no context from any source, proceed with basic conversation
            responseFromAI = await generateChatResponseWithAI(ticketContext, messageHistory, userMessage, '');
          }
          
          // If we get here, the operation was successful
          console.log(`Successfully generated chat response on attempt ${attempt+1}`);
          break;
        } catch (error) {
          const retryError = error as Error;
          lastError = retryError;
          console.error(`Chat response generation attempt ${attempt+1} failed:`, retryError);
          
          // Only continue retrying for connection issues, not for other errors
          if (retryError && retryError.message && (
              retryError.message.includes('timeout') || 
              retryError.message.includes('network') ||
              retryError.message.includes('connection') ||
              retryError.message.includes('ECONNRESET')
            )) {
            console.log(`Retryable error detected, will attempt again if retries remain`);
          } else {
            console.log(`Non-retryable error detected, falling back to simpler response`);
            break;
          }
          
          // On last attempt, fall back to a simple response
          if (attempt === maxRetries - 1) {
            console.error(`All ${maxRetries} attempts at generating chat response failed`);
            responseFromAI = `I apologize, but I'm having trouble accessing the knowledge base at the moment. Let me provide a basic response: I'll help you with your issue regarding ${ticketContext.category}. Could you provide more details about your specific problem?`;
            break;
          }
        }
      }
      
      // Make sure we have a response
      if (!responseFromAI) {
        console.warn(`No AI response was generated for ticket #${ticketContext.id}, using default`);
        responseFromAI = `I understand your question about ${ticketContext.category}. Let me assist you with that. Could you please provide some more details about what you're trying to accomplish?`;
      }
      
      // Record performance metrics
      const duration = Date.now() - startTime;
      console.log(`Generated AI response for ticket #${ticketContext.id} in ${duration}ms`);
      
      return responseFromAI;
    }
  } catch (error) {
    // Handle any unexpected errors in the AI flow
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Critical error in AI chat response for ticket #${ticketContext.id}: ${errorMessage}`, error);
    usedProvider = false; // Mark that we need to use the fallback
  }
  
  // If we couldn't use an AI provider or an error occurred, log this fact
  if (!usedProvider) {
    console.log(`Using fallback local implementation for ticket #${ticketContext.id}`);
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

// Generate a title for a ticket based on conversation
export async function generateTicketTitle(messages: ChatMessage[], tenantId?: number): Promise<string> {
  // Start timing for metrics
  const startTime = Date.now();
  
  // Log the request details
  console.log(`Generating ticket title for ${messages.length} messages${tenantId ? ` for tenant ${tenantId}` : ''}`);
  
  // Validate messages
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.log("No messages provided for title generation, returning default title");
    return "Support Request";
  }
  
  // Check if there are user messages to analyze
  let allUserMessages = messages.filter(m => m.role === 'user');
  if (allUserMessages.length === 0) {
    console.log("No user messages found, returning default title");
    return "Support Request";
  }
  
  // Tracking which approach is successful
  let titleGenMethod = 'fallback';
  let aiTitle: string | null = null;
  
  try {
    // Check if we should use AI provider (either tenant-specific or global fallback)
    const useAI = await shouldUseAIProvider(tenantId) || FALLBACK_TO_OPENAI;
    
    if (useAI) {
      // Get all message contents for context building
      const allText = messages.map(m => m.content).join(' ');
      
      // Create a robust system prompt for ticket title generation
      const baseSystemPrompt = `
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
      
      // Multi-layered approach with fallbacks:
      // Layer 1: Try Model Context Protocol (most advanced)
      let mcpSuccessful = false;
      let enhancedPrompt = baseSystemPrompt;
      let documents = '';
      
      try {
        console.log("Attempting to enhance title generation with MCP documents");
        const mcpResult = await enhanceModelContextWithDocuments(
          allText,
          baseSystemPrompt,
          tenantId
        );
        enhancedPrompt = mcpResult.enhancedPrompt || baseSystemPrompt;
        documents = mcpResult.documents || '';
        
        if (documents && documents.trim().length > 0) {
          console.log(`Found relevant MCP documents (${documents.length} chars) for title generation`);
          mcpSuccessful = true;
        }
      } catch (mcpError) {
        if (mcpError instanceof Error) {
          console.error(`MCP enhancement failed for title generation: ${mcpError.message}`);
        } else {
          console.error("MCP enhancement failed for title generation with non-Error object:", mcpError);
        }
      }
      
      // If MCP was successful, try generating a title with the enhanced context
      if (mcpSuccessful) {
        try {
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
          console.log("Generating ticket title with MCP context...");
          aiTitle = await generateTicketTitleWithAI(enhancedMessages);
          
          // Validate the title is non-generic and useful
          if (aiTitle && aiTitle.length > 5 && aiTitle !== 'Support Request' && 
              !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
            console.log(`Successfully generated ticket title with MCP: "${aiTitle}"`);
            titleGenMethod = 'mcp';
            
            // Track performance
            const duration = Date.now() - startTime;
            console.log(`Title generation (MCP) completed in ${duration}ms`);
            
            return aiTitle;
          } else {
            console.warn(`MCP approach returned low-quality title: "${aiTitle}", trying data source context...`);
            aiTitle = null; // Reset for next attempt
          }
        } catch (mcpTitleError) {
          console.error("Error generating title with MCP context:", mcpTitleError);
          // Continue to next approach
        }
      }
      
      // Layer 2: Try with data source context
      let dataSourceSuccessful = false;
      let knowledgeContext = '';
      
      try {
        console.log("Attempting to build data source context for title generation");
        knowledgeContext = await buildAIContext(allText, tenantId);
        
        if (knowledgeContext && knowledgeContext.trim().length > 0) {
          console.log(`Found relevant data source context (${knowledgeContext.length} chars) for title generation`);
          dataSourceSuccessful = true;
        } else {
          console.log("No relevant data source context found for title generation");
        }
      } catch (contextError) {
        if (contextError instanceof Error) {
          console.error(`Data source context generation failed: ${contextError.message}`);
        } else {
          console.error("Data source context generation failed with non-Error object:", contextError);
        }
      }
      
      // If data source context was found, try generating a title with it
      if (dataSourceSuccessful) {
        try {
          // Create system message with data source context
          const systemMessage: ChatMessage = {
            role: 'system',
            content: `${baseSystemPrompt}\n\nHere is relevant context for this conversation:\n${knowledgeContext}`
          };
          
          // Keep only non-system messages from original set
          const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
          
          // Build new messages array with the context-enhanced system prompt
          const contextMessages = [systemMessage, ...userAndAssistantMessages];
          
          // Generate title with data source context
          console.log("Generating ticket title with data source context...");
          aiTitle = await generateTicketTitleWithAI(contextMessages);
          
          // Validate the title is non-generic and useful
          if (aiTitle && aiTitle.length > 5 && aiTitle !== 'Support Request' && 
              !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
            console.log(`Successfully generated ticket title with data source context: "${aiTitle}"`);
            titleGenMethod = 'data_source';
            
            // Track performance
            const duration = Date.now() - startTime;
            console.log(`Title generation (data source) completed in ${duration}ms`);
            
            return aiTitle;
          } else {
            console.warn(`Data source approach returned low-quality title: "${aiTitle}", trying basic context...`);
            aiTitle = null; // Reset for next attempt
          }
        } catch (dataSourceTitleError) {
          console.error("Error generating title with data source context:", dataSourceTitleError);
          // Continue to next approach
        }
      }
      
      // Layer 3: Try with basic context (just the system prompt and messages)
      try {
        // Add the system prompt even without additional context
        const systemMessage: ChatMessage = {
          role: 'system',
          content: baseSystemPrompt
        };
        
        // Filter out any existing system messages
        const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
        
        // Generate title with original messages plus system prompt
        console.log("Generating ticket title with basic context...");
        aiTitle = await generateTicketTitleWithAI([systemMessage, ...userAndAssistantMessages]);
        
        // Validate the title is non-generic and useful
        if (aiTitle && aiTitle.length > 5 && aiTitle !== 'Support Request' && 
            !/^(support|help|assistance|issue|problem)$/i.test(aiTitle)) {
          console.log(`Successfully generated ticket title with basic context: "${aiTitle}"`);
          titleGenMethod = 'basic';
          
          // Track performance
          const duration = Date.now() - startTime;
          console.log(`Title generation (basic) completed in ${duration}ms`);
          
          return aiTitle;
        } else {
          console.warn(`Basic approach returned low-quality title: "${aiTitle}", falling back to local implementation...`);
        }
      } catch (basicTitleError) {
        console.error("Error generating title with basic context:", basicTitleError);
        // Fall back to local implementation
      }
    } else {
      console.log("No AI provider available for ticket title generation, using local implementation");
    }
  } catch (error) {
    // Catch all errors in the AI flow
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Critical error in title generation flow: ${errorMessage}`, error);
  }
  
  // If we have a title from any attempt, use it even if not perfect
  if (aiTitle && aiTitle !== 'Support Request') {
    console.log(`Using best available title: "${aiTitle}" (method: ${titleGenMethod})`);
    return aiTitle;
  }
  
  // Enhanced local fallback implementation for more descriptive titles in production
  // CRITICAL: No basic fallback allowed - AI providers are required for all ticket title generation
  console.error("AI providers are unavailable - cannot generate ticket title without AI");
  throw new Error("Ticket title generation requires AI providers - no basic fallback allowed");
}

export async function summarizeConversation(messages: ChatMessage[], tenantId?: number): Promise<string> {
  // Start a timer to measure performance
  const startTime = Date.now();
  console.log(`Summarizing conversation with ${messages.length} messages${tenantId ? ` for tenant ${tenantId}` : ''}`);
  
  // Try to use AI provider if available
  let usedProvider = false;
  try {
    // Check if we can use an AI provider
    const canUseProvider = await shouldUseAIProvider(tenantId);
    usedProvider = canUseProvider || FALLBACK_TO_OPENAI;
    
    if (usedProvider) {
      // Validate input
      if (messages.length === 0) {
        console.log("No messages to summarize, returning early");
        return "No conversation to summarize.";
      }
      
      // Get conversation content to build context
      const conversationText = messages.map(m => m.content).join(' ');
      
      // Create base system prompt for summary - enhanced for detailed responses
      const baseSystemPrompt = `
      You are an AI assistant tasked with creating a detailed and comprehensive summary of a support conversation.
      
      Your summary should capture all of these elements:
      - The main problem or request from the user (what they were trying to accomplish)
      - Key information exchanged during the conversation (questions asked, answers provided)
      - Technical details mentioned (error codes, specific features, configuration settings)
      - Attempted solutions and their outcomes
      - Current status (resolved completely, partially resolved, or needs further action)
      - Any follow-up actions required by the user or support team
      
      Guidelines for your summary:
      - Be thorough and include all important details from the conversation
      - Use proper paragraphs and organize information logically
      - Maintain a professional, neutral tone
      - Don't impose any word count restrictions 
      - Don't omit any significant technical details
      
      This summary will be used by support staff to understand the ticket history.
      `;
      
      // Multi-layered approach with fallbacks:
      // 1. First try Model Context Protocol (most advanced)
      // 2. Fall back to data source context if MCP fails
      // 3. If both fail, proceed with basic conversation
      
      // Layer 1: Model Context Protocol
      let enhancedPrompt = baseSystemPrompt;
      let documents = '';
      let contextFromMCP = false;
      
      try {
        console.log("Attempting to enhance summary with MCP documents");
        const mcpResult = await enhanceModelContextWithDocuments(
          conversationText,
          baseSystemPrompt,
          tenantId
        );
        enhancedPrompt = mcpResult.enhancedPrompt || baseSystemPrompt;
        documents = mcpResult.documents || '';
        
        if (documents && documents.trim().length > 0) {
          contextFromMCP = true;
          console.log(`Successfully obtained MCP document context (${documents.length} chars) for conversation summary`);
        } else {
          console.log("MCP returned no documents for conversation summary, will try alternative context sources");
        }
      } catch (mcpError) {
        if (mcpError instanceof Error) {
          console.error(`MCP enhancement failed for conversation summary: ${mcpError.message}`);
        } else {
          console.error("MCP enhancement failed for conversation summary with non-Error object:", mcpError);
        }
      }
      
      // Layer 2: Data Source Context (if MCP didn't provide anything)
      let knowledgeContext = '';
      let contextFromDataSources = false;
      
      if (!contextFromMCP) {
        try {
          console.log("Attempting to build context from data sources for conversation summary");
          knowledgeContext = await buildAIContext(conversationText, tenantId);
          
          if (knowledgeContext && knowledgeContext.trim().length > 0) {
            contextFromDataSources = true;
            console.log(`Successfully obtained data source context (${knowledgeContext.length} chars) for conversation summary`);
          } else {
            console.log("Data sources returned no context for conversation summary");
          }
        } catch (contextError) {
          if (contextError instanceof Error) {
            console.error(`Data source context generation failed for conversation summary: ${contextError.message}`);
          } else {
            console.error("Data source context generation failed for conversation summary with non-Error object:", contextError);
          }
        }
      }
      
      // Now use the best available context to generate the summary
      let summary: string;
      
      try {
        // If we found relevant documents using MCP
        if (contextFromMCP) {
          console.log("Using MCP context for conversation summary");
          
          // Create enhanced system message using MCP result
          const systemMessage: ChatMessage = {
            role: 'system',
            content: enhancedPrompt
          };
          
          // Keep only non-system messages from original set
          const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
          
          // Build new messages array with enhanced system prompt
          const enhancedMessages = [systemMessage, ...userAndAssistantMessages];
          
          // Generate summary with enhanced context
          summary = await summarizeConversationWithAI(enhancedMessages);
        } 
        // If we have knowledge context from data sources
        else if (contextFromDataSources) {
          console.log("Using data source context for conversation summary");
          
          // Create system message with data source context
          const systemMessage: ChatMessage = {
            role: 'system',
            content: `${baseSystemPrompt}\n\nHere is relevant context for this conversation:\n${knowledgeContext}`
          };
          
          // Keep only non-system messages from original set
          const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
          
          // Build new messages array with the context-enhanced system prompt
          const contextMessages = [systemMessage, ...userAndAssistantMessages];
          
          // Generate summary with data source context
          summary = await summarizeConversationWithAI(contextMessages);
        } 
        // If no context is available from any source
        else {
          console.log("No context available, using basic conversation for summary");
          
          // Add the system prompt even without additional context
          const systemMessage: ChatMessage = {
            role: 'system',
            content: baseSystemPrompt
          };
          
          // Filter out any existing system messages
          const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
          
          // Generate summary with original messages plus system prompt
          summary = await summarizeConversationWithAI([systemMessage, ...userAndAssistantMessages]);
        }
        
        // Ensure we got a valid summary back
        if (!summary || summary.trim().length === 0) {
          console.warn("Generated summary was empty, using fallback");
          throw new Error("Empty summary returned from AI");
        }
        
        // Record performance metrics
        const duration = Date.now() - startTime;
        console.log(`Generated conversation summary of ${summary.length} chars in ${duration}ms`);
        
        return summary;
      } catch (summaryGenError) {
        // Handle errors in the actual summary generation
        const errorMessage = summaryGenError instanceof Error ? summaryGenError.message : 'Unknown error';
        console.error(`Error in AI conversation summarization: ${errorMessage}`, summaryGenError);
        throw summaryGenError; // Re-throw to trigger fallback
      }
    }
  } catch (error) {
    // Handle any unexpected errors in the entire flow
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Critical error in AI conversation summarization: ${errorMessage}`, error);
    usedProvider = false; // Mark that we need to use the fallback
  }
  
  // If we couldn't use an AI provider or an error occurred, log this fact
  if (!usedProvider) {
    console.log("Using fallback method for conversation summarization");
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
