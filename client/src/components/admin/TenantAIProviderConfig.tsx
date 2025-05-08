import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, PlusCircle, Edit, Save, X } from "lucide-react";

// Define provider model options
const providerModels = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
  ],
  anthropic: [
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" }
  ],
  google: [
    { value: "gemini-pro", label: "Gemini Pro" },
    { value: "gemini-ultra", label: "Gemini Ultra" }
  ],
  aws: [
    { value: "anthropic.claude-3-sonnet-20240229-v1:0", label: "Claude 3 Sonnet (Bedrock)" },
    { value: "anthropic.claude-3-haiku-20240307-v1:0", label: "Claude 3 Haiku (Bedrock)" },
    { value: "meta.llama3-8b-instruct-v1:0", label: "Llama 3 8B (Bedrock)" },
    { value: "meta.llama3-70b-instruct-v1:0", label: "Llama 3 70B (Bedrock)" }
  ],
  azure: [
    { value: "gpt-4", label: "GPT-4 (Azure)" },
    { value: "gpt-35-turbo", label: "GPT-3.5 Turbo (Azure)" }
  ],
  perplexity: [
    { value: "llama-3.1-sonar-small-128k-online", label: "Llama 3.1 Sonar Small" },
    { value: "llama-3.1-sonar-large-128k-online", label: "Llama 3.1 Sonar Large" },
    { value: "llama-3.1-sonar-huge-128k-online", label: "Llama 3.1 Sonar Huge" }
  ]
};

// Define schema for AI provider configuration
const aiProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  provider: z.string().min(1, "Provider type is required"),
  model: z.string().min(1, "Model name is required"),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
  tenantId: z.number(),
  priority: z.number().int().min(1).max(100).default(50),
  contextWindow: z.number().int().min(1000).max(100000).default(8000),
  maxTokens: z.number().int().min(100).max(10000).default(1000),
  temperature: z.number().int().min(0).max(10).default(7),
});

type AIProvider = z.infer<typeof aiProviderSchema>;

interface TenantAIProviderConfigProps {
  tenantId: number;
}

export default function TenantAIProviderConfig({ tenantId }: TenantAIProviderConfigProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI providers for the tenant
  const { data: providers, isLoading } = useQuery<AIProvider[]>({
    queryKey: ['/api/creator/ai-providers', tenantId],
    enabled: !!tenantId,
  });

  // Form for adding/editing AI providers
  const form = useForm<z.infer<typeof aiProviderSchema>>({
    resolver: zodResolver(aiProviderSchema),
    defaultValues: {
      name: "",
      provider: "openai",
      model: "gpt-4o",
      apiKey: "",
      endpoint: "",
      isDefault: false,
      enabled: true,
      tenantId: tenantId,
      priority: 50,
      contextWindow: 8000,
      maxTokens: 1000,
      temperature: 7,
    },
  });

  // Update form values when tenant ID changes
  useEffect(() => {
    form.setValue('tenantId', tenantId);
  }, [tenantId, form]);

  // Set up form with values when editing
  useEffect(() => {
    if (editingProviderId && providers) {
      const provider = providers.find(p => p.id === editingProviderId);
      if (provider) {
        // Update the selected provider type for the dropdown
        setSelectedProvider(provider.provider);
        
        Object.entries(provider).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
            // @ts-ignore - dynamic form field setting
            form.setValue(key, value);
          }
        });
      }
    }
  }, [editingProviderId, providers, form]);

  // Add AI provider mutation
  const addProviderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof aiProviderSchema>) => {
      const response = await fetch('/api/creator/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add AI provider');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Added",
        description: "The AI provider has been added successfully.",
      });
      setIsAdding(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/creator/ai-providers', tenantId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add AI provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update AI provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof aiProviderSchema> }) => {
      const response = await fetch(`/api/creator/ai-providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update AI provider');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Updated",
        description: "The AI provider has been updated successfully.",
      });
      setEditingProviderId(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/creator/ai-providers', tenantId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update AI provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete AI provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/creator/ai-providers/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete AI provider');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Provider Deleted",
        description: "The AI provider has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/creator/ai-providers', tenantId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete AI provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof aiProviderSchema>) => {
    if (editingProviderId) {
      updateProviderMutation.mutate({ id: editingProviderId, data });
    } else {
      addProviderMutation.mutate(data);
    }
  };

  const resetForm = () => {
    form.reset();
    setIsAdding(false);
    setEditingProviderId(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this AI provider?")) {
      deleteProviderMutation.mutate(id);
    }
  };

  const startEditing = (id: number) => {
    setEditingProviderId(id);
    setIsAdding(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Providers Configuration</CardTitle>
          <CardDescription>
            Configure AI providers for this tenant
          </CardDescription>
        </div>
        {!isAdding && !editingProviderId && (
          <Button onClick={() => setIsAdding(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isAdding || editingProviderId ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Name</FormLabel>
                      <FormControl>
                        <Input placeholder="OpenAI GPT-4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedProvider(value);
                          
                          // Set default model for the selected provider
                          if (providerModels[value] && providerModels[value].length > 0) {
                            form.setValue('model', providerModels[value][0].value);
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="google">Google Gemini</SelectItem>
                          <SelectItem value="aws">AWS Bedrock</SelectItem>
                          <SelectItem value="azure">Azure OpenAI</SelectItem>
                          <SelectItem value="perplexity">Perplexity AI</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        {providerModels[selectedProvider] ? (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {providerModels[selectedProvider].map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input placeholder="Enter model name" {...field} />
                        )}
                      </FormControl>
                      <FormDescription>
                        Select the AI model to use for this provider
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
                          placeholder="••••••••" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        {editingProviderId ? "Leave blank to keep existing key" : "API key for the provider"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://api.example.com/v1" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional for custom endpoints
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1-100)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="100" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Higher priority providers are used first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contextWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context Window</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1000" 
                          max="100000"
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Max tokens for context
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Output Tokens</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="100" 
                          max="10000" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Max tokens for model output
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (0-10)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="10" 
                          step="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Higher = more creative (7 is equivalent to 0.7)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex flex-row items-center space-x-4">
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="m-0">Set as Default Provider</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="m-0">Enabled</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={resetForm}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit">
                  {addProviderMutation.isPending || updateProviderMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingProviderId ? (
                    <Save className="mr-2 h-4 w-4" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {editingProviderId ? "Update Provider" : "Add Provider"}
                </Button>
              </div>
            </form>
          </Form>
        ) : providers && providers.length > 0 ? (
          <div className="space-y-4">
            {providers.map((provider) => (
              <Card key={provider.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      {provider.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {!provider.enabled && (
                        <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => startEditing(provider.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => handleDelete(provider.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {provider.provider} - {provider.model}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="font-medium">Priority</div>
                      <div>{provider.priority}</div>
                    </div>
                    <div>
                      <div className="font-medium">Context Window</div>
                      <div>{provider.contextWindow} tokens</div>
                    </div>
                    <div>
                      <div className="font-medium">Max Tokens</div>
                      <div>{provider.maxTokens}</div>
                    </div>
                    <div>
                      <div className="font-medium">Temperature</div>
                      <div>{provider.temperature/10} ({provider.temperature}/10)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No AI providers configured for this tenant.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsAdding(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Provider
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}