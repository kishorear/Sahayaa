import { useQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { Ticket } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function RecentTickets() {
  const { data: recentTickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/metrics/recent"],
  });

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-200">
        {isLoading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="ml-3 h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="mt-2 h-4 w-full" />
                <div className="mt-2 flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))
        ) : !recentTickets || recentTickets.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No recent tickets found</div>
        ) : (
          recentTickets.map((ticket) => (
            <div key={ticket.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <StatusBadge status={ticket.status} />
                  <h3 className="ml-3 text-sm font-medium text-gray-900">{ticket.title}</h3>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {formatDistance(new Date(ticket.createdAt), new Date(), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
              </div>
              <div className="mt-2 flex justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <User className="h-4 w-4 mr-1" />
                  <span>{ticket.assignedTo || "Unassigned"}</span>
                </div>
                <div>
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-transparent">
                    {formatCategory(ticket.category)}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 px-6 py-3 flex justify-center">
        <Link href="/admin/tickets">
          <Button variant="link" className="text-sm font-medium text-primary hover:text-indigo-700">
            View all tickets
          </Button>
        </Link>
      </CardFooter>
    </Card>
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
