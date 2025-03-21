import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Bot, User } from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
};

type ChatMessagesProps = {
  messages: Message[];
  isTyping: boolean;
};

export default function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
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
            <p className={`text-sm ${message.sender === "user" ? "text-white" : "text-gray-800"}`}>
              {message.content}
            </p>
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
