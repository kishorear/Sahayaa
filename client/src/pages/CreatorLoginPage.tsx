import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const creatorLoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreatorLoginData = z.infer<typeof creatorLoginSchema>;

export default function CreatorLoginPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Initialize the form
  const creatorLoginForm = useForm<CreatorLoginData>({
    resolver: zodResolver(creatorLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // If user is already logged in and is a creator, redirect to creator dashboard
  if (user && user.role === "creator") {
    return <Redirect to="/creator/dashboard" />;
  }
  
  // If user is already logged in but not a creator, redirect to regular dashboard
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  async function onCreatorLoginSubmit(data: CreatorLoginData) {
    setIsLoggingIn(true);
    
    try {
      // Make a specific creator login request
      const response = await fetch("/api/creator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Login failed");
      }
      
      // Reload the page to update the auth state
      window.location.href = "/creator/dashboard";
    } catch (error) {
      console.error("Creator login error:", error);
      
      // Show an error toast
      toast({
        title: "Login Failed",
        description: "Invalid creator credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center w-full px-4 py-8 md:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Creator Login</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Access the creator dashboard to manage tenants and users
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Creator Login</CardTitle>
              <CardDescription>
                Enter your creator credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...creatorLoginForm}>
                <form onSubmit={creatorLoginForm.handleSubmit(onCreatorLoginSubmit)} className="space-y-4">
                  <FormField
                    control={creatorLoginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Creator username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={creatorLoginForm.control}
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
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
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
              
              <div className="mt-6 flex items-center justify-center">
                <div className="flex items-center text-sm text-gray-500">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  <span>Creator access only</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}