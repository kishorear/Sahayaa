// Using a local implementation instead of OpenAI API
console.log("Local AI implementation initialized");

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
export async function attemptAutoResolve(title: string, description: string, previousMessages: ChatMessage[] = []): Promise<{resolved: boolean; response: string}> {
  // Simple rule-based resolution system
  const text = (title + " " + description).toLowerCase();
  let resolved = false;
  let response = "";

  // Check for common issues that can be auto-resolved
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

  return { resolved, response };
}

// Generate a response to a user message in an ongoing chat
export async function generateChatResponse(
  ticketContext: { id: number; title: string; description: string; category: string },
  messageHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  // Simple rule-based chat response system based on the ticket context and user message
  const text = userMessage.toLowerCase();
  const category = ticketContext.category.toLowerCase();
  
  // Generic responses based on message content
  if (text.includes('thank you') || text.includes('thanks')) {
    return "You're welcome! Is there anything else I can help you with today?";
  }
  
  if (text.includes('yes') && text.length < 10) {
    return "Great! Please let me know what other questions you have, and I'll do my best to assist you.";
  }
  
  if (text.includes('no') && text.length < 10) {
    return "Alright! If you need any further assistance in the future, don't hesitate to reach out. Have a great day!";
  }
  
  // Category-specific responses
  switch (category) {
    case 'authentication':
      if (text.includes('password') || text.includes('reset')) {
        return "I can help you reset your password. I've sent a password reset link to your registered email address. The link will expire in 24 hours. Please let me know if you don't receive the email within the next few minutes.";
      } else if (text.includes('login') || text.includes('sign in')) {
        return "If you're having trouble logging in, please try the following steps:\n\n1. Ensure caps lock is turned off\n2. Clear your browser cookies and cache\n3. Try using a different browser\n4. If you still can't log in, I can help you reset your password";
      }
      break;
      
    case 'billing':
      if (text.includes('refund') || text.includes('money back')) {
        return "I understand you're requesting a refund. I'll need to transfer your ticket to our billing department who can better assist with this request. They typically respond within 1-2 business days. Is there any specific information about the refund you'd like me to include in the ticket?";
      } else if (text.includes('invoice') || text.includes('receipt')) {
        return "You can download all your invoices and receipts from the Billing section in your account settings. If you're having trouble locating a specific invoice, please provide the approximate date or transaction amount, and I can help you find it.";
      }
      break;
      
    case 'technical_issue':
      if (text.includes('error')) {
        return "I'm sorry you're experiencing this error. To help us troubleshoot, could you please provide the following information:\n\n1. What were you doing when the error occurred?\n2. Are you able to reproduce the error consistently?\n3. What device and browser are you using?\n\nThis information will help our technical team resolve the issue more quickly.";
      } else if (text.includes('bug') || text.includes('not working')) {
        return "I apologize for the inconvenience. Our engineering team will need to look into this issue. I've escalated your ticket with the details you've provided. In the meantime, is there a workaround you've tried that might help other users experiencing similar issues?";
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
      }
      break;
  }
  
  // Default response if none of the above patterns match
  return "Thank you for providing that information. I've updated your ticket with these details. A member of our support team will review this and get back to you soon. Is there anything else you'd like to add to your ticket in the meantime?";
}

// Generate a summary of multiple messages for ticket context
export async function summarizeConversation(messages: ChatMessage[]): Promise<string> {
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
