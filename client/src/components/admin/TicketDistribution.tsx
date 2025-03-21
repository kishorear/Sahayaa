import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCategoryDistribution } from "@shared/schema";

const COLORS = [
  "bg-primary",
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-gray-500",
];

export default function TicketDistribution() {
  const [timeRange, setTimeRange] = useState<"weekly" | "monthly">("monthly");
  const { data: distribution, isLoading } = useQuery<TicketCategoryDistribution[]>({
    queryKey: ["/api/metrics/categories"],
  });

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">Ticket Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">By Category</span>
            <span className="text-2xl font-semibold text-gray-900">
              {distribution?.reduce((sum, item) => sum + item.count, 0) || 0}
            </span>
            <span className="text-sm text-green-600">+4.5% from last week</span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={timeRange === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("weekly")}
              className={timeRange === "weekly" ? "bg-primary text-white" : ""}
            >
              Weekly
            </Button>
            <Button
              variant={timeRange === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("monthly")}
              className={timeRange === "monthly" ? "bg-primary text-white" : ""}
            >
              Monthly
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6 w-full">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
          </div>
        ) : !distribution || distribution.length === 0 ? (
          <div className="text-center text-gray-500 p-4">No data available</div>
        ) : (
          <div className="space-y-6 w-full">
            {distribution.map((item, index) => (
              <div key={item.category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {formatCategory(item.category)}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${COLORS[index % COLORS.length]} h-2.5 rounded-full`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCategory(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
