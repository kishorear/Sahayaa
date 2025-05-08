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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [configDetails, setConfigDetails] = useState<{success: boolean; message: string; details?: any}>({
    success: false,
    message: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  
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
    if (emailStatusResponse && typeof emailStatusResponse === 'object') {
      // TypeScript type guard to ensure 'configured' exists
      setIsEmailRunning('configured' in emailStatusResponse ? 
        !!emailStatusResponse.configured : false);
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
              auth: {
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
              auth: {
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
  
  // Config save mutation
  const configMutation = useMutation({
    mutationFn: async (data: EmailConfigValues) => {
      const response = await apiRequest('POST', '/api/email/config', data);
      const responseData = await response.json();
      return responseData;
    },
    onSuccess: (data) => {
      // Show success message
      toast({
        title: "Configuration Saved",
        description: "Email settings have been saved successfully.",
      });
      
      // Open the confirmation dialog with details
      setConfigDetails({
        success: true,
        message: data.message || "Email configuration saved successfully",
        details: data
      });
      setConfirmationOpen(true);
      
      // Refresh configuration data
      refetchConfig();
      refetchStatus();
    },
    onError: (error) => {
      // Show error message
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      
      // Open confirmation dialog with error details
      setConfigDetails({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save email configuration",
        details: error instanceof Error ? { message: error.message } : error
      });
      setConfirmationOpen(true);
    }
  });
  
  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: TestEmailValues) => {
      const response = await apiRequest('POST', '/api/email/test', data);
      const responseData = await response.json();
      return responseData;
    },
    onSuccess: (data) => {
      // Show success toast
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent successfully. Check your inbox to confirm receipt.",
      });
      
      // Open the confirmation dialog with details
      setConfigDetails({
        success: true,
        message: data.message || "Test email sent successfully",
        details: { 
          testEmailSent: true,
          to: testEmailForm.getValues().to // Using the field name from the schema
        }
      });
      setConfirmationOpen(true);
      
      // Reset the form
      testEmailForm.reset();
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Email Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      });
      
      // Open confirmation dialog with error details
      setConfigDetails({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send test email",
        details: { 
          testEmailError: true,
          errorDetails: error instanceof Error ? error.message : "Unknown error"
        }
      });
      setConfirmationOpen(true);
    }
  });
  
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
        {/* OAuth Setup removed as requested */}
        
        {/* Main email configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Configure your email service to receive and send support tickets via email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...configForm}>
              <form onSubmit={configForm.handleSubmit(onConfigSubmit)} className="space-y-4">
                <Tabs defaultValue="smtp" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="smtp">SMTP (Outgoing)</TabsTrigger>
                    <TabsTrigger value="imap">IMAP (Incoming)</TabsTrigger>
                    <TabsTrigger value="settings">General Settings</TabsTrigger>
                  </TabsList>

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
                                <FormLabel>Use Secure Connection (TLS/SSL)</FormLabel>
                                <FormDescription>
                                  Enable for secured SMTP connections (usually port 465)
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
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Authentication</h4>
                          
                          <FormField
                            control={configForm.control}
                            name="smtp.auth.user"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="your.email@example.com" />
                                </FormControl>
                                <FormDescription>
                                  Usually your full email address
                                </FormDescription>
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
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="••••••••••••"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Use an application-specific password if 2FA is enabled
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="imap" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>IMAP Configuration</CardTitle>
                        <CardDescription>
                          Configure incoming email settings to receive support tickets.
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
                        
                        <div className="flex flex-col space-y-4">
                          <FormField
                            control={configForm.control}
                            name="imap.tls"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Use TLS</FormLabel>
                                  <FormDescription>
                                    Enable for secured IMAP connections (recommended)
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
                                <FormLabel>Connection Timeout (ms)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="1000" step="1000" />
                                </FormControl>
                                <FormDescription>
                                  Timeout for IMAP connection attempts in milliseconds
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Authentication</h4>
                          
                          <FormField
                            control={configForm.control}
                            name="imap.auth.user"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="your.email@example.com" />
                                </FormControl>
                                <FormDescription>
                                  Usually your full email address
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={configForm.control}
                            name="imap.auth.pass"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="••••••••••••"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Use an application-specific password if 2FA is enabled
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Email Settings</CardTitle>
                        <CardDescription>
                          Configure general email processing settings.
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
                                  The display name that will be shown to recipients
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
                                  <Input {...field} placeholder="support@yourcompany.com" />
                                </FormControl>
                                <FormDescription>
                                  The email address that will be used as the sender
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
                              <FormLabel>Ticket Subject Prefix</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="[Ticket #]" />
                              </FormControl>
                              <FormDescription>
                                This text will be used to prefix the ticket ID in email subjects
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
                                <Input {...field} type="number" min="30000" step="10000" />
                              </FormControl>
                              <FormDescription>
                                How often to check for new emails (in milliseconds, minimum 30 seconds)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="submit"
                    disabled={configMutation.isPending}
                  >
                    {configMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Test email card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your configuration is working correctly.
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
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="recipient@example.com" />
                      </FormControl>
                      <FormDescription>
                        Email address to send the test message to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4">
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
                          <Input 
                            {...field} 
                            placeholder="This is a test email from the support system."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit"
                  disabled={testEmailMutation.isPending || configMutation.isPending || !isEmailRunning}
                >
                  {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                </Button>
                
                {!isEmailRunning && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email Service Not Running</AlertTitle>
                    <AlertDescription>
                      The email service is not currently running. Save your configuration and refresh the status before sending a test email.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Email Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Integration Guide</CardTitle>
            <CardDescription>
              Tips for setting up your email integration correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div>
              <h4 className="font-medium mb-2">Gmail Settings</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>SMTP Host: smtp.gmail.com</li>
                <li>SMTP Port: 587 (with TLS enabled)</li>
                <li>IMAP Host: imap.gmail.com</li>
                <li>IMAP Port: 993 (with TLS enabled)</li>
                <li>For accounts with 2FA, use an app password instead of your regular password</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Outlook/Office 365 Settings</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>SMTP Host: smtp.office365.com</li>
                <li>SMTP Port: 587 (with TLS enabled)</li>
                <li>IMAP Host: outlook.office365.com</li>
                <li>IMAP Port: 993 (with TLS enabled)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Make sure your email provider allows IMAP access to your account</li>
                <li>Check your email provider's specific requirements for third-party app access</li>
                <li>For best results, create a dedicated email account for support tickets</li>
                <li>Consider using a dedicated email address like support@yourdomain.com</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Configuration Confirmation Dialog */}
      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {configDetails.success ? (
                <div className="flex items-center text-green-500">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Email Configuration Saved
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Configuration Error
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              {configDetails.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {configDetails.success ? (
              <div className="space-y-4">
                <p className="text-sm font-medium">Connection Status:</p>
                <div className="space-y-3">
                  {/* SMTP Status */}
                  <div className={`rounded-md p-4 border ${
                    configDetails.details?.smtpStatus === 'connected' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {configDetails.details?.smtpStatus === 'connected' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${
                          configDetails.details?.smtpStatus === 'connected' 
                            ? 'text-green-800' 
                            : 'text-red-800'
                        }`}>
                          SMTP Server Connection: {' '}
                          <span className="font-bold">
                            {configDetails.details?.smtpStatus === 'connected' 
                              ? 'Connected Successfully' 
                              : 'Connection Failed'}
                          </span>
                        </p>
                        {configDetails.details?.smtpStatus === 'connected' ? (
                          <p className="mt-2 text-sm text-green-700">
                            Your outgoing email server is correctly configured. You can send emails through the system.
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-red-700">
                            {configDetails.details?.error || 'Unable to connect to SMTP server. Please check your credentials and try again.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* IMAP Status - Only show if user provided IMAP credentials */}
                  {configDetails.details?.imapConfigured && (
                    <div className={`rounded-md p-4 border ${
                      configDetails.details?.imapStatus === 'connected' 
                        ? 'bg-green-50 border-green-200' 
                        : configDetails.details?.imapStatus === 'not_configured' 
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {configDetails.details?.imapStatus === 'connected' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : configDetails.details?.imapStatus === 'not_configured' ? (
                            <Info className="h-5 w-5 text-gray-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            configDetails.details?.imapStatus === 'connected' 
                              ? 'text-green-800' 
                              : configDetails.details?.imapStatus === 'not_configured'
                                ? 'text-gray-800'
                                : 'text-amber-800'
                          }`}>
                            IMAP Server Connection: {' '}
                            <span className="font-bold">
                              {configDetails.details?.imapStatus === 'connected' 
                                ? 'Connected Successfully' 
                                : configDetails.details?.imapStatus === 'not_configured'
                                  ? 'Not Configured'
                                  : 'Connection Failed'}
                            </span>
                          </p>
                          {configDetails.details?.imapStatus === 'connected' ? (
                            <p className="mt-2 text-sm text-green-700">
                              Your incoming email server is correctly configured. The system will check for new support emails.
                            </p>
                          ) : configDetails.details?.imapStatus === 'not_configured' ? (
                            <p className="mt-2 text-sm text-gray-700">
                              IMAP not configured. System will operate in SMTP-only mode (can send emails but not receive).
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-amber-700">
                              {configDetails.details?.imapError || 'Unable to connect to IMAP server. Email receiving will be disabled.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-sm font-medium mt-4">Next Steps:</p>
                <p className="text-sm">
                  {configDetails.details?.smtpStatus === 'connected' 
                    ? 'You can now send a test email to verify that your configuration is working correctly.'
                    : 'Please review your SMTP settings and try again.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium">Error Details:</p>
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        Unable to save email configuration
                      </p>
                      <div className="mt-2 text-sm text-red-700">
                        <p>Please check the following:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                          <li>Ensure your SMTP and IMAP server addresses are correct</li>
                          <li>Verify that the username and password are valid</li>
                          <li>Confirm that the ports are correct and not blocked by firewalls</li>
                          <li>If using Gmail, ensure "Less secure app access" is enabled or use an app password</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant={configDetails.success ? "default" : "secondary"}
              onClick={() => setConfirmationOpen(false)}
            >
              {configDetails.success ? "Close" : "Try Again"}
            </Button>
            
            {configDetails.success && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmationOpen(false);
                  refetchConfig();
                  refetchStatus();
                }}
              >
                Refresh Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}