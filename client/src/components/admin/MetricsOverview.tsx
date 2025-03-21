import { useQuery } from "@tanstack/react-query";
import { Check, Clock, BarChartBig, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketSummary } from "@shared/schema";

export default function MetricsOverview() {
  const { data: metrics, isLoading } = useQuery<TicketSummary>({
    queryKey: ["/api/metrics/summary"],
  });

  const metricsItems = [
    {
      title: "Total Tickets",
      value: metrics?.totalTickets || 0,
      icon: BarChartBig,
      color: "bg-primary bg-opacity-10",
      textColor: "text-primary",
    },
    {
      title: "Resolved",
      value: metrics?.resolvedTickets || 0,
      icon: Check,
      color: "bg-success bg-opacity-10",
      textColor: "text-success",
    },
    {
      title: "Average Time",
      value: metrics?.avgResponseTime || "N/A",
      icon: Clock,
      color: "bg-warning bg-opacity-10",
      textColor: "text-warning",
    },
    {
      title: "AI Resolution Rate",
      value: metrics?.aiResolvedPercentage || "0%",
      icon: CheckCircle,
      color: "bg-primary bg-opacity-10",
      textColor: "text-primary",
    },
  ];

  return (
    <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="ml-4 space-y-2">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-6 w-[50px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        : metricsItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 mr-4 ${item.color} rounded-full`}>
                    <item.icon className={`w-6 h-6 ${item.textColor}`} />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">{item.title}</p>
                    <p className="text-lg font-semibold text-gray-700">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}
