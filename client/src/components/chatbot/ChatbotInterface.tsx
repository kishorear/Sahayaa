import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X, Video, Image, Camera, Paperclip, RefreshCcw } from "lucide-react";
import ChatMessages from "./ChatMessages";
import ScreenRecorder from "./ScreenRecorder";
import { InsertTicket } from "@shared/schema";

// Simple message type
type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

export default function ChatbotInterface() {
  // Basic state with sessionStorage persistence
  const [isChatOpen, setIsChatOpen] = useState(() => {
    // Try to load chat open state from sessionStorage
    const savedState = sessionStorage.getItem('chatState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        return state.isOpen || false;
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  
  const [messages, setMessages] = useState<Message[]>(() => {
    // Try to load messages from sessionStorage
    const savedMessages = sessionStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {
        console.error("Error parsing saved messages:", e);
        return [];
      }
    }
    return [];
  });
  
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Initialize with welcome message if no messages exist
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
  }, []);
  
  // Save chat state to sessionStorage whenever it changes
  useEffect(() => {
    // Save chat open state
    sessionStorage.setItem('chatState', JSON.stringify({ isOpen: isChatOpen }));
    
    // Save messages only if we have any
    if (messages.length > 0) {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [isChatOpen, messages]);
  
  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Send message to chatbot API
  const chatbotMutation = useMutation({
    mutationFn: async (payload: { message: string, messageHistory: Message[] }) => {
      return await apiRequest("POST", "/api/chatbot", payload);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      setIsTyping(false);
      
      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: data.message || "I'm sorry, I couldn't process your request.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error) => {
      setIsTyping(false);
      console.error("Error getting chatbot response:", error);
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          content: "I'm sorry, I encountered an error while processing your message. Please try again later.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again later.",
        variant: "destructive",
      });
    },
  });
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = inputMessage.trim();
    if (!message || chatbotMutation.isPending) return;
    
    // Clear input
    setInputMessage("");
    
    // Add user message to chat
    const userMessage = {
      id: `user-${Date.now()}`,
      content: message,
      sender: "user" as const,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Get AI response
    chatbotMutation.mutate({ 
      message,
      messageHistory: messages
    });
  };
  
  // Function to handle file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a new user message with the image
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: `I've shared an image: ${file.name}`,
        sender: "user",
        timestamp: new Date(),
      },
    ]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Add AI response acknowledging the image
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: "I've received your image. This will help us better understand your situation. Is there anything else you'd like to tell me about this issue?",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }, 1500);
    
    // Reset the file input
    e.target.value = "";
  };
  
  // Function for screen recording
  const handleRecording = (blob: Blob) => {
    setShowRecorder(false);
    
    // Create a new user message with the recording
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: "I've shared a screen recording.",
        sender: "user",
        timestamp: new Date(),
      },
    ]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Add AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: "Thanks for sharing your screen recording. This will help us understand your issue better. How else can I assist you today?",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };
  
  // Simple toggle function
  const toggleChat = () => {
    console.log("Toggle chat clicked, current state:", isChatOpen);
    setIsChatOpen(!isChatOpen);
  };
  
  return (
    <>
      {showRecorder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ScreenRecorder onCancel={() => setShowRecorder(false)} onRecordingComplete={handleRecording} />
        </div>
      )}
      
      <div className="fixed right-6 bottom-6 flex flex-col z-40">
        {/* Chat bubble */}
        {!isChatOpen && (
          <Button
            onClick={toggleChat}
            className="w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            size="icon"
          >
            <MessageSquare className="w-8 h-8 text-white" />
          </Button>
        )}

        {/* Chat window */}
        {isChatOpen && (
          <div className="w-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden" style={{ height: "550px" }}>
            {/* Chat header */}
            <div className="bg-primary text-white px-4 py-4 flex justify-between items-center">
              <div className="flex items-center">
                <MessageSquare className="w-6 h-6 mr-2" />
                <h3 className="font-semibold">Support Chat</h3>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  title="New Chat"
                  onClick={() => {
                    // Reset the chat state for a new session
                    setMessages([
                      {
                        id: "ai-welcome",
                        content: "Hello! I'm your AI support assistant. How can I help you today?",
                        sender: "ai",
                        timestamp: new Date(),
                      },
                    ]);
                    setInputMessage("");
                    toast({
                      title: "Chat Reset",
                      description: "Starting a new chat session",
                    });
                  }} 
                  className="text-white hover:bg-primary/80 mr-1"
                >
                  <RefreshCcw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleChat} 
                  className="text-white hover:bg-primary/80"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Chat messages area */}
            <div className="flex-1 px-4 py-4 overflow-y-auto" id="chat-messages">
              <ChatMessages messages={messages} isTyping={isTyping} />
              <div ref={messagesEndRef} />
            </div>

            {/* Image Upload Options */}
            {showAttachments && (
              <div className="border-t border-gray-200 bg-gray-50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 py-2 h-auto"
                  >
                    <Image className="w-4 h-4" />
                    <span className="text-xs">Upload Image</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Screenshot",
                        description: "Please use your device's screenshot function to capture your screen, then upload it.",
                      });
                    }}
                    className="flex flex-col items-center gap-1 py-2 h-auto"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-xs">Screenshot</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecorder(true)}
                    className="flex flex-col items-center gap-1 py-2 h-auto"
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-xs">Record Screen</span>
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}

            {/* Chat input area */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <div className="flex items-center mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="text-gray-500 hover:text-primary px-1"
                  title="Attach Files"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500 ml-1">
                  {showAttachments ? "Hide options" : "Add attachments"}
                </span>
              </div>
              <form className="flex items-center" onSubmit={handleSendMessage}>
                <Textarea
                  id="message-input"
                  placeholder="Type your message... (Enter to send)"
                  className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[100px]"
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
                  className="bg-primary text-white rounded-r-md px-3 py-2 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-[40px]"
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
    </>
  );
}