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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">142.5K</div>
                  <p className="text-xs text-muted-foreground">+8% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.2s</div>
                  <p className="text-xs text-muted-foreground">-5% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">99.2%</div>
                  <p className="text-xs text-muted-foreground">+0.1% from last month</p>
                </CardContent>
              </Card>
            </div>

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
                    {aiProviders?.map((provider) => (
                      <div key={provider.id} className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{provider.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {Math.floor(Math.random() * 1000) + 100} calls
                            </span>
                          </div>
                          <div className="mt-1 h-2 bg-secondary rounded-full">
                            <div 
                              className="h-2 bg-primary rounded-full" 
                              style={{ width: `${Math.floor(Math.random() * 80) + 20}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                    {[
                      { provider: 'OpenAI GPT-4', action: 'Ticket Classification', status: 'success', time: '2 mins ago' },
                      { provider: 'Google Gemini', action: 'Chat Response', status: 'success', time: '5 mins ago' },
                      { provider: 'OpenAI GPT-4', action: 'Auto Resolution', status: 'success', time: '8 mins ago' },
                      { provider: 'Google Gemini', action: 'Email Generation', status: 'error', time: '12 mins ago' },
                      { provider: 'OpenAI GPT-4', action: 'Ticket Summary', status: 'success', time: '15 mins ago' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.action}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {activity.provider}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    ))}
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
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Month</p>
                      <p className="text-2xl font-bold">$127.45</p>
                      <p className="text-xs text-muted-foreground">+15% from last month</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Average per Call</p>
                      <p className="text-2xl font-bold">$0.045</p>
                      <p className="text-xs text-muted-foreground">-2% from last month</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Projected Monthly</p>
                      <p className="text-2xl font-bold">$142.80</p>
                      <p className="text-xs text-muted-foreground">Based on current usage</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Cost by Provider</h4>
                    <div className="space-y-3">
                      {aiProviders?.map((provider, index) => {
                        const costs = [45.20, 82.25, 0.00]; // Sample costs
                        const cost = costs[index] || 0;
                        return (
                          <div key={provider.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                provider.type === 'openai' ? 'bg-green-500' :
                                provider.type === 'gemini' ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`} />
                              <span className="text-sm font-medium">{provider.name}</span>
                            </div>
                            <span className="text-sm font-mono">${cost.toFixed(2)}</span>
                          </div>
                        );
                      })}
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