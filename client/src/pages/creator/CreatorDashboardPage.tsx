import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Building,
  Users,
  UserPlus,
  Settings,
  Briefcase,
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  LogOut
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Define schemas for forms
const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  subdomain: z.string().min(2, "Subdomain must be at least 2 characters")
    .regex(/^[a-zA-Z0-9-]+$/, "Subdomain can only contain letters, numbers, and hyphens"),
  adminEmail: z.string().email("Please enter a valid email"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
});

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["administrator", "support_engineer", "user"]),
  tenantId: z.number().min(1, "Tenant ID is required"),
  teamId: z.number().optional(),
});

export default function CreatorDashboardPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  
  // If user is not logged in or not a creator, redirect to creator login
  if (!user) {
    return <Redirect to="/creator/login" />;
  }
  
  if (user.role !== "creator") {
    toast({
      title: "Access Denied",
      description: "You don't have permission to access the creator dashboard.",
      variant: "destructive",
    });
    return <Redirect to="/dashboard" />;
  }
  
  // Fetch tenants
  const { data: tenants, isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ['/api/creator/tenants'],
    refetchOnWindowFocus: false,
  });
  
  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/creator/users', selectedTenantId],
    refetchOnWindowFocus: false,
    enabled: selectedTenantId !== null,
  });
  
  // Fetch teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['/api/creator/teams', selectedTenantId],
    refetchOnWindowFocus: false,
    enabled: selectedTenantId !== null,
  });
  
  // Define types for API responses
  type Tenant = {
    id: number;
    name: string;
    subdomain: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  
  type Team = {
    id: number;
    name: string;
    tenantId: number;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
  
  type User = {
    id: number;
    username: string;
    name: string | null;
    email: string | null;
    role: string;
    tenantId: number;
    teamId: number | null;
    profilePicture: string | null;
    createdAt: string;
    updatedAt: string;
  };

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTenantSchema>) => {
      const response = await fetch('/api/creator/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create tenant');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant Created",
        description: "The tenant has been created successfully.",
      });
      setIsCreatingTenant(false);
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const response = await fetch('/api/creator/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      });
      setIsCreatingUser(false);
      queryClient.invalidateQueries({ queryKey: ['/api/creator/users', selectedTenantId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const response = await fetch(`/api/creator/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tenant');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant Deleted",
        description: "The tenant has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete tenant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/creator/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/creator/users', selectedTenantId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Forms for creating tenants and users
  const createTenantForm = useForm<z.infer<typeof createTenantSchema>>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      adminEmail: "",
      adminName: "",
    },
  });
  
  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user",
      tenantId: selectedTenantId || undefined,
      teamId: undefined,
    },
  });
  
  // Update the tenantId in the form when selectedTenantId changes
  useEffect(() => {
    if (selectedTenantId) {
      createUserForm.setValue('tenantId', selectedTenantId);
    }
  }, [selectedTenantId, createUserForm]);
  
  // Handle form submissions
  const onCreateTenantSubmit = (data: z.infer<typeof createTenantSchema>) => {
    createTenantMutation.mutate(data);
  };
  
  const onCreateUserSubmit = (data: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(data);
  };
  
  const handleTenantSelect = (tenantId: number) => {
    setSelectedTenantId(tenantId);
  };
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md hidden md:block">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Creator Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your system</p>
        </div>
        <div className="p-4">
          <div className="py-2 px-2 mb-2 flex items-center text-sm font-medium text-primary">
            <Building className="mr-2 h-4 w-4" />
            <span>Tenants</span>
          </div>
          {isLoadingTenants ? (
            <div className="p-2 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {tenants?.map((tenant) => (
                <Button
                  key={tenant.id}
                  variant={selectedTenantId === tenant.id ? "default" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => handleTenantSelect(tenant.id)}
                >
                  <span className="truncate">{tenant.name}</span>
                </Button>
              ))}
            </div>
          )}
          <Dialog open={isCreatingTenant} onOpenChange={setIsCreatingTenant}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mt-4 w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Add a new tenant to the system. This will create a new isolated workspace with its own users and data.
                </DialogDescription>
              </DialogHeader>
              <Form {...createTenantForm}>
                <form onSubmit={createTenantForm.handleSubmit(onCreateTenantSubmit)} className="space-y-4">
                  <FormField
                    control={createTenantForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createTenantForm.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subdomain</FormLabel>
                        <FormControl>
                          <Input placeholder="acme" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used for accessing the tenant's portal (e.g., acme.supportai.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createTenantForm.control}
                    name="adminName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormDescription>
                          Name of the tenant's administrator
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createTenantForm.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@acme.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          The admin will receive login credentials at this email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createTenantMutation.isPending}>
                      {createTenantMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Tenant
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" className="w-full justify-start text-left mt-8 text-red-500" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage your tenants and users across the system
            </p>
          </div>
        </div>
        
        {selectedTenantId ? (
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Briefcase className="mr-2 h-4 w-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Tenant Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="pt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                      Manage users for the selected tenant
                    </CardDescription>
                  </div>
                  <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Add a new user to the selected tenant.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...createUserForm}>
                        <form onSubmit={createUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                          <FormField
                            control={createUserForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="johndoe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="john@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="administrator">Administrator</SelectItem>
                                    <SelectItem value="support_engineer">Support Engineer</SelectItem>
                                    <SelectItem value="user">Regular User</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {teams && teams.length > 0 && (
                            <FormField
                              control={createUserForm.control}
                              name="teamId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Team</FormLabel>
                                  <Select 
                                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                    defaultValue={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select team (optional)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id.toString()}>
                                          {team.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <DialogFooter>
                            <Button type="submit" disabled={createUserMutation.isPending}>
                              {createUserMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Create User
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.name || "-"}</TableCell>
                            <TableCell>{user.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === "administrator" ? "default" :
                                user.role === "support_engineer" ? "secondary" : "outline"
                              }>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.teamId && teams ? 
                                teams.find(t => t.id === user.teamId)?.name || `Team ${user.teamId}` 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the user account for {user.username}.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="teams" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                  <CardDescription>
                    Manage teams for the selected tenant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTeams ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams?.map((team) => (
                          <TableRow key={team.id}>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell>{team.description || "-"}</TableCell>
                            <TableCell>
                              {users ? 
                                users.filter(u => u.teamId === team.id).length : 
                                "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Settings</CardTitle>
                  <CardDescription>
                    Configure settings for the selected tenant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Tenant info */}
                    {tenants && selectedTenantId && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Tenant Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Name</p>
                            <p>{tenants.find(t => t.id === selectedTenantId)?.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Subdomain</p>
                            <p>{tenants.find(t => t.id === selectedTenantId)?.subdomain}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Status</p>
                            <Badge variant={
                              tenants.find(t => t.id === selectedTenantId)?.active ? "success" : "destructive"
                            }>
                              {tenants.find(t => t.id === selectedTenantId)?.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Created</p>
                            <p>{new Date(tenants.find(t => t.id === selectedTenantId)?.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {/* Danger Zone */}
                        <div className="mt-8 border rounded-md p-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                          <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-4">
                            These actions are destructive and cannot be reversed.
                          </p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Tenant
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the tenant, all its users, teams, and data.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteTenantMutation.mutate(selectedTenantId)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {deleteTenantMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete Tenant"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-10">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No Tenant Selected</h3>
            <p className="mt-2 text-sm text-gray-500">
              Please select a tenant from the sidebar or create a new one.
            </p>
            <Dialog open={isCreatingTenant} onOpenChange={setIsCreatingTenant}>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Tenant
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}