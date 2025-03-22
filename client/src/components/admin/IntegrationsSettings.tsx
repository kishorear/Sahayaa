import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Form schemas for integration configurations
const zendeskSchema = z.object({
  enabled: z.boolean().default(false),
  subdomain: z.string().min(1, { message: "Subdomain is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  apiToken: z.string().min(1, { message: "API token is required" }),
});

const jiraSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().url({ message: "Please enter a valid URL" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  apiToken: z.string().min(1, { message: "API token is required" }),
  projectKey: z.string().min(1, { message: "Project key is required" }),
});

// Integration type to be used for typing
type IntegrationType = "zendesk" | "jira";

export default function IntegrationsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"zendesk" | "jira">("zendesk");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch integration settings
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations");
      return res.json();
    },
  });

  // Form for Zendesk
  const zendeskForm = useForm<z.infer<typeof zendeskSchema>>({
    resolver: zodResolver(zendeskSchema),
    defaultValues: {
      enabled: false,
      subdomain: "",
      email: "",
      apiToken: "",
    },
  });

  // Form for Jira
  const jiraForm = useForm<z.infer<typeof jiraSchema>>({
    resolver: zodResolver(jiraSchema),
    defaultValues: {
      enabled: false,
      baseUrl: "",
      email: "",
      apiToken: "",
      projectKey: "",
    },
  });

  // Update forms when data is loaded
  React.useEffect(() => {
    if (integrations) {
      zendeskForm.reset({
        enabled: integrations.zendesk.enabled,
        subdomain: integrations.zendesk.subdomain,
        email: integrations.zendesk.email,
        // Don't prefill token for security
        apiToken: integrations.zendesk.apiToken === "********" ? "" : integrations.zendesk.apiToken,
      });

      jiraForm.reset({
        enabled: integrations.jira.enabled,
        baseUrl: integrations.jira.baseUrl,
        email: integrations.jira.email,
        // Don't prefill token for security
        apiToken: integrations.jira.apiToken === "********" ? "" : integrations.jira.apiToken,
        projectKey: integrations.jira.projectKey,
      });
    }
  }, [integrations]);

  // Save integration settings
  const saveIntegrationMutation = useMutation({
    mutationFn: async ({ type, data }: { type: IntegrationType; data: any }) => {
      const res = await apiRequest("POST", `/api/integrations/${type}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Integration settings saved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: error.message,
      });
    },
  });

  // Test integration connection
  const testIntegrationMutation = useMutation({
    mutationFn: async (type: IntegrationType) => {
      const res = await apiRequest("POST", `/api/integrations/${type}/test`);
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult({
        success: true,
        message: data.message,
      });
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        message: error.message,
      });
    },
    onSettled: () => {
      setTestingConnection(false);
    },
  });

  // Handler for saving Zendesk settings
  const onZendeskSubmit = async (values: z.infer<typeof zendeskSchema>) => {
    saveIntegrationMutation.mutate({ type: "zendesk", data: values });
  };

  // Handler for saving Jira settings
  const onJiraSubmit = async (values: z.infer<typeof jiraSchema>) => {
    saveIntegrationMutation.mutate({ type: "jira", data: values });
  };

  // Handler for testing the current integration
  const testCurrentIntegration = () => {
    setTestingConnection(true);
    setTestResult(null);
    testIntegrationMutation.mutate(activeTab);
  };

  // If loading, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get the active form based on the selected tab
  // Get the active form based on the selected tab
  const form = activeTab === "zendesk" ? zendeskForm : jiraForm;
  const isPending = saveIntegrationMutation.isPending && 
    (activeTab === "zendesk" 
      ? saveIntegrationMutation.variables?.type === "zendesk"
      : saveIntegrationMutation.variables?.type === "jira");

  // Handle form submission based on active tab
  const handleFormSubmit = () => {
    if (activeTab === "zendesk") {
      zendeskForm.handleSubmit(onZendeskSubmit)();
    } else {
      jiraForm.handleSubmit(onJiraSubmit)();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>External Ticketing System Integrations</CardTitle>
        <CardDescription>
          Connect your AI support system with your existing ticketing platforms to synchronize tickets and responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="zendesk" onValueChange={(value) => setActiveTab(value as "zendesk" | "jira")}>
          <TabsList className="mb-4">
            <TabsTrigger value="zendesk">
              Zendesk
              {integrations?.zendesk.enabled && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">
                  Active
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jira">
              Jira
              {integrations?.jira.enabled && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">
                  Active
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zendesk">
            <Form {...zendeskForm}>
              <form onSubmit={zendeskForm.handleSubmit(onZendeskSubmit)} className="space-y-4">
                <FormField
                  control={zendeskForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Zendesk Integration</FormLabel>
                        <FormDescription>
                          When enabled, tickets will be synchronized between this system and Zendesk.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={zendeskForm.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zendesk Subdomain</FormLabel>
                        <FormControl>
                          <Input placeholder="your-company" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Zendesk subdomain (e.g., "your-company" for your-company.zendesk.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={zendeskForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="agent@your-company.com" type="email" {...field} />
                        </FormControl>
                        <FormDescription>Email address of the Zendesk agent</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={zendeskForm.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Token</FormLabel>
                      <FormControl>
                        <Input placeholder="API Token" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Zendesk API token. You can generate one in your Zendesk admin settings.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="jira">
            <Form {...jiraForm}>
              <form onSubmit={jiraForm.handleSubmit(onJiraSubmit)} className="space-y-4">
                <FormField
                  control={jiraForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Jira Integration</FormLabel>
                        <FormDescription>
                          When enabled, tickets will be synchronized between this system and Jira.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={jiraForm.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jira Base URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-company.atlassian.net" {...field} />
                      </FormControl>
                      <FormDescription>The base URL of your Jira instance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={jiraForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="user@your-company.com" type="email" {...field} />
                        </FormControl>
                        <FormDescription>Email address associated with your Jira account</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jiraForm.control}
                    name="projectKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Key</FormLabel>
                        <FormControl>
                          <Input placeholder="SUP" {...field} />
                        </FormControl>
                        <FormDescription>The key of the Jira project to create issues in</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={jiraForm.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Token</FormLabel>
                      <FormControl>
                        <Input placeholder="API Token" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Jira API token. You can generate one in your Atlassian account settings.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {testResult && (
          <Alert className={`mt-4 ${testResult.success ? "bg-green-50" : "bg-red-50"}`}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle className={testResult.success ? "text-green-800" : "text-red-800"}>
              {testResult.success ? "Connection Successful" : "Connection Failed"}
            </AlertTitle>
            <AlertDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={testCurrentIntegration}
          disabled={testingConnection || !form.getValues().enabled}
        >
          {testingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Connection
        </Button>
        <Button 
          type="submit" 
          onClick={handleFormSubmit} 
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}