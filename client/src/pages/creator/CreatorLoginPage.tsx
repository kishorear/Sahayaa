import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Redirect } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function CreatorLoginPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in as creator, redirect to creator dashboard
  if (user && user.role === "creator") {
    return <Redirect to="/creator/dashboard" />;
  }

  // If logged in but not as creator, show a message
  if (user && user.role !== "creator") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Creator Access Required</CardTitle>
            <CardDescription>
              You are logged in as {user.role}, but this area requires creator privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Please log out and log back in with a creator account to access this area.
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use creator-specific login endpoint
      const response = await apiRequest("POST", "/api/creator/login", {
        username,
        password
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      // Refresh the page to update auth state
      window.location.href = "/creator/dashboard";

    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Invalid username or password";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Creator Login</CardTitle>
            <CardDescription>
              Access the Creator Dashboard to manage users and companies
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <div className="hidden lg:flex bg-muted items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Creator Dashboard</h1>
          <p className="text-lg text-muted-foreground mb-8">
            As a creator, you have exclusive access to manage user accounts and companies
            across the entire system. This dashboard provides tools for user registration
            and tenant management.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-6 rounded-lg">
              <h3 className="font-medium mb-2">User Management</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage user accounts with specific roles and permissions
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg">
              <h3 className="font-medium mb-2">Company Setup</h3>
              <p className="text-sm text-muted-foreground">
                Create companies with unique configurations and dedicated teams
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg">
              <h3 className="font-medium mb-2">Team Organization</h3>
              <p className="text-sm text-muted-foreground">
                Organize users into teams for better collaboration and access control
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg">
              <h3 className="font-medium mb-2">System Access</h3>
              <p className="text-sm text-muted-foreground">
                Cross-tenant privileges to access all parts of the system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}