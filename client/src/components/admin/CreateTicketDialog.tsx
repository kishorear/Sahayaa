import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertTicketSchema, type InsertTicket } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

type SimilarTicket = {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  createdAt: string;
  score: number;
};

type CreateTicketDialogProps = {
  children?: React.ReactNode;
};

export default function CreateTicketDialog({ children }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [similarTickets, setSimilarTickets] = useState<SimilarTicket[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertTicket>({
    resolver: zodResolver(insertTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      status: "new",
      tenantId: user?.tenantId || 1,
      createdBy: user?.id || null,
      assignedTo: null,
    },
  });

  // Check for duplicate tickets
  const checkDuplicates = async (title: string, description: string) => {
    if (!title || !description || title.length < 3 || description.length < 5) {
      return;
    }

    try {
      setCheckingDuplicates(true);
      const data: { hasDuplicates: boolean; similarTickets: SimilarTicket[] } = await apiRequest('POST', '/api/tickets/check-duplicates', {
        title,
        description,
      });

      if (data.hasDuplicates && data.similarTickets.length > 0) {
        setSimilarTickets(data.similarTickets);
        setShowSimilarWarning(true);
      } else {
        setSimilarTickets([]);
        setShowSimilarWarning(false);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      // Continue without duplicate check
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertTicket) => {
      return await apiRequest('POST', '/api/tickets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been created successfully.",
      });
      form.reset();
      setSimilarTickets([]);
      setShowSimilarWarning(false);
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertTicket) => {
    // If similar tickets found and user hasn't acknowledged, check again
    if (!showSimilarWarning) {
      await checkDuplicates(data.title, data.description);
      // If duplicates found, wait for user confirmation
      if (similarTickets.length > 0) {
        return;
      }
    }

    // Create the ticket
    createTicketMutation.mutate(data);
  };

  const handleDescriptionBlur = () => {
    const title = form.getValues('title');
    const description = form.getValues('description');
    checkDuplicates(title, description);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-new-ticket">
            <MessageSquare className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new support ticket.
          </DialogDescription>
        </DialogHeader>

        {showSimilarWarning && similarTickets.length > 0 && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Similar Tickets Found</AlertTitle>
            <AlertDescription className="text-yellow-700">
              We found {similarTickets.length} similar open ticket{similarTickets.length > 1 ? 's' : ''}. 
              You might want to check them before creating a new one.
              <div className="mt-3 space-y-2">
                {similarTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-white border border-yellow-200 rounded-md p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/admin/tickets/${ticket.id}`}>
                          <p className="font-medium text-sm text-blue-600 hover:underline cursor-pointer truncate">
                            {ticket.title}
                          </p>
                        </Link>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {ticket.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(ticket.score * 100)}% match
                          </span>
                        </div>
                      </div>
                      <Link href={`/admin/tickets/${ticket.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          data-testid={`button-view-ticket-${ticket.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSimilarTickets([]);
                    setShowSimilarWarning(false);
                  }}
                  data-testid="button-create-anyway"
                >
                  Create Ticket Anyway
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of the issue"
                      {...field}
                      data-testid="input-ticket-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the issue"
                      rows={5}
                      {...field}
                      onBlur={handleDescriptionBlur}
                      data-testid="input-ticket-description"
                    />
                  </FormControl>
                  <FormMessage />
                  {checkingDuplicates && (
                    <p className="text-xs text-gray-500">Checking for similar tickets...</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ticket-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="technical_issue">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="account_access">Account Access</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setSimilarTickets([]);
                  setShowSimilarWarning(false);
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTicketMutation.isPending || checkingDuplicates}
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
