import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, FileText, Search, Filter, Tag, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminLayout from '@/components/admin/AdminLayout';
import { DocumentUploadDialog } from '@/components/admin/DocumentUploadDialog';

// Define the document interface based on schema
interface Document {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string; // Using snake_case to match database column
  updated_at: string; // Using snake_case to match database column
  created_by: number; // Using snake_case to match database column
  last_edited_by?: number; // Using snake_case to match database column
  published_at?: string; // Using snake_case to match database column
  view_count: number; // Using snake_case to match database column
  tenant_id: number; // Using snake_case to match database column
  summary?: string | null;
  tags?: string[] | null;
  error_codes?: string[] | null; // Using snake_case to match database column
  keywords?: string[] | null;
  metadata?: any;
}

// Form validation schema for creating/editing documents
const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["draft", "published", "archived"]),
  summary: z.string().nullable().optional(),
  tags: z.union([
    z.string().transform(val => val ? val.split(',').map(tag => tag.trim()) : []),
    z.array(z.string())
  ]),
  // Frontend uses camelCase, but database uses snake_case (error_codes)
  errorCodes: z.union([
    z.string().transform(val => val ? val.split(',').map(code => code.trim()) : []),
    z.array(z.string())
  ]),
  keywords: z.union([
    z.string().transform(val => val ? val.split(',').map(keyword => keyword.trim()) : []),
    z.array(z.string())
  ]),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all documents
  const { 
    data: documents = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    }
  });

  // Get categories for filtering
  const uniqueCategories: string[] = Array.from(
    new Set(documents.filter((doc: Document) => doc.category).map((doc: Document) => doc.category))
  );

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormValues) => {
      const response = await apiRequest('POST', '/api/documents', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Document created",
        description: "The document has been created successfully.",
      });
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get a specific document by ID
  const {
    data: currentDocument,
    isLoading: isLoadingDocument,
  } = useQuery({
    queryKey: ['/api/documents', currentDocumentId],
    queryFn: async () => {
      if (!currentDocumentId) return null;
      const response = await fetch(`/api/documents/${currentDocumentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }
      return response.json();
    },
    enabled: !!currentDocumentId,
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DocumentFormValues }) => {
      const response = await apiRequest('PATCH', `/api/documents/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents', currentDocumentId] });
      setIsEditDialogOpen(false);
      toast({
        title: "Document updated",
        description: "The document has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/documents/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Search documents
  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = searchQuery 
      ? doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesStatus = statusFilter ? doc.status === statusFilter : true;
    const matchesCategory = categoryFilter ? doc.category === categoryFilter : true;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Form for creating new documents
  const createForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "",
      status: "draft",
      summary: "",
      tags: [],
      errorCodes: [],
      keywords: [],
    }
  });

  // Form for editing documents
  const editForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "",
      status: "draft",
      summary: "",
      tags: [],
      errorCodes: [],
      keywords: [],
    }
  });

  // Set edit form values when currentDocument changes
  useEffect(() => {
    if (currentDocument && isEditDialogOpen) {
      editForm.reset({
        title: currentDocument.title,
        content: currentDocument.content,
        category: currentDocument.category,
        status: currentDocument.status,
        summary: currentDocument.summary || "",
        tags: currentDocument.tags ? currentDocument.tags.join(', ') : "",
        errorCodes: currentDocument.error_codes ? currentDocument.error_codes.join(', ') : "",
        keywords: currentDocument.keywords ? currentDocument.keywords.join(', ') : "",
      });
    }
  }, [currentDocument, isEditDialogOpen, editForm]);

  // Handle document creation
  const onCreateSubmit = (data: DocumentFormValues) => {
    createDocumentMutation.mutate(data);
  };

  // Handle document update
  const onEditSubmit = (data: DocumentFormValues) => {
    if (currentDocumentId) {
      updateDocumentMutation.mutate({ id: currentDocumentId, data });
    }
  };

  // Open edit dialog
  const handleEditClick = (id: number) => {
    setCurrentDocumentId(id);
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (id: number) => {
    setCurrentDocumentId(id);
    setIsDeleteDialogOpen(true);
  };

  // Open view dialog
  const handleViewClick = (id: number) => {
    setCurrentDocumentId(id);
    setIsViewDialogOpen(true);
  };

  // Handle document deletion
  const confirmDelete = () => {
    if (currentDocumentId) {
      deleteDocumentMutation.mutate(currentDocumentId);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Render content
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center py-8">Loading documents...</div>;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-red-500">Error loading documents: {(error as Error).message}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/documents'] })}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Knowledge Base Documents</h1>
          <div className="flex space-x-2">
            <Button onClick={() => setIsUploadDialogOpen(true)} className="flex items-center gap-1">
              <Upload size={16} /> Upload File
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-1">
              <Plus size={16} /> New Document
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter size={16} />
                    <span>{statusFilter || "Filter by Status"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <div className="flex items-center gap-2">
                    <Tag size={16} />
                    <span>{categoryFilter || "Filter by Category"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category: string) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No documents found. Create a new document to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc: Document) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.category}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(doc.status)}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell>{doc.view_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewClick(doc.id)}>
                          <FileText size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(doc.id)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(doc.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Document Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Add a new document to the knowledge base. Documents can be referenced by the AI when assisting customers.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Document title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. API, General, Troubleshooting" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief summary of the document" {...field} value={field.value || ''} />
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
                        <Textarea placeholder="Document content..." className="min-h-[200px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={createForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input placeholder="tag1, tag2, tag3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="errorCodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Error Codes</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. E401, AUTH_ERROR" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keywords</FormLabel>
                        <FormControl>
                          <Input placeholder="keyword1, keyword2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createDocumentMutation.isPending}
                  >
                    {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>
                Update the document details and content.
              </DialogDescription>
            </DialogHeader>
            {isLoadingDocument ? (
              <div className="text-center py-4">Loading document data...</div>
            ) : (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Document title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. API, General, Troubleshooting" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of the document" {...field} value={field.value || ''} />
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
                          <Textarea placeholder="Document content..." className="min-h-[200px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <FormControl>
                            <Input placeholder="tag1, tag2, tag3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="errorCodes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Error Codes</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. E401, AUTH_ERROR" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="keyword1, keyword2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={updateDocumentMutation.isPending}
                    >
                      {updateDocumentMutation.isPending ? "Updating..." : "Update Document"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* View Document Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Document Details</DialogTitle>
            </DialogHeader>
            {isLoadingDocument || !currentDocument ? (
              <div className="text-center py-4">Loading document data...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold">{currentDocument.title}</h2>
                  <Badge className={getStatusBadgeColor(currentDocument.status)}>
                    {currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Category</p>
                    <p>{currentDocument.category}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Created</p>
                    <p>{formatDate(currentDocument.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Last Updated</p>
                    <p>{formatDate(currentDocument.updated_at)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">View Count</p>
                    <p>{currentDocument.view_count}</p>
                  </div>
                  {currentDocument.published_at && (
                    <div>
                      <p className="font-semibold">Published Date</p>
                      <p>{formatDate(currentDocument.published_at)}</p>
                    </div>
                  )}
                </div>
                
                {currentDocument.summary && (
                  <div>
                    <h3 className="font-semibold text-lg">Summary</h3>
                    <p>{currentDocument.summary}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-lg">Content</h3>
                  <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                    {currentDocument.content}
                  </div>
                </div>
                
                {currentDocument.tags && currentDocument.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg">Tags</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentDocument.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentDocument.error_codes && currentDocument.error_codes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg">Error Codes</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentDocument.error_codes.map((code: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-red-50">{code}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentDocument.keywords && currentDocument.keywords.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg">Keywords</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentDocument.keywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditClick(currentDocument.id);
                  }}>
                    Edit Document
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this document?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the document from the knowledge base.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
                disabled={deleteDocumentMutation.isPending}
              >
                {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Document Upload Dialog */}
        <DocumentUploadDialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} />
      </>
    );
  };

  return (
    <AdminLayout>
      {renderContent()}
    </AdminLayout>
  );
}