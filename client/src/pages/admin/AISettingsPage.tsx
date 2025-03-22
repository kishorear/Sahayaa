import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react";
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
            <Card>
              <CardHeader>
                <CardTitle>AI Performance Monitoring</CardTitle>
                <CardDescription>
                  Monitor AI performance, usage metrics, and error rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Coming Soon</AlertTitle>
                  <AlertDescription>
                    AI performance monitoring is coming in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}