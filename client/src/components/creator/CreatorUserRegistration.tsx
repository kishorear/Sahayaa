import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { RoleBadge } from "@/components/ui/role-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  UserCog,
  Building,
  Loader2,
} from "lucide-react";

// Form schemas
const newUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["administrator", "support_engineer", "user"]),
  tenantId: z.number().min(1, "Tenant ID is required"),
  teamId: z.number().optional(),
});

const newUserNewCompanySchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.string().min(1, "Role is required"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companySubdomain: z.string().min(2, "Subdomain must be at least 2 characters")
    .regex(/^[a-zA-Z0-9-]+$/, "Subdomain can only contain letters, numbers, and hyphens"),
});

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

export default function CreatorUserRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("existing-company");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // Fetch all tenants for dropdown
  const { data: tenants, isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ['/api/creator/tenants'],
    refetchOnWindowFocus: false,
  });

  // Fetch teams for the selected tenant
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['/api/creator/teams', selectedTenantId],
    refetchOnWindowFocus: false,
    enabled: selectedTenantId !== null,
  });

  // Form for registering a user with existing company
  const existingCompanyForm = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user",
      tenantId: undefined,
      teamId: undefined,
    },
  });

  // Form for registering a user with a new company
  const newCompanyForm = useForm<z.infer<typeof newUserNewCompanySchema>>({
    resolver: zodResolver(newUserNewCompanySchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "administrator", // Default to admin for new company
      companyName: "",
      companySubdomain: "",
    },
  });

  // Mutations
  const registerExistingCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newUserSchema>) => {
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
        description: "New user has been created successfully",
      });
      existingCompanyForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/creator/users'] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const registerNewCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newUserNewCompanySchema>) => {
      const response = await fetch('/api/creator/register-with-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user and company');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Company & User Created",
        description: `New company "${data.companyName}" created with an admin user`,
      });
      newCompanyForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submissions
  const onExistingCompanySubmit = (data: z.infer<typeof newUserSchema>) => {
    registerExistingCompanyMutation.mutate(data);
  };

  const onNewCompanySubmit = (data: z.infer<typeof newUserNewCompanySchema>) => {
    registerNewCompanyMutation.mutate(data);
  };

  // Handle tenant selection
  const handleTenantChange = (tenantId: string) => {
    const id = parseInt(tenantId);
    setSelectedTenantId(id);
    existingCompanyForm.setValue('tenantId', id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">User Registration</h2>
        <p className="text-muted-foreground">
          Register new users for existing companies or create new companies with users
        </p>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="existing-company">
            <Building className="mr-2 h-4 w-4" />
            Existing Company
          </TabsTrigger>
          <TabsTrigger value="new-company">
            <UserCog className="mr-2 h-4 w-4" />
            New Company + User
          </TabsTrigger>
        </TabsList>

        {/* Register for Existing Company */}
        <TabsContent value="existing-company">
          <Card>
            <CardHeader>
              <CardTitle>Register User for Existing Company</CardTitle>
              <CardDescription>
                Add a new user to an existing company in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...existingCompanyForm}>
                <form onSubmit={existingCompanyForm.handleSubmit(onExistingCompanySubmit)} className="space-y-6">
                  <FormField
                    control={existingCompanyForm.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Company</FormLabel>
                        <Select
                          onValueChange={(value) => handleTenantChange(value)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingTenants ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : (
                              tenants?.map((tenant) => (
                                <SelectItem
                                  key={tenant.id}
                                  value={tenant.id.toString()}
                                >
                                  {tenant.name} ({tenant.subdomain})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedTenantId && teams && teams.length > 0 && (
                    <FormField
                      control={existingCompanyForm.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a team (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingTeams ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                teams?.map((team) => (
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
                            Assign the user to a team within the company
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={existingCompanyForm.control}
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
                      control={existingCompanyForm.control}
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
                      control={existingCompanyForm.control}
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
                      control={existingCompanyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={existingCompanyForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="administrator">
                              <div className="flex items-center">
                                <RoleBadge role="administrator" size="sm" />
                              </div>
                            </SelectItem>
                            <SelectItem value="support_engineer">
                              <div className="flex items-center">
                                <RoleBadge role="support_engineer" size="sm" />
                              </div>
                            </SelectItem>
                            <SelectItem value="user">
                              <div className="flex items-center">
                                <RoleBadge role="user" size="sm" />
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Determines what permissions the user will have
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={registerExistingCompanyMutation.isPending}
                    className="w-full"
                  >
                    {registerExistingCompanyMutation.isPending ? (
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

        {/* Create New Company With User */}
        <TabsContent value="new-company">
          <Card>
            <CardHeader>
              <CardTitle>Create New Company with User</CardTitle>
              <CardDescription>
                Create a new company and register an administrator user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...newCompanyForm}>
                <form onSubmit={newCompanyForm.handleSubmit(onNewCompanySubmit)} className="space-y-6">
                  <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                    <h3 className="text-base font-medium">Company Information</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={newCompanyForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={newCompanyForm.control}
                        name="companySubdomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Subdomain</FormLabel>
                            <FormControl>
                              <Input placeholder="acme" {...field} />
                            </FormControl>
                            <FormDescription>
                              Used for accessing the company portal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                    <h3 className="text-base font-medium">Admin User Information</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField
                        control={newCompanyForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="admin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={newCompanyForm.control}
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
                        control={newCompanyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company Admin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={newCompanyForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="admin@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={newCompanyForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="administrator">
                                <div className="flex items-center">
                                  <RoleBadge role="administrator" size="sm" />
                                </div>
                              </SelectItem>
                              <SelectItem value="support_engineer">
                                <div className="flex items-center">
                                  <RoleBadge role="support_engineer" size="sm" />
                                </div>
                              </SelectItem>
                              <SelectItem value="user">
                                <div className="flex items-center">
                                  <RoleBadge role="user" size="sm" />
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Typically set to "administrator" for new companies
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={registerNewCompanyMutation.isPending}
                    className="w-full"
                  >
                    {registerNewCompanyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Company & User"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}