import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCcw, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface ChatLog {
  id: number;
  tenantId: number;
  userId: number | null;
  ticketId: number | null;
  sender: string;
  content: string;
  metadata: any;
  createdAt: string;
}

export default function ChatLogsSettings() {
  const { toast } = useToast();

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/chat-logs"],
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/chat-logs", "DELETE"),
    onSuccess: () => {
      toast({
        title: "Chat logs cleared",
        description: "All chat logs have been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat-logs"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat logs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logs: ChatLog[] = logsData?.logs || [];

  const downloadLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs downloaded",
      description: "Chat logs have been downloaded successfully.",
    });
  };

  const getSenderBadgeColor = (sender: string) => {
    switch (sender.toLowerCase()) {
      case "user":
        return "bg-blue-500";
      case "ai":
        return "bg-purple-500";
      case "support":
        return "bg-green-500";
      case "system":
        return "bg-gray-500";
      default:
        return "bg-orange-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chat Logs</CardTitle>
            <CardDescription>
              View and manage all chat interactions. Logs are stored for audit and compliance purposes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-logs"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {logs.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLogs}
                  data-testid="button-download-logs"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      data-testid="button-clear-logs"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Logs
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all chat logs. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearLogsMutation.mutate()}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete All Logs
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading chat logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500" data-testid="text-no-logs">
            No chat logs found. Logs will appear here as users interact with the chat system.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600" data-testid="text-log-count">
                Total logs: <span className="font-semibold">{logs.length}</span>
              </p>
            </div>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    data-testid={`log-item-${log.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSenderBadgeColor(log.sender)}>
                          {log.sender}
                        </Badge>
                        {log.ticketId && (
                          <Badge variant="outline">Ticket #{log.ticketId}</Badge>
                        )}
                        {log.userId && (
                          <Badge variant="outline">User ID: {log.userId}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {log.content}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View metadata
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
