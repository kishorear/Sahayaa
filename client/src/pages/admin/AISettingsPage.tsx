import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot, Activity, Clock, CheckCircle } from "lucide-react";
import AIProviderSettings from "@/components/admin/AIProviderSettings";

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState("providers");

  const { data: aiProviders, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['/api/ai-providers'],
    retry: false,
  });

  const { data: aiStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/ai-providers/status'],
    retry: false,
  });

  // Real AI usage data queries
  const { data: aiUsageStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/ai-usage/stats'],
    retry: false,
  });

  const { data: aiUsageByProvider, isLoading: isLoadingByProvider } = useQuery({
    queryKey: ['/api/ai-usage/by-provider'],
    retry: false,
  });

  const { data: aiUsageActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['/api/ai-usage/activity'],
    retry: false,
  });

  const { data: aiUsageCosts, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['/api/ai-usage/costs'],
    retry: false,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure and manage AI providers for your support system
          </p>
        </div>

        <Tabs
          defaultValue="providers"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="providers">AI Providers</TabsTrigger>
            <TabsTrigger value="settings">General Settings</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <AIProviderSettings 
              aiProviders={aiProviders || []} 
              aiStatus={aiStatus || {}} 
              isLoading={isLoadingProviders || isLoadingStatus} 
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI General Settings</CardTitle>
                <CardDescription>
                  Configure global settings for AI behavior and functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Coming Soon</AlertTitle>
                  <AlertDescription>
                    Advanced AI settings management is coming in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            {isLoadingStats || isLoadingByProvider || isLoadingActivity || isLoadingCosts ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                      <p className="text-xs text-muted-foreground">Loading data...</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiUsageStats?.totalCalls || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiUsageStats?.totalTokens ? 
                        (aiUsageStats.totalTokens > 1000 ? 
                          `${(aiUsageStats.totalTokens / 1000).toFixed(1)}K` : 
                          aiUsageStats.totalTokens) : 
                        0}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiUsageStats?.avgResponseTime ? 
                        `${aiUsageStats.avgResponseTime.toFixed(1)}s` : 
                        '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiUsageStats?.successRate ? 
                        `${aiUsageStats.successRate.toFixed(1)}%` : 
                        '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage by Provider</CardTitle>
                  <CardDescription>
                    Usage breakdown across different AI providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingByProvider ? (
                      <div className="text-sm text-muted-foreground">Loading usage data...</div>
                    ) : aiUsageByProvider && aiUsageByProvider.length > 0 ? (
                      aiUsageByProvider.map((usage, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{usage.providerName}</span>
                              <span className="text-sm text-muted-foreground">
                                {usage.totalCalls} calls
                              </span>
                            </div>
                            <div className="mt-1 h-2 bg-secondary rounded-full">
                              <div 
                                className="h-2 bg-primary rounded-full" 
                                style={{ width: `${usage.percentage || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No usage data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent AI Activity</CardTitle>
                  <CardDescription>
                    Latest AI API calls and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingActivity ? (
                      <div className="text-sm text-muted-foreground">Loading activity data...</div>
                    ) : aiUsageActivity && aiUsageActivity.length > 0 ? (
                      aiUsageActivity.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.success ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.requestType}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {activity.providerName || activity.model}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.timeAgo}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>
                  Monthly cost breakdown by AI provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingCosts ? (
                    <div className="text-sm text-muted-foreground">Loading cost data...</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Month</p>
                        <p className="text-2xl font-bold">
                          ${aiUsageCosts?.currentMonth?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Average per Call</p>
                        <p className="text-2xl font-bold">
                          ${aiUsageCosts?.avgPerCall?.toFixed(3) || '0.000'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {aiUsageCosts?.totalCalls || 0} total calls
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Projected Monthly</p>
                        <p className="text-2xl font-bold">
                          ${aiUsageCosts?.projectedMonthly?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">Based on current usage</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Cost by Provider</h4>
                    <div className="space-y-3">
                      {isLoadingByProvider ? (
                        <div className="text-sm text-muted-foreground">Loading provider costs...</div>
                      ) : aiUsageByProvider && aiUsageByProvider.length > 0 ? (
                        aiUsageByProvider.map((usage, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                usage.providerType === 'openai' ? 'bg-green-500' :
                                usage.providerType === 'gemini' ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`} />
                              <span className="text-sm font-medium">{usage.providerName}</span>
                            </div>
                            <span className="text-sm font-mono">
                              ${usage.totalCost?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No cost data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}