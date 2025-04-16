import React from 'react';
import { Route, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface CreatorProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string;
}

export const CreatorProtectedRoute: React.FC<CreatorProtectedRouteProps> = ({
  component: Component,
  path,
  ...rest
}) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
    <Route
      path={path}
      {...rest}
      component={(props: any) => {
        // If still loading auth state, return null temporarily
        if (isLoading) {
          return null;
        }
        
        // If user is authenticated and is a creator, render the component
        if (user && user.role === 'creator') {
          return <Component {...props} />;
        }
        
        // If user is authenticated but not a creator, show an error and redirect to dashboard
        if (user) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this area. Creator access only.",
            variant: "destructive",
          });
          setLocation('/dashboard');
          return null;
        }
        
        // If user is not authenticated, redirect to creator login
        setLocation('/creator/login');
        return null;
      }}
    />
  );
};