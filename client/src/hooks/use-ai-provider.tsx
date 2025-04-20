import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * Type for AI provider information returned from API
 */
interface AIProvider {
  id: number;
  name: string;
  type: string;
  model: string;
  teamId: number | null;
  isDefault: boolean;
  hasApiKey: boolean;
}

/**
 * Context for AI provider availability
 */
interface AIProviderContextType {
  isAvailable: boolean | null;
  isLoading: boolean;
  error: Error | null;
  providers: AIProvider[];
  defaultProvider: AIProvider | null;
  providersLoading: boolean;
  providersError: Error | null;
  refreshProviders: () => void;
}

const AIProviderContext = createContext<AIProviderContextType | null>(null);

/**
 * Provider for AI availability context
 * This wraps the application to provide global access to AI availability status
 */
export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: availabilityData,
    isLoading,
    error,
  } = useQuery<{ available: boolean }>({
    queryKey: ["/api/ai/availability"],
    retry: false,
  });

  const {
    data: providersData,
    isLoading: providersLoading,
    error: providersError,
  } = useQuery<{ providers: AIProvider[] }>({
    queryKey: ["/api/ai/providers", refreshKey],
    enabled: !!availabilityData?.available,
    retry: false,
  });

  const {
    data: defaultProviderData,
    isLoading: defaultProviderLoading,
    error: defaultProviderError,
  } = useQuery<{ provider: AIProvider | null }>({
    queryKey: ["/api/ai/providers/default", refreshKey],
    enabled: !!availabilityData?.available,
    retry: false,
  });

  const refreshProviders = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const value = {
    isAvailable: availabilityData?.available ?? null,
    isLoading,
    error: error as Error | null,
    providers: providersData?.providers || [],
    defaultProvider: defaultProviderData?.provider || null,
    providersLoading: providersLoading || defaultProviderLoading,
    providersError: (providersError || defaultProviderError) as Error | null,
    refreshProviders,
  };

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
}

/**
 * Hook to access AI availability status
 * Use this to conditionally render AI features based on availability
 */
export function useAIProvider() {
  const context = useContext(AIProviderContext);
  
  if (context === null) {
    throw new Error("useAIProvider must be used within an AIProviderProvider");
  }
  
  return context;
}

/**
 * Utility function to invalidate AI provider cache
 * Used after making changes to AI providers
 */
export function invalidateAIProviderCache() {
  queryClient.invalidateQueries({ queryKey: ["/api/ai/availability"] });
  queryClient.invalidateQueries({ queryKey: ["/api/ai/providers"] });
  queryClient.invalidateQueries({ queryKey: ["/api/ai/providers/default"] });
}