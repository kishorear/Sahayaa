import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Key, AlertTriangle, Check, Copy, Clipboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

// Define types for API key management
interface ApiKeyPermissions {
  read: boolean;
  write: boolean;
  webhook: boolean;
}

interface ApiKey {
  id: number;
  keyPrefix: string;
  tenantId: number;
  createdBy: number;
  createdAt: string;
  domains: string[];
  expiresAt: string | null;
  description: string;
  permissions: ApiKeyPermissions;
  lastUsed: string | null;
  useCount: number;
}

interface ApiKeyFormData {
  tenantId: number;
  userId: number;
  domains: string[];
  expiresIn: number; // 0 means never expires
  description: string;
  permissions: ApiKeyPermissions;
}

export default function WidgetApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  
  // Default form data
  const defaultFormData: ApiKeyFormData = {
    tenantId: user?.tenantId || 1,
    userId: user?.id || 1,
    domains: [],
    expiresIn: 0, // Never expires by default
    description: "Widget API key for website integration",
    permissions: {
      read: true,
      write: true,
      webhook: false
    }
  };
  
  const [formData, setFormData] = useState<ApiKeyFormData>(defaultFormData);
  
  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['/api/widgets/keys'],
    enabled: !!user
  });
  
  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: (data: ApiKeyFormData) => 
      apiRequest('/api/widgets/keys', 'POST', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets/keys'] });
      setNewApiKey(data.apiKey);
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
        variant: "destructive",
      });
      console.error("API key creation error:", error);
    }
  });
  
  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: number) => 
      apiRequest(`/api/widgets/keys/${keyId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets/keys'] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive",
      });
      console.error("API key deletion error:", error);
    }
  });
  
  // Add a domain to the form
  const addDomain = () => {
    if (!newDomain) return;
    if (formData.domains.includes(newDomain)) {
      toast({
        title: "Duplicate Domain",
        description: "This domain is already in the list.",
        variant: "destructive",
      });
      return;
    }
    setFormData({
      ...formData,
      domains: [...formData.domains, newDomain]
    });
    setNewDomain("");
  };
  
  // Remove a domain from the form
  const removeDomain = (domain: string) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter(d => d !== domain)
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createKeyMutation.mutate(formData);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    if (newApiKey) {
      setNewApiKey(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(false);
  };
  
  // Copy API key to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The API key has been copied to your clipboard.",
    });
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-6 w-6 mr-2" />
            Widget API Keys
          </CardTitle>
          <CardDescription>
            Manage API keys for integrating the chat widget with your websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Active API Keys</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                {newApiKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>API Key Generated</DialogTitle>
                      <DialogDescription>
                        Your new API key has been created. Make sure to copy it now as you won't be able to see it again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md my-4 relative">
                      <code className="text-sm break-all">{newApiKey}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(newApiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-amber-500 dark:text-amber-400 flex items-center mb-4">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      This key will only be shown once. Store it securely.
                    </p>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={handleDialogClose}
                        className="w-full"
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Generate New API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for widget integration on your website.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="Enter a description for this API key"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Domain Restrictions (Optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="example.com"
                          />
                          <Button type="button" onClick={addDomain} variant="outline">
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Leave empty to allow all domains, or add specific domains to restrict access.
                          You can use wildcards like *.example.com
                        </p>
                        
                        {formData.domains.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.domains.map((domain) => (
                              <Badge key={domain} variant="outline" className="flex items-center gap-1">
                                {domain}
                                <button 
                                  type="button" 
                                  onClick={() => removeDomain(domain)}
                                  className="ml-1 text-gray-500 hover:text-gray-700"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expiresIn">Expiration</Label>
                        <Select 
                          value={formData.expiresIn.toString()} 
                          onValueChange={(value) => setFormData({...formData, expiresIn: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Never expires</SelectItem>
                            <SelectItem value="2592000">30 days</SelectItem>
                            <SelectItem value="7776000">90 days</SelectItem>
                            <SelectItem value="31536000">1 year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Permissions</Label>
                        
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h4 className="text-sm font-medium">Read Access</h4>
                            <p className="text-xs text-gray-500">Can receive responses from the widget</p>
                          </div>
                          <Switch
                            checked={formData.permissions.read}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData, 
                                permissions: {...formData.permissions, read: checked}
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h4 className="text-sm font-medium">Write Access</h4>
                            <p className="text-xs text-gray-500">Can send messages through the widget</p>
                          </div>
                          <Switch
                            checked={formData.permissions.write}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData, 
                                permissions: {...formData.permissions, write: checked}
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h4 className="text-sm font-medium">Webhook Access</h4>
                            <p className="text-xs text-gray-500">Can receive webhook notifications</p>
                          </div>
                          <Switch
                            checked={formData.permissions.webhook}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData, 
                                permissions: {...formData.permissions, webhook: checked}
                              })
                            }
                          />
                        </div>
                      </div>
                      
                      <DialogFooter className="pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleDialogClose}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createKeyMutation.isPending}
                        >
                          Generate Key
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">Loading API keys...</div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key: ApiKey) => (
                <div key={key.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium flex items-center">
                        {key.description}
                        <Badge variant="outline" className="ml-2">
                          {key.keyPrefix}
                        </Badge>
                      </h4>
                      <p className="text-sm text-gray-500">
                        Created: {formatDate(key.createdAt)}
                        {key.expiresAt && (
                          <span> · Expires: {formatDate(key.expiresAt)}</span>
                        )}
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteKeyMutation.mutate(key.id)}
                      disabled={deleteKeyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Domains:</span>{" "}
                      {key.domains && key.domains.length > 0 
                        ? key.domains.join(", ") 
                        : "All domains"}
                    </div>
                    <div>
                      <span className="text-gray-500">Permissions:</span>{" "}
                      {Object.entries(key.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => key)
                        .join(", ") || "None"}
                    </div>
                    <div>
                      <span className="text-gray-500">Usage:</span>{" "}
                      {key.useCount} times
                      {key.lastUsed && (
                        <span> · Last used: {formatDate(key.lastUsed)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No API keys found. Generate a new key to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}