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
import { apiRequest } from "@/lib/queryClient";

// Define the Ticket type explicitly since we're accessing cross-tenant tickets
type Ticket = {
  id: number;
  tenantId: number;
  teamId: number | null;
  createdBy: number | null;
  title: string;
  description: string;
  status: string;
  category: string;
  complexity: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  aiResolved: boolean;
  aiNotes: string | null;
  externalIntegrations: any | null;
  clientMetadata: any | null;
};
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserX,
  MessageSquare,
  Building
} from "lucide-react";

// Ticket status component with appropriate colors
function StatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case "new":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Resolved</Badge>;
    case "closed":
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Closed</Badge>;
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  }
}

// Complexity badge component
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

export default function CreatorTicketList() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const [filterTenant, setFilterTenant] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tickets (using creator-specific endpoint that returns cross-tenant tickets)
  const { data: tickets, isLoading: isLoadingTickets, error: ticketsError } = useQuery<Ticket[]>({
    queryKey: ['/api/creator/tickets']
  });

  // Log data for debugging
  if (tickets) {
    console.log('✅ Tickets fetched successfully:', tickets.length, 'tickets');
  }
  
  if (ticketsError) {
    console.error('❌ Error fetching tickets:', ticketsError);
  }

  // Fetch tenants for filtering
  const { data: tenants, isLoading: isLoadingTenants, error: tenantsError } = useQuery<any[]>({
    queryKey: ['/api/creator/tenants']
  });
  
  // Log data for debugging
  if (tenants) {
    console.log('✅ Tenants fetched successfully:', tenants.length, 'tenants');
  }
  
  if (tenantsError) {
    console.error('❌ Error fetching tenants:', tenantsError);
  }

  // Mutation for updating ticket status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => {
      return apiRequest(`/api/tickets/${id}/status`, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tickets'] });
      toast({
        title: "Status updated",
        description: "The ticket status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update ticket status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Filter and search logic
  const filteredTickets = tickets?.filter(ticket => {
    // Filter by tab/view - this is the main status filter from the tabs
    if (currentView !== "all" && ticket.status !== currentView) {
      return false;
    }
    
    // Filter by status dropdown (additional filtering)
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
    
    // Filter by tenant
    if (filterTenant !== "all" && ticket.tenantId !== parseInt(filterTenant)) {
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
        <h2 className="text-3xl font-bold tracking-tight">Cross-Tenant Ticket Management</h2>
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
          <div className="flex flex-col space-y-4 mb-6 md:flex-row md:space-y-0 md:space-x-4">
            {/* Search box */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter dropdowns */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
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
                  {assignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>{assignee || 'Unassigned'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTenant} onValueChange={setFilterTenant}>
                <SelectTrigger className="w-[150px]">
                  <Building className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants?.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="new">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={currentView} className="mt-0">
              {isLoadingTickets || isLoadingTenants ? (
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
                        <TableHead>Tenant</TableHead>
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
                          <TableCell className="font-medium">#{ticket.id}</TableCell>
                          <TableCell>
                            <Link href={`/admin/tickets/${ticket.id}`}>
                              <span className="hover:underline cursor-pointer">{ticket.title}</span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {tenants?.find(t => t.id === ticket.tenantId)?.name || `Tenant ${ticket.tenantId}`}
                          </TableCell>
                          <TableCell>{ticket.category}</TableCell>
                          <TableCell>
                            <ComplexityBadge complexity={ticket.complexity} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell>{ticket.assignedTo || "Unassigned"}</TableCell>
                          <TableCell>
                            {ticket.createdAt 
                              ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) 
                              : "Unknown"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/tickets/${ticket.id}`}>
                              <Button variant="outline" size="sm" className="h-8 mr-2">
                                View Details
                              </Button>
                            </Link>
                            <Select 
                              defaultValue={ticket.status || "new"}
                              onValueChange={(value) => handleStatusChange(ticket.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue placeholder="Change Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Open</SelectItem>
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