// Knowledge Base for the support chatbot
// This contains sample resolved tickets and their solutions

export type KnowledgeBaseEntry = {
  id: number;
  question: string;
  category: string;
  tags: string[];
  solution: string;
};

/**
 * Sample knowledge base of support tickets and their solutions.
 * This can be expanded with real data from your support database.
 */
export const knowledgeBase: KnowledgeBaseEntry[] = [
  {
    id: 1,
    question: "How do I reset my password?",
    category: "authentication",
    tags: ["password", "reset", "login", "forgot", "can't access"],
    solution: "To reset your password, click on the 'Forgot Password' link on the login page. Enter your email address and we'll send you a password reset link. The link will expire in 24 hours."
  },
  {
    id: 2,
    question: "I'm getting error code 403 when trying to access the admin dashboard",
    category: "technical_issue",
    tags: ["error", "403", "forbidden", "admin", "dashboard", "access denied"],
    solution: "Error 403 means you don't have permission to access this resource. Please verify that your account has admin privileges. If you're certain you should have access, your session may have expired - try logging out and back in."
  },
  {
    id: 3,
    question: "How do I update my billing information?",
    category: "billing",
    tags: ["billing", "payment", "update", "credit card", "payment method"],
    solution: "To update your billing information, go to Account Settings > Billing. Click 'Edit Payment Method' to update your credit card details. All changes are securely processed through our payment provider."
  },
  {
    id: 4,
    question: "The system is running very slowly for me",
    category: "technical_issue",
    tags: ["slow", "performance", "laggy", "unresponsive", "loading"],
    solution: "Performance issues can be caused by several factors. Try these steps: 1) Clear your browser cache and cookies, 2) Try a different browser, 3) Check your internet connection speed, 4) Disable browser extensions. If the problem persists, please provide details about your device and browser for further troubleshooting."
  },
  {
    id: 5,
    question: "Does your platform integrate with Salesforce?",
    category: "technical_issue",
    tags: ["integration", "salesforce", "connect", "sync", "crm"],
    solution: "Yes, we offer a full integration with Salesforce. You can connect your Salesforce account through Settings > Integrations > Salesforce. The integration allows two-way syncing of contacts, opportunities, and custom objects. For detailed setup instructions, please see our integration guide at https://help.example.com/salesforce-integration."
  },
  {
    id: 6,
    question: "How do I export my data?",
    category: "technical_issue",
    tags: ["export", "download", "data", "backup", "csv", "reports"],
    solution: "You can export your data from the Reports section. Select the data you want to export, click 'Export' and choose your preferred format (CSV, Excel, or PDF). For large data sets, the export will be processed in the background and you'll receive an email when it's ready to download."
  },
  {
    id: 7,
    question: "I was charged twice for my subscription",
    category: "billing",
    tags: ["double charge", "billing error", "refund", "subscription", "payment"],
    solution: "I apologize for the incorrect billing. I can see that there was indeed a duplicate charge on your account. I've initiated a refund for the duplicate charge, which should appear on your account within 3-5 business days. I've also added a note to your account to prevent this from happening again."
  },
  {
    id: 8,
    question: "How can I add team members to my account?",
    category: "account",
    tags: ["team", "users", "invite", "add user", "member", "seats"],
    solution: "To add team members, go to Settings > Team Members and click 'Invite New User'. Enter their email address and select their access level. They'll receive an invitation email with instructions to join your team. Note that additional users may affect your billing depending on your subscription plan."
  },
  {
    id: 9,
    question: "What security measures do you have in place to protect my data?",
    category: "technical_issue",
    tags: ["security", "data protection", "encryption", "privacy", "compliance"],
    solution: "We take security very seriously. Our platform uses industry-standard encryption (AES-256) for all data, both in transit and at rest. We maintain SOC 2 Type II compliance, regular penetration testing, and a comprehensive disaster recovery plan. All data centers are physically secured and monitored 24/7. For more details, please see our Security Whitepaper at https://help.example.com/security."
  },
  {
    id: 10,
    question: "Can I change my username?",
    category: "account",
    tags: ["username", "change", "profile", "account settings"],
    solution: "Currently, usernames cannot be changed directly. However, you can contact our support team with your requested username, and we can change it for you manually. Please note that this will affect your login credentials, but not your email address or any other account settings."
  },
  {
    id: 11,
    question: "How do I set up two-factor authentication?",
    category: "authentication",
    tags: ["2fa", "two-factor", "security", "mfa", "authentication"],
    solution: "To enable two-factor authentication, go to Account Settings > Security and click 'Enable 2FA'. You can choose between SMS verification or using an authenticator app like Google Authenticator or Authy. We recommend using an authenticator app for better security. Once enabled, you'll need both your password and a verification code to log in."
  },
  {
    id: 12,
    question: "I need to cancel my subscription",
    category: "billing",
    tags: ["cancel", "subscription", "stop billing", "downgrade"],
    solution: "You can cancel your subscription by going to Account Settings > Billing > Subscription and clicking 'Cancel Subscription'. You'll continue to have access until the end of your current billing period. If you're canceling due to an issue with our service, we'd appreciate if you could share your feedback so we can improve."
  },
  {
    id: 13,
    question: "Do you offer an API?",
    category: "technical_issue",
    tags: ["api", "integration", "developer", "custom", "connect"],
    solution: "Yes, we offer a comprehensive REST API that allows you to integrate our platform with your systems. Our API documentation is available at https://api.example.com/docs and includes authentication details, endpoints, and code examples in various languages. Enterprise plans include dedicated API support and higher rate limits."
  },
  {
    id: 14,
    question: "I'm getting a 'database connection error' message",
    category: "technical_issue",
    tags: ["error", "database", "connection", "failed", "outage"],
    solution: "A database connection error typically indicates a temporary issue with our services. Our team has been notified and is working on resolving it. Please try again in a few minutes. If the problem persists for more than 15 minutes, please check our status page at https://status.example.com for any known outages."
  },
  {
    id: 15,
    question: "How can I request a feature?",
    category: "feature_request",
    tags: ["feature", "suggestion", "request", "improvement", "new"],
    solution: "We love hearing feature suggestions from our users! You can submit feature requests through the 'Feedback' button in the bottom-right corner of the dashboard. Our product team reviews all requests, and popular features are added to our roadmap. You can also vote on existing feature requests to help us prioritize development."
  },
];

/**
 * Find knowledge base entries that match the given query
 * @param query The user's question/message
 * @returns The most relevant knowledge base entry, or undefined if no good match found
 */
export function findRelevantKnowledgeBaseEntries(query: string): KnowledgeBaseEntry | undefined {
  const queryLower = query.toLowerCase();

  // Compute a relevance score for each entry based on matching words
  const scoredEntries = knowledgeBase.map(entry => {
    // Check for direct question match
    if (entry.question.toLowerCase().includes(queryLower)) {
      return { entry, score: 100 };
    }

    let score = 0;
    
    // Check tags for relevant keywords
    for (const tag of entry.tags) {
      if (queryLower.includes(tag.toLowerCase())) {
        score += 10;
      }
    }
    
    // More sophisticated word matching could be added here
    // This is a simple keyword matching approach
    const words = queryLower.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) { // Only check substantial words, not "a", "the", etc.
        // Check if the word appears in question or tags
        if (entry.question.toLowerCase().includes(word)) {
          score += 5;
        }
        if (entry.category.toLowerCase().includes(word)) {
          score += 3;
        }
      }
    }
    
    return { entry, score };
  });

  // Sort by score descending
  scoredEntries.sort((a, b) => b.score - a.score);
  
  // Return the highest-scoring entry if it's above a threshold
  if (scoredEntries.length > 0 && scoredEntries[0].score > 15) {
    return scoredEntries[0].entry;
  }
  
  return undefined;
}