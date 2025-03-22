import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Exact match for the current path
  const isActive = location === path || location.startsWith(`${path}/`);

  // Create a wrapper component for the protected route
  return (
    <Route path={path}>
      {(params) => {
        // Show loading state
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }
        
        // If route is active and user is not logged in, redirect to auth
        if (isActive && !user) {
          return <Redirect to="/auth" />;
        }
        
        // If authenticated, render the protected component
        if (user) {
          return <Component params={params} />;
        }
        
        // Safety fallback - should not reach here but just in case
        return <Redirect to="/auth" />;
      }}
    </Route>
  );
}