import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, RefreshCcw, Bot, User, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Demo message type
type DemoMessage = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

// Demo responses showcasing agent workflow capabilities
const demoResponses = {
  greeting: [
    "Hello! I'm your AI customer support assistant powered by advanced agent orchestration. I can help you with technical issues, billing questions, and automatically create support tickets. How can I assist you today?",
    "Hi there! I'm here to help you with any questions or issues. I use intelligent agents to search through knowledge bases, analyze similar tickets, and provide comprehensive solutions. What can I help you with?",
    "Welcome! I'm ready to assist you with your support needs using AI-powered workflows that combine multiple specialized agents. What would you like to know about?"
  ],
  technical: [
    "🔍 **Agent Workflow Initiated**\n\n**Step 1: Processing your request** ✅\n**Step 2: Searching knowledge base** ✅\n**Step 3: Finding similar tickets** ✅\n**Step 4: Generating solution** ✅\n\nFor API integration issues, I've found the most common solution:\n\n1. Verify your API key is correctly formatted\n2. Check authentication headers include: `Authorization: Bearer YOUR_API_KEY`\n3. Ensure you're using the correct endpoint: `/api/v1/authenticate`\n\n**Confidence Score: 92%** | **Similar tickets resolved: 47**\n\nWould you like me to create a detailed support ticket with these troubleshooting steps?",
    "🤖 **Multi-Agent Analysis Complete**\n\n**ChatProcessor Agent:** Identified technical issue with authentication\n**InstructionLookup Agent:** Found 3 relevant documentation entries\n**TicketLookup Agent:** Located 12 similar resolved cases\n**LLM Resolution Agent:** Generated comprehensive solution\n\nBased on similar tickets, this issue is typically resolved by:\n- Checking CORS settings in your application\n- Verifying SSL certificate configuration\n- Testing with our sandbox environment first\n\n**Resolution Success Rate: 89%** | **Average Resolution Time: 15 minutes**",
    "⚡ **Intelligent Support Workflow**\n\n**Issue Classification:** Technical - API Integration\n**Complexity Level:** Medium\n**Department:** Engineering\n**Auto-Resolve Capable:** Yes\n\nI've analyzed your technical issue using our AI agent network. The solution involves updating your webhook configuration. I've found the exact documentation and 8 similar cases that were resolved with these steps.\n\n**Next Steps:** Would you like me to generate a detailed resolution guide or create a support ticket for hands-on assistance?"
  ],
  billing: [
    "💳 **Billing Agent Workflow**\n\n**Step 1: Account verification** ✅\n**Step 2: Payment history analysis** ✅\n**Step 3: Plan comparison** ✅\n**Step 4: Recommendation generation** ✅\n\nOur AI agents have analyzed your billing inquiry. Here's what I found:\n\n**Current Plan:** Professional ($79/month)\n**Usage Pattern:** 67% of limits\n**Optimization Opportunity:** You could save $20/month with our Growth plan\n\n**Similar Customer Actions:** 73% of customers with similar usage patterns switched to save costs.\n\nWould you like me to create a plan change request or connect you with our billing team?",
    "🔍 **Multi-Agent Billing Analysis**\n\n**PaymentProcessor Agent:** Verified payment method status\n**PlanOptimizer Agent:** Analyzed usage patterns\n**CustomerHistory Agent:** Reviewed account timeline\n**ComplianceAgent:** Checked billing regulations\n\nBased on your billing question, I can help with:\n- Payment method updates (94% automated resolution)\n- Plan changes (instant processing)\n- Invoice disputes (3-day resolution average)\n- Refund requests (reviewed within 24 hours)\n\n**Recommendation Confidence: 96%** | **Customer Satisfaction: 4.8/5**",
    "💰 **Intelligent Billing Support**\n\n**Issue Type:** Billing inquiry\n**Priority Level:** Standard\n**Auto-Resolution:** Partial\n**Human Review Required:** No\n\nOur billing agents have processed your request:\n\n**Account Status:** Active and in good standing\n**Next Billing Date:** December 15, 2024\n**Available Actions:** Upgrade, downgrade, or modify billing cycle\n\n**Similar Cases:** 156 customers had similar questions - 92% resolved through self-service options.\n\nShall I generate a personalized billing management guide for you?"
  ],
  general: [
    "🎯 **Agent Orchestration System**\n\n**ChatProcessor:** Analyzed your message\n**ContextBuilder:** Gathered relevant information\n**ResponseGenerator:** Creating personalized solution\n**QualityAssurance:** Verifying accuracy\n\nI'm using multiple AI agents to provide you with the best possible assistance. Each agent specializes in different aspects of support:\n\n- **Technical Issues:** 89% resolution rate\n- **Account Management:** 94% customer satisfaction\n- **Integration Support:** 15-minute average response time\n\nWhat specific area would you like help with today?",
    "🔄 **Intelligent Workflow Processing**\n\n**Status:** Analyzing your request across multiple knowledge domains\n**Agents Active:** 4 specialized support agents\n**Knowledge Sources:** Documentation, ticket history, best practices\n**Confidence Building:** 87% complete\n\nOur AI system is designed to provide comprehensive support by:\n1. Understanding your specific context\n2. Searching through thousands of resolved cases\n3. Generating tailored solutions\n4. Learning from each interaction\n\n**Ready to assist!** Please describe your specific need so I can route it to the most appropriate agents.",
    "🚀 **Advanced Support Intelligence**\n\n**Multi-Agent Network:** Online and ready\n**Processing Power:** Full capacity\n**Knowledge Base:** 15,000+ articles indexed\n**Resolution Database:** 50,000+ successful cases\n\nI'm powered by a network of specialized AI agents that work together to solve your problems:\n\n**Available Capabilities:**\n- Real-time documentation search\n- Similar issue pattern matching\n- Automated ticket creation\n- Multi-language support\n- Integration guidance\n\nHow can this intelligent system help you today?"
  ],
  ticket: [
    "🎫 **Ticket Creation Agent Workflow**\n\n**Step 1: Information extraction** ✅\n**Step 2: Category classification** ✅\n**Step 3: Priority assessment** ✅\n**Step 4: Team assignment** ✅\n**Step 5: Ticket generation** ✅\n\n**Ticket Created:** #TKT-2024-7892\n**Category:** Technical Support\n**Priority:** Medium\n**Assigned To:** Engineering Team\n**SLA:** 24-hour response\n\n**AI Confidence:** 94% accurate classification\n**Similar Tickets:** 23 resolved cases with 96% success rate\n**Estimated Resolution:** 2-3 business days\n\n**Next Steps:** You'll receive email updates as our team works on your case.",
    "📋 **Intelligent Ticket Management**\n\n**TicketFormatter Agent:** Structuring your request\n**TeamRouter Agent:** Identifying best-fit specialist\n**SLAManager Agent:** Setting appropriate expectations\n**NotificationAgent:** Preparing update system\n\n**Ticket Details:**\n- **ID:** #SUP-2024-1547\n- **Type:** Customer Support\n- **Urgency:** Standard\n- **Department:** Customer Success\n- **Response Time:** Within 4 hours\n\n**AI Enhancement:** Your ticket has been enriched with context from 8 similar resolved cases to help our team provide faster resolution.\n\n**Status:** Active and queued for specialist review",
    "⚙️ **Automated Ticket Processing**\n\n**WorkflowOrchestrator:** Coordinating all agents\n**DataExtractor:** Parsing issue details\n**ContextEnricher:** Adding relevant background\n**PriorityCalculator:** Determining urgency level\n\n**Ticket Successfully Created!**\n\n**Reference:** #HELP-2024-3301\n**Classification:** 98% confidence\n**Auto-Resolution Attempted:** Yes (partial success)\n**Human Review:** Recommended for complex aspects\n\n**Enriched with:**\n- 12 similar resolved tickets\n- 5 relevant documentation articles\n- 3 best-practice recommendations\n\n**Your ticket is now in our intelligent routing system for optimal handling.**"
  ]
};

// Function to determine response type based on message content
function getResponseType(message: string): keyof typeof demoResponses {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'greeting';
  } else if (lowerMessage.includes('api') || lowerMessage.includes('integration') || lowerMessage.includes('technical') || lowerMessage.includes('error') || lowerMessage.includes('bug')) {
    return 'technical';
  } else if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('price') || lowerMessage.includes('subscription') || lowerMessage.includes('invoice')) {
    return 'billing';
  } else if (lowerMessage.includes('ticket') || lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
    return 'ticket';
  } else {
    return 'general';
  }
}

export default function DemoChatInterface() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: "welcome",
      content: "🤖 **Welcome to Sahayaa AI Agent Demo!**\n\nI'm powered by a network of specialized AI agents that work together to provide intelligent customer support:\n\n**🔍 ChatProcessor Agent** - Analyzes and categorizes your requests\n**📚 InstructionLookup Agent** - Searches knowledge base for relevant solutions\n**🎫 TicketLookup Agent** - Finds similar resolved cases\n**⚡ LLM Resolution Agent** - Generates comprehensive solutions\n**📋 TicketFormatter Agent** - Creates structured support tickets\n\n**Ready to experience multi-agent intelligence?** Try the sample questions below or ask me anything!",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Agent workflow steps for visual feedback
  const agentSteps = [
    "🔍 ChatProcessor analyzing your request...",
    "📚 Searching knowledge base for relevant instructions...",
    "🎫 Looking up similar resolved tickets...",
    "⚡ LLM generating comprehensive solution...",
    "📋 Formatting response and recommendations..."
  ];
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage;
    if (!messageToSend.trim()) return;

    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setProcessingStep(0);

    // Simulate realistic agent workflow processing time with step progression
    const responseType = getResponseType(messageToSend);
    const processingTime = responseType === 'technical' ? 4000 : responseType === 'ticket' ? 5000 : 3000;
    const stepDuration = processingTime / agentSteps.length;

    // Progress through agent steps
    agentSteps.forEach((step, index) => {
      setTimeout(() => {
        setProcessingStep(index);
      }, stepDuration * index);
    });

    setTimeout(() => {
      const responses = demoResponses[responseType];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiMessage: DemoMessage = {
        id: (Date.now() + 1).toString(),
        content: randomResponse,
        sender: "ai",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setProcessingStep(0);
    }, processingTime + Math.random() * 1000); // Longer, more realistic processing time
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: "welcome",
        content: "🤖 **Welcome to Sahayaa AI Agent Demo!**\n\nI'm powered by a network of specialized AI agents that work together to provide intelligent customer support:\n\n**🔍 ChatProcessor Agent** - Analyzes and categorizes your requests\n**📚 InstructionLookup Agent** - Searches knowledge base for relevant solutions\n**🎫 TicketLookup Agent** - Finds similar resolved cases\n**⚡ LLM Resolution Agent** - Generates comprehensive solutions\n**📋 TicketFormatter Agent** - Creates structured support tickets\n\n**Ready to experience multi-agent intelligence?** Try the sample questions below or ask me anything!",
        sender: "ai",
        timestamp: new Date()
      }
    ]);
    setInputMessage("");
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      {/* Demo Notice */}
      <Alert className="mb-4 border-primary/20 bg-primary/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Live Demo:</strong> Experience our AI agent orchestration system. All responses showcase real workflow capabilities.
        </AlertDescription>
      </Alert>

      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Sahayaa AI Assistant</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Multi-Agent System Online
              </span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetChat}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Demo
        </Button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === "user"
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.sender === "ai" && (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                {message.sender === "user" && (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, index) => {
                      // Format agent workflow steps with visual indicators
                      if (line.includes('**Step') || line.includes('**Agent')) {
                        return <div key={index} className="font-medium text-primary mb-1">{line}</div>;
                      }
                      if (line.includes('**') && (line.includes('✅') || line.includes('Complete'))) {
                        return <div key={index} className="text-green-600 dark:text-green-400 font-medium">{line}</div>;
                      }
                      if (line.includes('**Confidence') || line.includes('**Resolution') || line.includes('**Similar')) {
                        return <div key={index} className="text-blue-600 dark:text-blue-400 font-medium">{line}</div>;
                      }
                      if (line.includes('**Ticket') || line.includes('**ID:') || line.includes('**Reference:')) {
                        return <div key={index} className="text-purple-600 dark:text-purple-400 font-medium">{line}</div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg p-3 bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">AI agents processing...</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {agentSteps[processingStep]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Sample Questions */}
      {messages.length <= 1 && (
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Try these sample questions to see our AI agents in action:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("My API integration is failing with 401 errors")}
                disabled={isTyping}
                className="text-xs"
              >
                🔧 API Integration Issue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("I need to change my billing plan and update payment method")}
                disabled={isTyping}
                className="text-xs"
              >
                💳 Billing Support
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("Create a support ticket for my dashboard login problem")}
                disabled={isTyping}
                className="text-xs"
              >
                🎫 Create Ticket
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("How do I set up webhook notifications for my application?")}
                disabled={isTyping}
                className="text-xs"
              >
                📋 Setup Guide
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isTyping}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}