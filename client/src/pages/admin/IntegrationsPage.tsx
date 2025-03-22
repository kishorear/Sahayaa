import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntegrationsSettings from "@/components/admin/IntegrationsSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin/AdminLayout";

export default function IntegrationsPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Integrations | AI Support Admin</title>
      </Helmet>
      
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your AI support system with external ticketing systems and services.
          </p>
        </div>

        <Tabs defaultValue="ticketing-systems" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ticketing-systems">Ticketing Systems</TabsTrigger>
            <TabsTrigger value="sync-settings">Sync Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ticketing-systems" className="space-y-4">
            <IntegrationsSettings />
          </TabsContent>
          
          <TabsContent value="sync-settings">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization Settings</CardTitle>
                <CardDescription>
                  Configure how tickets and messages are synchronized between systems.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Coming Soon</h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>
                          Additional synchronization settings will be available in a future update. 
                          Currently, tickets and messages are automatically synchronized when integrations are enabled.
                        </p>
                      </div>
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