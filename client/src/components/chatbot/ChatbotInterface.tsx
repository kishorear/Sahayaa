import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ChatMessages from "./ChatMessages";
import ScreenRecorder from "./ScreenRecorder";
import { MessageSquare, X, Video } from "lucide-react";
import { InsertTicket, InsertAttachment } from "@shared/schema";

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
  const [showRecorder, setShowRecorder] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState<number | null>(null);
  const [suggestedTicketData, setSuggestedTicketData] = useState<InsertTicket | null>(null);
  const [awaitingTicketConfirmation, setAwaitingTicketConfirmation] = useState(false);
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
    mutationFn: async (payload: { message: string, messageHistory: Message[] }) => {
      return await apiRequest("POST", "/api/chatbot", payload);
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
          case "suggest_ticket":
            // Just store the ticket data for later confirmation
            // Ask the user if they want to proceed with ticket creation
            setMessages(prev => [
              ...prev,
              {
                id: `ai-confirm-${Date.now()}`,
                content: "Would you like me to create a support ticket for this issue? Please reply with 'yes' or 'no'.",
                sender: "ai",
                timestamp: new Date(),
              }
            ]);
            
            // Store ticket data in a ref or state
            setSuggestedTicketData(data.action.data as InsertTicket);
            setAwaitingTicketConfirmation(true);
            break;
            
          case "create_ticket":
            // Legacy direct ticket creation (we'll update the backend to use suggest_ticket instead)
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
      setCurrentTicketId(ticket.id);
      toast({
        title: "Ticket Created",
        description: `Support ticket #${ticket.id} has been created. Our team will follow up shortly.`,
      });
      
      // Prompt user to record their screen
      setMessages(prev => [
        ...prev,
        {
          id: `ai-recorder-${Date.now()}`,
          content: "Would you like to record your screen to better show us the issue?",
          sender: "ai",
          timestamp: new Date(),
        }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create ticket: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const createAttachmentMutation = useMutation({
    mutationFn: async ({ ticketId, attachmentData }: { ticketId: number, attachmentData: InsertAttachment }) => {
      return await apiRequest("POST", `/api/tickets/${ticketId}/attachments`, attachmentData);
    },
    onSuccess: async () => {
      toast({
        title: "Recording Attached",
        description: "Your screen recording has been attached to the ticket successfully.",
      });
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-attachment-${Date.now()}`,
          content: "Thanks for sharing your screen recording. This will help our team better understand and resolve your issue.",
          sender: "ai",
          timestamp: new Date(),
        }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to attach recording: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setShowRecorder(false); // Close recorder when opening chat
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    const message = inputMessage.toLowerCase().trim();
    
    // Handle ticket confirmation if we're awaiting it
    if (suggestedTicketData) {
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
      
      // Check if user has confirmed creating a ticket
      if (message === 'yes' || message.includes('yes') || message.includes('create ticket') || message.includes('submit ticket')) {
        // User confirmed, create the ticket
        createTicketMutation.mutate(suggestedTicketData);
        
        // Reset confirmation state
        setSuggestedTicketData(null);
        setAwaitingTicketConfirmation(false);
        
        // Add AI confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-creating-${Date.now()}`,
            content: "I'm creating a support ticket for you now...",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      } else if (message === 'no' || message.includes('no') || message.includes("don't create") || message.includes('do not create')) {
        // User declined, reset the suggested ticket data
        setSuggestedTicketData(null);
        setAwaitingTicketConfirmation(false);
        
        // Add AI acknowledgment
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-cancel-${Date.now()}`,
            content: "I understand. I won't create a ticket. Is there anything else I can help you with?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      } else {
        // The user's response was unclear, ask again
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-clarify-${Date.now()}`,
            content: "I'm not sure if you want me to create a support ticket. Please reply with 'yes' or 'no'.",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }
      
      // Clear input
      setInputMessage("");
      return;
    }
    
    // Check if message contains keywords for screen recording
    const recordingKeywords = ['record', 'screen', 'show', 'yes', 'share'];
    
    if (currentTicketId && recordingKeywords.some(keyword => message.includes(keyword))) {
      // If user wants to record the screen and we have a ticket
      setShowRecorder(true);
      setInputMessage("");
      
      // Add user message to chat first
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          content: inputMessage,
          sender: "user",
          timestamp: new Date(),
        },
      ]);
      
      return;
    }
    
    // Regular message flow - add user message to chat
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
    
    // Send to API with message history
    // Filter out the AI confirmation messages to keep only the conversation
    const messageHistory = messages.filter(msg => 
      !msg.id.includes('confirm') && 
      !msg.id.includes('clarify') && 
      !msg.id.includes('creating') &&
      !msg.id.includes('cancel')
    );
    
    chatbotMutation.mutate({
      message: inputMessage,
      messageHistory: messageHistory
    });
    
    // Clear input
    setInputMessage("");
  };
  
  const handleRecordingComplete = (blob: Blob) => {
    if (!currentTicketId) {
      toast({
        title: "Error",
        description: "No active ticket to attach recording to.",
        variant: "destructive",
      });
      setShowRecorder(false);
      return;
    }
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      const base64data = reader.result?.toString().split(',')[1];
      
      if (!base64data) {
        toast({
          title: "Error",
          description: "Failed to process recording.",
          variant: "destructive",
        });
        return;
      }
      
      // Create attachment data
      const attachmentData: InsertAttachment = {
        ticketId: currentTicketId,
        type: "screen_recording",
        filename: `screen-recording-${Date.now()}.webm`,
        contentType: "video/webm",
        data: base64data,
      };
      
      // Send to server
      createAttachmentMutation.mutate({ 
        ticketId: currentTicketId,
        attachmentData
      });
    };
    
    // Hide the recorder
    setShowRecorder(false);
    
    // Add a message about the recording
    setMessages((prev) => [
      ...prev,
      {
        id: `user-recording-${Date.now()}`,
        content: "I've shared a screen recording to help explain my issue.",
        sender: "user",
        timestamp: new Date(),
      },
    ]);
  };
  
  const handleCancelRecording = () => {
    setShowRecorder(false);
    
    setMessages((prev) => [
      ...prev,
      {
        id: `user-cancel-recording-${Date.now()}`,
        content: "I've decided not to share a screen recording at this time.",
        sender: "user",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Screen recorder modal */}
      {showRecorder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full">
            <ScreenRecorder 
              onRecordingComplete={handleRecordingComplete}
              onCancel={handleCancelRecording}
            />
          </div>
        </div>
      )}
      
      <div className="fixed bottom-6 right-6 flex flex-col z-40">
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
              <div className="flex items-center">
                {currentTicketId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowRecorder(true)}
                    className="text-white hover:bg-primary/80 mr-2"
                    title="Record Screen"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                )}
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
    </>
  );
}
