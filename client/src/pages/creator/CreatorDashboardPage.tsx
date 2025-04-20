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
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, UserPlus, Building, Users } from "lucide-react";
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
  teamId: z.number().optional(),
  teamName: z.string().optional(),
}).refine(data => data.companyId || data.companyName, {
  message: "Either company ID or company name must be provided",
  path: ["companyName"],
});

type UserFormValues = z.infer<typeof userSchema>;

export default function CreatorDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");
  
  // Fetch existing tenants (companies)
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/creator/tenants'],
    enabled: !!user,
  });
  
  // Fetch existing teams (optional)
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/creator/teams'],
    enabled: !!user,
  });
  
  // Fetch existing users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/creator/users'],
    enabled: !!user,
  });

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

  // Handle form submission
  const onSubmit = (values: UserFormValues) => {
    registerMutation.mutate(values);
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
        <TabsList>
          <TabsTrigger value="register">
            <UserPlus className="h-4 w-4 mr-2" />
            Register User
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building className="h-4 w-4 mr-2" />
            Companies
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
                              <Input placeholder="johndoe" {...field} />
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
                              <Input type="password" placeholder="••••••••" {...field} />
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
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="support_engineer">Support Engineer</SelectItem>
                                <SelectItem value="administrator">Administrator</SelectItem>
                                <SelectItem value="creator">Creator</SelectItem>
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
                                  tenants.map((tenant: any) => (
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
                                <SelectItem value="">None</SelectItem>
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
                                  teams.map((team: any) => (
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
                Manage existing companies (tenants)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tenants.length === 0 ? (
                    <p>No companies found. Create one using the Register tab.</p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {tenants.map((tenant: any) => (
                        <div key={tenant.id} className="p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{tenant.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              ID: {tenant.id} | Subdomain: {tenant.subdomain}
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
    </div>
  );
}