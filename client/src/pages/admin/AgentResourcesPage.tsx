import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Trash2, Download, Bot, AlertCircle, CheckCircle, Database, Plus, Edit, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { apiRequest, queryClient } from '@/lib/queryClient';

// Agent configuration with file type restrictions
const AGENT_CONFIGS = {
  'chat-preprocessor': {
    name: 'Chat Preprocessor Agent',
    description: 'Normalizes user messages and extracts metadata',
    allowedTypes: ['.txt', '.md', '.json'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    icon: Bot,
    color: 'bg-blue-500',
    disabled: false,
    usesDatabaseConnections: false
  },
  'instruction-lookup': {
    name: 'Instruction Lookup Agent',
    description: 'Searches for relevant instructions using ChromaDB',
    allowedTypes: ['.txt', '.pdf', '.docx', '.pptx', '.xlsx'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    icon: FileText,
    color: 'bg-green-500',
    disabled: false,
    usesDatabaseConnections: false
  },
  'ticket-lookup': {
    name: 'Ticket Lookup Agent',
    description: 'Finds similar tickets using MCP with external database connections',
    allowedTypes: [] as string[],
    maxFileSize: 0,
    icon: Database,
    color: 'bg-orange-500',
    disabled: false,
    usesDatabaseConnections: true
  },
  'ticket-formatter': {
    name: 'Ticket Formatter Agent',
    description: 'Formats professional ticket responses',
    allowedTypes: ['.txt', '.md', '.json', '.html'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    icon: CheckCircle,
    color: 'bg-purple-500',
    disabled: false,
    usesDatabaseConnections: false
  }
};

interface AgentResource {
  id: number;
  agent_type: string;
  filename: string;
  original_name: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  tenant_id: number;
  uploaded_by: number;
  metadata?: any;
}

interface DatabaseConnection {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastTested?: string;
  testSuccess?: boolean;
}

interface DatabaseConnectionFormData {
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema?: string;
  description?: string;
}

export default function AgentResourcesPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('chat-preprocessor');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentResourceId, setCurrentResourceId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDatabaseDialogOpen, setIsDatabaseDialogOpen] = useState(false);
  const [isEditingDatabase, setIsEditingDatabase] = useState(false);
  const [currentDatabaseConnection, setCurrentDatabaseConnection] = useState<DatabaseConnection | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [databaseFormData, setDatabaseFormData] = useState<DatabaseConnectionFormData>({
    name: '',
    type: 'postgresql',
    host: '',
    port: 5432,
    username: '',
    password: '',
    database: '',
    schema: '',
    description: ''
  });
  const { toast } = useToast();

  // Fetch agent resources for the selected agent
  const { 
    data: resources = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/agent-resources', selectedAgent],
    queryFn: async () => {
      const response = await fetch(`/api/agent-resources?agent=${selectedAgent}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent resources');
      }
      return response.json();
    }
  });

  // Fetch database connections for ticket lookup agent
  const { 
    data: databaseConnections = [], 
    isLoading: isDatabaseLoading, 
    error: databaseError 
  } = useQuery({
    queryKey: ['/api/mcp/database/connections'],
    queryFn: async () => {
      const response = await fetch('/api/mcp/database/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch database connections');
      }
      return response.json();
    },
    enabled: selectedAgent === 'ticket-lookup'
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, agentType }: { file: File; agentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/agent-resources/upload/${agentType}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-resources', selectedAgent] });
      toast({
        title: "File uploaded",
        description: "The file has been uploaded successfully.",
      });
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/agent-resources/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete resource');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-resources', selectedAgent] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Resource deleted",
        description: "The resource has been deleted successfully.",
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

  // Database connection mutations
  const createDatabaseConnectionMutation = useMutation({
    mutationFn: async (connectionData: DatabaseConnectionFormData) => {
      const response = await apiRequest('POST', '/api/mcp/database/connections', connectionData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create database connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/database/connections'] });
      setIsDatabaseDialogOpen(false);
      resetDatabaseForm();
      toast({
        title: "Database connection created",
        description: "The database connection has been created successfully.",
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

  const updateDatabaseConnectionMutation = useMutation({
    mutationFn: async ({ id, connectionData }: { id: number; connectionData: DatabaseConnectionFormData }) => {
      const response = await apiRequest('PUT', `/api/mcp/database/connections/${id}`, connectionData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update database connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/database/connections'] });
      setIsDatabaseDialogOpen(false);
      resetDatabaseForm();
      toast({
        title: "Database connection updated",
        description: "The database connection has been updated successfully.",
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

  const deleteDatabaseConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/mcp/database/connections/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete database connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/database/connections'] });
      toast({
        title: "Database connection deleted",
        description: "The database connection has been deleted successfully.",
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

  const testDatabaseConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/mcp/database/connections/${id}/test`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test database connection');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/database/connections'] });
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Database form handlers
  const resetDatabaseForm = () => {
    setDatabaseFormData({
      name: '',
      type: 'postgresql',
      host: '',
      port: 5432,
      username: '',
      password: '',
      database: '',
      schema: '',
      description: ''
    });
    setIsEditingDatabase(false);
    setCurrentDatabaseConnection(null);
    setShowPassword(false);
  };

  const handleDatabaseFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingDatabase && currentDatabaseConnection) {
      updateDatabaseConnectionMutation.mutate({
        id: currentDatabaseConnection.id,
        connectionData: databaseFormData
      });
    } else {
      createDatabaseConnectionMutation.mutate(databaseFormData);
    }
  };

  const handleEditDatabaseConnection = (connection: DatabaseConnection) => {
    setCurrentDatabaseConnection(connection);
    setDatabaseFormData({
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database: connection.database,
      schema: connection.schema || '',
      description: connection.description || ''
    });
    setIsEditingDatabase(true);
    setIsDatabaseDialogOpen(true);
  };

  const handleAddDatabaseConnection = () => {
    resetDatabaseForm();
    setIsDatabaseDialogOpen(true);
  };

  const handleDatabaseTypeChange = (type: string) => {
    setDatabaseFormData(prev => ({
      ...prev,
      type,
      port: type === 'oracle' ? 1521 : type === 'mysql' ? 3306 : 5432
    }));
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const config = AGENT_CONFIGS[selectedAgent as keyof typeof AGENT_CONFIGS];
    
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `Only ${config.allowedTypes.join(', ')} files are allowed for this agent.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > config.maxFileSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${Math.round(config.maxFileSize / 1024 / 1024)}MB.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate({ file, agentType: selectedAgent });
    
    // Clear the input
    event.target.value = '';
  };

  // Handle delete
  const handleDeleteClick = (id: number) => {
    setCurrentResourceId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (currentResourceId) {
      deleteResourceMutation.mutate(currentResourceId);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Render agent tab content
  const renderAgentContent = (agentKey: string) => {
    const config = AGENT_CONFIGS[agentKey as keyof typeof AGENT_CONFIGS];
    const Icon = config.icon;

    if (config.disabled) {
      return (
        <div className="text-center py-8">
          <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">{config.name}</h3>
          <p className="text-gray-500 mb-4">{config.description}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-orange-700 text-sm">
              This agent only pulls data from the MCP FastAPI server and does not accept user uploads.
            </p>
          </div>
        </div>
      );
    }

    // Handle database connection UI for ticket lookup agent
    if (config.usesDatabaseConnections && agentKey === 'ticket-lookup') {
      return (
        <div className="space-y-6">
          {/* Agent Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>{config.name}</CardTitle>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  This agent uses external database connections to search for similar tickets and relevant data to provide better context for AI responses.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Database Connections */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Database Connections</CardTitle>
                <Button onClick={handleAddDatabaseConnection} className="flex items-center gap-2">
                  <Plus size={16} />
                  Add Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isDatabaseLoading ? (
                <div className="text-center py-4">Loading database connections...</div>
              ) : databaseError ? (
                <div className="text-center py-4 text-red-500">
                  Error loading database connections: {(databaseError as Error).message}
                </div>
              ) : databaseConnections.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No database connections configured.</p>
                  <p className="text-sm text-gray-400">Add a database connection to enable external data lookup.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Database</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {databaseConnections.map((connection: DatabaseConnection) => (
                        <TableRow key={connection.id}>
                          <TableCell className="font-medium">{connection.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{connection.type.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>{connection.host}:{connection.port}</TableCell>
                          <TableCell>{connection.database}</TableCell>
                          <TableCell>
                            <Badge variant={connection.testSuccess ? "default" : "destructive"}>
                              {connection.testSuccess ? "Connected" : "Not tested"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => testDatabaseConnectionMutation.mutate(connection.id)}
                                disabled={testDatabaseConnectionMutation.isPending}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditDatabaseConnection(connection)}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteDatabaseConnectionMutation.mutate(connection.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Agent Info and Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>{config.name}</CardTitle>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Accepted File Types:</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {config.allowedTypes.map((type) => (
                    <Badge key={type} variant="outline">{type}</Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  Maximum file size: {Math.round(config.maxFileSize / 1024 / 1024)}MB
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id={`upload-${agentKey}`}
                  className="hidden"
                  accept={config.allowedTypes.join(',')}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById(`upload-${agentKey}`)?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Resources</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading resources...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                Error loading resources: {(error as Error).message}
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No resources uploaded yet.</p>
                <p className="text-sm text-gray-400">Upload files to provide this agent with reference materials.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource: AgentResource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.original_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{resource.file_type}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(resource.file_size)}</TableCell>
                        <TableCell>{formatDate(resource.upload_date)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/api/agent-resources/${resource.id}/download`, '_blank')}
                            >
                              <Download size={16} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(resource.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Agent Resources</h1>
            <p className="text-gray-600">Manage reference materials for each AI agent</p>
          </div>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Agent Resource Configuration</h3>
                <p className="text-sm text-blue-700">
                  Each agent has its own isolated resource area. Files uploaded to one agent cannot be accessed by other agents. 
                  The Ticket Lookup Agent uses external database connections for enhanced data lookup instead of file uploads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedAgent} onValueChange={setSelectedAgent}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(AGENT_CONFIGS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="hidden sm:inline">{config.name.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(AGENT_CONFIGS).map((agentKey) => (
            <TabsContent key={agentKey} value={agentKey}>
              {renderAgentContent(agentKey)}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Database Connection Dialog */}
      <Dialog open={isDatabaseDialogOpen} onOpenChange={setIsDatabaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditingDatabase ? 'Edit Database Connection' : 'Add Database Connection'}
            </DialogTitle>
            <DialogDescription>
              Configure an external database connection for the Ticket Lookup Agent to search for similar tickets and relevant data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDatabaseFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  value={databaseFormData.name}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Production CRM"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Database Type</Label>
                <Select value={databaseFormData.type} onValueChange={handleDatabaseTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={databaseFormData.host}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="e.g., localhost or db.example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={databaseFormData.port}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  placeholder="e.g., 5432"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={databaseFormData.username}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Database username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={databaseFormData.password}
                    onChange={(e) => setDatabaseFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Database password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  value={databaseFormData.database}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="Database name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="schema">Schema (Optional)</Label>
                <Input
                  id="schema"
                  value={databaseFormData.schema}
                  onChange={(e) => setDatabaseFormData(prev => ({ ...prev, schema: e.target.value }))}
                  placeholder="e.g., public, dbo"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={databaseFormData.description}
                onChange={(e) => setDatabaseFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this database connection"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDatabaseDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDatabaseConnectionMutation.isPending || updateDatabaseConnectionMutation.isPending}
              >
                {createDatabaseConnectionMutation.isPending || updateDatabaseConnectionMutation.isPending 
                  ? 'Saving...' 
                  : isEditingDatabase ? 'Update Connection' : 'Create Connection'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}