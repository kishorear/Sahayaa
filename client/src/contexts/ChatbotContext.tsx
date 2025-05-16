import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define message type for use throughout the app
export type ChatMessage = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

// Define the shape of our context
type ChatbotContextType = {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  position: { top: string; left: string; right: string; bottom: string };
  setPosition: React.Dispatch<React.SetStateAction<{ top: string; left: string; right: string; bottom: string }>>;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
};

// Create the context with default values
const ChatbotContext = createContext<ChatbotContextType>({
  isChatOpen: false,
  setIsChatOpen: () => {},
  messages: [],
  setMessages: () => {},
  position: { right: '24px', bottom: '24px', left: 'auto', top: 'auto' },
  setPosition: () => {},
  isDragging: false,
  setIsDragging: () => {},
});

// Custom hook to use the chatbot context
export const useChatbot = () => useContext(ChatbotContext);

interface ChatbotProviderProps {
  children: ReactNode;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  // Chat open state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Position state - default to bottom right
  const [position, setPosition] = useState({ 
    right: '24px', 
    bottom: '24px', 
    left: 'auto', 
    top: 'auto' 
  });
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Load saved messages from sessionStorage on initial render
  useEffect(() => {
    // Only run this once on initial load
    const savedChatState = sessionStorage.getItem('chatbotState');
    
    if (savedChatState) {
      try {
        const state = JSON.parse(savedChatState);
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

  // Save chat state to sessionStorage whenever it changes
  useEffect(() => {
    // Don't save empty state
    if (messages.length === 0) return;
    
    const chatState = {
      messages,
      isOpen: isChatOpen,
    };
    
    sessionStorage.setItem('chatbotState', JSON.stringify(chatState));
  }, [messages, isChatOpen]);

  return (
    <ChatbotContext.Provider
      value={{
        isChatOpen,
        setIsChatOpen,
        messages,
        setMessages,
        position,
        setPosition,
        isDragging,
        setIsDragging,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
};