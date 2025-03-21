import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserX,
  MessageSquare 
} from "lucide-react";

// Ticket status component with appropriate colors
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
    case "closed":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Format category names for display
function formatCategory(category: string) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format complexity level with visual indicator
function ComplexityBadge({ complexity }: { complexity: string | null }) {
  switch (complexity) {
    case "simple":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Simple</Badge>;
    case "medium":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
    case "complex":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Complex</Badge>;
    default:
      return <Badge>{complexity || 'Unknown'}</Badge>;
  }
}

export default function EnhancedTicketList() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets'],
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update ticket status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter and search logic
  const filteredTickets = tickets?.filter(ticket => {
    // Filter by status
    if (filterStatus !== "all" && ticket.status !== filterStatus) {
      return false;
    }
    
    // Filter by category
    if (filterCategory !== "all" && ticket.category !== filterCategory) {
      return false;
    }
    
    // Filter by assigned to
    if (filterAssignedTo !== "all" && ticket.assignedTo !== filterAssignedTo) {
      return false;
    }
    
    // Search in title and description
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Create a list of unique categories for filtering
  const categories = Array.from(new Set(tickets?.map(ticket => ticket.category || '') || []));
  
  // Create a list of unique assignees for filtering
  const assignees = Array.from(new Set(tickets?.map(ticket => ticket.assignedTo || '') || []));

  // Handle ticket status change
  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: ticketId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ticket Management</h2>
        <Link href="/admin/tickets/new">
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategory(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
                  <SelectTrigger className="w-[150px]">
                    <UserX className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Assigned To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee} value={assignee}>
                        {assignee.charAt(0).toUpperCase() + assignee.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={currentView} className="mt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 rounded-md border p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTickets && filteredTickets.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Complexity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.id}</TableCell>
                          <TableCell>
                            <Link href={`/admin/tickets/${ticket.id}`}>
                              <a className="hover:underline text-blue-600">{ticket.title}</a>
                            </Link>
                          </TableCell>
                          <TableCell>{formatCategory(ticket.category || '')}</TableCell>
                          <TableCell><ComplexityBadge complexity={ticket.complexity || ''} /></TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell>
                            {ticket.assignedTo ? 
                              ticket.assignedTo.charAt(0).toUpperCase() + ticket.assignedTo.slice(1) :
                              "Unassigned"}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={ticket.status}
                              onValueChange={(value) => handleStatusChange(ticket.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue placeholder="Change Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8 text-center border rounded-md">
                  <div>
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No tickets found</h3>
                    <p className="text-sm text-muted-foreground">
                      There are no tickets matching your current filters
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}