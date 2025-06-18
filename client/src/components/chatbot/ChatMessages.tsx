import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Bot, User } from "lucide-react";
import FormattedMessage from "./FormattedMessage";

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

type ChatMessagesProps = {
  messages: Message[];
  isTyping: boolean;
  ticketCreatedThisSession?: boolean;
};

export default function ChatMessages({ messages, isTyping, ticketCreatedThisSession = false }: ChatMessagesProps) {
  return (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex mb-4 ${message.sender === "user" ? "justify-end" : ""}`}
        >
          {message.sender === "ai" && (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          )}
          
          <div
            className={`${
              message.sender === "user"
                ? "mr-3 bg-primary py-2 px-4 rounded-lg rounded-tr-none text-white max-w-[75%]"
                : "ml-3 bg-gray-100 py-2 px-4 rounded-lg rounded-tl-none max-w-[75%]"
            }`}
          >
            <FormattedMessage 
              content={message.content} 
              isUser={message.sender === "user"} 
            />
            
            {/* Render action buttons if present */}
            {message.actionButtons && message.actionButtons.type === 'ticket_creation' && (
              <div className="flex gap-2 mt-3">
                {ticketCreatedThisSession ? (
                  <div className="text-xs text-gray-600 italic">
                    ✓ Ticket already created this session
                  </div>
                ) : (
                  <>
                    <Button 
                      size="sm" 
                      onClick={message.actionButtons.onYes}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Yes, create ticket
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={message.actionButtons.onNo}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      No, continue chat
                    </Button>
                  </>
                )}
              </div>
            )}
            <span
              className={`text-xs mt-1 block ${
                message.sender === "user" ? "text-indigo-200" : "text-gray-500"
              }`}
            >
              {format(message.timestamp, "h:mm a")}
            </span>
          </div>
          
          {message.sender === "user" && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex mb-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="ml-3 bg-gray-100 py-3 px-4 rounded-lg rounded-tl-none">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
