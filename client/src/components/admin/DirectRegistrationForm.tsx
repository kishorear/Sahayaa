import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateRandomPassword } from "@/lib/utils";

// UI Components
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";

// Schema for registration form
const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
  name: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  companyId: z.number().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyIndustryType: z.string().default("none"),
  companySSO: z.boolean().default(false),
  teamId: z.number().optional().nullable(),
  teamName: z.string().optional().nullable(),
});

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

type TenantsResponse = Tenant[];

type TeamsResponse = Team[];

export function DirectRegistrationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Setup form
  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: generateRandomPassword(12),
      role: "user",
      name: "",
      email: "",
      companyId: null,
      companyName: "",
      companyIndustryType: "none",
      companySSO: false,
      teamId: null,
      teamName: "",
    },
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

  // Fetch industry types
  const { data: industryTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/industry-types"],
    queryFn: () => 
      apiRequest("GET", "/api/industry-types")
        .then(res => res.json()),
  });

  // Fetch available roles for the selected company's industry
  const selectedCompanyId = form.watch("companyId");
  const selectedCompany = tenantsData?.find(t => t.id === selectedCompanyId);
  
  const { data: availableRoles = [] } = useQuery<Array<{ key: string; name: string; description: string }>>({
    queryKey: ["/api/permissions/available-roles", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) {
        // Return default roles for new companies
        return [
          { key: "admin", name: "Administrator", description: "Full administrative access" },
          { key: "support_agent", name: "Support Agent", description: "Can manage tickets" },
          { key: "engineer", name: "Engineer", description: "Can view tickets" },
          { key: "user", name: "User", description: "Can create and view own tickets" }
        ];
      }
      
      // For existing companies, fetch roles based on their industry type
      const url = `/api/permissions/available-roles?tenantId=${selectedCompanyId}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: true
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: z.infer<typeof registrationSchema>) => 
      apiRequest("POST", "/api/creators/users", userData)
        .then(res => {
          if (!res.ok) {
            return res.json().then(data => {
              throw new Error(data.message || "Failed to create user");
            });
          }
          return res.json();
        }),
    onSuccess: () => {
      // Reset form and clear data
      form.reset({
        username: "",
        password: generateRandomPassword(12),
        role: "user",
        name: "",
        email: "",
        companyId: null,
        companyName: "",
        companyIndustryType: "none",
        companySSO: false,
        teamId: null,
        teamName: "",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/creators/users"] });
      
      // Show success toast
      toast({
        title: "User Created Successfully",
        description: "The new user has been registered in the system.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "There was an error creating the user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter teams based on selected tenant
  const getFilteredTeams = () => {
    const companyId = form.watch("companyId");
    if (!companyId || !teamsData) return [];
    
    return teamsData.filter(team => team.tenantId === companyId);
  };

  // Handle form submission  
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

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus size={18} />
          Register New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">User Information</h3>
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
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        Auto-generated secure password
                      </FormDescription>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.key} value={role.key}>
                              {role.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="creator">Creator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {availableRoles.find(r => r.key === field.value)?.description || "The user's role determines their permissions"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company */}
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existing Company</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                        value={field.value?.toString() || "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an existing company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenantsData?.map((tenant) => (
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
                
                {/* Industry Type */}
                <FormField
                  control={form.control}
                  name="companyIndustryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {industryTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the industry type for this company
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
                        value={field.value?.toString() || "0"}
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
                          disabled={!form.watch("companyId") && !form.watch("companyName") || !!form.watch("teamId")}
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
                        
            <CardFooter className="flex justify-end px-0 pt-4">
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
                    Register User
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}