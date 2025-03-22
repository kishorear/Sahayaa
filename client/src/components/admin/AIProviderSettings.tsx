import React, { useState } from "react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, PlusCircle, Trash2, Check, X, Bot, RefreshCcw } from "lucide-react";

// Define the AI provider types
const providerTypes = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "aws-bedrock", label: "AWS Bedrock" },
  { value: "custom", label: "Custom API" }
];

// Define the provider schema
const aiProviderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["openai", "gemini", "anthropic", "aws-bedrock", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  isPrimary: z.boolean().default(false),
  enabled: z.boolean().default(true),
  useForChat: z.boolean().default(true),
  useForClassification: z.boolean().default(true),
  useForAutoResolve: z.boolean().default(true),
  useForEmail: z.boolean().default(true),
  settings: z.record(z.any()).default({})
});

type AIProvider = z.infer<typeof aiProviderSchema> & {
  id: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
};

type AIProviderFormValues = z.infer<typeof aiProviderSchema>;

export default function AIProviderSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("openai");

  // Fetch AI providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ["/api/ai-providers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ai-providers");
      const data = await res.json();
      return data as AIProvider[];
    }
  });
  
  // Fetch AI provider status
  const { data: providerStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/ai-providers/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ai-providers/status");
      return await res.json() as Record<string, boolean>;
    }
  });

  // Create a new AI provider
  const createProviderMutation = useMutation({
    mutationFn: async (data: AIProviderFormValues) => {
      const res = await apiRequest("POST", "/api/ai-providers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      toast({
        title: "Provider created",
        description: "AI provider was successfully created.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create provider",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update an AI provider
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AIProviderFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/ai-providers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      toast({
        title: "Provider updated",
        description: "AI provider was successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update provider",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete an AI provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ai-providers/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      toast({
        title: "Provider deleted",
        description: "AI provider was successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedProviderId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete provider",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create provider form
  const form = useForm<AIProviderFormValues>({
    resolver: zodResolver(aiProviderSchema),
    defaultValues: {
      name: "",
      type: "openai",
      apiKey: "",
      model: "gpt-4o",
      isPrimary: false,
      enabled: true,
      useForChat: true,
      useForClassification: true,
      useForAutoResolve: true,
      useForEmail: true,
      settings: {
        systemPrompt: "You are a helpful customer support assistant. Your goal is to resolve customer issues efficiently and professionally."
      }
    }
  });

  const handleProviderTypeChange = (value: string) => {
    form.setValue("type", value as any);
    
    // Set default model based on provider type
    if (value === "openai") {
      form.setValue("model", "gpt-4o");
    } else if (value === "anthropic") {
      form.setValue("model", "claude-3-opus-20240229");
    } else if (value === "gemini") {
      form.setValue("model", "gemini-1.5-pro");
    } else if (value === "aws-bedrock") {
      form.setValue("model", "anthropic.claude-3-sonnet-20240229");
    }
  };

  const onSubmit = (data: AIProviderFormValues) => {
    createProviderMutation.mutate(data);
  };

  const toggleProviderEnabled = (provider: AIProvider) => {
    updateProviderMutation.mutate({
      id: provider.id,
      data: { enabled: !provider.enabled }
    });
  };

  const setPrimaryProvider = (provider: AIProvider) => {
    if (!provider.isPrimary) {
      updateProviderMutation.mutate({
        id: provider.id,
        data: { isPrimary: true }
      });
    }
  };

  const handleCheckStatus = () => {
    refetchStatus();
  };

  // Group providers by type
  const groupedProviders = providers?.reduce((acc, provider) => {
    const type = provider.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(provider);
    return acc;
  }, {} as Record<string, AIProvider[]>) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Provider Settings</h2>
          <p className="text-muted-foreground">
            Configure and manage AI providers for ticket classification, chat, and auto-resolution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCheckStatus} disabled={isStatusLoading}>
            {isStatusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Check Status
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add AI Provider</DialogTitle>
                <DialogDescription>
                  Configure a new AI provider for your support system.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="OpenAI GPT-4o" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this provider configuration.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Type</FormLabel>
                        <Select 
                          onValueChange={(value) => handleProviderTypeChange(value)} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providerTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the AI provider service.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="sk-..." 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          The API key for authentication with the provider.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('type') === 'custom' && (
                    <FormField
                      control={form.control}
                      name="baseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://api.example.com/v1" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            The base URL for the custom API.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="gpt-4o" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          The specific model to use within the provider.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Provider Options</h4>
                    
                    <FormField
                      control={form.control}
                      name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Primary Provider</FormLabel>
                            <FormDescription>
                              Set as the default provider for all AI operations.
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
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Enabled</FormLabel>
                            <FormDescription>
                              Enable or disable this provider.
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="useForChat"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Chat</FormLabel>
                              <FormDescription>
                                Use for chatbot responses
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="useForClassification"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Classification</FormLabel>
                              <FormDescription>
                                Use for ticket classification
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="useForAutoResolve"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Auto-resolve</FormLabel>
                              <FormDescription>
                                Use for ticket auto-resolution
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="useForEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Email</FormLabel>
                              <FormDescription>
                                Use for email responses
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="settings.systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Prompt</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="You are a helpful customer support assistant..." 
                              className="min-h-[100px]"
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Default system instructions for the AI.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      disabled={createProviderMutation.isPending}
                    >
                      {createProviderMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Provider
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : providers?.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent className="py-10">
            <div className="flex flex-col items-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No AI Providers Configured</h3>
              <p className="text-muted-foreground mb-6">
                You haven't added any AI providers yet. Add a provider to enable AI-powered support.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid grid-cols-5">
            {providerTypes.map((type) => (
              <TabsTrigger 
                key={type.value} 
                value={type.value}
                disabled={!groupedProviders[type.value] || groupedProviders[type.value].length === 0}
              >
                {type.label}
                {groupedProviders[type.value] && groupedProviders[type.value].length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {groupedProviders[type.value].length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {providerTypes.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              {groupedProviders[type.value]?.map((provider) => (
                <Card key={provider.id} className={!provider.enabled ? "opacity-60" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CardTitle>{provider.name}</CardTitle>
                        {provider.isPrimary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                        {providerStatus && (
                          <Badge variant={providerStatus[provider.type] ? "success" : "destructive"}>
                            {providerStatus[provider.type] ? "Available" : "Unavailable"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Switch 
                          checked={provider.enabled} 
                          onCheckedChange={() => toggleProviderEnabled(provider)}
                        />
                        <Dialog open={isDeleteDialogOpen && selectedProviderId === provider.id} 
                          onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSelectedProviderId(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedProviderId(provider.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete AI Provider</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this AI provider? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button 
                                variant="destructive" 
                                onClick={() => deleteProviderMutation.mutate(provider.id)}
                                disabled={deleteProviderMutation.isPending}
                              >
                                {deleteProviderMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Delete
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setIsDeleteDialogOpen(false);
                                  setSelectedProviderId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <CardDescription>
                      {provider.model && `Model: ${provider.model}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Chat:</span>
                        {provider.useForChat ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Classification:</span>
                        {provider.useForClassification ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Auto-resolve:</span>
                        {provider.useForAutoResolve ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Email:</span>
                        {provider.useForEmail ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created on {new Date(provider.createdAt).toLocaleDateString()}
                    </span>
                    {!provider.isPrimary && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPrimaryProvider(provider)}
                      >
                        Set as Primary
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}