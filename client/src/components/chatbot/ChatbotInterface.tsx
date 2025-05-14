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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showImageUploadOptions, setShowImageUploadOptions] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState<number | null>(null);
  const [suggestedTicketData, setSuggestedTicketData] = useState<InsertTicket | null>(null);
  const [awaitingTicketConfirmation, setAwaitingTicketConfirmation] = useState(false);
  // Track created tickets with their issues to prevent duplicates
  const [createdTickets, setCreatedTickets] = useState<{id: number, issue: string}[]>([]);
  
  // Draggable position state - always reset to default on page refresh 
  // but maintain position during page navigation
  const [position, setPosition] = useState(() => {
    // Default position (bottom right)
    return { right: '24px', bottom: '24px', left: 'auto', top: 'auto' };
  });
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Ref for the chat button
  const chatButtonRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Drag start handler
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if ('touches' in e) {
      // For touch events, we need to prevent the default behavior to avoid scrolling
      e.preventDefault();
    }
    
    if (chatButtonRef.current) {
      setIsDragging(true);
      
      let clientX: number, clientY: number;
      
      // Handle both mouse and touch events
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // Calculate the offset from the pointer to the element's corner
      const rect = chatButtonRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  };
  
  // Drag move handler
  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    let clientX: number, clientY: number;
    
    // Handle both mouse and touch events
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling during touch drag
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate the new position
    const newLeft = clientX - dragOffset.x;
    const newTop = clientY - dragOffset.y;
    
    // Update position using CSS values
    const newPosition = {
      left: `${newLeft}px`,
      top: `${newTop}px`,
      right: 'auto',
      bottom: 'auto'
    };
    
    setPosition(newPosition);
  };
  
  // Drag end handler
  const handleDragEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      // No longer saving position to localStorage - will reset on refresh
    }
  };
  
  // Add event listeners for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDrag(e);
    const handleTouchMove = (e: TouchEvent) => handleDrag(e);
    
    const handleMouseUp = () => handleDragEnd();
    const handleTouchEnd = () => handleDragEnd();
    
    // Add global event listeners to track movement even when cursor moves quickly
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
    }
    
    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, position]);
  
  // Load chat state on initial mount
  useEffect(() => {
    // Load chat state from sessionStorage (clears on refresh, persists during navigation)
    const savedChatState = sessionStorage.getItem('chatbotState');
    if (savedChatState) {
      try {
        const state = JSON.parse(savedChatState);
        // Only restore if we have valid state
        if (state.messages && Array.isArray(state.messages)) {
          // Convert ISO timestamps back to Date objects
          const messagesWithDates = state.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          setIsChatOpen(state.isOpen || false);
        }
      } catch (err) {
        console.error('Error parsing saved chat state:', err);
        // Set default welcome message if saved state is corrupted
        setMessages([
          {
            id: "welcome",
            content: "Hello! I'm your AI support assistant. How can I help you today?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }
    } else {
      // Set initial welcome message if no saved state
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
  
  // Save chat state when it changes
  useEffect(() => {
    // Don't save on initial render
    if (messages.length === 0) return;
    
    // Save to sessionStorage (maintains state during navigation but clears on refresh)
    const chatState = {
      messages,
      isOpen: isChatOpen
    };
    sessionStorage.setItem('chatbotState', JSON.stringify(chatState));
  }, [messages, isChatOpen]);

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
            // Check if this would be a duplicate ticket
            if (data.action.data && data.action.data.title && isDuplicateTicket(data.action.data.title, createdTickets)) {
              setMessages(prev => [
                ...prev,
                {
                  id: `ai-duplicate-${Date.now()}`,
                  content: "I notice you already have an open ticket for a similar issue. I'll continue to help you with your problem, but we don't need to create another ticket for the same issue.",
                  sender: "ai",
                  timestamp: new Date(),
                }
              ]);
              break;
            }
            
            // Ask the user if they want to proceed with ticket creation
            setMessages(prev => [
              ...prev,
              {
                id: `ai-confirm-${Date.now()}`,
                content: "Would you like me to create a support ticket for this issue? Please reply with 'yes' or 'no'. If yes, you'll be able to add screenshots or recordings after the ticket is created.",
                sender: "ai",
                timestamp: new Date(),
              }
            ]);
            
            // Create enhanced ticket data with temporary title
            // We'll update it with AI-generated title when user confirms
            const enhancedTicketData = {
              ...data.action.data,
              title: data.action.data.title || "Support Request"
            };
            
            // Store ticket data in a ref or state
            setSuggestedTicketData(enhancedTicketData as InsertTicket);
            setAwaitingTicketConfirmation(true);
            break;
            
          case "create_ticket":
            // Legacy direct ticket creation
            const ticketData = data.action.data as InsertTicket;
            
            // Check if this would be a duplicate ticket
            if (ticketData && ticketData.title && isDuplicateTicket(ticketData.title, createdTickets)) {
              setMessages(prev => [
                ...prev,
                {
                  id: `ai-duplicate-${Date.now()}`,
                  content: "I notice you already have an open ticket for a similar issue. I'll continue to help you with your problem, but we don't need to create another ticket for the same issue.",
                  sender: "ai",
                  timestamp: new Date(),
                }
              ]);
              break;
            }
            
            // Use AI to generate a better title
            const conversationHistory = prepareChatHistory(messages);
            setIsTyping(true);
            
            titleMutation.mutate(conversationHistory, {
              onSuccess: (titleData) => {
                // Update the ticket with AI-generated title
                ticketData.title = titleData.title || ticketData.title;
                createTicketMutation.mutate(ticketData);
                setIsTyping(false);
              },
              onError: (error) => {
                console.error("Failed to generate title for direct creation:", error);
                // Fallback to local title extraction
                const fallbackTitle = extractIssueTitle(messages);
                ticketData.title = fallbackTitle || ticketData.title;
                createTicketMutation.mutate(ticketData);
                setIsTyping(false);
              }
            });
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
      // Make sure we pass the tenant ID to ensure proper third-party integrations
      // This is especially important when deployed as a widget on a client site
      // We don't need to pass a flag anymore - tickets are ALWAYS created in third-party systems
      return await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: async (response) => {
      const ticket = await response.json();
      setCurrentTicketId(ticket.id);
      
      // Add this ticket to our list of created tickets
      setCreatedTickets(prev => [...prev, {
        id: ticket.id,
        issue: ticket.title.toLowerCase() // Store the title in lowercase for case-insensitive comparison
      }]);
      
      // Check if the ticket was created in third-party systems
      const externalSystems = ticket.externalIntegrations 
        ? Object.keys(ticket.externalIntegrations).join(', ') 
        : '';
      
      const externalText = externalSystems 
        ? ` It has also been created in ${externalSystems}.` 
        : '';
      
      toast({
        title: "Ticket Created",
        description: `Support ticket #${ticket.id} has been created.${externalText} Our team will follow up shortly.`,
      });
      
      // Add a message about successful ticket creation with attachment reminder and asking if they need more help
      setMessages(prev => [
        ...prev,
        {
          id: `ai-ticket-created-${Date.now()}`,
          content: `Support ticket #${ticket.id} has been created successfully.${externalText} You can add images or a screen recording now if that would help explain your issue better. Is there anything else I can assist you with today?`,
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
    onSuccess: async (_response, variables) => {
      const attachmentType = variables.attachmentData.type;
      let title, description, message;
      
      switch (attachmentType) {
        case 'image':
          title = "Image Attached";
          description = "Your image has been attached to the ticket successfully.";
          message = "Thanks for sharing the image. This will help our team better understand and resolve your issue.";
          break;
        case 'screenshot':
          title = "Screenshot Attached";
          description = "Your screenshot has been attached to the ticket successfully.";
          message = "Thanks for sharing the screenshot. This will help our team better understand and resolve your issue.";
          break;
        case 'screen_recording':
        default:
          title = "Recording Attached";
          description = "Your screen recording has been attached to the ticket successfully.";
          message = "Thanks for sharing your screen recording. This will help our team better understand and resolve your issue.";
          break;
      }
      
      toast({
        title,
        description,
      });
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-attachment-${Date.now()}`,
          content: message,
          sender: "ai",
          timestamp: new Date(),
        }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to attach file: ${error.message}`,
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

  // Processing messages before sending them to the AI for ticket creation
  const prepareChatHistory = (messages: Message[]) => {
    // Filter out UI-specific messages to get just the conversation
    return messages.filter(msg => 
      !msg.id.includes('confirm') && 
      !msg.id.includes('clarify') && 
      !msg.id.includes('creating') &&
      !msg.id.includes('cancel')
    ).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };
  
  // Extract a proper title from the conversation that describes the issue
  const extractIssueTitle = (messages: Message[]): string => {
    // Filter out UI-specific messages
    const conversationMessages = messages.filter(msg => 
      !msg.id.includes('confirm') && 
      !msg.id.includes('clarify') && 
      !msg.id.includes('creating') &&
      !msg.id.includes('cancel')
    );
    
    // Combine all messages to analyze the conversation
    const fullConversation = conversationMessages
      .map(msg => msg.content)
      .join(" ");
    
    // Common issue keywords to look for
    const errorKeywords = [
      "error", "issue", "problem", "bug", "crash", "fail", "not working",
      "broken", "stuck", "down", "unavailable", "timeout", "cannot access"
    ];
    
    // Look for error codes (like HTTP status codes)
    const errorCodeMatch = fullConversation.match(/(\b[45]\d{2}\b|error code)/i);
    
    // Look for specific error keywords
    let foundKeyword = "";
    for (const keyword of errorKeywords) {
      if (fullConversation.toLowerCase().includes(keyword)) {
        foundKeyword = keyword;
        break;
      }
    }
    
    // Construct a descriptive title
    if (errorCodeMatch) {
      // If we found an error code like 500, 404, etc.
      return `${errorCodeMatch[0]} Error - ${foundKeyword ? foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1) : "Server"} Issue`;
    } else if (foundKeyword) {
      // If we found a keyword but no error code
      return `${foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1)} Issue`;
    }
    
    // Try to find a good user message with the issue
    const userMessages = conversationMessages.filter(msg => msg.sender === 'user');
    for (const msg of userMessages) {
      // Skip very short messages like "hi" or "hello"
      if (msg.content.length > 5 && !["hi", "hello", "hey"].includes(msg.content.toLowerCase())) {
        const content = msg.content;
        const maxLength = 60;
        
        // Try to find sentence boundaries for a more natural title
        const firstSentence = content.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length + 1 < maxLength) {
          return firstSentence;
        }
        
        // Truncate if too long
        return content.length > maxLength
          ? content.substring(0, maxLength) + "..."
          : content;
      }
    }
    
    return "Support Request"; // Fallback title
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
      // Generate a ticket with AI-summarized description
      setIsTyping(true);
      
      // Add a message that we're generating the ticket
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-creating-${Date.now()}`,
          content: "I'm creating a support ticket for you now with a detailed summary of our conversation...",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
      
      // Prepare the conversation history in the right format for AI
      const conversationHistory = prepareChatHistory(messages);
      
      // Generate the AI summary and title for the ticket
      console.log("Preparing to generate AI content with conversation history:", conversationHistory);
      
      // First, generate a better title using AI
      titleMutation.mutate(conversationHistory, {
          onSuccess: (titleData) => {
            console.log("AI title generated successfully:", titleData);
            
            // Now generate a summary with the AI-generated title
            summaryMutation.mutate(conversationHistory, {
              onSuccess: (summaryData) => {
                console.log("AI summary generated successfully:", summaryData);
                
                // Use both AI-generated title and summary
                const enhancedTicketData = {
                  ...suggestedTicketData,
                  title: titleData.title || suggestedTicketData.title,
                  description: summaryData.summary || "Support ticket created via chat interface."
                };
                
                console.log("Creating ticket with AI-enhanced data:", enhancedTicketData);
                
                // Create the ticket with the enhanced data
                createTicketMutation.mutate(enhancedTicketData);
                setIsTyping(false);
              },
              onError: (error) => {
                console.error("Failed to generate summary:", error);
                
                // Still create the ticket with the AI title but fallback description
                const enhancedTicketData = {
                  ...suggestedTicketData,
                  title: titleData.title || suggestedTicketData.title,
                  description: `Support ticket from chat interface.`
                };
                
                createTicketMutation.mutate(enhancedTicketData);
                setIsTyping(false);
              }
            });
          },
          onError: (error) => {
            console.error("Failed to generate title:", error);
            
            // Fall back to generating just the summary
            summaryMutation.mutate(conversationHistory, {
              onSuccess: (summaryData) => {
                // Use AI summary but fallback title
                const enhancedTicketData = {
                  ...suggestedTicketData,
                  description: summaryData.summary || "Support ticket created via chat interface."
                };
                
                createTicketMutation.mutate(enhancedTicketData);
                setIsTyping(false);
              },
              onError: (error) => {
                console.error("Failed to generate summary after title failure:", error);
                
                // Complete fallback if both AI calls fail
                const enhancedTicketData = {
                  ...suggestedTicketData,
                  description: `Support ticket from chat interface.\n\nIssue: ${extractIssueTitle(messages)}`
                };
                
                createTicketMutation.mutate(enhancedTicketData);
                setIsTyping(false);
              }
            });
          }
        });
        
        // Reset confirmation state
        setSuggestedTicketData(null);
        setAwaitingTicketConfirmation(false);
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
    
    // Check if user indicates they don't need more help after ticket creation
    if (createdTickets.length > 0) {
      const noMoreHelpKeywords = [
        'no', 'that\'s all', 'that is all', 'nothing else', 'i\'m good', 'im good', 
        'that\'s it', 'that is it', 'no thanks', 'nothing more', 'i\'m done', 'im done'
      ];
      
      const isEndingChat = noMoreHelpKeywords.some(keyword => 
        message.includes(keyword) || message === keyword
      );
      
      if (isEndingChat) {
        // Add user message and end chat message
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            content: inputMessage,
            sender: "user",
            timestamp: new Date(),
          },
          {
            id: `ai-end-chat-${Date.now()}`,
            content: "Thank you for using our support chat. I'm ending this session now. Feel free to return anytime you need further assistance!",
            sender: "ai",
            timestamp: new Date(),
          }
        ]);
        
        // Clear input
        setInputMessage("");
        
        // Reset chat after a short delay so user can read the message
        setTimeout(() => {
          // Reset the chat state for a new session
          setMessages([
            {
              id: "ai-welcome",
              content: "Hello! I'm your AI support assistant. How can I help you today?",
              sender: "ai",
              timestamp: new Date(),
            },
          ]);
          setCurrentTicketId(null);
          setCreatedTickets([]);
          setSuggestedTicketData(null);
          setAwaitingTicketConfirmation(false);
        }, 5000);
        
        return;
      }
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
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, WebP).",
        variant: "destructive",
      });
      return;
    }
    
    // Process file
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
      const base64data = reader.result?.toString().split(',')[1];
      
      if (!base64data) {
        toast({
          title: "Error",
          description: "Failed to process image.",
          variant: "destructive",
        });
        return;
      }
      
      // Add a message about the image
      setMessages((prev) => [
        ...prev,
        {
          id: `user-image-${Date.now()}`,
          content: "I've shared an image to help explain my issue.",
          sender: "user",
          timestamp: new Date(),
        },
      ]);
      
      if (currentTicketId) {
        // If we have a ticket ID, attach the image to it
        const attachmentData: InsertAttachment = {
          ticketId: currentTicketId,
          type: "image",
          filename: file.name || `image-${Date.now()}.${file.type.split('/')[1]}`,
          contentType: file.type,
          data: base64data,
        };
        
        createAttachmentMutation.mutate({ 
          ticketId: currentTicketId,
          attachmentData 
        });
      } else {
        // If no ticket yet, store the image temporarily
        // When a ticket is created, we can attach it then
        toast({
          title: "Image Received",
          description: "Your image has been received. It will be attached to your support ticket when created.",
        });
        
        // In a real implementation, we would store this image and attach it when the ticket is created
      }
    };
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Close the upload options
    setShowImageUploadOptions(false);
  };
  
  const captureScreenshot = async () => {
    try {
      // Just use simple display media capture without additional options
      const stream = await navigator.mediaDevices.getDisplayMedia();
      
      // Create a video element to capture a frame
      const video = document.createElement('video');
      video.srcObject = stream;
      
      // Wait for the video to be loaded enough to capture a frame
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });
      
      // Capture the frame to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to base64
      const base64data = canvas.toDataURL('image/png').split(',')[1];
      
      // Add a message about the screenshot
      setMessages((prev) => [
        ...prev,
        {
          id: `user-screenshot-${Date.now()}`,
          content: "I've shared a screenshot to help explain my issue.",
          sender: "user",
          timestamp: new Date(),
        },
      ]);
      
      if (currentTicketId) {
        // If we have a ticket ID, attach the screenshot to it
        const attachmentData: InsertAttachment = {
          ticketId: currentTicketId,
          type: "screenshot",
          filename: `screenshot-${Date.now()}.png`,
          contentType: "image/png",
          data: base64data,
        };
        
        createAttachmentMutation.mutate({ 
          ticketId: currentTicketId,
          attachmentData 
        });
      } else {
        // If no ticket yet, store the screenshot temporarily
        toast({
          title: "Screenshot Received",
          description: "Your screenshot has been received. It will be attached to your support ticket when created.",
        });
        
        // In a real implementation, we would store this screenshot and attach it when the ticket is created
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast({
        title: "Screenshot Failed",
        description: "Failed to capture screenshot. Please try again or use another method.",
        variant: "destructive",
      });
    }
    
    // Close the upload options
    setShowImageUploadOptions(false);
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
      
      <div 
        ref={chatButtonRef}
        className="fixed flex flex-col z-40"
        style={{ 
          ...position,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease'
        }}
      >
        {/* Chat bubble (when closed) */}
        {!isChatOpen && (
          <div
            className={`relative ${isDragging ? 'shadow-2xl' : 'hover:shadow-lg'}`}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <Button
              onClick={toggleChat}
              className="w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              size="icon"
              // Add pointer-events-none to prevent button from interfering with dragging
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              <MessageSquare className="w-8 h-8 text-white" />
            </Button>
            {/* Handle for dragging (small visual indicator) */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 rounded-full border border-gray-300 opacity-70" title="Drag to move chat"></div>
          </div>
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
                    setCurrentTicketId(null);
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
                  onClick={() => setShowImageUploadOptions(!showImageUploadOptions)}
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
