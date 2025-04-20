import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, PlusCircle, RefreshCw, UserPlus, Key, Building, User, UsersRound, X, Check, Copy, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Define the registration form schema
const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  companyId: z.number().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companySSO: z.boolean().optional(),
  teamId: z.number().optional().nullable(),
  teamName: z.string().optional().nullable(),
});

// Define types for our API responses
type Tenant = {
  id: number;
  name: string;
  subdomain: string;
  createdAt: string;
};

type Team = {
  id: number;
  name: string;
  tenantId: number;
  tenantName: string;
  description: string | null;
  createdAt: string;
};

type User = {
  id: number;
  username: string;
  role: string;
  name: string | null;
  email: string | null;
  tenantId: number;
  tenantName: string;
  teamId: number | null;
  teamName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  profilePicture: string | null;
};

type UsersResponse = {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type TenantsResponse = {
  tenants: Tenant[];
};

type TeamsResponse = {
  teams: Team[];
};

const RegistrationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("user-management");
  
  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [generateRandom, setGenerateRandom] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;
  
  // Password copy state
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Setup form
  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "user",
      name: "",
      email: "",
      companyId: null,
      companyName: "",
      companySSO: false,
      teamId: null,
      teamName: "",
    },
  });
  
  // Fetch users
  const { 
    data: usersData, 
    isLoading: usersLoading,
    refetch: refetchUsers
  } = useQuery<UsersResponse>({
    queryKey: ["/api/creators/users", currentPage, searchQuery],
    queryFn: () => 
      apiRequest("GET", `/api/creators/users?page=${currentPage}&pageSize=${pageSize}${searchQuery ? `&search=${searchQuery}` : ""}`)
        .then(res => res.json()),
  });

  // Fetch tenants (companies)
  const { 
    data: tenantsData, 
    isLoading: tenantsLoading 
  } = useQuery<TenantsResponse>({
    queryKey: ["/api/creators/tenants"],
    queryFn: () => 
      apiRequest("GET", "/api/creators/tenants")
        .then(res => res.json()),
  });

  // Fetch teams
  const { 
    data: teamsData, 
    isLoading: teamsLoading 
  } = useQuery<TeamsResponse>({
    queryKey: ["/api/creators/teams"],
    queryFn: () => 
      apiRequest("GET", "/api/creators/teams")
        .then(res => res.json()),
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registrationSchema>) => {
      const response = await apiRequest("POST", "/api/creators/users", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: "The new user has been registered in the system.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/creators/users"] });
      setUserDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "There was an error creating the user. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, generateRandom, newPassword }: { userId: number, generateRandom: boolean, newPassword?: string }) => {
      const response = await apiRequest("POST", `/api/creators/users/${userId}/reset-password`, {
        generateRandom,
        newPassword: !generateRandom ? newPassword : undefined
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.password) {
        setNewPassword(data.password);
      }
      toast({
        title: "Password reset successful",
        description: "The user's password has been reset.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "There was an error resetting the password. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle registration form submission
  function onSubmit(values: z.infer<typeof registrationSchema>) {
    // If companyId is not selected but companyName is provided, set companyId to null
    if (!values.companyId && values.companyName) {
      values.companyId = null;
    }
    
    // If neither companyId nor companyName is provided, show error
    if (!values.companyId && !values.companyName) {
      toast({
        title: "Missing company information",
        description: "Please select an existing company or enter a new company name.",
        variant: "destructive",
      });
      return;
    }
    
    // Create user
    createUserMutation.mutate(values);
  }
  
  // Handle reset password
  const handleResetPassword = () => {
    if (!selectedUserId) return;
    
    resetPasswordMutation.mutate({
      userId: selectedUserId,
      generateRandom,
      newPassword: !generateRandom ? newPassword : undefined
    });
  };
  
  // Handle copy password to clipboard
  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };
  
  // Reset form when dialog opens
  useEffect(() => {
    if (userDialogOpen) {
      form.reset();
    }
  }, [userDialogOpen, form]);
  
  // Helper function to get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "creator":
        return "bg-purple-100 text-purple-800";
      case "administrator":
        return "bg-red-100 text-red-800";
      case "support_engineer":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Filter teams based on selected tenant
  const getFilteredTeams = () => {
    const companyId = form.watch("companyId");
    if (!companyId || !teamsData?.teams) return [];
    
    return teamsData.teams.filter(team => team.tenantId === companyId);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">User Registration & Management</h1>
          <Button
            onClick={() => setUserDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus size={18} />
            Register New User
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <UsersRound size={16} />
              User Management
            </TabsTrigger>
            <TabsTrigger value="companies-and-teams" className="flex items-center gap-2">
              <Building size={16} />
              Companies and Teams
            </TabsTrigger>
            <TabsTrigger value="registration-logs" className="flex items-center gap-2">
              <Award size={16} />
              Registration Logs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="user-management" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchUsers()}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </Button>
                    <div className="relative w-64">
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setCurrentPage(1);
                            refetchUsers();
                          }
                        }}
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => {
                            setSearchQuery("");
                            setCurrentPage(1);
                            refetchUsers();
                          }}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription>
                  View, create, and manage users across all companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData?.users && usersData.users.length > 0 ? (
                          usersData.users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{user.username}</span>
                                  {user.name && <span className="text-sm text-muted-foreground">{user.name}</span>}
                                  {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                  {user.role}
                                </span>
                              </TableCell>
                              <TableCell>{user.tenantName}</TableCell>
                              <TableCell>{user.teamName || '—'}</TableCell>
                              <TableCell>
                                <span title={new Date(user.createdAt).toLocaleString()}>
                                  {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                </span>
                              </TableCell>
                              <TableCell>
                                {user.active ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Inactive
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setResetPasswordDialogOpen(true);
                                  }}
                                >
                                  <Key className="h-4 w-4 mr-1" />
                                  Reset
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                              {searchQuery ? "No users found matching your search criteria." : "No users found. Add your first user using the 'Register New User' button."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Pagination */}
                {usersData && usersData.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: usersData.totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page and pages around current page
                            return page === 1 || 
                                  page === usersData.totalPages || 
                                  Math.abs(page - currentPage) <= 1;
                          })
                          .reduce((acc: React.ReactNode[], page, i, filtered) => {
                            // Add ellipsis between non-consecutive pages
                            if (i > 0 && filtered[i] - filtered[i-1] > 1) {
                              acc.push(
                                <PaginationItem key={`ellipsis-${i}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            
                            // Add the page number
                            acc.push(
                              <PaginationItem key={page}>
                                <PaginationLink 
                                  isActive={page === currentPage}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                            
                            return acc;
                          }, [])}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, usersData.totalPages))}
                            className={currentPage === usersData.totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="companies-and-teams" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Companies</CardTitle>
                  <CardDescription>All registered companies in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {tenantsLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Subdomain</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantsData?.tenants && tenantsData.tenants.length > 0 ? (
                            tenantsData.tenants.map((tenant) => (
                              <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.name}</TableCell>
                                <TableCell>{tenant.subdomain}</TableCell>
                                <TableCell>
                                  <span title={new Date(tenant.createdAt).toLocaleString()}>
                                    {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                No companies found. New companies are created when registering users.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                  <CardDescription>All teams across companies</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamsLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamsData?.teams && teamsData.teams.length > 0 ? (
                            teamsData.teams.map((team) => (
                              <TableRow key={team.id}>
                                <TableCell className="font-medium">{team.name}</TableCell>
                                <TableCell>{team.tenantName}</TableCell>
                                <TableCell>{team.description || '—'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                No teams found. Teams can be created when registering users.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="registration-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registration Logs</CardTitle>
                <CardDescription>
                  Audit trail of all user registration and management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Registration logs are captured in the system logs for audit purposes.
                  <br />
                  A more detailed audit log UI will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Register User Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus size={18} />
                Register New User
              </DialogTitle>
              <DialogDescription>
                Create a new user account in the system. Fill out all the required fields.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username*</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password*</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>User Roles</SelectLabel>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="support_engineer">Support Engineer</SelectItem>
                              <SelectItem value="administrator">Administrator</SelectItem>
                              <SelectItem value="creator">Creator</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the appropriate role for this user
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company (Tenant) */}
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Existing Company</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              // Clear teamId if companyId changes
                              if (value !== field.value?.toString()) {
                                form.setValue("teamId", null);
                              }
                              field.onChange(value ? parseInt(value) : null);
                            }} 
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an existing company" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenantsData?.tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select an existing company or create a new one below
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* New Company Name */}
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Company Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Acme Inc." 
                              {...field} 
                              value={field.value || ""}
                              disabled={!!form.watch("companyId")}
                              onChange={(e) => {
                                field.onChange(e);
                                // If entering a company name, clear companyId
                                if (e.target.value) {
                                  form.setValue("companyId", null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Create a new company if not in the list above
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Company SSO (Future use) */}
                    <FormField
                      control={form.control}
                      name="companySSO"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch("companyName")}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable SSO for new company</FormLabel>
                            <FormDescription>
                              Enables single sign-on setup for this company
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Team Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Team */}
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Existing Team</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                            value={field.value?.toString() || ""}
                            disabled={!form.watch("companyId")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={form.watch("companyId") ? "Select a team" : "Select a company first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getFilteredTeams().map((team) => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select an existing team or create a new one below
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* New Team Name */}
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
                              value={field.value || ""}
                              disabled={
                                !form.watch("companyId") && !form.watch("companyName") ||
                                !!form.watch("teamId")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                // If entering a team name, clear teamId
                                if (e.target.value) {
                                  form.setValue("teamId", null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Create a new team for this user
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setUserDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="gap-2"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Create User
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key size={18} />
                Reset User Password
              </DialogTitle>
              <DialogDescription>
                Reset the password for the selected user. You can generate a random password or set a specific one.
              </DialogDescription>
            </DialogHeader>
            
            {resetPasswordMutation.isPending ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Resetting password...</span>
              </div>
            ) : resetPasswordMutation.isSuccess && newPassword ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-md border border-green-200">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                    <Check size={18} />
                    Password Reset Successful
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    The new password has been generated. Please share it with the user securely.
                  </p>
                  
                  <div className="relative">
                    <Input
                      value={newPassword}
                      readOnly
                      className="font-mono pr-12 bg-white"
                    />
                    <Button
                      variant={passwordCopied ? "success" : "outline"}
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                      onClick={copyPasswordToClipboard}
                    >
                      {passwordCopied ? (
                        <Check size={14} className="mr-1" />
                      ) : (
                        <Copy size={14} className="mr-1" />
                      )}
                      {passwordCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    onClick={() => {
                      setResetPasswordDialogOpen(false);
                      setNewPassword("");
                      setSelectedUserId(null);
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 space-y-0">
                    <Checkbox
                      id="generate-random"
                      checked={generateRandom}
                      onCheckedChange={(checked) => setGenerateRandom(checked === true)}
                    />
                    <div className="space-y-1 leading-none">
                      <Label
                        htmlFor="generate-random"
                        className="font-medium cursor-pointer"
                      >
                        Generate random password
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        System will create a secure random password
                      </p>
                    </div>
                  </div>
                  
                  {!generateRandom && (
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setResetPasswordDialogOpen(false);
                      setNewPassword("");
                      setSelectedUserId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResetPassword}
                    disabled={!generateRandom && (!newPassword || newPassword.length < 6)}
                  >
                    Reset Password
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default RegistrationPage;