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

// Demo responses for different types of questions
const demoResponses = {
  greeting: [
    "Hello! I'm your AI customer support assistant. How can I help you today?",
    "Hi there! I'm here to help you with any questions or issues you might have.",
    "Welcome! I'm ready to assist you with your support needs. What can I help you with?"
  ],
  technical: [
    "I can help you with technical issues! For API integration, you'll need to first authenticate using your API key. Would you like me to walk you through the setup process?",
    "For technical problems, I can guide you through troubleshooting steps. Could you please describe the specific issue you're experiencing?",
    "I see you're having a technical issue. Let me help you resolve this. Can you provide more details about what's not working?"
  ],
  billing: [
    "For billing questions, I can help you understand our pricing plans and manage your subscription. What specific billing information do you need?",
    "I can assist with billing inquiries. Our current plans start at $29/month for the Basic plan. Would you like to know more about our pricing options?",
    "Regarding billing, I can help you with payment issues, plan changes, or invoice questions. What would you like to know?"
  ],
  general: [
    "I understand you need help with that. Let me provide you with some information and see if we need to create a support ticket for further assistance.",
    "I'm here to help! Based on your question, I can provide immediate assistance or connect you with our specialized support team if needed.",
    "Thanks for reaching out! I'll do my best to help you resolve this. Let me gather some information first."
  ],
  ticket: [
    "I can create a support ticket for you to ensure your issue gets proper attention from our team. Would you like me to create a ticket with the details you've provided?",
    "Based on your description, this seems like something our support team should handle directly. Shall I create a support ticket for you?",
    "I'll create a support ticket to make sure your issue is tracked and resolved quickly. This will be assigned to the appropriate team member."
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
      content: "Welcome to the Sahayaa AI demo! I'm here to help you experience our AI-powered customer support system. Try asking me about our features, pricing, or technical support.",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const responseType = getResponseType(inputMessage);
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
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
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
        content: "Welcome to the Sahayaa AI demo! I'm here to help you experience our AI-powered customer support system. Try asking me about our features, pricing, or technical support.",
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
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This is a demonstration of our AI chat system. Responses are simulated for demo purposes.
        </AlertDescription>
      </Alert>

      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Sahayaa AI Assistant</h3>
            <p className="text-sm text-gray-500">Demo Mode</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetChat}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Chat
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
                  <p className="text-sm">{message.content}</p>
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
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

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
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("What are your pricing plans?")}
            disabled={isTyping}
          >
            Pricing
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("I can't access my dashboard")}
            disabled={isTyping}
          >
            Technical Issue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("Can you create a support ticket?")}
            disabled={isTyping}
          >
            Create Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}