import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X, Video, Image, Camera, Paperclip, RefreshCcw, Ticket, AlertTriangle, GripVertical } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ChatMessages from "./ChatMessages";
import ScreenRecorder from "./ScreenRecorder";
import { InsertTicket } from "@shared/schema";

// Message type with action buttons support
type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  actionButtons?: {
    type: 'ticket_creation';
    onYes: () => void;
    onNo: () => void;
  };
};

// Helper function to check if AI has completed diagnosis and ticket creation should be offered
function shouldShowCreateTicketButton(messages: Message[]): boolean {
  if (messages.length < 2) return false; // Need at least user message and AI response
  
  // Check if user has explicitly requested ticket creation
  const userMessages = messages
    .filter(msg => msg.sender === 'user')
    .map(msg => msg.content.toLowerCase());
  
  const explicitTicketKeywords = [
    'create a ticket', 'create ticket', 'open a ticket', 'open ticket',
    'make a ticket', 'submit a ticket', 'file a ticket', 'ticket please',
    'create support ticket', 'i need a ticket', 'can you create a ticket'
  ];
  
  const hasExplicitRequest = userMessages.some(message => 
    explicitTicketKeywords.some(keyword => message.includes(keyword))
  );
  
  // If user explicitly requested a ticket, show button immediately
  if (hasExplicitRequest) return true;
  
  // Check if user has expressed an issue or problem
  const issueKeywords = [
    'problem', 'issue', 'error', 'broken', 'not working', "doesn't work",
    'help', 'trouble', 'bug', 'wrong', 'failed', 'crash', 'stuck'
  ];
  
  const hasIssue = userMessages.some(message => 
    issueKeywords.some(keyword => message.includes(keyword))
  );
  
  if (!hasIssue) return false;
  
  // Check if AI has provided diagnostic response with information gathering
  const aiMessages = messages
    .filter(msg => msg.sender === 'ai')
    .map(msg => msg.content.toLowerCase());
  
  const diagnosticKeywords = [
    'can you provide more details', 'could you tell me more', 'what specific',
    'when did this start', 'what steps did you take', 'what browser',
    'what device', 'error message', 'screenshot', 'reproduce the issue',
    'understand your issue', 'help me understand', 'more information',
    'additional details', 'specific steps', 'troubleshooting'
  ];
  
  const aiHasDiagnosed = aiMessages.some(message => 
    diagnosticKeywords.some(keyword => message.includes(keyword))
  );
  
  // Only show button if user has an issue AND AI has started diagnostic process
  return hasIssue && aiHasDiagnosed && messages.length >= 4; // At least 2 exchanges
}

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
  const [ticketCreatedThisSession, setTicketCreatedThisSession] = useState(false);
  const [showTicketConfirmation, setShowTicketConfirmation] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createdTickets, setCreatedTickets] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem('chatCreatedTickets');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [attachments, setAttachments] = useState<Array<{
    filename: string;
    data: string; // base64 encoded
    mimeType: string;
    size: number;
  }>>([]);
  
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
    
    // Save created tickets
    sessionStorage.setItem('chatCreatedTickets', JSON.stringify(Array.from(createdTickets)));
  }, [isChatOpen, messages, createdTickets]);
  
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
      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: data.message || "I'm sorry, I couldn't process your request.",
        sender: "ai" as const,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Handle any actions suggested by the AI
      if (data.action) {
        handleAIAction(data.action);
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
  
  // Mutation for creating tickets from chat conversation
  const createWidgetTicketMutation = useMutation({
    mutationFn: async () => {
      const conversation = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      console.log('Creating ticket with attachments:', attachments.length);
      
      return await apiRequest("POST", "/api/widget/create-ticket", {
        tenantId: 1, // Default tenant
        sessionId: `chat_${Date.now()}`,
        conversation: conversation,
        attachments: attachments.length > 0 ? attachments : undefined,
        context: {
          url: window.location.href,
          title: document.title,
          userAgent: navigator.userAgent
        }
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setIsCreatingTicket(false);
      setShowTicketConfirmation(false);
      
      if (data.success) {
        const ticketId = data.ticket.id;
        setCreatedTickets(prev => new Set([...Array.from(prev), `ticket_${ticketId}`]));
        setTicketCreatedThisSession(true);
        
        // Clear attachments after successful ticket creation
        setAttachments([]);

        toast({
          title: "Ticket Created Successfully",
          description: `Ticket #${ticketId} has been created: ${data.ticket.title}`,
        });

        // Add confirmation message to chat
        const confirmationMessage = {
          id: `ticket-confirmation-${Date.now()}`,
          content: `I've created ticket #${ticketId} for you: "${data.ticket.title}". Our support team will review this and get back to you.`,
          sender: "ai" as const,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmationMessage]);
      } else {
        toast({
          title: "Ticket Creation Failed",
          description: "Unable to create ticket. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setIsCreatingTicket(false);
      setShowTicketConfirmation(false);
      console.error("Error creating ticket:", error);
      
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Original ticket creation mutation (keeping for backward compatibility)
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: InsertTicket) => {
      return await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: async (response) => {
      const ticket = await response.json();
      
      // Mark that a ticket has been created this session
      setTicketCreatedThisSession(true);
      
      // Add confirmation message to chat
      setMessages(prev => [
        ...prev,
        {
          id: `ai-ticket-${Date.now()}`,
          content: `✅ I've created ticket #${ticket.id} for you: "${ticket.title}". You can track its progress in the tickets section. Is there anything else I can help you with?`,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      toast({
        title: "Ticket Created",
        description: `Ticket #${ticket.id} has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error("Error creating ticket:", error);
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          content: "I'm sorry, I encountered an error while creating your ticket. Please try again or contact support directly.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle AI actions (like suggesting ticket creation)
  const handleAIAction = (action: any) => {
    if (action.type === 'suggest_ticket' && action.data) {
      // Show confirmation message with interactive buttons
      const confirmMessage = {
        id: `ai-confirm-${Date.now()}`,
        content: `I think this issue would benefit from a support ticket. Would you like me to create one for you with the title "${action.data.title}"?`,
        sender: "ai" as const,
        timestamp: new Date(),
        actionButtons: {
          type: 'ticket_creation' as const,
          onYes: () => {
            // Use the widget ticket creation (with AI processing) instead of regular ticket creation
            setIsCreatingTicket(true);
            createWidgetTicketMutation.mutate();
          },
          onNo: () => {
            // Continue with chat
            setMessages(prev => [
              ...prev,
              {
                id: `ai-continue-${Date.now()}`,
                content: "No problem! Let's continue our conversation. How else can I help you?",
                sender: "ai",
                timestamp: new Date(),
              },
            ]);
          }
        }
      };
      
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  // Check if conversation is similar to existing tickets (duplicate prevention)
  const checkForDuplicateIssue = () => {
    const userMessages = messages.filter(msg => msg.sender === 'user').map(msg => msg.content);
    const conversationText = userMessages.join(' ').toLowerCase();
    
    // Simple keyword-based duplicate detection
    const issueKeywords = [
      'login', 'password', 'access', 'account', 'billing', 'payment', 'error', 
      'bug', 'broken', 'not working', 'issue', 'problem', 'help'
    ];
    
    const foundKeywords = issueKeywords.filter(keyword => 
      conversationText.includes(keyword)
    );
    
    // If we have created tickets this session and similar keywords, warn about duplicates
    if (createdTickets.size > 0 && foundKeywords.length > 2) {
      return {
        isDuplicate: true,
        keywords: foundKeywords
      };
    }
    
    return { isDuplicate: false, keywords: foundKeywords };
  };

  const handleCreateTicketClick = () => {
    // Check if we have meaningful conversation
    const userMessages = messages.filter(msg => msg.sender === 'user');
    if (userMessages.length === 0) {
      toast({
        title: "No Content",
        description: "Please have a conversation before creating a ticket.",
        variant: "destructive",
      });
      return;
    }

    const duplicateCheck = checkForDuplicateIssue();
    
    if (duplicateCheck.isDuplicate) {
      // Show duplicate warning
      toast({
        title: "Possible Duplicate",
        description: `You've already created ${createdTickets.size} ticket(s) this session. Are you sure this is a different issue?`,
      });
    }
    
    setShowTicketConfirmation(true);
  };

  const confirmTicketCreation = () => {
    setIsCreatingTicket(true);
    createWidgetTicketMutation.mutate();
  };
  
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
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'file';
    
    // Convert file to base64 for storage
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
      
      // Store in attachments state
      setAttachments(prev => [
        ...prev,
        {
          filename: file.name,
          data: base64Data,
          mimeType: file.type,
          size: file.size
        }
      ]);
      
      // Create a new user message with the file
      setMessages(prev => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          content: `[ATTACHMENT] I've shared ${fileType === 'image' ? 'an image' : fileType === 'video' ? 'a video' : 'a file'}: ${file.name}`,
          sender: "user",
          timestamp: new Date(),
        },
      ]);
      
      // Show typing indicator
      setIsTyping(true);
      
      // Add AI response acknowledging the file
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            content: `I've received your ${fileType === 'image' ? 'image' : fileType === 'video' ? 'video' : 'file'}. This will help us better understand your situation. Is there anything else you'd like to tell me about this issue?`,
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }, 1500);
    };
    reader.readAsDataURL(file);
    
    // Reset the file input
    e.target.value = "";
  };

  // Function to handle automatic screenshot capture
  const handleScreenshot = async () => {
    try {
      // Check if the browser supports the Screen Capture API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          title: "Screenshot Not Supported",
          description: "Your browser doesn't support automatic screenshots. Please use your device's screenshot function.",
          variant: "destructive",
        });
        return;
      }

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });

      // Create a video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      video.addEventListener('loadedmetadata', () => {
        // Create canvas to capture the screenshot
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        ctx?.drawImage(video, 0, 0);
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const filename = `screenshot-${Date.now()}.png`;
            
            // Convert blob to base64 for storage
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = (reader.result as string).split(',')[1]; // Remove data:image/png;base64, prefix
              
              // Store in attachments state
              setAttachments(prev => [
                ...prev,
                {
                  filename,
                  data: base64Data,
                  mimeType: 'image/png',
                  size: blob.size
                }
              ]);
              
              // Create a new user message with the screenshot
              setMessages(prev => [
                ...prev,
                {
                  id: `user-${Date.now()}`,
                  content: `I've captured a screenshot: ${filename}`,
                  sender: "user",
                  timestamp: new Date(),
                },
              ]);
              
              // Show typing indicator
              setIsTyping(true);
              
              // Add AI response acknowledging the screenshot
              setTimeout(() => {
                setIsTyping(false);
                setMessages(prev => [
                  ...prev,
                  {
                    id: `ai-${Date.now()}`,
                    content: "I've received your screenshot. This visual context will help me better understand the issue you're experiencing. Can you tell me more about what you're seeing?",
                    sender: "ai",
                    timestamp: new Date(),
                  },
                ]);
              }, 1500);

              toast({
                title: "Screenshot Captured",
                description: "Screenshot has been automatically captured and attached.",
              });
            };
            reader.readAsDataURL(blob);
          }
        }, 'image/png');
      });

    } catch (error) {
      console.error('Error capturing screenshot:', error);
      
      // Fallback message for when user cancels or there's an error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({
          title: "Screenshot Cancelled",
          description: "Screenshot capture was cancelled. You can try again or upload an image manually.",
        });
      } else {
        toast({
          title: "Screenshot Failed",
          description: "Unable to capture screenshot automatically. Please use the upload button to attach an image.",
          variant: "destructive",
        });
      }
    }
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
          <div className="w-[480px] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden resize relative" style={{ height: "550px", minWidth: "360px", minHeight: "400px", maxWidth: "700px", maxHeight: "800px" }}>
            {/* Resize handle indicator */}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-gray-200 cursor-se-resize flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity z-10">
              <GripVertical className="w-3 h-3 text-gray-500 rotate-45" />
            </div>
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
                    setTicketCreatedThisSession(false); // Reset ticket creation state
                    setAttachments([]); // Clear attachments
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
              <ChatMessages 
                messages={messages} 
                isTyping={isTyping} 
                ticketCreatedThisSession={ticketCreatedThisSession}
              />
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
                    <span className="text-xs">Upload File</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScreenshot}
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
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
              </div>
            )}

            {/* Create Ticket Button - Only show when user indicates they want to create a ticket */}
            {shouldShowCreateTicketButton(messages) && (
              <div className="border-t border-gray-200 px-4 py-2 bg-blue-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateTicketClick}
                  disabled={isCreatingTicket}
                  className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {isCreatingTicket ? "Creating Ticket..." : "Create Ticket from Conversation"}
                </Button>
                {createdTickets.size > 0 && (
                  <p className="text-xs text-blue-600 mt-1 text-center">
                    {createdTickets.size} ticket(s) created this session
                  </p>
                )}
              </div>
            )}

            {/* Ticket Confirmation Dialog */}
            {showTicketConfirmation && (
              <div className="border-t border-gray-200 px-4 py-3 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-900 mb-1">Create Support Ticket</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      This will create a support ticket from your current conversation. 
                      {createdTickets.size > 0 && (
                        <span className="block mt-1 font-medium">
                          Note: You've already created {createdTickets.size} ticket(s) this session.
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={confirmTicketCreation}
                        disabled={isCreatingTicket}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCreatingTicket ? "Creating..." : "Yes, Create Ticket"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTicketConfirmation(false)}
                        disabled={isCreatingTicket}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
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
                  {attachments.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {attachments.length} file{attachments.length > 1 ? 's' : ''} ready
                    </span>
                  )}
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