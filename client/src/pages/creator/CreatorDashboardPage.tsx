import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, UserPlus, Building, Users, Edit, Trash2, Settings, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";

// Schema for user registration
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string(),
  name: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  companyId: z.number().optional(),
  companyName: z.string().optional(),
  companySSO: z.string().optional(),
  companyIndustryType: z.string().optional(), // Industry type for new company
  teamId: z.number().optional(),
  teamName: z.string().optional(),
}).refine(data => data.companyId || data.companyName, {
  message: "Either company ID or company name must be provided",
  path: ["companyName"],
});

// Schema for custom role management
const customRoleSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  roleKey: z.string().min(1, "Role key is required").regex(/^[a-z_]+$/, "Role key must be lowercase with underscores only"),
  description: z.string().optional(),
  permissions: z.object({
    canViewAllTickets: z.boolean().default(false),
    canEditAllTickets: z.boolean().default(false),
    canDeleteTickets: z.boolean().default(false),
    canManageUsers: z.boolean().default(false),
    canManageTeams: z.boolean().default(false),
    canManageSettings: z.boolean().default(false),
  }).default({}),
});

type UserFormValues = z.infer<typeof userSchema>;
type CustomRoleFormValues = z.infer<typeof customRoleSchema>;

// Types for API responses
interface Tenant {
  id: number;
  name: string;
  subdomain?: string;
  industryType?: string;
}

interface Team {
  id: number;
  name: string;
  tenantId: number;
}

interface User {
  id: number;
  username: string;
  name?: string;
  role: string;
  tenantId: number;
}

interface CustomRole {
  id: number;
  tenantId: number;
  roleName: string;
  roleKey: string;
  description?: string;
  permissions: {
    canViewAllTickets: boolean;
    canEditAllTickets: boolean;
    canDeleteTickets: boolean;
    canManageUsers: boolean;
    canManageTeams: boolean;
    canManageSettings: boolean;
  };
}

export default function CreatorDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  
  // Fetch existing tenants (companies)
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/creator/tenants'],
    enabled: !!user,
  });
  
  // Fetch existing teams (optional)
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/creator/teams'],
    enabled: !!user,
  });
  
  // Fetch existing users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/creator/users'],
    enabled: !!user,
  });
  
  // Fetch industry types with error handling
  const industryTypesQuery = useQuery<string[]>({
    queryKey: ['/api/industry-types'],
    enabled: !!user,
  });
  
  // Fetch custom user roles with error handling
  const customRolesQuery = useQuery<CustomRole[]>({
    queryKey: ['/api/custom-roles'],
    enabled: !!user,
  });
  
  // Show errors in toast
  useEffect(() => {
    if (industryTypesQuery.error) {
      console.error('Industry Types Error:', industryTypesQuery.error);
      toast({
        title: "Failed to load industry types",
        description: String(industryTypesQuery.error),
        variant: "destructive",
      });
    }
    if (customRolesQuery.error) {
      console.error('Custom Roles Error:', customRolesQuery.error);
      toast({
        title: "Failed to load custom roles",
        description: String(customRolesQuery.error),
        variant: "destructive",
      });
    }
  }, [industryTypesQuery.error, customRolesQuery.error, toast]);
  
  const industryTypes = industryTypesQuery.data || [];
  const customRoles = customRolesQuery.data || [];

  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "user",
      name: "",
      email: "",
      companyName: "",
      companySSO: "",
      companyIndustryType: "none",
      teamName: "",
    },
  });
  
  // Register user mutation
  const registerMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const res = await apiRequest("POST", "/api/creator/register", values);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to register user");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created Successfully",
        description: "The new user has been registered",
      });
      form.reset();
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['/api/creator/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update tenant industry type mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ tenantId, industryType }: { tenantId: number; industryType: string }) => {
      const res = await apiRequest("PATCH", `/api/creators/tenants/${tenantId}/industry`, { industryType });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update industry type");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Industry Type Updated",
        description: "Company industry type has been updated successfully",
      });
      setIsEditTenantOpen(false);
      setEditingTenant(null);
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Custom role form
  const roleForm = useForm<CustomRoleFormValues>({
    resolver: zodResolver(customRoleSchema),
    defaultValues: {
      roleName: "",
      roleKey: "",
      description: "",
      permissions: {
        canViewAllTickets: false,
        canEditAllTickets: false,
        canDeleteTickets: false,
        canManageUsers: false,
        canManageTeams: false,
        canManageSettings: false,
      },
    },
  });
  
  // Create/Update custom role mutation
  const saveRoleMutation = useMutation({
    mutationFn: async (values: CustomRoleFormValues & { id?: number; tenantId: number }) => {
      const method = values.id ? "PATCH" : "POST";
      const url = values.id ? `/api/custom-roles/${values.id}` : `/api/custom-roles`;
      const res = await apiRequest(method, url, values);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${values.id ? 'update' : 'create'} role`);
      }
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: `Role ${variables.id ? 'Updated' : 'Created'}`,
        description: `Custom role has been ${variables.id ? 'updated' : 'created'} successfully`,
      });
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete custom role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await apiRequest("DELETE", `/api/custom-roles/${roleId}`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete role");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Role Deleted",
        description: "Custom role has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: UserFormValues) => {
    registerMutation.mutate(values);
  };
  
  // Handle role form submission
  const onRoleSubmit = (values: CustomRoleFormValues) => {
    saveRoleMutation.mutate({
      ...values,
      id: editingRole?.id,
      tenantId: user!.tenantId,
    });
  };
  
  // Handle edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditTenantOpen(true);
  };
  
  // Handle create/edit role
  const handleEditRole = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      roleForm.reset({
        roleName: role.roleName,
        roleKey: role.roleKey,
        description: role.description || "",
        permissions: role.permissions || {
          canViewAllTickets: false,
          canEditAllTickets: false,
          canDeleteTickets: false,
          canManageUsers: false,
          canManageTeams: false,
          canManageSettings: false,
        },
      });
    } else {
      setEditingRole(null);
      roleForm.reset();
    }
    setIsRoleDialogOpen(true);
  };
  
  // Clear company name when company ID is selected
  useEffect(() => {
    const companyIdValue = form.watch("companyId");
    if (companyIdValue) {
      form.setValue("companyName", "");
    }
  }, [form.watch("companyId")]);
  
  // Clear team name when team ID is selected
  useEffect(() => {
    const teamIdValue = form.watch("teamId");
    if (teamIdValue) {
      form.setValue("teamName", "");
    }
  }, [form.watch("teamId")]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Ensure the user is a creator
  if (!user || user.role !== "creator") {
    return <Redirect to="/creator/login" />;
  }
  
  const isLoading = tenantsLoading || teamsLoading || usersLoading;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Creator Dashboard</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="register">
            <UserPlus className="h-4 w-4 mr-2" />
            Register User
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building className="h-4 w-4 mr-2" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Settings className="h-4 w-4 mr-2" />
            Custom Roles
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>
        
        {/* User Registration Tab */}
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Register New User</CardTitle>
              <CardDescription>
                Create a new user with company and team association
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">User Information</h3>
                      
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} data-testid="input-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-user-role">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user" data-testid="role-option-user">User</SelectItem>
                                <SelectItem value="support_engineer" data-testid="role-option-support">Support Engineer</SelectItem>
                                <SelectItem value="administrator" data-testid="role-option-admin">Administrator</SelectItem>
                                <SelectItem value="creator" data-testid="role-option-creator">Creator</SelectItem>
                                {customRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.roleKey} data-testid={`role-option-custom-${role.roleKey}`}>
                                    {role.roleName} (Custom)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The user's role determines their permissions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
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
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Company and Team Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Company & Team</h3>
                      
                      <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Existing Company</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select existing company" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoading ? (
                                  <div className="flex items-center justify-center p-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : (
                                  tenants.map((tenant) => (
                                    <SelectItem 
                                      key={tenant.id} 
                                      value={tenant.id.toString()}
                                    >
                                      {tenant.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select an existing company or create a new one below
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Company Name <span className={form.watch("companyId") ? "" : "text-red-500"}>*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Acme Inc." 
                                {...field} 
                                disabled={!!form.watch("companyId")}
                                data-testid="input-company-name"
                              />
                            </FormControl>
                            <FormDescription>
                              {form.watch("companyId") 
                                ? "Using existing company" 
                                : "Enter a name to create a new company"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companyIndustryType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry Type (for new company)</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || "none"}
                              disabled={!!form.watch("companyId")}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-company-industry">
                                  <SelectValue placeholder="Select industry type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none" data-testid="industry-option-none">None</SelectItem>
                                {industryTypes.map((type: string) => (
                                  <SelectItem key={type} value={type} data-testid={`industry-option-${type}`}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {form.watch("companyId") 
                                ? "Using existing company's industry type" 
                                : "Select an industry type for the new company"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companySSO"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company SSO Provider</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select SSO provider (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                                <SelectItem value="microsoft">Microsoft</SelectItem>
                                <SelectItem value="saml">SAML</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional: Configure SSO for this company
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Existing Team</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select existing team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoading ? (
                                  <div className="flex items-center justify-center p-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : (
                                  teams.map((team) => (
                                    <SelectItem 
                                      key={team.id} 
                                      value={team.id.toString()}
                                    >
                                      {team.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select an existing team or create a new one below
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Team Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Support Team" 
                                {...field} 
                                disabled={!!form.watch("teamId")}
                              />
                            </FormControl>
                            <FormDescription>
                              {form.watch("teamId") 
                                ? "Using existing team" 
                                : "Optional: Enter a name to create a new team"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="mt-6" 
                    disabled={registerMutation.isPending}
                    data-testid="button-submit-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register User"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>
                Manage existing companies (tenants) and their industry types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tenants.length === 0 ? (
                    <p>No companies found. Create one using the Register tab.</p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {tenants.map((tenant) => (
                        <div key={tenant.id} className="p-4 flex justify-between items-center" data-testid={`company-${tenant.id}`}>
                          <div>
                            <h3 className="font-medium">{tenant.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              ID: {tenant.id} | Subdomain: {tenant.subdomain || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-industry-type-${tenant.id}`}>
                              Industry: <span className="font-medium">{tenant.industryType || 'none'}</span>
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTenant(tenant)}
                            data-testid={`button-edit-company-${tenant.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Custom Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Custom User Roles</CardTitle>
                  <CardDescription>
                    Manage industry-specific roles with granular permissions
                  </CardDescription>
                </div>
                <Button onClick={() => window.location.href = '/creator/roles'} data-testid="button-manage-roles">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Roles
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customRoles.length === 0 ? (
                <p className="text-muted-foreground">No custom roles defined. Create one to get started.</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {customRoles.map((role: any) => (
                    <div key={role.id} className="p-4" data-testid={`role-${role.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium">{role.roleName}</h3>
                          <p className="text-sm text-muted-foreground">Key: {role.roleKey}</p>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {role.permissions?.canViewAllTickets && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">View All Tickets</span>
                            )}
                            {role.permissions?.canEditAllTickets && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Edit All Tickets</span>
                            )}
                            {role.permissions?.canDeleteTickets && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Delete Tickets</span>
                            )}
                            {role.permissions?.canManageUsers && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Manage Users</span>
                            )}
                            {role.permissions?.canManageTeams && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Manage Teams</span>
                            )}
                            {role.permissions?.canManageSettings && (
                              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Manage Settings</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                            disabled={deleteRoleMutation.isPending}
                            data-testid={`button-delete-role-${role.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                View and manage all users across companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
              ) : (
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p>No users found. Create one using the Register tab.</p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {users.map((user: any) => (
                        <div key={user.id} className="p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{user.username}</h3>
                            <p className="text-sm text-muted-foreground">
                              {user.name || 'No name'} | Role: {user.role} | Company ID: {user.tenantId}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Tenant Dialog */}
      <Dialog open={isEditTenantOpen} onOpenChange={setIsEditTenantOpen}>
        <DialogContent data-testid="dialog-edit-tenant">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company industry type and settings
            </DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input value={editingTenant.name} disabled className="mt-1" />
              </div>
              <div>
                <Label>Industry Type</Label>
                <Select
                  value={editingTenant.industryType || "none"}
                  onValueChange={(value) => setEditingTenant({ ...editingTenant, industryType: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-industry-type">
                    <SelectValue placeholder="Select industry type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {industryTypes.map((type: string) => (
                      <SelectItem key={type} value={type} data-testid={`option-industry-${type}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTenantOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingTenant && updateTenantMutation.mutate({ 
                tenantId: editingTenant.id, 
                industryType: editingTenant.industryType || "none"
              })}
              disabled={updateTenantMutation.isPending || !editingTenant}
              data-testid="button-save-industry"
            >
              {updateTenantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-role">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Custom Role' : 'Create Custom Role'}</DialogTitle>
            <DialogDescription>
              Define a custom role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
              <FormField
                control={roleForm.control}
                name="roleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Technical Support" {...field} data-testid="input-role-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="roleKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Key <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="technical_support" {...field} data-testid="input-role-key" />
                    </FormControl>
                    <FormDescription>
                      Lowercase with underscores only (e.g., technical_support)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Role description..." {...field} data-testid="input-role-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label className="text-base font-medium">Permissions</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={roleForm.control}
                    name="permissions.canViewAllTickets"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-view-tickets"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">View All Tickets</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roleForm.control}
                    name="permissions.canEditAllTickets"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-edit-tickets"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Edit All Tickets</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roleForm.control}
                    name="permissions.canDeleteTickets"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-delete-tickets"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Delete Tickets</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roleForm.control}
                    name="permissions.canManageUsers"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-manage-users"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Manage Users</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roleForm.control}
                    name="permissions.canManageTeams"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-manage-teams"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Manage Teams</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roleForm.control}
                    name="permissions.canManageSettings"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value} 
                            onChange={field.onChange}
                            data-testid="checkbox-manage-settings"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Manage Settings</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveRoleMutation.isPending} data-testid="button-save-role">
                  {saveRoleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingRole ? 'Update Role' : 'Create Role'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}