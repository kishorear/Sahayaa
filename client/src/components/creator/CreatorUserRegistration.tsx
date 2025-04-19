import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Building, UserPlus, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Define the schema for the user registration form
const userRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["administrator", "support_engineer", "user"]),
  tenantId: z.number().int().positive("Please select a company"),
  createNewCompany: z.boolean().optional(),
  newCompanyName: z.string().optional(),
  newCompanySubdomain: z.string().optional(),
});

// Refine the schema to conditionally validate new company fields
const conditionalUserRegistrationSchema = userRegistrationSchema.refine(
  (data) => {
    // If creating a new company, require name and subdomain
    if (data.createNewCompany) {
      return !!data.newCompanyName && !!data.newCompanySubdomain;
    }
    return true;
  },
  {
    message: "Company name and subdomain are required when creating a new company",
    path: ["newCompanyName"],
  }
).refine(
  (data) => {
    // If creating a new company, validate subdomain format
    if (data.createNewCompany && data.newCompanySubdomain) {
      return /^[a-zA-Z0-9-]+$/.test(data.newCompanySubdomain);
    }
    return true;
  },
  {
    message: "Subdomain can only contain letters, numbers, and hyphens",
    path: ["newCompanySubdomain"],
  }
);

type UserRegistrationFormValues = z.infer<typeof conditionalUserRegistrationSchema>;

export default function CreatorUserRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<"existing" | "new">("existing");

  // Fetch tenants for the dropdown
  const { data: tenants, isLoading: isLoadingTenants } = useQuery<any[]>({
    queryKey: ['/api/creator/tenants'],
    refetchOnWindowFocus: false,
  });

  // Initialize the form
  const form = useForm<UserRegistrationFormValues>({
    resolver: zodResolver(conditionalUserRegistrationSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user",
      tenantId: undefined,
      createNewCompany: false,
      newCompanyName: "",
      newCompanySubdomain: "",
    },
  });

  // Watch for createNewCompany changes to toggle form behavior
  const createNewCompany = form.watch("createNewCompany");

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; subdomain: string }) => {
      const response = await fetch('/api/creator/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          subdomain: data.subdomain,
          adminEmail: "placeholder@example.com", // Will be updated with user data
          adminName: "Placeholder Name", // Will be updated with user data
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }
      
      return await response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
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
  });

  const onSubmit = async (data: UserRegistrationFormValues) => {
    try {
      let tenantId = data.tenantId;
      
      // If creating a new company, create it first
      if (data.createNewCompany && data.newCompanyName && data.newCompanySubdomain) {
        const newCompany = await createCompanyMutation.mutateAsync({
          name: data.newCompanyName,
          subdomain: data.newCompanySubdomain,
        });
        tenantId = newCompany.id;
      }
      
      // Then create the user with the appropriate tenantId
      await createUserMutation.mutateAsync({
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
        role: data.role,
        tenantId: tenantId,
      });
      
      // Show success message
      toast({
        title: "User Registered Successfully",
        description: data.createNewCompany 
          ? `User ${data.name} has been registered with a new company ${data.newCompanyName}`
          : `User ${data.name} has been registered to the selected company`,
      });
      
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/creator/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creator/users'] });
    } catch (error) {
      // Handle errors
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserPlus className="mr-2 h-5 w-5" />
          User Registration
        </CardTitle>
        <CardDescription>
          Register new users and assign them to existing companies or create new ones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Register New User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Create a new user account and assign it to a company
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="existing" onValueChange={(value) => setRegistrationMode(value as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">
                  <Building className="mr-2 h-4 w-4" />
                  Existing Company
                </TabsTrigger>
                <TabsTrigger value="new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Company
                </TabsTrigger>
              </TabsList>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  {/* User Information - Common to both modes */}
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-medium">User Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
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
                  </div>
                  
                  {/* Company Selection or Creation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Company Information</h3>
                    
                    <TabsContent value="existing">
                      <FormField
                        control={form.control}
                        name="tenantId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Company</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
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
                                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                      {tenant.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="new">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="createNewCompany"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 border rounded-md">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Create a new company for this user</FormLabel>
                                <FormDescription>
                                  This will create a new company and assign the user to it
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        {createNewCompany && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="newCompanyName"
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
                              control={form.control}
                              name="newCompanySubdomain"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Company Subdomain</FormLabel>
                                  <FormControl>
                                    <Input placeholder="acme" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Used for accessing the portal (e.g., acme.supportai.com)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="submit"
                      disabled={createUserMutation.isPending || createCompanyMutation.isPending}
                    >
                      {(createUserMutation.isPending || createCompanyMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Register User
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}