import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, AlertCircle, BarChart3, Clock, MessageSquare, TrendingUp, Zap } from "lucide-react";

interface AIUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  providerUsage: Array<{
    provider: string;
    requests: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    errors: number;
  }>;
  operationBreakdown: Array<{
    operation: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AIUsageMonitoring() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: metrics, isLoading, error } = useQuery<AIUsageMetrics>({
    queryKey: ['/api/ai-providers/metrics', timeRange],
    retry: false,
  });

  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['/api/ai-providers/recent-activity'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading AI usage metrics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              AI Usage Monitoring
            </CardTitle>
            <CardDescription>
              Monitor AI provider performance, usage patterns, and error rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to Load Metrics</AlertTitle>
              <AlertDescription>
                AI usage metrics are currently unavailable. This could be due to insufficient data or a configuration issue.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successRate = metrics.totalRequests > 0 
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            AI Usage Monitoring
          </h2>
          <p className="text-muted-foreground">
            Monitor AI provider performance and usage patterns
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Requests</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{successRate}%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Avg Response Time</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.averageResponseTime}ms</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Failed Requests</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{metrics.failedRequests.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Trend
            </CardTitle>
            <CardDescription>Daily AI requests and error rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Requests"
                />
                <Line 
                  type="monotone" 
                  dataKey="errors" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  name="Errors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Operation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Operation Breakdown
            </CardTitle>
            <CardDescription>Distribution of AI operations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.operationBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.operationBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Provider Performance
          </CardTitle>
          <CardDescription>Performance metrics by AI provider</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.providerUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provider" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#8884d8" name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Provider Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Details</CardTitle>
          <CardDescription>Detailed performance metrics for each AI provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Provider</th>
                  <th className="text-right p-2">Requests</th>
                  <th className="text-right p-2">Success Rate</th>
                  <th className="text-right p-2">Avg Response Time</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.providerUsage.map((provider, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{provider.provider}</td>
                    <td className="p-2 text-right">{provider.requests.toLocaleString()}</td>
                    <td className="p-2 text-right">{provider.success_rate.toFixed(1)}%</td>
                    <td className="p-2 text-right">{provider.avg_response_time}ms</td>
                    <td className="p-2 text-center">
                      <Badge 
                        variant={provider.success_rate > 95 ? "default" : 
                                provider.success_rate > 85 ? "secondary" : "destructive"}
                      >
                        {provider.success_rate > 95 ? "Excellent" : 
                         provider.success_rate > 85 ? "Good" : "Poor"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest AI provider requests and responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoadingActivity ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading recent activity...</p>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Activity Tracking</AlertTitle>
                  <AlertDescription>
                    Recent activity logs will be available in the next update.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}