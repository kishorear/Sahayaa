import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { formatDistance } from "date-fns";
import { Ticket } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

// Component to fetch and display creator name
function CreatorName({ createdBy }: { createdBy: number | null | undefined }) {
  const { data: user, isLoading } = useQuery<{id: number, name?: string, username: string}>({
    queryKey: [`/api/users/${createdBy}`],
    enabled: !!createdBy,
  });

  if (isLoading) return <Skeleton className="h-4 w-20" />;
  if (!user) return <span className="text-gray-500">Unknown</span>;
  
  return <span className="text-gray-700">{user.name || user.username}</span>;
}

export default function TicketList() {
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtered tickets based on search and filters
  const filteredTickets = tickets?.filter((ticket) => {
    // Search filter - only apply search if searchQuery has content
    const matchesSearch = 
      !searchQuery ||
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Function to get tenant-specific ticket number
  const getTenantTicketNumber = (ticket: Ticket) => {
    // Use the companyTicketId field if available, otherwise fall back to global ID
    return ticket.companyTicketId || ticket.id;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage all support tickets</p>
      </div>

      <Card className="mb-8">
        <CardHeader className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle className="text-lg font-medium text-gray-900">All Tickets</CardTitle>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.trim())}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="billing">Billing</option>
              <option value="feature_request">Feature Requests</option>
              <option value="technical_issue">Technical Issue</option>
              <option value="documentation">Documentation</option>
              <option value="other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                ) : !filteredTickets || filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      {tickets?.length ? "No tickets match your filters" : "No tickets found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{getTenantTicketNumber(ticket)}</TableCell>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell>{formatCategory(ticket.category)}</TableCell>
                      <TableCell>
                        <SourceBadge source={ticket.source} />
                      </TableCell>
                      <TableCell>
                        <CreatorName createdBy={ticket.createdBy} />
                      </TableCell>
                      <TableCell>{ticket.assignedTo || "Unassigned"}</TableCell>
                      <TableCell>
                        {formatDistance(new Date(ticket.createdAt), new Date(), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/tickets/${ticket.id}`}>
                          <Button variant="link" className="text-primary hover:text-indigo-900">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{filteredTickets?.length || 0}</span> of{" "}
                <span className="font-medium">{tickets?.length || 0}</span> results
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return <Badge variant="destructive">New</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    case "resolved":
      return <Badge variant="default" className="bg-green-100 text-green-800">Resolved</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatCategory(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SourceBadge({ source }: { source: string | undefined | null }) {
  switch (source) {
    case "email":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Email</Badge>;
    case "widget":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Widget</Badge>;
    case "api":
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">API</Badge>;
    case "chat":
    default:
      return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">Chat</Badge>;
  }
}