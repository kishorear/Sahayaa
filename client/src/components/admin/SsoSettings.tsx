import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash, PlusCircle, RefreshCw, Check, AlertCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";

// Define validation schemas
const oauthProviderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.literal("oauth2"),
  enabled: z.boolean().default(true),
  config: z.object({
    clientID: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
    authorizationURL: z.string().url("Must be a valid URL"),
    tokenURL: z.string().url("Must be a valid URL"),
    callbackURL: z.string().url("Must be a valid URL"),
    scope: z.string()
  })
});

const googleProviderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.literal("google"),
  enabled: z.boolean().default(true),
  config: z.object({
    clientID: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
    callbackURL: z.string().url("Must be a valid URL").optional(),
    scope: z.string().optional()
  })
});

const samlProviderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.literal("saml"),
  enabled: z.boolean().default(true),
  config: z.object({
    entryPoint: z.string().url("Must be a valid URL"),
    issuer: z.string().min(1, "Issuer is required"),
    cert: z.string().min(1, "Certificate is required"),
    callbackURL: z.string().url("Must be a valid URL")
  })
});

const providerSchema = z.discriminatedUnion("type", [
  oauthProviderSchema,
  googleProviderSchema,
  samlProviderSchema
]);

type Provider = z.infer<typeof providerSchema>;
type OAuthProvider = z.infer<typeof oauthProviderSchema>;
type SamlProvider = z.infer<typeof samlProviderSchema>;

// Predefined provider templates
const PREDEFINED_PROVIDERS = {
  google: {
    name: "Google",
    type: "oauth2" as const,
    enabled: true,
    config: {
      clientID: "",
      clientSecret: "",
      authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenURL: "https://oauth2.googleapis.com/token",
      callbackURL: window.location.origin + "/api/sso/oauth2/1/callback",
      scope: "profile email"
    }
  },
  google_native: {
    name: "Google",
    type: "google" as const,
    enabled: true,
    config: {
      clientID: "",
      clientSecret: "",
      callbackURL: window.location.origin + "/api/sso/google/1/callback",
      scope: "profile email"
    }
  },
  microsoft: {
    name: "Microsoft",
    type: "oauth2" as const,
    enabled: true,
    config: {
      clientID: "",
      clientSecret: "",
      authorizationURL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenURL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      callbackURL: window.location.origin + "/api/sso/oauth2/1/callback",
      scope: "profile email"
    }
  },
  generic_saml: {
    name: "SAML Provider",
    type: "saml" as const,
    enabled: true,
    config: {
      entryPoint: "",
      issuer: "",
      cert: "",
      callbackURL: window.location.origin + "/api/sso/saml/1/callback"
    }
  }
};

export default function SsoSettings() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("existing");
  const [providerType, setProviderType] = useState<"oauth2" | "google" | "saml">("oauth2");
  const [providerTemplate, setProviderTemplate] = useState("google");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // Initialize form with default values
  const form = useForm<Provider>({
    resolver: zodResolver(providerSchema),
    defaultValues: PREDEFINED_PROVIDERS.google
  });
  
  // Load providers from API
  useEffect(() => {
    fetchProviders();
  }, []);
  
  const fetchProviders = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/sso/providers");
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error("Error fetching SSO providers:", error);
      toast({
        title: "Error",
        description: "Failed to load SSO providers",
        variant: "destructive"
      });
    }
  };
  
  // When provider template changes, update form values
  useEffect(() => {
    if (providerTemplate === "google") {
      form.reset(PREDEFINED_PROVIDERS.google);
    } else if (providerTemplate === "microsoft") {
      form.reset(PREDEFINED_PROVIDERS.microsoft);
    } else if (providerTemplate === "generic_saml") {
      form.reset(PREDEFINED_PROVIDERS.generic_saml);
    }
  }, [providerTemplate, form]);
  
  // When provider type changes, update the template and form
  useEffect(() => {
    if (providerType === "oauth2") {
      setProviderTemplate("google");
      form.reset(PREDEFINED_PROVIDERS.google);
    } else {
      setProviderTemplate("generic_saml");
      form.reset(PREDEFINED_PROVIDERS.generic_saml);
    }
  }, [providerType, form]);
  
  const handleCreateProvider = async (data: Provider) => {
    setIsSubmitting(true);
    setTestResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/sso/providers", data);
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `${data.name} SSO provider created successfully!`,
        variant: "default"
      });
      
      // Refresh providers list and switch to existing tab
      await fetchProviders();
      setActiveTab("existing");
      
      // Reset form
      if (data.type === "oauth2") {
        form.reset(PREDEFINED_PROVIDERS.google);
      } else {
        form.reset(PREDEFINED_PROVIDERS.generic_saml);
      }
    } catch (error) {
      console.error("Error creating SSO provider:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create SSO provider",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteProvider = async (id: number) => {
    if (!confirm("Are you sure you want to delete this provider? This cannot be undone.")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/admin/sso/providers/${id}`);
      
      toast({
        title: "Success",
        description: "SSO provider deleted successfully!",
        variant: "default"
      });
      
      // Refresh providers list
      await fetchProviders();
    } catch (error) {
      console.error("Error deleting SSO provider:", error);
      toast({
        title: "Error",
        description: "Failed to delete SSO provider",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleProvider = async (id: number, currentState: boolean) => {
    try {
      await apiRequest("PUT", `/api/admin/sso/providers/${id}`, {
        enabled: !currentState
      });
      
      toast({
        title: "Success",
        description: `SSO provider ${!currentState ? "enabled" : "disabled"} successfully!`,
        variant: "default"
      });
      
      // Refresh providers list
      await fetchProviders();
    } catch (error) {
      console.error("Error toggling SSO provider:", error);
      toast({
        title: "Error",
        description: "Failed to update SSO provider",
        variant: "destructive"
      });
    }
  };
  
  const handleTestProvider = async () => {
    setIsSubmitting(true);
    setTestResult(null);
    
    try {
      const formData = form.getValues();
      const response = await apiRequest("POST", "/api/admin/sso/providers/test", formData);
      const result = await response.json();
      
      setTestResult(result);
      
      toast({
        title: result.success ? "Test Successful" : "Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error testing SSO provider:", error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to test SSO provider"
      });
      toast({
        title: "Error",
        description: "Failed to test SSO provider",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Single Sign-On (SSO) Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure SSO providers to allow users to sign in using their existing accounts.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Existing Providers</TabsTrigger>
          <TabsTrigger value="new">Add Provider</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing" className="space-y-4 mt-4">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
              <h4 className="text-sm font-semibold">No SSO Providers Configured</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven't configured any SSO providers yet. Click "Add Provider" to get started.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setActiveTab("new")}
                variant="outline"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <Card key={provider.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center">
                        {provider.name}
                        <Badge className="ml-2" variant={provider.enabled ? "default" : "outline"}>
                          {provider.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {provider.type === "oauth2" ? "OAuth 2.0" : "SAML"} Provider
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={provider.enabled} 
                        onCheckedChange={() => handleToggleProvider(provider.id, provider.enabled)}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteProvider(provider.id)}
                      >
                        <Trash className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {provider.type === "oauth2" && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Client ID</Label>
                            <div className="font-mono p-1 bg-muted rounded text-xs truncate">
                              {provider.config.clientID}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Callback URL</Label>
                            <div className="font-mono p-1 bg-muted rounded text-xs truncate">
                              {provider.config.callbackURL}
                            </div>
                          </div>
                        </>
                      )}
                      {provider.type === "saml" && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Entry Point</Label>
                            <div className="font-mono p-1 bg-muted rounded text-xs truncate">
                              {provider.config.entryPoint}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Issuer</Label>
                            <div className="font-mono p-1 bg-muted rounded text-xs truncate">
                              {provider.config.issuer}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="new" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add SSO Provider</CardTitle>
              <CardDescription>
                Configure a new Single Sign-On provider for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateProvider)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Provider Type</Label>
                        <Select 
                          defaultValue={providerType} 
                          onValueChange={(value) => setProviderType(value as "oauth2" | "saml")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                            <SelectItem value="saml">SAML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {providerType === "oauth2" && (
                        <div className="space-y-2">
                          <Label>Provider Template</Label>
                          <Select 
                            defaultValue={providerTemplate} 
                            onValueChange={setProviderTemplate}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="google">Google</SelectItem>
                              <SelectItem value="microsoft">Microsoft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            A user-friendly name for this provider
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {providerType === "oauth2" && (
                      <>
                        <FormField
                          control={form.control}
                          name="config.clientID"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client ID</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                The client ID provided by the OAuth provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.clientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Secret</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" />
                              </FormControl>
                              <FormDescription>
                                The client secret provided by the OAuth provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.callbackURL"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Callback URL</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                The URL the OAuth provider will redirect to after authentication
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.scope"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scope</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                Space-separated list of scopes to request from the provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    {providerType === "saml" && (
                      <>
                        <FormField
                          control={form.control}
                          name="config.entryPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entry Point</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                The URL where the SAML provider will authenticate the user
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.issuer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Issuer</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                The issuer string for your application
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.cert"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certificate</FormLabel>
                              <FormControl>
                                <textarea
                                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                The X.509 certificate provided by your SAML identity provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="config.callbackURL"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Callback URL</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                The URL where the SAML response should be sent
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    {testResult && (
                      <Alert variant={testResult.success ? "default" : "destructive"}>
                        {testResult.success ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {testResult.success ? "Test Successful" : "Test Failed"}
                        </AlertTitle>
                        <AlertDescription>
                          {testResult.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <CardFooter className="flex justify-between px-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestProvider}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                      Add Provider
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}