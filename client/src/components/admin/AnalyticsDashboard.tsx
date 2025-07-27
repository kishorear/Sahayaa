import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCategoryDistribution } from '@shared/schema';
import TenantSelector from "@/components/TenantSelector";
import { useAuth } from "@/hooks/use-auth";
import TeamWorkload from "@/components/admin/TeamWorkload";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState("weekly");
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>(undefined);
  
  // Only show tenant selector for creator role
  const isCreator = user?.role?.toLowerCase() === 'creator';

  // Fetch data for ticket analytics with tenant filtering for creator role
  const { data: summaryData, isLoading: summaryLoading } = useQuery<{
    totalTickets: number;
    resolvedTickets: number;
    avgResponseTime: string;
    aiResolvedPercentage: string;
  }>({
    queryKey: ['/api/metrics/summary', timePeriod, selectedTenantId],
    queryFn: async () => {
      try {
        const tenantParam = selectedTenantId ? `&tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/metrics/summary?timePeriod=${timePeriod}${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch metrics summary');
        }
        return response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Summary metrics fetch aborted during navigation');
          return null;
        }
        throw error;
      }
    }
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery<TicketCategoryDistribution[]>({
    queryKey: ['/api/metrics/categories', timePeriod, selectedTenantId],
    queryFn: async () => {
      try {
        const tenantParam = selectedTenantId ? `&tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/metrics/categories?timePeriod=${timePeriod}${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch category metrics');
        }
        return response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Category metrics fetch aborted during navigation');
          return [];
        }
        throw error;
      }
    }
  });

  // Response time metrics from real data
  const { data: responseTimeData = [], isLoading: responseTimeLoading } = useQuery<{name: string, avg: number}[]>({
    queryKey: ['/api/metrics/response-time', timePeriod, selectedTenantId],
    queryFn: async () => {
      try {
        const tenantParam = selectedTenantId ? `&tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/metrics/response-time?timePeriod=${timePeriod}${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch response time metrics');
        }
        return response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Response time metrics fetch aborted during navigation');
          return [];
        }
        throw error;
      }
    }
  });

  // Daily ticket volume from real data
  const { data: ticketVolumeData = [], isLoading: volumeLoading } = useQuery<{name: string, volume: number}[]>({
    queryKey: ['/api/metrics/ticket-volume', timePeriod, selectedTenantId],
    queryFn: async () => {
      try {
        const tenantParam = selectedTenantId ? `&tenantId=${selectedTenantId}` : '';
        const response = await fetch(`/api/metrics/ticket-volume?timePeriod=${timePeriod}${tenantParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ticket volume metrics');
        }
        return response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Ticket volume metrics fetch aborted during navigation');
          return [];
        }
        throw error;
      }
    }
  });

  // Format category name for display
  function formatCategory(category: string) {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
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
          
          <div className="flex items-center gap-2">
            {(summaryLoading || categoryLoading || responseTimeLoading || volumeLoading) && (
              <div className="flex items-center text-sm text-muted-foreground">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Updating...
              </div>
            )}
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
        </div>
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
              For {timePeriod} time period
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
              For {timePeriod} time period
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
              For {timePeriod} time period
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
              For {timePeriod} time period
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
          <TabsTrigger value="workload">Team Workload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Distribution by Category</CardTitle>
              <CardDescription>
                Breakdown of support tickets by category for the selected time period
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
              <CardTitle>Ticket Volume by Day</CardTitle>
              <CardDescription>
                Number of tickets created per day for the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {volumeLoading ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-[350px] w-full" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time by Day</CardTitle>
              <CardDescription>
                Average time (in hours) to resolve tickets for the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {responseTimeLoading ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-[350px] w-full" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workload" className="space-y-4">
          <TeamWorkload />
        </TabsContent>
      </Tabs>
    </div>
  );
}