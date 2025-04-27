import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { formatDistance, format } from "date-fns";
import { Ticket, Message, InsertMessage } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Bot, CircleCheck, Clock, Calendar } from "lucide-react";
import { TicketStatusProgress } from "@/components/admin/TicketStatusProgress";

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  const { data: ticket, isLoading: ticketLoading } = useQuery<Ticket & { messages: Message[] }>({
    queryKey: [`/api/tickets/${ticketId}`],
  });

  const createMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const message: InsertMessage = {
        ticketId,
        sender: "support",
        content,
        metadata: null,
      };
      return await apiRequest("POST", `/api/tickets/${ticketId}/messages`, message);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      toast({
        title: "Ticket updated",
        description: "Ticket status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update ticket: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateTicketMutation.mutate(status);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    createMessageMutation.mutate(newMessage);
  };

  if (ticketLoading) {
    return <TicketDetailsSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
        <p className="text-gray-600">The ticket you're looking for doesn't exist or has been deleted.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Messages Thread (2/3 width on large screens) */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-gray-900">
                Ticket #{ticket.id}: {ticket.title}
              </CardTitle>
              <StatusBadge status={ticket.status} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start">
                <Avatar className="h-10 w-10 mr-4 flex-shrink-0">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium">Customer</h3>
                    <time className="text-xs text-gray-500">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                  <div className="mt-1">
                    <div className="max-h-[300px] overflow-y-auto p-3 bg-white rounded-md border border-gray-100 shadow-sm">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {ticket.messages && ticket.messages.length > 0 ? (
                ticket.messages.map((message) => (
                  <div key={message.id} className="p-6">
                    <div className="flex items-start">
                      <Avatar className="h-10 w-10 mr-4 flex-shrink-0">
                        {message.sender === "ai" ? (
                          <AvatarFallback className="bg-indigo-100 text-primary">
                            <Bot className="h-6 w-6" />
                          </AvatarFallback>
                        ) : message.sender === "user" ? (
                          <AvatarFallback className="bg-gray-200">U</AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-green-100 text-green-800">S</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-medium">
                            {message.sender === "ai"
                              ? "AI Assistant"
                              : message.sender === "user"
                              ? "Customer"
                              : "Support Team"}
                          </h3>
                          <time className="text-xs text-gray-500">
                            {format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </time>
                        </div>
                        <div className="mt-1">
                          <div className={`p-3 rounded-md border ${
                            message.sender === "ai" 
                              ? "bg-blue-50 border-blue-100" 
                              : message.sender === "user"
                              ? "bg-gray-50 border-gray-100"
                              : "bg-green-50 border-green-100"
                          }`}>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">No messages yet</div>
              )}
            </div>

            {/* Reply form */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <form onSubmit={handleSendMessage}>
                <Textarea
                  placeholder="Type your reply..."
                  className="w-full min-h-[120px] mb-3"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={ticket.status === "resolved"}
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || createMessageMutation.isPending || ticket.status === "resolved"}
                  >
                    {createMessageMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Info (1/3 width on large screens) */}
      <div>
        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <CardTitle className="text-lg font-medium text-gray-900">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                <Select
                  value={selectedStatus || ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateTicketMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Animated Ticket Status Progress Bar */}
                <div className="mt-3">
                  <TicketStatusProgress status={selectedStatus || ticket.status} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Category</h3>
                <Badge className="capitalize">{formatCategory(ticket.category)}</Badge>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Assigned To</h3>
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{ticket.assignedTo ? ticket.assignedTo : "Unassigned"}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Complexity</h3>
                <ComplexityBadge complexity={ticket.complexity || "medium"} />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Created</h3>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>

              {ticket.resolvedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Resolved</h3>
                  <div className="flex items-center">
                    <CircleCheck className="h-5 w-5 mr-2 text-green-500" />
                    <span>{format(new Date(ticket.resolvedAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              )}

              {ticket.aiResolved && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-start">
                    <Bot className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">Resolved by AI</h3>
                      <p className="text-xs text-green-700 mt-1">
                        This ticket was automatically resolved by the AI assistant.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ticket.aiNotes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">AI Notes</h3>
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
                    {ticket.aiNotes}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return <Badge variant="destructive">New</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function ComplexityBadge({ complexity }: { complexity: string | null }) {
  switch (complexity) {
    case "simple":
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Simple</Badge>;
    case "medium":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
    case "complex":
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Complex</Badge>;
    default:
      return <Badge variant="outline">{complexity || "Medium"}</Badge>;
  }
}

function formatCategory(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function TicketDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-start">
                <Skeleton className="h-10 w-10 rounded-full mr-4" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-20 w-full mt-2" />
                </div>
              </div>
              
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-16 w-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {Array(5).fill(0).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
