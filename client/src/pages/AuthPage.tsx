import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, InfoIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";

import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  
  // Initialize the form before any conditional returns
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  function onLoginSubmit(data: z.infer<typeof loginSchema>) {
    loginMutation.mutate(data);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-4 py-8 md:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">AI Support Ticket System</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Login to access the support system
            </p>
          </div>
          
          <div className="w-full">
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
                  
                  <div className="mt-6 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>
                    
                    <Link href="/trial">
                      <Button 
                        variant="outline" 
                        className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        data-testid="button-start-trial"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Start Free Trial - 10 Tickets Free
                      </Button>
                    </Link>
                    
                    <Alert className="bg-muted/50">
                      <InfoIcon className="h-4 w-4 mr-2" />
                      <AlertDescription>Try our AI-powered system with 10 free tickets. No credit card required!</AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
          </div>
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