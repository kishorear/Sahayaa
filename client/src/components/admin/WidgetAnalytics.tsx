import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { WidgetAnalytics } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";

// Helper function to format dates
const formatDate = (date: Date): string => {
  try {
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (e) {
    return 'Invalid date';
  }
};

export default function WidgetAnalyticsComponent() {
  const { 
    data: analyticsData, 
    isLoading, 
    error,
    refetch
  } = useQuery<WidgetAnalytics[]>({
    queryKey: ["/api/admin/widget-analytics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Widget Analytics</CardTitle>
          <CardDescription>Error loading analytics data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load widget analytics data. Please try again later.</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData || analyticsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Widget Analytics</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No widget usage data available yet. Deploy your widget to start collecting analytics.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalInteractions = analyticsData.reduce((sum, item) => sum + (item.interactions || 0), 0);
  const totalMessages = analyticsData.reduce((sum, item) => sum + (item.messagesReceived || 0), 0);
  const totalTicketsCreated = analyticsData.reduce((sum, item) => sum + (item.ticketsCreated || 0), 0);
  
  // Prepare data for chart
  const chartData = analyticsData.map(item => ({
    name: item.clientWebsite?.split('/').pop() || 'Unknown Site',
    interactions: item.interactions || 0,
    messages: item.messagesReceived || 0,
    tickets: item.ticketsCreated || 0
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Widget Analytics</h2>
        <Button onClick={() => refetch()} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInteractions}</div>
            <p className="text-xs text-muted-foreground">
              Total widget clicks and interactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Total messages received from users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTicketsCreated}</div>
            <p className="text-xs text-muted-foreground">
              Support tickets generated from widget
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="p-2">
          <Card>
            <CardHeader>
              <CardTitle>Widget Performance by Website</CardTitle>
              <CardDescription>
                Comparison of interactions, messages, and tickets across websites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="interactions" fill="#8884d8" name="Interactions" />
                    <Bar dataKey="messages" fill="#82ca9d" name="Messages" />
                    <Bar dataKey="tickets" fill="#ffc658" name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Widget Details</CardTitle>
              <CardDescription>
                Detailed analytics data for each widget instance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Website</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Interactions</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.clientWebsite ? (
                          <a 
                            href={item.clientWebsite} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {item.clientWebsite.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="p-1 bg-muted rounded text-xs">{item.apiKey}</code>
                      </TableCell>
                      <TableCell>{item.interactions || 0}</TableCell>
                      <TableCell>{item.messagesReceived || 0}</TableCell>
                      <TableCell>{item.ticketsCreated || 0}</TableCell>
                      <TableCell>
                        {item.lastActivity ? (
                          <Badge variant="outline">{formatDate(new Date(item.lastActivity))}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}