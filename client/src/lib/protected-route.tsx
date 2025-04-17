import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  return (
    <Route path={path}>
      {(params) => {
        // Show loading state while auth is checked
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }
        
        // If not authenticated, redirect to login
        if (!user) {
          // Redirect to the regular auth page
          return <Redirect to="/auth" />;
        }
        
        // If authenticated, render the protected component
        return <Component params={params} />;
      }}
    </Route>
  );
}