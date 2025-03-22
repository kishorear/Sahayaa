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
  
  // TEMPORARY CHANGE: Skip authentication and always render the component
  // This will be reverted back to proper authentication when needed
  
  return (
    <Route path={path}>
      {(params) => {
        // Show loading state while auth is checked (kept for UI consistency)
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }
        
        // TEMPORARY: Directly render the component without checking authentication
        return <Component params={params} />;
        
        /* ORIGINAL AUTHENTICATION LOGIC (DISABLED)
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
        */
      }}
    </Route>
  );
}