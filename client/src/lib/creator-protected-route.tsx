import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * A route component that only allows access to users with the creator role
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

  // Check if user exists and has creator role
  if (!user || user.role !== "creator") {
    return (
      <Route path={path}>
        <Redirect to="/creator/login" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}