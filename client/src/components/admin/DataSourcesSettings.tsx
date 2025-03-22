import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DataSource } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Form schema for data source creation/editing
const dataSourceSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(1, "Please select a source type"),
  description: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(10)
});

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

export default function DataSourcesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Fetch all data sources
  const { data: dataSources, isLoading, error } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
    refetchOnWindowFocus: false
  });

  // Create data source mutation
  const createMutation = useMutation({
    mutationFn: async (data: DataSourceFormValues) => {
      const response = await apiRequest("POST", "/api/data-sources", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Data source created",
        description: "The data source has been created successfully.",
      });
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create data source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update data source mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DataSourceFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/data-sources/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Data source updated",
        description: "The data source has been updated successfully.",
      });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update data source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete data source mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/data-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Data source deleted",
        description: "The data source has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete data source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms for create and edit
  const createForm = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      content: "",
      enabled: true,
      priority: 10
    }
  });

  const editForm = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      content: "",
      enabled: true,
      priority: 10
    }
  });

  // Initialize edit form when editing a data source
  const startEditing = (dataSource: DataSource) => {
    editForm.reset({
      name: dataSource.name,
      type: dataSource.type,
      description: dataSource.description || "",
      content: dataSource.content || "",
      enabled: dataSource.enabled,
      priority: dataSource.priority
    });
    setEditingId(dataSource.id);
  };

  // Handle form submissions
  const onCreateSubmit = (data: DataSourceFormValues) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: DataSourceFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    }
  };

  // Format data source type for display
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "kb":
        return "Knowledge Base";
      case "url":
        return "Web URL";
      case "doc":
        return "Document";
      case "custom":
        return "Custom Data";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Format data source type for badge color
  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "kb":
        return "default";
      case "url":
        return "secondary";
      case "doc":
        return "outline";
      case "custom":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Error loading data sources</p>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] })}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Knowledge Sources</CardTitle>
          <CardDescription>
            Manage the knowledge sources used by the AI to provide responses
          </CardDescription>
        </div>
        <Button 
          onClick={() => setIsCreating(!isCreating)} 
          variant={isCreating ? "secondary" : "default"}
        >
          {isCreating ? (
            <>
              <X className="mr-2 h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Add Source
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isCreating && (
          <div className="mb-6 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium mb-3">Add Knowledge Source</h3>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Product Documentation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kb">Knowledge Base</SelectItem>
                            <SelectItem value="url">Web URL</SelectItem>
                            <SelectItem value="doc">Document</SelectItem>
                            <SelectItem value="custom">Custom Data</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this knowledge source" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={
                            createForm.watch("type") === "url" 
                              ? "https://example.com/docs" 
                              : createForm.watch("type") === "custom" 
                                ? "JSON data or formatted text content" 
                                : "Content for this knowledge source"
                          }
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {createForm.watch("type") === "url" 
                          ? "Enter the URL of the documentation or knowledge base" 
                          : createForm.watch("type") === "kb" 
                            ? "Enter JSON array of knowledge base entries"
                            : "Enter the content for this knowledge source"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enabled</FormLabel>
                          <FormDescription>
                            Make this knowledge source available for AI
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
                    control={createForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-100)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers = higher priority
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Source"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {dataSources && dataSources.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map(dataSource => (
                <TableRow key={dataSource.id}>
                  <TableCell className="font-medium">{dataSource.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(dataSource.type)}>
                      {getTypeLabel(dataSource.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{dataSource.priority}</TableCell>
                  <TableCell>
                    {dataSource.enabled ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => startEditing(dataSource)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this data source?")) {
                            deleteMutation.mutate(dataSource.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>No knowledge sources found. Add one to get started.</p>
          </div>
        )}

        {editingId && (
          <div className="mt-6 p-4 border rounded-md bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Edit Knowledge Source</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingId(null)}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kb">Knowledge Base</SelectItem>
                            <SelectItem value="url">Web URL</SelectItem>
                            <SelectItem value="doc">Document</SelectItem>
                            <SelectItem value="custom">Custom Data</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enabled</FormLabel>
                          <FormDescription>
                            Make this knowledge source available for AI
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-100)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers = higher priority
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}