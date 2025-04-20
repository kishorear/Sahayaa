import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * CreatorProtectedRoute component
 * Only allows access to users with the creator role
 * Redirects to homepage or shows loading state otherwise
 */
export function CreatorProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Check if user is authenticated and has creator role
  if (!user || user.role !== "creator") {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // If user is authenticated and has creator role, render the component
  return <Route path={path} component={Component} />;
}

export default CreatorProtectedRoute;