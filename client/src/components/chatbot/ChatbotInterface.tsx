import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ChatMessages from "./ChatMessages";
import ScreenRecorder from "./ScreenRecorder";
import { MessageSquare, X, Video, Image, Camera, Upload, Paperclip, RefreshCcw } from "lucide-react";
import { InsertTicket, InsertAttachment } from "@shared/schema";

// Define message type
type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

// Check if a ticket already exists for a given issue
const isDuplicateTicket = (title: string, createdTickets: { id: number, issue: string }[]): boolean => {
  // Convert title to lowercase for case-insensitive comparison
  const normalizedTitle = title.toLowerCase();
  
  // Check if any existing ticket has a similar title
  return createdTickets.some(ticket => {
    // Check for exact match
    if (ticket.issue === normalizedTitle) return true;
    
    // Check for significant overlap (e.g., "payment error" vs "payment processing error")
    const words = normalizedTitle.split(/\s+/).filter(word => word.length > 3);
    const matchingWords = words.filter(word => ticket.issue.includes(word));
    
    // If more than 50% of the significant words match, consider it a duplicate
    return matchingWords.length > 0 && matchingWords.length >= Math.ceil(words.length * 0.5);
  });
};

export default function ChatbotInterface() {
  // Component state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showImageUploadOptions, setShowImageUploadOptions] = useState<boolean>(false);
  const [currentTicketId, setCurrentTicketId] = useState<number | undefined>(undefined);
  const [suggestedTicketData, setSuggestedTicketData] = useState<InsertTicket | null>(null);
  const [awaitingTicketConfirmation, setAwaitingTicketConfirmation] = useState(false);
  const [createdTickets, setCreatedTickets] = useState<{id: number, issue: string}[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  }, []);
  
  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Create a mutation for generating AI summaries for tickets
  const summaryMutation = useMutation({
    mutationFn: async (chatHistory: { role: string, content: string }[]) => {
      const response = await apiRequest("POST", "/api/chatbot/summarize", {
        messages: chatHistory,
        purpose: "ticket_creation"
      });
      
      return await response.json();
    }
  });
  
  // Create a mutation for generating AI-powered ticket titles
  const titleMutation = useMutation({
    mutationFn: async (chatHistory: { role: string, content: string }[]) => {
      const response = await apiRequest("POST", "/api/chatbot/title", {
        messages: chatHistory
      });
      
      return await response.json();
    }
  });
  
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
          content: data.response.content,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      // Check if we should suggest creating a ticket
      if (
        data.response.suggestTicket && 
        !currentTicketId && 
        !awaitingTicketConfirmation &&
        messages.length >= 3
      ) {
        const messageHistory = messages.map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        }));
        
        // Get a summary of the conversation for the ticket description
        const summaryResult = await summaryMutation.mutateAsync(messageHistory);
        // Get a title for the ticket
        const titleResult = await titleMutation.mutateAsync(messageHistory);
        
        // Prepare ticket data
        const ticketData: InsertTicket = {
          title: titleResult.title,
          description: summaryResult.summary,
          status: "open",
          priority: "medium",
          category: data.response.category || "General",
          assignedTo: undefined,
          createdBy: undefined,
          tenantId: undefined,
          complexity: data.response.complexity || "medium",
          source: "chat"
        };
        
        // Set suggested ticket data and add a message asking for confirmation
        setSuggestedTicketData(ticketData);
        setAwaitingTicketConfirmation(true);
        
        // Check if this looks like a duplicate of an existing ticket
        const isDuplicate = isDuplicateTicket(titleResult.title, createdTickets);
        
        // Add AI message with ticket suggestion
        setMessages(prev => [
          ...prev,
          {
            id: `ai-ticket-${Date.now()}`,
            content: isDuplicate 
              ? "I notice this issue may be similar to a ticket you've already created. Would you still like to create a new support ticket for this conversation?" 
              : "I'd like to create a support ticket for this conversation to make sure your issue gets resolved. Is that okay?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }
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
  
  // Mutation for creating tickets
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: InsertTicket) => {
      return await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Add the created ticket to our list to prevent duplicates
      setCreatedTickets(prev => [
        ...prev, 
        { id: data.id, issue: suggestedTicketData?.title?.toLowerCase() || "" }
      ]);
      
      // Set the current ticket ID
      setCurrentTicketId(data.id);
      setAwaitingTicketConfirmation(false);
      setSuggestedTicketData(null);
      
      // Add a message about the created ticket
      setMessages(prev => [
        ...prev,
        {
          id: `ai-ticket-created-${Date.now()}`,
          content: `Great! I've created support ticket #${data.id}. A support agent will review this conversation and follow up with you soon.`,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      toast({
        title: "Ticket Created",
        description: `Support ticket #${data.id} has been created.`,
      });
    },
    onError: (error) => {
      console.error("Error creating ticket:", error);
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-ticket-error-${Date.now()}`,
          content: "I'm sorry, I encountered an error while creating your ticket. Please try again later.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      setAwaitingTicketConfirmation(false);
      
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again later.",
        variant: "destructive",
      });
    },
  });
  
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
    
    // If we're awaiting confirmation for ticket creation
    if (awaitingTicketConfirmation) {
      const lowerMessage = message.toLowerCase();
      const isPositiveResponse = 
        lowerMessage.includes("yes") || 
        lowerMessage.includes("ok") || 
        lowerMessage.includes("sure") ||
        lowerMessage.includes("create") ||
        lowerMessage.includes("ticket");
      
      const isNegativeResponse =
        lowerMessage.includes("no") ||
        lowerMessage.includes("don't") ||
        lowerMessage.includes("dont") ||
        lowerMessage.includes("not") ||
        lowerMessage.includes("cancel");
      
      if (isPositiveResponse && suggestedTicketData) {
        // User confirmed ticket creation
        createTicketMutation.mutate(suggestedTicketData);
      } else if (isNegativeResponse) {
        // User declined ticket creation
        setAwaitingTicketConfirmation(false);
        setSuggestedTicketData(null);
        
        // Add AI response acknowledging decision
        setMessages(prev => [
          ...prev,
          {
            id: `ai-ticket-declined-${Date.now()}`,
            content: "No problem. I won't create a ticket for this. Let me know if you need anything else!",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      } else {
        // Unclear response, ask again
        setMessages(prev => [
          ...prev,
          {
            id: `ai-ticket-unclear-${Date.now()}`,
            content: "I'm not sure if you want me to create a ticket. Please reply with 'Yes' to create a ticket or 'No' to continue the conversation without creating a ticket.",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }
      
      return;
    }
    
    // If we already have a ticket for this conversation, update it with the new message
    if (currentTicketId) {
      try {
        await apiRequest("POST", `/api/tickets/${currentTicketId}/messages`, {
          content: message,
          sender: "user",
        });
      } catch (error) {
        console.error("Error adding message to ticket:", error);
      }
    }
    
    // Show typing indicator
    setIsTyping(true);
    
    // Prepare message history for AI
    const history = messages.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content,
    }));
    
    // Add the new user message
    history.push({
      role: "user",
      content: message,
    });
    
    // Get AI response
    chatbotMutation.mutate({ 
      message,
      messageHistory: messages
    });
  };
  
  // Function to handle screen recordings
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
    
    // If we have a current ticket, upload the recording as an attachment
    if (currentTicketId) {
      const formData = new FormData();
      formData.append("file", blob, `screen-recording-${Date.now()}.webm`);
      formData.append("type", "video/webm");
      formData.append("ticketId", currentTicketId.toString());
      
      apiRequest("POST", "/api/tickets/attachments", formData, true)
        .then(response => response.json())
        .then(data => {
          console.log("Attachment uploaded:", data);
        })
        .catch(error => {
          console.error("Error uploading attachment:", error);
          toast({
            title: "Upload Error",
            description: "Failed to upload screen recording. Please try again.",
            variant: "destructive",
          });
        });
    }
    
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
  
  // Function to handle file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
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
    
    // If we have a current ticket, upload the image as an attachment
    if (currentTicketId) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type);
      formData.append("ticketId", currentTicketId.toString());
      
      apiRequest("POST", "/api/tickets/attachments", formData, true)
        .then(response => response.json())
        .then(data => {
          console.log("Attachment uploaded:", data);
        })
        .catch(error => {
          console.error("Error uploading attachment:", error);
          toast({
            title: "Upload Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive",
          });
        });
    }
    
    // Add AI response
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
  
  // Function to capture screenshot
  const captureScreenshot = () => {
    toast({
      title: "Screenshot",
      description: "Please use your device's screenshot function to capture your screen, then upload it.",
    });
  };
  
  // Simple toggle function
  const toggleChat = () => {
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
                    setCurrentTicketId(undefined);
                    setCreatedTickets([]);
                    setSuggestedTicketData(null);
                    setAwaitingTicketConfirmation(false);
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
            {showImageUploadOptions && (
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
                    onClick={captureScreenshot}
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
                  onClick={() => setShowImageUploadOptions(prev => !prev)}
                  className="text-gray-500 hover:text-primary px-1"
                  title="Attach Files"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500 ml-1">
                  {showImageUploadOptions ? "Hide options" : "Add attachments"}
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