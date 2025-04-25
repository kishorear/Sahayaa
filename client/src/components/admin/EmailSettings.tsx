import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";

// Form schema for email configuration
const emailConfigSchema = z.object({
  smtp: z.object({
    host: z.string().min(1, "SMTP host is required"),
    port: z.coerce.number().int().min(1, "Port must be a positive number"),
    secure: z.boolean().default(true),
    auth: z.object({
      user: z.string().min(1, "Username is required"),
      pass: z.string().min(1, "Password is required"),
    }),
  }),
  imap: z.object({
    user: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    host: z.string().min(1, "IMAP host is required"),
    port: z.coerce.number().int().min(1, "Port must be a positive number"),
    tls: z.boolean().default(true),
    authTimeout: z.coerce.number().int().min(1000, "Timeout should be at least 1000ms").default(10000),
  }),
  settings: z.object({
    fromName: z.string().min(1, "Sender name is required"),
    fromEmail: z.string().email("Must be a valid email address"),
    ticketSubjectPrefix: z.string().default("[Support]"),
    checkInterval: z.coerce.number().int().min(10000, "Interval should be at least 10000ms (10 seconds)").default(60000),
  }),
});

type EmailConfigValues = z.infer<typeof emailConfigSchema>;

// Schema for test email
const testEmailSchema = z.object({
  recipient: z.string().email("Must be a valid email address"),
});

type TestEmailValues = z.infer<typeof testEmailSchema>;

export default function EmailSettings() {
  const [testMode, setTestMode] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Query to fetch existing email configuration
  const { data: emailConfigResponse, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['/api/email/config'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/email/config');
        // Parse the JSON response if it's a string, otherwise return as is
        return typeof response === 'string' ? JSON.parse(response) : response;
      } catch (error) {
        // Don't show toast for 401 unauthorized errors - this is expected when not logged in
        if (!(error instanceof Error && error.message.includes("401"))) {
          toast({
            title: "Error Loading Configuration",
            description: error instanceof Error ? error.message : "Could not load email configuration",
            variant: "destructive",
          });
        }
        // Return empty configuration instead of throwing
        return {
          smtp: null,
          imap: null,
          settings: null
        };
      }
    }
  });

  // Form for email configuration
  const configForm = useForm<EmailConfigValues>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtp: {
        host: "",
        port: 465,
        secure: true,
        auth: {
          user: "",
          pass: "",
        },
      },
      imap: {
        user: "",
        password: "",
        host: "",
        port: 993,
        tls: true,
        authTimeout: 10000,
      },
      settings: {
        fromName: "Support Team",
        fromEmail: "",
        ticketSubjectPrefix: "[Support]",
        checkInterval: 60000, // 1 minute
      },
    },
  });

  // Form for test email
  const testForm = useForm<TestEmailValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      recipient: "",
    },
  });
  
  // Update form values when configuration is loaded
  useEffect(() => {
    if (emailConfigResponse && !configLoading) {
      try {
        // For type safety
        interface ConfigResponse {
          smtp?: {
            host?: string;
            port?: number;
            secure?: boolean;
            auth?: {
              user?: string;
              pass?: string;
            };
          };
          imap?: {
            host?: string;
            port?: number;
            user?: string;
            password?: string;
            tls?: boolean;
            authTimeout?: number;
          };
          settings?: {
            fromName?: string;
            fromEmail?: string;
            ticketSubjectPrefix?: string;
            checkInterval?: number;
          };
        }

        // Safely cast the response
        const parsedConfig: ConfigResponse = emailConfigResponse;
        
        if (!parsedConfig || !parsedConfig.smtp || !parsedConfig.imap || !parsedConfig.settings) {
          console.log("Email configuration is incomplete or in unexpected format", parsedConfig);
          return;
        }
        
        // Create a properly typed config object with defaults
        const config: EmailConfigValues = {
          smtp: {
            host: parsedConfig.smtp.host || "",
            port: Number(parsedConfig.smtp.port) || 465,
            secure: parsedConfig.smtp.secure !== undefined ? Boolean(parsedConfig.smtp.secure) : true,
            auth: {
              user: parsedConfig.smtp.auth?.user || "",
              pass: parsedConfig.smtp.auth?.pass || "",
            },
          },
          imap: {
            host: parsedConfig.imap.host || "",
            port: Number(parsedConfig.imap.port) || 993,
            user: parsedConfig.imap.user || "",
            password: parsedConfig.imap.password || "",
            tls: parsedConfig.imap.tls !== undefined ? Boolean(parsedConfig.imap.tls) : true,
            authTimeout: Number(parsedConfig.imap.authTimeout) || 10000,
          },
          settings: {
            fromName: parsedConfig.settings.fromName || "Support Team",
            fromEmail: parsedConfig.settings.fromEmail || "",
            ticketSubjectPrefix: parsedConfig.settings.ticketSubjectPrefix || "[Support]",
            checkInterval: Number(parsedConfig.settings.checkInterval) || 60000,
          }
        };
        
        // If password is masked (for security reasons), don't overwrite the current value
        const formValues = configForm.getValues();
        if (config.smtp.auth.pass === '********' && formValues.smtp?.auth?.pass) {
          config.smtp.auth.pass = formValues.smtp.auth.pass;
        }
        
        if (config.imap.password === '********' && formValues.imap?.password) {
          config.imap.password = formValues.imap.password;
        }
        
        // Reset the form with loaded configuration
        configForm.reset(config);
        
        // Log success
        console.log("Email configuration loaded successfully");
      } catch (error) {
        console.error("Error processing email configuration:", error);
      }
    }
  }, [emailConfigResponse, configLoading, configForm]);

  // Mutation for saving email configuration
  const configMutation = useMutation({
    mutationFn: async (data: EmailConfigValues) => {
      return await apiRequest("POST", "/api/email/config", data);
    },
    onSuccess: () => {
      toast({
        title: "Email Configuration Saved",
        description: "Your email settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/status"] });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for sending test email
  const testEmailMutation = useMutation({
    mutationFn: async (data: TestEmailValues) => {
      return await apiRequest("POST", "/api/email/test", data);
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent to the specified address.",
      });
      setTestMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error Sending Test Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for configuration
  const onConfigSubmit = (data: EmailConfigValues) => {
    configMutation.mutate(data);
  };

  // Handle form submission for test email
  const onTestEmailSubmit = (data: TestEmailValues) => {
    testEmailMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Email Integration</h2>
        {!testMode ? (
          <Button
            variant="outline"
            onClick={() => setTestMode(true)}
            disabled={configMutation.isPending}
          >
            <Mail className="mr-2 h-4 w-4" />
            Test Email
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setTestMode(false)}
            disabled={testEmailMutation.isPending}
          >
            Cancel Test
          </Button>
        )}
      </div>
      
      <p className="text-muted-foreground">
        Configure email integration to automatically process support requests received via email.
      </p>

      {testMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your configuration is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testForm}>
              <form id="test-email-form" onSubmit={testForm.handleSubmit(onTestEmailSubmit)} className="space-y-4">
                <FormField
                  control={testForm.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input placeholder="recipient@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter an email address to receive the test message.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setTestMode(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="test-email-form"
              disabled={testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Tabs defaultValue="smtp" className="space-y-4">
          <TabsList>
            <TabsTrigger value="smtp">SMTP (Outgoing)</TabsTrigger>
            <TabsTrigger value="imap">IMAP (Incoming)</TabsTrigger>
            <TabsTrigger value="settings">General Settings</TabsTrigger>
          </TabsList>

          <Form {...configForm}>
            <form id="email-config-form" onSubmit={configForm.handleSubmit(onConfigSubmit)}>
              <TabsContent value="smtp" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SMTP Configuration</CardTitle>
                    <CardDescription>
                      Configure outgoing email settings to send responses and notifications.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={configForm.control}
                        name="smtp.host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={configForm.control}
                        name="smtp.port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Port</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={configForm.control}
                      name="smtp.secure"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Use Secure Connection (SSL/TLS)
                            </FormLabel>
                            <FormDescription>
                              Enable for secure SMTP connections (recommended for most providers).
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

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium">Authentication</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={configForm.control}
                          name="smtp.auth.user"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={configForm.control}
                          name="smtp.auth.pass"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="imap" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>IMAP Configuration</CardTitle>
                    <CardDescription>
                      Configure incoming email settings to receive and process support requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={configForm.control}
                        name="imap.host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="imap.example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={configForm.control}
                        name="imap.port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Port</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={configForm.control}
                      name="imap.tls"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Use Secure Connection (TLS)
                            </FormLabel>
                            <FormDescription>
                              Enable for secure IMAP connections (recommended for most providers).
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

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium">Authentication</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={configForm.control}
                          name="imap.user"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={configForm.control}
                          name="imap.password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={configForm.control}
                      name="imap.authTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Connection Timeout (ms)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            How long to wait for IMAP connection before timing out.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>General Email Settings</CardTitle>
                    <CardDescription>
                      Configure general settings for email processing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={configForm.control}
                        name="settings.fromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Support Team" {...field} />
                            </FormControl>
                            <FormDescription>
                              Name to display as the sender of outgoing emails.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={configForm.control}
                        name="settings.fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email</FormLabel>
                            <FormControl>
                              <Input placeholder="support@example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Email address to use as the sender of outgoing emails.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={configForm.control}
                      name="settings.ticketSubjectPrefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="[Support]" {...field} />
                          </FormControl>
                          <FormDescription>
                            Prefix added to the subject line of outgoing emails for ticket identification.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={configForm.control}
                      name="settings.checkInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Check Interval (ms)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            How frequently to check for new emails (in milliseconds). 60000 = 1 minute.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </form>
          </Form>

          <div className="mt-6">
            <Button 
              type="submit" 
              form="email-config-form" 
              className="mr-2"
              disabled={configMutation.isPending}
            >
              {configMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => configForm.reset()}
              disabled={configMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </Tabs>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Security Note</AlertTitle>
        <AlertDescription>
          Email credentials are stored securely but should be handled with care. In a production environment, 
          it's recommended to use app-specific passwords or OAuth authentication when available.
        </AlertDescription>
      </Alert>
    </div>
  );
}