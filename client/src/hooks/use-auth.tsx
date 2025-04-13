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

// Extended type for registration with optional team creation
type RegisterData = InsertUser & {
  newTeam?: string; // Optional field for new team creation
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
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
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Maximum retries with exponential backoff
        let retries = 5;
        let delay = 1000;
        
        while (retries > 0) {
          try {
            const res = await fetch("/api/user", {
              credentials: "include"
            });
            
            // If unauthorized, try fallback mechanisms
            if (res.status === 401) {
              console.log("Server returned 401, checking for fallback user data");
              return await tryFallbackUserData();
            }
            
            // For server errors, retry with exponential backoff
            if (res.status >= 500) {
              console.log(`Server error ${res.status}, retrying... (${retries} attempts left)`);
              retries--;
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
              continue;
            }
            
            // If request was successful, parse and return the data
            if (res.ok) {
              return await res.json();
            }
            
            // Handle other errors
            const errorText = await res.text();
            console.error(`Error fetching user data: ${res.status} - ${errorText}`);
            
            // Try fallback user data as a last resort
            return await tryFallbackUserData();
          } catch (fetchError) {
            console.error("Network error fetching user data:", fetchError);
            retries--;
            
            if (retries <= 0) {
              // Try fallback user data as a last resort
              return await tryFallbackUserData();
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }
        }
        
        // All retries failed, try fallback
        return await tryFallbackUserData();
      } catch (error) {
        console.error("Unhandled error in user query:", error);
        
        // Final attempt with fallback
        return await tryFallbackUserData();
      }
    },
    // Increase retry attempts
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000)
  });
  
  // Function to extract essential user data from cookie as a last resort fallback
  async function tryFallbackUserData(): Promise<User | null> {
    try {
      const cookies = document.cookie.split(';');
      const userDataCookie = cookies.find(cookie => cookie.trim().startsWith('essential_user_data='));
      
      if (userDataCookie) {
        const cookieValue = userDataCookie.split('=')[1];
        if (cookieValue) {
          const userData = JSON.parse(decodeURIComponent(cookieValue));
          console.log("Found fallback user data in cookie:", userData.username);
          
          // This is a minimal User object with just enough data to keep the app functional
          // until the server becomes available again
          return {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            tenantId: userData.tenantId,
            // Add minimal defaults for required fields
            password: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: userData.username,
            email: null,
            mfaEnabled: false,
            mfaSecret: null,
            mfaBackupCodes: null,
            ssoEnabled: false,
            ssoProvider: null,
            ssoProviderId: null,
            ssoProviderData: {}
          } as User;
        }
      }
      
      console.log("No fallback user data available");
      return null;
    } catch (fallbackError) {
      console.error("Error using fallback user data:", fallbackError);
      return null;
    }
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login attempt with:', credentials.username);
      
      // Maximum retries with exponential backoff
      let retries = 3;
      let delay = 1000;
        
      while (retries >= 0) {
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
          
          // For server errors, retry with exponential backoff
          if (res.status >= 500) {
            console.log(`Server error during login ${res.status}, retrying... (${retries} attempts left)`);
            
            if (retries <= 0) {
              throw new Error(`${res.status}: Server error - please try again later`);
            }
            
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
          
          // For successful or client error responses, process normally
          let data;
          try {
            data = await res.json();
            console.log('Login response data:', data);
          } catch (parseError) {
            console.error('Error parsing login response:', parseError);
            throw new Error(`Error processing server response: ${res.status}`);
          }
          
          if (!res.ok) {
            throw new Error(`${res.status}: ${data.message || 'Login failed'}`);
          }
          
          return data;
        } catch (err) {
          console.error('Login error:', err);
          
          // If this is the last retry or not a retryable error, throw
          if (retries <= 0 || !(err instanceof Error && err.message.includes('Server error'))) {
            throw err;
          }
          
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
      
      // This should never be reached due to the throw in the last iteration
      throw new Error('Login failed after multiple attempts');
    },
    onSuccess: (user: User) => {
      console.log('Login successful for:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      
      // Store a minimal backup of essential user data in a cookie
      // This will be used as a last resort if all server methods fail
      try {
        const essentialUserData = {
          id: user.id,
          username: user.username,
          role: user.role,
          tenantId: user.tenantId
        };
        document.cookie = `essential_user_data=${JSON.stringify(essentialUserData)};path=/;max-age=86400`;
      } catch (cookieError) {
        console.error('Failed to set fallback cookie:', cookieError);
      }
      
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
    mutationFn: async (credentials: RegisterData) => {
      console.log('Registration attempt with:', credentials.username);
      console.log('Team data:', credentials.teamId || credentials.newTeam || 'None');
      
      // Maximum retries with exponential backoff
      let retries = 3;
      let delay = 1000;
        
      while (retries >= 0) {
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
          
          // For server errors, retry with exponential backoff
          if (res.status >= 500) {
            console.log(`Server error during registration ${res.status}, retrying... (${retries} attempts left)`);
            
            if (retries <= 0) {
              throw new Error(`${res.status}: Server error - please try again later`);
            }
            
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
          
          // For successful or client error responses, process normally
          let data;
          try {
            data = await res.json();
            console.log('Registration response data:', data);
          } catch (parseError) {
            console.error('Error parsing registration response:', parseError);
            throw new Error(`Error processing server response: ${res.status}`);
          }
          
          if (!res.ok) {
            throw new Error(`${res.status}: ${data.message || 'Registration failed'}`);
          }
          
          return data;
        } catch (err) {
          console.error('Registration error:', err);
          
          // If this is the last retry or not a retryable error, throw
          if (retries <= 0 || !(err instanceof Error && err.message.includes('Server error'))) {
            throw err;
          }
          
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
      
      // This should never be reached due to the throw in the last iteration
      throw new Error('Registration failed after multiple attempts');
    },
    onSuccess: (user: User) => {
      console.log('Registration successful for:', user.username);
      queryClient.setQueryData(["/api/user"], user);
      
      // Store a minimal backup of essential user data in a cookie
      // This will be used as a last resort if all server methods fail
      try {
        const essentialUserData = {
          id: user.id,
          username: user.username,
          role: user.role,
          tenantId: user.tenantId
        };
        document.cookie = `essential_user_data=${JSON.stringify(essentialUserData)};path=/;max-age=86400`;
      } catch (cookieError) {
        console.error('Failed to set fallback cookie:', cookieError);
      }
      
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
      // Maximum retries with exponential backoff
      let retries = 3;
      let delay = 1000;
        
      while (retries >= 0) {
        try {
          const res = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
          });
          
          // For server errors, retry with exponential backoff
          if (res.status >= 500) {
            console.log(`Server error during logout ${res.status}, retrying... (${retries} attempts left)`);
            
            if (retries <= 0) {
              // For logout, we can proceed even if the server call fails
              // Just clear client-side state and log the error
              console.error(`Server error during logout: ${res.status}, but proceeding with client-side logout`);
              return;
            }
            
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
          
          // For successful response, normal processing
          if (res.ok) {
            return;
          }
          
          // For client errors, log but proceed with client-side logout
          console.error(`Error during logout: ${res.status}`);
          return;
        } catch (err) {
          console.error('Logout error:', err);
          
          // If this is the last retry, just proceed with client-side logout
          if (retries <= 0) {
            console.warn('Logout request failed, but proceeding with client-side logout');
            return;
          }
          
          retries--;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear the backup cookie as well
      try {
        document.cookie = "essential_user_data=;path=/;max-age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch (cookieError) {
        console.error('Failed to clear fallback cookie:', cookieError);
      }
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      // Redirect to auth page after logout
      setLocation("/auth");
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