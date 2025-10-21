import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import TenantSelector from "@/components/TenantSelector";
import { usePermissions } from "@/hooks/use-permissions";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserX,
  MessageSquare,
  Users
} from "lucide-react";

// Component to fetch and display creator name
function CreatorName({ createdBy }: { createdBy: number | null | undefined }) {
  const { data: user, isLoading } = useQuery<{id: number, name?: string, username: string, company?: string}>({
    queryKey: [`/api/users/${createdBy}`],
    enabled: !!createdBy,
  });

  if (isLoading) return <Skeleton className="h-4 w-20" />;
  if (!user) return <span className="text-gray-500">Unknown</span>;
  
  return <span className="text-gray-700">{user.name || user.username}</span>;
}

// Component to fetch and display company name
function CompanyName({ createdBy }: { createdBy: number | null | undefined }) {
  const { data: user, isLoading } = useQuery<{id: number, name?: string, username: string, company?: string}>({
    queryKey: [`/api/users/${createdBy}`],
    enabled: !!createdBy,
  });

  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (!user) return <span className="text-gray-500">-</span>;
  
  return <span className="text-gray-700">{user.company || '-'}</span>;
}

// Ticket status component with appropriate colors
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
    case "open": // Supporting both "new" and "open" for flexibility
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
    case "closed":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
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
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: permissions } = usePermissions();
  
  // Permission-based access control
  const isCreator = user?.role?.toLowerCase() === 'creator';
  const canAssignTickets = permissions?.canAssignTickets ?? false;
  const canEditTickets = permissions?.canEditOwnTickets ?? false;
  const canViewAllTickets = permissions?.canViewAllTickets ?? false;

  // Fetch tickets with tenant filter for creator role
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets', selectedTenantId],
    queryFn: async () => {
      try {
        const tenantParam = selectedTenantId ? `?tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/tickets${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        return response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Tickets fetch aborted during navigation');
          return [];
        }
        throw error;
      }
    }
  });

  // Fetch team members for assignment dropdown (only if user can assign tickets)
  const { data: teamMembers } = useQuery<any[]>({
    queryKey: ['/api/team-members', selectedTenantId],
    queryFn: async () => {
      if (!canAssignTickets && !isCreator) return [];
      try {
        const tenantParam = selectedTenantId ? `?tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/team-members${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch team members');
        }
        return response.json();
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        return [];
      }
    },
    enabled: canAssignTickets || isCreator
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

  // Assign ticket mutation (admin only)
  const assignTicketMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: number; assignedTo: string | null }) => {
      return await apiRequest('PATCH', `/api/tickets/${id}/assign`, { assignedTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Assignment Updated",
        description: "Ticket assignment has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to assign ticket: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter and search logic
  const filteredTickets = tickets?.filter(ticket => {
    // Permission-based filtering: If user can't view all tickets, only show their own
    if (!canViewAllTickets && !isCreator) {
      // Only show tickets created by the current user
      if (ticket.createdBy !== user?.id) {
        return false;
      }
    }
    
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
  const categories = Array.from(new Set(tickets?.map(ticket => ticket.category).filter(Boolean) || []));
  
  // Create a list of unique assignees for filtering
  const assignees = Array.from(new Set(tickets?.map(ticket => ticket.assignedTo).filter((assignee): assignee is string => Boolean(assignee)) || []));

  // Handle ticket status change
  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: ticketId, status: newStatus });
  };

  // Handle ticket assignment change (admin only)
  const handleAssignmentChange = (ticketId: number, assignedTo: string) => {
    const finalAssignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    assignTicketMutation.mutate({ id: ticketId, assignedTo: finalAssignedTo });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Tenant Selector - Only visible for creator role */}
          {isCreator && (
            <TenantSelector
              onTenantChange={setSelectedTenantId}
              selectedTenantId={selectedTenantId}
              className="w-full sm:w-[220px]"
              label="Filter by Tenant"
            />
          )}
          
          <Link href="/admin/tickets/new">
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Management</CardTitle>
          <CardDescription>
            View and manage support tickets with automatic workload-based assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="new">Open</TabsTrigger>
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
                        <TableHead>Created By</TableHead>
                        {isCreator && <TableHead>Company Name</TableHead>}
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.companyTicketId}</TableCell>
                          <TableCell>
                            <Link href={`/admin/tickets/${ticket.id}`}>
                              <span className="hover:underline text-blue-600 cursor-pointer">{ticket.title}</span>
                            </Link>
                          </TableCell>
                          <TableCell>{formatCategory(ticket.category || '')}</TableCell>
                          <TableCell><ComplexityBadge complexity={ticket.complexity || ''} /></TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell>
                            <CreatorName createdBy={ticket.createdBy} />
                          </TableCell>
                          {isCreator && (
                            <TableCell>
                              <CompanyName createdBy={ticket.createdBy} />
                            </TableCell>
                          )}
                          <TableCell>
                            {canAssignTickets ? (
                              <Select
                                value={ticket.assignedTo || 'unassigned'}
                                onValueChange={(value) => handleAssignmentChange(ticket.id, value)}
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <Users className="mr-2 h-4 w-4" />
                                  <SelectValue placeholder="Assign To" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {teamMembers?.map((member) => (
                                    <SelectItem key={member.id} value={member.username}>
                                      {member.name || member.username}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              ticket.assignedTo ? 
                                ticket.assignedTo.charAt(0).toUpperCase() + ticket.assignedTo.slice(1) :
                                "Unassigned"
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {canEditTickets ? (
                                <Select
                                  value={ticket.status}
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
                              ) : (
                                <StatusBadge status={ticket.status} />
                              )}
                            </div>
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