import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.status === 401) {
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login attempt with:', credentials.username);
      
      try {
        // Use fetch directly to get more detailed response info for debugging
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
          credentials: 'include'
        });
        
        console.log('Login response status:', res.status);
        console.log('Login response headers:', [...res.headers.entries()].reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}));
        
        const data = await res.json();
        console.log('Login response data:', data);
        
        if (!res.ok) {
          throw new Error(`${res.status}: ${data.message || 'Login failed'}`);
        }
        
        return data;
      } catch (err) {
        console.error('Login error:', err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log('Login successful for:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
      // Redirect to dashboard after successful login
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log('Registration attempt with:', credentials.username);
      
      try {
        // Use fetch directly to get more detailed response info for debugging
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
          credentials: 'include'
        });
        
        console.log('Registration response status:', res.status);
        console.log('Registration response headers:', [...res.headers.entries()].reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}));
        
        const data = await res.json();
        console.log('Registration response data:', data);
        
        if (!res.ok) {
          throw new Error(`${res.status}: ${data.message || 'Registration failed'}`);
        }
        
        return data;
      } catch (err) {
        console.error('Registration error:', err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log('Registration successful for:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
      // Redirect to dashboard after successful registration
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      // Redirect to landing page after logout
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}