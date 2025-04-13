import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Team, InsertUser } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["user", "admin", "support"]).default("user"),
  teamId: z.number().optional(), // Team ID is optional
});

// Extend the InsertUser type to include newTeam for creating a new team during registration
type RegisterData = InsertUser & {
  newTeam?: string;
};

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [createNewTeam, setCreateNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  
  // Fetch teams for the dropdown
  // Move this hook before any conditional returns to avoid React hook errors
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/teams");
        if (!response.ok) {
          throw new Error("Failed to fetch teams");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching teams:", error);
        return [];
      }
    },
  });
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user",
      teamId: undefined,
    },
  });

  function onLoginSubmit(data: z.infer<typeof loginSchema>) {
    loginMutation.mutate(data);
  }

  function onRegisterSubmit(data: z.infer<typeof registerSchema>) {
    // If creating a new team, add team name to the data
    if (createNewTeam && newTeamName) {
      // We'll handle the team creation on the server side
      registerMutation.mutate({
        ...data,
        newTeam: newTeamName,
      } as RegisterData);
    } else {
      registerMutation.mutate(data);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-4 py-8 md:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">AI Support Ticket System</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Login or create an account to access the support system
            </p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Register</CardTitle>
                  <CardDescription>
                    Create a new account to access support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel>Team Membership</FormLabel>
                        <div className="flex items-center space-x-2">
                          <Button 
                            type="button" 
                            variant={createNewTeam ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setCreateNewTeam(true)}
                          >
                            Create new team
                          </Button>
                          <Button 
                            type="button" 
                            variant={!createNewTeam ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setCreateNewTeam(false)}
                          >
                            Join existing team
                          </Button>
                        </div>

                        {createNewTeam ? (
                          <FormItem>
                            <FormLabel>New Team Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter new team name" 
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                              />
                            </FormControl>
                          </FormItem>
                        ) : (
                          <FormField
                            control={registerForm.control}
                            name="teamId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Team</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a team" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {isLoadingTeams ? (
                                      <SelectItem value="loading" disabled>
                                        Loading teams...
                                      </SelectItem>
                                    ) : !teams || teams.length === 0 ? (
                                      <SelectItem value="none" disabled>
                                        No teams available
                                      </SelectItem>
                                    ) : (
                                      teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id.toString()}>
                                          {team.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending || 
                          (createNewTeam && !newTeamName) || 
                          (!createNewTeam && !registerForm.getValues().teamId && teams && teams.length > 0)}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Register"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero */}
      <div className="hidden md:flex md:w-1/2 bg-primary-50 dark:bg-primary-950 flex-col justify-center p-12 relative">
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-4xl font-bold">AI-Powered Support</h2>
          <p className="text-lg">
            Our intelligent support system uses AI to automate ticket classification, routing, and resolution.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="mr-2 bg-primary rounded-full text-white h-6 w-6 flex items-center justify-center">✓</span>
              <span>Intelligent ticket routing</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2 bg-primary rounded-full text-white h-6 w-6 flex items-center justify-center">✓</span>
              <span>Automatic resolution for simple issues</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2 bg-primary rounded-full text-white h-6 w-6 flex items-center justify-center">✓</span>
              <span>Advanced analytics dashboard</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2 bg-primary rounded-full text-white h-6 w-6 flex items-center justify-center">✓</span>
              <span>24/7 AI-powered responses</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}