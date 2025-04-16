import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface CreatorProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function CreatorProtectedRoute({
  path,
  component: Component,
}: CreatorProtectedRouteProps) {
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
        
        // If not authenticated or not a creator, redirect to creator login
        if (!user || user.role !== "creator") {
          return <Redirect to="/creator/login" />;
        }
        
        // If authenticated as creator, render the protected component
        return <Component params={params} />;
      }}
    </Route>
  );
}