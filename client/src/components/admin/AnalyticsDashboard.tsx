import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCategoryDistribution } from '@shared/schema';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard() {
  const [timePeriod, setTimePeriod] = useState("weekly");

  // Fetch data for ticket analytics
  const { data: summaryData, isLoading: summaryLoading } = useQuery<{
    totalTickets: number;
    resolvedTickets: number;
    avgResponseTime: string;
    aiResolvedPercentage: string;
  }>({
    queryKey: ['/api/metrics/summary'],
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery<TicketCategoryDistribution[]>({
    queryKey: ['/api/metrics/categories'],
  });

  // Response time metrics (mock data for now)
  const responseTimeData = [
    { name: 'Mon', avg: 3.4 },
    { name: 'Tue', avg: 2.8 },
    { name: 'Wed', avg: 4.2 },
    { name: 'Thu', avg: 3.0 },
    { name: 'Fri', avg: 2.5 },
    { name: 'Sat', avg: 1.8 },
    { name: 'Sun', avg: 1.5 },
  ];

  // Daily ticket volume (mock data for now)
  const ticketVolumeData = [
    { name: 'Mon', volume: 12 },
    { name: 'Tue', volume: 19 },
    { name: 'Wed', volume: 15 },
    { name: 'Thu', volume: 22 },
    { name: 'Fri', volume: 18 },
    { name: 'Sat', volume: 8 },
    { name: 'Sun', volume: 6 },
  ];

  // Format category name for display
  function formatCategory(category: string) {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{summaryData?.totalTickets || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v4.34" />
              <path d="M3 15h10" />
              <path d="m14 9 7-7m-7 0h7v7" />
            </svg>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{summaryData?.resolvedTickets || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              +15.6% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{summaryData?.avgResponseTime || "N/A"}</div>
            )}
            <p className="text-xs text-muted-foreground">
              -7.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Resolution Rate</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M21 7v6m0 0v6m0-6h-6m6 0H3" />
            </svg>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{summaryData?.aiResolvedPercentage || "0%"}</div>
            )}
            <p className="text-xs text-muted-foreground">
              +9.4% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="volume">Ticket Volume</TabsTrigger>
          <TabsTrigger value="response">Response Time</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Distribution by Category</CardTitle>
              <CardDescription>
                Breakdown of support tickets by category
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {categoryLoading ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-[350px] w-[350px] rounded-full" />
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="category"
                        label={({ category }) => formatCategory(category)}
                      >
                        {categoryData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, formatCategory(name as string)]}
                      />
                      <Legend formatter={(value) => formatCategory(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Ticket Volume</CardTitle>
              <CardDescription>
                Number of tickets created per day over the last week
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="volume" fill="#8884d8" name="Ticket Volume" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time</CardTitle>
              <CardDescription>
                Average time (in hours) to first response per day
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg" fill="#82ca9d" name="Avg. Response Time (hours)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}