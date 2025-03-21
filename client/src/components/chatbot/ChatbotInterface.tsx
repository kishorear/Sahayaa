import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ChatMessages from "./ChatMessages";
import { MessageSquare, X } from "lucide-react";
import { InsertTicket } from "@shared/schema";

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

export default function ChatbotInterface() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          content: "Hello! I'm your AI support assistant. How can I help you today?",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatbotMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/chatbot", { message });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: data.message,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      setIsTyping(false);
      
      // Handle actions returned by the API
      if (data.action) {
        switch (data.action.type) {
          case "create_ticket":
            const ticketData = data.action.data as InsertTicket;
            createTicketMutation.mutate(ticketData);
            break;
            
          case "resolve_ticket":
            toast({
              title: "Issue Resolved",
              description: "Your issue has been successfully resolved!",
            });
            break;
        }
      }
    },
    onError: (error) => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      toast({
        title: "Error",
        description: `Failed to get response: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: InsertTicket) => {
      return await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: async (response) => {
      const ticket = await response.json();
      toast({
        title: "Ticket Created",
        description: `Support ticket #${ticket.id} has been created. Our team will follow up shortly.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create ticket: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: inputMessage,
        sender: "user",
        timestamp: new Date(),
      },
    ]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Send to API
    chatbotMutation.mutate(inputMessage);
    
    // Clear input
    setInputMessage("");
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col z-50">
      {/* Chat bubble (when closed) */}
      <Button
        onClick={toggleChat}
        className="w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        size="icon"
      >
        <MessageSquare className="w-8 h-8 text-white" />
      </Button>

      {/* Chat window */}
      {isChatOpen && (
        <div className="mb-4 w-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden" style={{ height: "500px" }}>
          {/* Chat header */}
          <div className="bg-primary text-white px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <MessageSquare className="w-6 h-6 mr-2" />
              <h3 className="font-semibold">Support Chat</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleChat} className="text-white hover:bg-primary/80">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat messages area */}
          <div className="flex-1 px-4 py-4 overflow-y-auto" id="chat-messages">
            <ChatMessages messages={messages} isTyping={isTyping} />
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input area */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <form className="flex items-center" onSubmit={handleSendMessage}>
              <Textarea
                id="message-input"
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px]"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={chatbotMutation.isPending}
              />
              <Button
                type="submit"
                className="bg-primary text-white rounded-r-md px-4 py-2 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-[40px]"
                disabled={!inputMessage.trim() || chatbotMutation.isPending}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
