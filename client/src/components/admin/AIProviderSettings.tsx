import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Plus, Settings, Trash2, Check, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

// Define AI provider types
const providerTypes = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "aws-bedrock", label: "AWS Bedrock" },
  { value: "custom", label: "Custom API" }
];

// Define available models for each provider
const providerModels = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
  ],
  gemini: [
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro" }
  ],
  anthropic: [
    { value: "claude-3-opus", label: "Claude 3 Opus" },
    { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku", label: "Claude 3 Haiku" }
  ],
  "aws-bedrock": [
    { value: "anthropic.claude-3-sonnet-20240229-v1:0", label: "Claude 3 Sonnet" },
    { value: "anthropic.claude-3-haiku-20240307-v1:0", label: "Claude 3 Haiku" },
    { value: "anthropic.claude-instant-v1", label: "Claude Instant" },
    { value: "meta.llama3-8b-instruct-v1:0", label: "Llama 3 8B" },
    { value: "meta.llama3-70b-instruct-v1:0", label: "Llama 3 70B" }
  ],
  // Perplexity AI models have been removed
  custom: [
    { value: "custom", label: "Custom Model" }
  ]
};

// Form schema for adding or editing AI providers
const providerFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.string().min(1, "Provider type is required"),
  enabled: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  useForChat: z.boolean().default(true),
  useForClassification: z.boolean().default(true),
  useForAutoResolve: z.boolean().default(true),
  useForEmail: z.boolean().default(true),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().min(1, "Model is required"),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(100).max(32000).default(2000),
  extraParams: z.string().optional(),
});

type ProviderFormValues = z.infer<typeof providerFormSchema>;

type AIProviderSettingsProps = {
  aiProviders: any[];
  aiStatus: Record<string, boolean>;
  isLoading: boolean;
};

export default function AIProviderSettings({ aiProviders, aiStatus, isLoading }: AIProviderSettingsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<any>(null);
  const [defaultValues, setDefaultValues] = useState<Partial<ProviderFormValues>>({
    name: "",
    type: "openai",
    enabled: true,
    isPrimary: false,
    useForChat: true,
    useForClassification: true,
    useForAutoResolve: true,
    useForEmail: true,
    apiKey: "",
    model: "gpt-4o",
    baseUrl: "",
    temperature: 0.7,
    maxTokens: 2000,
    extraParams: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for adding a new provider
  const addForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues,
  });

  // Form for editing an existing provider
  const editForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: ProviderFormValues) => {
      // Parse extraParams if provided
      let parsedExtraParams = {};
      if (values.extraParams) {
        try {
          parsedExtraParams = JSON.parse(values.extraParams);
        } catch (e) {
          toast({
            title: "Invalid Extra Parameters",
            description: "Extra parameters must be valid JSON",
            variant: "destructive",
          });
          return;
        }
      }

      const payload = {
        ...values,
        settings: {
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          ...parsedExtraParams
        }
      };
      
      // Remove properties that are already in settings
      delete payload.temperature;
      delete payload.maxTokens;
      delete payload.extraParams;

      const res = await apiRequest("POST", "/api/ai-providers", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Added",
        description: "The AI provider has been successfully added",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers/status'] });
      setIsAddDialogOpen(false);
      addForm.reset(defaultValues);
    },
    onError: (error) => {
      toast({
        title: "Failed to Add AI Provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (values: ProviderFormValues) => {
      if (!values.id) return;

      // Parse extraParams if provided
      let parsedExtraParams = {};
      if (values.extraParams) {
        try {
          parsedExtraParams = JSON.parse(values.extraParams);
        } catch (e) {
          toast({
            title: "Invalid Extra Parameters",
            description: "Extra parameters must be valid JSON",
            variant: "destructive",
          });
          return;
        }
      }

      const payload = {
        ...values,
        settings: {
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          ...parsedExtraParams
        }
      };
      
      // Remove properties that are already in settings
      delete payload.temperature;
      delete payload.maxTokens;
      delete payload.extraParams;

      const res = await apiRequest("PATCH", `/api/ai-providers/${values.id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Updated",
        description: "The AI provider has been successfully updated",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers/status'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update AI Provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ai-providers/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Deleted",
        description: "The AI provider has been successfully deleted",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers/status'] });
      setIsDeleteDialogOpen(false);
      setCurrentProvider(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete AI Provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle provider enabled state
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/ai-providers/${id}`, { enabled });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers/status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set provider as primary
  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/ai-providers/${id}`, { isPrimary: true });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Primary Provider Updated",
        description: "The primary AI provider has been updated",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-providers'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Primary Provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onCreateSubmit(values: ProviderFormValues) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: ProviderFormValues) {
    updateMutation.mutate(values);
  }

  function handleEditProvider(provider: any) {
    const formValues = {
      ...provider,
      temperature: provider.settings?.temperature || 0.7,
      maxTokens: provider.settings?.maxTokens || 2000,
      extraParams: provider.settings 
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(provider.settings).filter(
                ([key]) => !['temperature', 'maxTokens'].includes(key)
              )
            ),
            null,
            2
          )
        : ""
    };

    setCurrentProvider(provider);
    editForm.reset(formValues);
    setIsEditDialogOpen(true);
  }

  function handleDeleteProvider(provider: any) {
    setCurrentProvider(provider);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (currentProvider) {
      deleteMutation.mutate(currentProvider.id);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">AI Providers</h2>
        <Button onClick={() => {
          addForm.reset(defaultValues);
          setIsAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : aiProviders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">No AI Providers Configured</h3>
              <p className="text-muted-foreground mb-4">
                Add an AI provider to enable intelligent support features
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiProviders.map((provider) => (
            <Card key={provider.id} className={provider.enabled ? "" : "opacity-70"}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {provider.name} 
                      {provider.isPrimary && (
                        <Badge className="ml-2 bg-primary" variant="secondary">Primary</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {providerTypes.find(p => p.value === provider.type)?.label || provider.type}
                    </CardDescription>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center mr-2">
                      {aiStatus && provider.type in aiStatus ? (
                        aiStatus[provider.type] ? (
                          <Badge className="bg-green-500" variant="secondary">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500" variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-yellow-500" variant="secondary">
                          Unknown
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(checked) => 
                        toggleEnabledMutation.mutate({ id: provider.id, enabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{provider.model}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {provider.useForChat && (
                      <Badge variant="outline">Chat</Badge>
                    )}
                    {provider.useForClassification && (
                      <Badge variant="outline">Classification</Badge>
                    )}
                    {provider.useForAutoResolve && (
                      <Badge variant="outline">Auto-resolve</Badge>
                    )}
                    {provider.useForEmail && (
                      <Badge variant="outline">Email</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                {!provider.isPrimary && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPrimaryMutation.mutate(provider.id)}
                    disabled={!provider.enabled}
                  >
                    Set as Primary
                  </Button>
                )}
                {provider.isPrimary && (
                  <div className="text-xs text-muted-foreground">
                    Primary provider
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditProvider(provider)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteProvider(provider)}
                    disabled={provider.isPrimary}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Provider Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add AI Provider</DialogTitle>
            <DialogDescription>
              Configure a new AI provider for your support system
            </DialogDescription>
          </DialogHeader>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="OpenAI GPT-4" {...field} />
                        </FormControl>
                        <FormDescription>
                          Give this provider a descriptive name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Update model based on provider type
                            const defaultModel = providerModels[value as keyof typeof providerModels][0].value;
                            addForm.setValue("model", defaultModel);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providerTypes.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the AI service provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providerModels[addForm.watch("type") as keyof typeof providerModels]?.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the specific model to use
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your API key for this provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={addForm.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable Provider</FormLabel>
                            <FormDescription>
                              Enable or disable this AI provider
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={addForm.control}
                      name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Set as Primary Provider</FormLabel>
                            <FormDescription>
                              Make this the primary AI provider
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4 mt-4">
                  <FormField
                    control={addForm.control}
                    name="useForChat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Chatbot Responses
                          </FormLabel>
                          <FormDescription>
                            Use this provider for generating chatbot responses
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
                    control={addForm.control}
                    name="useForClassification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Ticket Classification
                          </FormLabel>
                          <FormDescription>
                            Use this provider for ticket classification and routing
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
                    control={addForm.control}
                    name="useForAutoResolve"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto-Resolution
                          </FormLabel>
                          <FormDescription>
                            Use this provider for automatic ticket resolution
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
                    control={addForm.control}
                    name="useForEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Generation
                          </FormLabel>
                          <FormDescription>
                            Use this provider for generating email responses
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
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <FormField
                    control={addForm.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Custom API endpoint URL (for self-hosted models or proxies)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Controls randomness: lower values are more deterministic, higher values more creative
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Tokens: {field.value}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={100} 
                            max={32000} 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum length of generated responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="extraParams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extra Parameters (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"top_p": 0.9, "presence_penalty": 0.2}'
                            className="font-mono text-sm"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Additional parameters in JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Provider
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Provider</DialogTitle>
            <DialogDescription>
              Update the configuration for this AI provider
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  {/* Hidden id field */}
                  <input type="hidden" {...editForm.register("id")} />

                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Give this provider a descriptive name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Update model based on provider type
                            const defaultModel = providerModels[value as keyof typeof providerModels][0].value;
                            editForm.setValue("model", defaultModel);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providerTypes.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the AI service provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providerModels[editForm.watch("type") as keyof typeof providerModels]?.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the specific model to use
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                            placeholder="••••••••••••••••••••••" 
                          />
                        </FormControl>
                        <FormDescription>
                          Leave blank to keep the current API key
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={editForm.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable Provider</FormLabel>
                            <FormDescription>
                              Enable or disable this AI provider
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={editForm.control}
                      name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={field.value}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Primary Provider</FormLabel>
                            <FormDescription>
                              {field.value ? "This is the primary provider" : "Make this the primary provider"}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4 mt-4">
                  <FormField
                    control={editForm.control}
                    name="useForChat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Chatbot Responses
                          </FormLabel>
                          <FormDescription>
                            Use this provider for generating chatbot responses
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
                    control={editForm.control}
                    name="useForClassification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Ticket Classification
                          </FormLabel>
                          <FormDescription>
                            Use this provider for ticket classification and routing
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
                    control={editForm.control}
                    name="useForAutoResolve"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto-Resolution
                          </FormLabel>
                          <FormDescription>
                            Use this provider for automatic ticket resolution
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
                    control={editForm.control}
                    name="useForEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Generation
                          </FormLabel>
                          <FormDescription>
                            Use this provider for generating email responses
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
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <FormField
                    control={editForm.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Custom API endpoint URL (for self-hosted models or proxies)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Controls randomness: lower values are more deterministic, higher values more creative
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Tokens: {field.value}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={100} 
                            max={32000} 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum length of generated responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="extraParams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extra Parameters (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"top_p": 0.9, "presence_penalty": 0.2}'
                            className="font-mono text-sm"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Additional parameters in JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this AI provider? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}