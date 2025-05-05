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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";

// Form schema for email configuration
// Auth configuration schema - only basic auth supported
const basicAuthSchema = z.object({
  type: z.literal('basic'),
  user: z.string().min(1, "Username is required"),
  pass: z.string().min(1, "Password is required"),
});

// Use basic auth schema directly since OAuth is removed
const authConfigSchema = basicAuthSchema;

// Main email configuration schema
const emailConfigSchema = z.object({
  smtp: z.object({
    host: z.string().min(1, "SMTP host is required"),
    port: z.coerce.number().int().min(1, "Port must be a positive number"),
    secure: z.boolean().default(true),
    auth: authConfigSchema,
  }),
  imap: z.object({
    host: z.string().min(1, "IMAP host is required"),
    port: z.coerce.number().int().min(1, "Port must be a positive number"),
    tls: z.boolean().default(true),
    authTimeout: z.coerce.number().int().min(1000).default(10000),
    auth: authConfigSchema,
  }),
  settings: z.object({
    fromName: z.string().min(1, "From name is required"),
    fromEmail: z.string().email("Invalid email address"),
    ticketSubjectPrefix: z.string(),
    checkInterval: z.coerce.number().int().min(30000, "Check interval must be at least 30 seconds"),
  }),
});

// Test email schema
const testEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

// No OAuth schemas needed - removed

type EmailConfigValues = z.infer<typeof emailConfigSchema>;
type TestEmailValues = z.infer<typeof testEmailSchema>;

export default function EmailSettings() {
  const { toast } = useToast();
  
  // Status state
  const [isEmailRunning, setIsEmailRunning] = useState(false);
  
  // Initial query for current email configuration
  const {
    data: emailConfigResponse,
    isLoading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ["/api/email/config"],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Query for email service status
  const {
    data: emailStatusResponse,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["/api/email/status"],
    refetchInterval: 10000,
    retry: 2,
  });
  
  // Effect to update running status
  useEffect(() => {
    if (emailStatusResponse) {
      setIsEmailRunning(emailStatusResponse.running || false);
    }
  }, [emailStatusResponse]);
  
  // Email configuration form
  const configForm = useForm<EmailConfigValues>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtp: {
        host: "",
        port: 587,
        secure: true,
        auth: {
          type: "basic",
          user: "",
          pass: ""
        },
      },
      imap: {
        host: "",
        port: 993,
        tls: true,
        authTimeout: 10000,
        auth: {
          type: "basic",
          user: "",
          pass: ""
        },
      },
      settings: {
        fromName: "",
        fromEmail: "",
        ticketSubjectPrefix: "[Ticket #]",
        checkInterval: 60000,
      },
    },
  });
  
  // Test email form
  const testEmailForm = useForm<TestEmailValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: "",
      subject: "Test Email",
      message: "This is a test email sent from the support system.",
    },
  });
  
  // No OAuth-related forms needed
  
  // Load configuration data into the form
  useEffect(() => {
    if (emailConfigResponse && !configLoading) {
      try {
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
            tls?: boolean;
            authTimeout?: number;
            auth?: {
              type?: string;
              user?: string;
              pass?: string;
            };
          };
          settings?: {
            fromName?: string;
            fromEmail?: string;
            ticketSubjectPrefix?: string;
            checkInterval?: number;
          };
          message?: string;
          config?: null;
        }
        
        const parsedConfig: ConfigResponse = emailConfigResponse;
        
        // Only update the form if we have valid configuration
        if (parsedConfig && parsedConfig.smtp && parsedConfig.imap && parsedConfig.settings) {
          const config: EmailConfigValues = {
            smtp: {
              host: parsedConfig.smtp.host || "",
              port: parsedConfig.smtp.port || 587,
              secure: parsedConfig.smtp.secure !== undefined ? parsedConfig.smtp.secure : true,
              auth: parsedConfig.smtp.auth?.type === 'oauth2' ? 
                {
                  type: 'oauth2',
                  user: parsedConfig.smtp.auth.user || "",
                  clientId: parsedConfig.smtp.auth.clientId || "",
                  clientSecret: parsedConfig.smtp.auth.clientSecret || "",
                  refreshToken: parsedConfig.smtp.auth.refreshToken || "",
                  accessToken: parsedConfig.smtp.auth.accessToken,
                  expires: parsedConfig.smtp.auth.expires
                } :
                {
                  type: 'basic',
                  user: parsedConfig.smtp.auth?.user || "",
                  pass: parsedConfig.smtp.auth?.pass || "",
                },
            },
            imap: {
              host: parsedConfig.imap.host || "",
              port: parsedConfig.imap.port || 993,
              tls: parsedConfig.imap.tls !== undefined ? parsedConfig.imap.tls : true,
              authTimeout: parsedConfig.imap.authTimeout || 10000,
              auth: parsedConfig.imap.auth?.type === 'oauth2' ? 
                {
                  type: 'oauth2',
                  user: parsedConfig.imap.auth.user || "",
                  clientId: parsedConfig.imap.auth.clientId || "",
                  clientSecret: parsedConfig.imap.auth.clientSecret || "",
                  refreshToken: parsedConfig.imap.auth.refreshToken || "",
                  accessToken: parsedConfig.imap.auth.accessToken,
                  expires: parsedConfig.imap.auth.expires
                } :
                {
                  type: 'basic',
                  user: parsedConfig.imap.auth?.user || "",
                  pass: parsedConfig.imap.auth?.pass || "",
                },
            },
            settings: {
              fromName: parsedConfig.settings.fromName || "",
              fromEmail: parsedConfig.settings.fromEmail || "",
              ticketSubjectPrefix: parsedConfig.settings.ticketSubjectPrefix || "[Ticket #]",
              checkInterval: parsedConfig.settings.checkInterval || 60000,
            },
          };
          
          configForm.reset(config);
        }
      } catch (error) {
        console.error("Error parsing config:", error);
        toast({
          title: "Configuration Error",
          description: "Failed to load email configuration. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [emailConfigResponse, configLoading, toast, configForm]);
  
  // No OAuth state transfer needed
  
  // Config save mutation
  const configMutation = useMutation({
    mutationFn: async (data: EmailConfigValues) => {
      return apiRequest('/api/email/config', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Email settings have been saved successfully.",
      });
      refetchConfig();
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: TestEmailValues) => {
      return apiRequest('/api/email/test', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent successfully.",
      });
      testEmailForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Email Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      });
    }
  });
  
  // No OAuth-related mutations or handlers needed

  // Form submission handlers for main configuration
  const onConfigSubmit = (data: EmailConfigValues) => {
    configMutation.mutate(data);
  };
  
  // Test email submission handler
  const onTestEmailSubmit = (data: TestEmailValues) => {
    testEmailMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Email Integration</h2>
          {configLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-3 h-3 mr-2 rounded-full bg-yellow-400 animate-pulse"></div>
              Loading...
            </div>
          )}
          {configError && configError instanceof Error && 
            (configError.message.includes("timeout") || 
             configError.message.includes("connect") || 
             configError.message.includes("network") ||
             configError.message.includes("refused") ||
             configError.message.includes("socket")) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-3 h-3 mr-2 rounded-full bg-orange-400 animate-pulse"></div>
              Reconnecting...
            </div>
          )}
          {!configLoading && !configError && (
            <div className="flex items-center text-sm text-muted-foreground">
              <div className={`w-3 h-3 mr-2 rounded-full ${isEmailRunning ? "bg-green-400" : "bg-gray-400"}`}></div>
              {isEmailRunning ? "Connected" : "Disconnected"}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            onClick={() => {
              refetchConfig();
              refetchStatus();
            }}
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Email OAuth Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Email OAuth Setup</CardTitle>
            <CardDescription>
              Configure secure OAuth authentication for your email service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {oauthStep === 'authorize' && (
              <Form {...oauthAuthorizeForm}>
                <form onSubmit={oauthAuthorizeForm.handleSubmit(onOAuthAuthorizeSubmit)} className="space-y-4">
                  <FormField
                    control={oauthAuthorizeForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OAuth Provider</FormLabel>
                        <FormControl>
                          <Input {...field} disabled value="google" />
                        </FormControl>
                        <FormDescription>Currently only Google OAuth is supported</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={oauthAuthorizeForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="OAuth Client ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={oauthAuthorizeForm.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="OAuth Client Secret" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={oauthAuthorizeForm.control}
                    name="redirectUri"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Redirect URI</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://your-app/admin/email" />
                        </FormControl>
                        <FormDescription>
                          This must match exactly with the redirect URI registered in your OAuth application
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={oauthAuthorizeForm.control}
                    name="scopes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scopes</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://mail.google.com/" />
                        </FormControl>
                        <FormDescription>Space-separated OAuth scopes</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={oauthAuthorizeMutation.isPending}>
                    {oauthAuthorizeMutation.isPending ? "Generating Auth URL..." : "Generate Authorization URL"}
                  </Button>
                </form>
              </Form>
            )}
            
            {oauthStep === 'token' && (
              <Form {...oauthTokenForm}>
                <form onSubmit={oauthTokenForm.handleSubmit(onOAuthTokenSubmit)} className="space-y-4">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authorization Required</AlertTitle>
                    <AlertDescription>
                      Please complete the authorization in the opened browser tab, then enter the authorization code below.
                      <div className="mt-2">
                        <a 
                          href={oauthAuthUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Click here if the authorization page didn't open automatically
                        </a>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <FormField
                    control={oauthTokenForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authorization Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Paste the authorization code here" />
                        </FormControl>
                        <FormDescription>
                          After you authorize access, you'll receive a code to paste here
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOauthStep('authorize')}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={oauthTokenMutation.isPending}
                    >
                      {oauthTokenMutation.isPending ? "Processing..." : "Submit Authorization Code"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
            
            {oauthStep === 'configure' && (
              <Form {...oauthConfigForm}>
                <form onSubmit={oauthConfigForm.handleSubmit(onOAuthConfigSubmit)} className="space-y-4">
                  <Alert className="mb-4 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>OAuth Tokens Received</AlertTitle>
                    <AlertDescription>
                      Authorization successful! Please review and confirm the configuration below.
                    </AlertDescription>
                  </Alert>
                  
                  <FormField
                    control={oauthConfigForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="The email address you authorized" />
                        </FormControl>
                        <FormDescription>
                          This is the email account you've granted access to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={oauthConfigForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="OAuth Client ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={oauthConfigForm.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="OAuth Client Secret" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={oauthConfigForm.control}
                    name="refreshToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refresh Token</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormDescription>
                          This token is used to automatically refresh your access.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOauthStep('token')}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={oauthConfigMutation.isPending}
                    >
                      {oauthConfigMutation.isPending ? "Saving..." : "Complete OAuth Setup"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        
        {/* Main email configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Configure your email service to receive and send support tickets via email.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                                  <Input {...field} placeholder="smtp.gmail.com" />
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
                                  <Input {...field} type="number" placeholder="587" />
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
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Use Secure Connection (SSL/TLS)</FormLabel>
                                <FormDescription>
                                  Enable for secure SMTP connections (usually on port 465)
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Separator className="my-4" />
                        
                        <FormField
                          control={configForm.control}
                          name="smtp.auth.type"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Authentication Type</FormLabel>
                              <FormControl>
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="smtp-auth-basic"
                                      checked={field.value === 'basic'}
                                      onCheckedChange={() => configForm.setValue('smtp.auth.type', 'basic')}
                                    />
                                    <label
                                      htmlFor="smtp-auth-basic"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Basic Authentication (Username/Password)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="smtp-auth-oauth2"
                                      checked={field.value === 'oauth2'}
                                      onCheckedChange={() => configForm.setValue('smtp.auth.type', 'oauth2')}
                                    />
                                    <label
                                      htmlFor="smtp-auth-oauth2"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      OAuth2 Authentication (Recommended for better security)
                                    </label>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {configForm.watch('smtp.auth.type') === 'basic' && (
                          <div className="space-y-4">
                            <FormField
                              control={configForm.control}
                              name="smtp.auth.user"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMTP Username</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="username@example.com" />
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
                                  <FormLabel>SMTP Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" placeholder="••••••••" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {configForm.watch('smtp.auth.type') === 'oauth2' && (
                          <div className="space-y-4">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>OAuth2 Authentication</AlertTitle>
                              <AlertDescription>
                                Please use the OAuth setup section above to configure OAuth authentication.
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
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
                                  <Input {...field} placeholder="imap.gmail.com" />
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
                                  <Input {...field} type="number" placeholder="993" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={configForm.control}
                            name="imap.tls"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Use TLS</FormLabel>
                                  <FormDescription>
                                    Enable TLS for secure IMAP connections
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={configForm.control}
                            name="imap.authTimeout"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Auth Timeout (ms)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" placeholder="10000" />
                                </FormControl>
                                <FormDescription>
                                  Authentication timeout in milliseconds
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <FormField
                          control={configForm.control}
                          name="imap.auth.type"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Authentication Type</FormLabel>
                              <FormControl>
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="imap-auth-basic"
                                      checked={field.value === 'basic'}
                                      onCheckedChange={() => configForm.setValue('imap.auth.type', 'basic')}
                                    />
                                    <label
                                      htmlFor="imap-auth-basic"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Basic Authentication (Username/Password)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="imap-auth-oauth2"
                                      checked={field.value === 'oauth2'}
                                      onCheckedChange={() => configForm.setValue('imap.auth.type', 'oauth2')}
                                    />
                                    <label
                                      htmlFor="imap-auth-oauth2"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      OAuth2 Authentication (Recommended for better security)
                                    </label>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {configForm.watch('imap.auth.type') === 'basic' && (
                          <div className="space-y-4">
                            <FormField
                              control={configForm.control}
                              name="imap.auth.user"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>IMAP Username</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="username@example.com" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={configForm.control}
                              name="imap.auth.pass"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>IMAP Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" placeholder="••••••••" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {configForm.watch('imap.auth.type') === 'oauth2' && (
                          <div className="space-y-4">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>OAuth2 Authentication</AlertTitle>
                              <AlertDescription>
                                Please use the OAuth setup section above to configure OAuth authentication.
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>General Email Settings</CardTitle>
                        <CardDescription>
                          Configure general email service settings for ticket processing.
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
                                  <Input {...field} placeholder="Support Team" />
                                </FormControl>
                                <FormDescription>
                                  Display name for outgoing emails
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
                                  <Input {...field} placeholder="support@example.com" />
                                </FormControl>
                                <FormDescription>
                                  Email address for outgoing emails
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={configForm.control}
                            name="settings.ticketSubjectPrefix"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ticket Subject Prefix</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="[Ticket #]" />
                                </FormControl>
                                <FormDescription>
                                  Used to identify tickets in email subjects
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
                                <FormLabel>Check Interval (ms)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" placeholder="60000" />
                                </FormControl>
                                <FormDescription>
                                  How often to check for new emails (minimum 30 seconds)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => configForm.reset()}>
                          Reset
                        </Button>
                        <Button type="submit" form="email-config-form" disabled={configMutation.isPending}>
                          {configMutation.isPending ? "Saving..." : "Save Configuration"}
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </form>
              </Form>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testEmailForm}>
              <form onSubmit={testEmailForm.handleSubmit(onTestEmailSubmit)} className="space-y-4">
                <FormField
                  control={testEmailForm.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="recipient@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={testEmailForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Test Email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={testEmailForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="This is a test email." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={testEmailMutation.isPending || !isEmailRunning}>
                  {testEmailMutation.isPending 
                    ? "Sending..." 
                    : !isEmailRunning 
                      ? "Email service not running" 
                      : "Send Test Email"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

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