import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Info, ShieldAlert, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Validation schemas for integration forms
const zendeskSchema = z.object({
  enabled: z.boolean().default(false),
  subdomain: z.string().min(1, "Subdomain is required"),
  email: z.string().email("Valid email is required"),
  apiToken: z.string().min(1, "API Token is required"),
});

const jiraSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().url("Valid URL is required"),
  email: z.string().email("Valid email is required"),
  apiToken: z.string().min(1, "API Token is required"),
  projectKey: z.string().min(1, "Project Key is required"),
});

type ZendeskFormValues = z.infer<typeof zendeskSchema>;
type JiraFormValues = z.infer<typeof jiraSchema>;

// Define test configuration types
interface TestConfigPayload {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  enabled: boolean;
}

export default function IntegrationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("zendesk");

  // Fetch existing integration configurations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/integrations");
      return await response.json();
    },
  });

  // Zendesk form
  const zendeskForm = useForm<ZendeskFormValues>({
    resolver: zodResolver(zendeskSchema),
    defaultValues: {
      enabled: false,
      subdomain: "",
      email: "",
      apiToken: "",
    },
  });

  // Jira form
  const jiraForm = useForm<JiraFormValues>({
    resolver: zodResolver(jiraSchema),
    defaultValues: {
      enabled: false,
      baseUrl: "",
      email: "",
      apiToken: "",
      projectKey: "",
    },
  });

  // Set form values when integrations data is loaded
  // Using useEffect instead of useState for side effects
  React.useEffect(() => {
    if (integrations) {
      if (integrations.zendesk) {
        zendeskForm.reset({
          enabled: integrations.zendesk.enabled,
          subdomain: integrations.zendesk.subdomain,
          email: integrations.zendesk.email,
          apiToken: integrations.zendesk.apiToken === "********" ? "" : integrations.zendesk.apiToken,
        });
      }

      if (integrations.jira) {
        jiraForm.reset({
          enabled: integrations.jira.enabled,
          baseUrl: integrations.jira.baseUrl,
          email: integrations.jira.email,
          apiToken: integrations.jira.apiToken === "********" ? "" : integrations.jira.apiToken,
          projectKey: integrations.jira.projectKey,
        });
      }
    }
  }, [integrations, zendeskForm, jiraForm]);

  // Mutation for saving Zendesk configuration
  const zendeskMutation = useMutation({
    mutationFn: async (data: ZendeskFormValues) => {
      const res = await apiRequest("POST", "/api/integrations/zendesk", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Zendesk Integration Updated",
        description: "Your Zendesk integration settings have been saved successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Zendesk Settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for saving Jira configuration
  const jiraMutation = useMutation({
    mutationFn: async (data: JiraFormValues) => {
      console.log("Saving Jira configuration:", {
        baseUrl: data.baseUrl,
        email: data.email,
        apiToken: data.apiToken ? "[REDACTED]" : "missing",
        projectKey: data.projectKey,
        enabled: data.enabled
      });

      // Explicitly create the payload to ensure all fields are present
      const payload = {
        baseUrl: data.baseUrl,
        email: data.email,
        apiToken: data.apiToken,
        projectKey: data.projectKey,
        enabled: data.enabled
      };
      
      // Direct fetch with explicit headers to ensure content type is set correctly
      const response = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Failed to save Jira configuration");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Jira Integration Updated",
        description: "Your Jira integration settings have been saved successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving Jira settings:", error);
      toast({
        title: "Error Saving Jira Settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutations
  const testZendeskMutation = useMutation({
    mutationFn: async () => {
      // Use the current form values to test the connection
      const formValues = zendeskForm.getValues();
      const res = await apiRequest("POST", "/api/integrations/zendesk/test", formValues);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Zendesk Connection Successful",
        description: "Successfully connected to Zendesk API.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Zendesk Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testJiraMutation = useMutation<any, Error, TestConfigPayload>({
    mutationFn: async (data: TestConfigPayload) => {
      // Explicitly create the payload to ensure all fields are present and values are strings
      const payload = {
        baseUrl: String(data.baseUrl || ''),
        email: String(data.email || ''),
        apiToken: String(data.apiToken || ''),
        projectKey: String(data.projectKey || ''),
        enabled: Boolean(data.enabled)
      };
      
      console.log("Testing Jira connection with payload:", {
        ...payload,
        apiToken: payload.apiToken ? "[REDACTED]" : "missing"
      });
      
      // Validate the form values manually before submission
      if (!payload.baseUrl) {
        throw new Error("Base URL is required");
      }
      if (!payload.email) {
        throw new Error("Email is required");
      }
      if (!payload.apiToken) {
        throw new Error("API Token is required");
      }
      if (!payload.projectKey) {
        throw new Error("Project Key is required");
      }
      
      // Direct fetch with explicit headers to ensure content type is set correctly
      const response = await fetch('/api/integrations/jira/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Failed to test Jira connection");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Jira Connection Successful",
        description: "Successfully connected to Jira API.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Jira connection test failed:", error);
      toast({
        title: "Jira Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onZendeskSubmit = (data: ZendeskFormValues) => {
    zendeskMutation.mutate(data);
  };

  const onJiraSubmit = (data: JiraFormValues) => {
    console.log("Submitting Jira settings:", {
      ...data,
      apiToken: data.apiToken ? "[REDACTED]" : "missing"
    });
    
    // Validate the form values manually before submission
    if (!data.baseUrl) {
      toast({
        title: "Validation Error",
        description: "Base URL is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.email) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.apiToken) {
      toast({
        title: "Validation Error",
        description: "API Token is required",
        variant: "destructive",
      });
      return;
    }
    if (!data.projectKey) {
      toast({
        title: "Validation Error",
        description: "Project Key is required",
        variant: "destructive",
      });
      return;
    }
    
    jiraMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Third-Party Integrations</h2>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse">Loading integration settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Third-Party Integrations</h2>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Integration Information</AlertTitle>
        <AlertDescription>
          Connect your Support AI system to third-party platforms to synchronize tickets and responses.
          Your API keys are securely stored and never exposed in client-side code.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="zendesk">Zendesk</TabsTrigger>
          <TabsTrigger value="jira">Jira</TabsTrigger>
        </TabsList>

        <TabsContent value="zendesk">
          <Card>
            <CardHeader>
              <CardTitle>Zendesk Integration</CardTitle>
              <CardDescription>
                Connect to Zendesk to automatically create tickets and synchronize responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...zendeskForm}>
                <form
                  onSubmit={zendeskForm.handleSubmit(onZendeskSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={zendeskForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Zendesk Integration</FormLabel>
                          <FormDescription>
                            Activates synchronization with Zendesk
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={zendeskForm.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zendesk Subdomain</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="yourcompany"
                            disabled={!zendeskForm.watch("enabled")}
                          />
                        </FormControl>
                        <FormDescription>
                          Your Zendesk subdomain (e.g., for 'yourcompany.zendesk.com', enter 'yourcompany')
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="admin@yourcompany.com"
                            disabled={!zendeskForm.watch("enabled")}
                          />
                        </FormControl>
                        <FormDescription>
                          The email address associated with your Zendesk account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={zendeskForm.control}
                    name="apiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••••••••••"
                              disabled={!zendeskForm.watch("enabled")}
                            />
                            <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your Zendesk API token (found in Admin &gt; API &gt; Tokens)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={zendeskMutation.isPending}
                    >
                      {zendeskMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testZendeskMutation.mutate()}
                      disabled={
                        testZendeskMutation.isPending ||
                        !zendeskForm.watch("enabled") ||
                        !zendeskForm.formState.isValid
                      }
                    >
                      {testZendeskMutation.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-gray-50 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Your Zendesk API credentials are securely stored and encrypted.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="jira">
          <Card>
            <CardHeader>
              <CardTitle>Jira Integration</CardTitle>
              <CardDescription>
                Connect to Jira to automatically create issues and track their progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...jiraForm}>
                <form
                  onSubmit={jiraForm.handleSubmit(onJiraSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={jiraForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Jira Integration</FormLabel>
                          <FormDescription>
                            Activates synchronization with Jira
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                          <Input
                            {...field}
                            placeholder="https://yourcompany.atlassian.net"
                            disabled={!jiraForm.watch("enabled")}
                          />
                        </FormControl>
                        <FormDescription>
                          Your Jira instance URL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jiraForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="admin@yourcompany.com"
                            disabled={!jiraForm.watch("enabled")}
                          />
                        </FormControl>
                        <FormDescription>
                          The email address associated with your Jira account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={jiraForm.control}
                    name="apiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••••••••••"
                              disabled={!jiraForm.watch("enabled")}
                            />
                            <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your Jira API token (created in Atlassian Account Settings)
                        </FormDescription>
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
                          <Input
                            {...field}
                            placeholder="SUP"
                            disabled={!jiraForm.watch("enabled")}
                          />
                        </FormControl>
                        <FormDescription>
                          The project key where tickets will be created
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={jiraMutation.isPending}
                    >
                      {jiraMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const formValues = jiraForm.getValues();
                        console.log("Testing connection with:", {
                          baseUrl: formValues.baseUrl,
                          email: formValues.email,
                          apiToken: formValues.apiToken ? "[PRESENT]" : "[MISSING]",
                          projectKey: formValues.projectKey,
                          enabled: formValues.enabled
                        });
                        
                        // Explicitly pass the form values to the mutation
                        testJiraMutation.mutate({
                          baseUrl: String(formValues.baseUrl || ''),
                          email: String(formValues.email || ''),
                          apiToken: String(formValues.apiToken || ''),
                          projectKey: String(formValues.projectKey || ''),
                          enabled: Boolean(formValues.enabled)
                        });
                      }}
                      disabled={
                        testJiraMutation.isPending ||
                        !jiraForm.watch("enabled")
                      }
                    >
                      {testJiraMutation.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-gray-50 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Your Jira API credentials are securely stored and encrypted.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}