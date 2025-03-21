import MetricsOverview from "./MetricsOverview";
import RecentTickets from "./RecentTickets";
import TicketDistribution from "./TicketDistribution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ticket } from "@shared/schema";
import { format, formatDistance } from "date-fns";

export default function Dashboard() {
  const { data: tickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of ticket analytics and performance</p>
      </div>

      <MetricsOverview />

      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <RecentTickets />
        <TicketDistribution />
      </div>

      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Active Tickets</h2>
          <div className="flex space-x-2">
            <select className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary">
              <option>All Categories</option>
              <option>Authentication</option>
              <option>Billing</option>
              <option>Feature Requests</option>
              <option>Other</option>
            </select>
            <select className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary">
              <option>All Status</option>
              <option>New</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Loading tickets...
                  </TableCell>
                </TableRow>
              ) : !tickets || tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>{formatCategory(ticket.category)}</TableCell>
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
              Showing <span className="font-medium">1</span> to <span className="font-medium">
                {tickets?.length || 0}
              </span> of{" "}
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
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return <Badge variant="destructive">New</Badge>;
    case "in_progress":
      return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    case "resolved":
      return <Badge variant="success" className="bg-green-100 text-green-800">Resolved</Badge>;
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
