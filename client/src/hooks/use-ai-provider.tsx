import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

type AiAvailabilityResponse = {
  available: boolean;
};

type AiProviderResponse = {
  id: number;
  name: string;
  provider: string;
  model: string;
  teamId: number | null;
  isDefault: boolean;
  hasApiKey: boolean;
};

type AiProvidersResponse = {
  providers: AiProviderResponse[];
};

type AiDefaultProviderResponse = {
  provider: AiProviderResponse | null;
};

/**
 * Custom hook to check if AI features should be available for the current user
 * 
 * @returns Object containing:
 *  - isAvailable: boolean indicating if AI features are available
 *  - isLoading: boolean indicating if the check is in progress
 *  - error: error object if the check failed
 */
export function useAiProviderAvailability() {
  const { data, isLoading, error } = useQuery<AiAvailabilityResponse>({
    queryKey: ['/api/ai/availability'],
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAvailable: data?.available || false,
    isLoading,
    error
  };
}

/**
 * Custom hook to fetch available AI providers for the current user
 * 
 * @returns Object containing:
 *  - providers: array of available AI providers
 *  - isLoading: boolean indicating if the fetch is in progress
 *  - error: error object if the fetch failed
 */
export function useAvailableAiProviders() {
  const { data, isLoading, error } = useQuery<AiProvidersResponse>({
    queryKey: ['/api/ai/providers'],
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    providers: data?.providers || [],
    isLoading,
    error
  };
}

/**
 * Custom hook to fetch the default AI provider for the current user
 * 
 * @returns Object containing:
 *  - provider: the default AI provider or undefined
 *  - isLoading: boolean indicating if the fetch is in progress
 *  - error: error object if the fetch failed
 */
export function useDefaultAiProvider() {
  const { data, isLoading, error } = useQuery<AiDefaultProviderResponse>({
    queryKey: ['/api/ai/providers/default'],
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    provider: data?.provider || null,
    isLoading,
    error
  };
}

/**
 * Utility function to refresh all AI provider data in the cache
 */
export function refreshAiProviderData() {
  queryClient.invalidateQueries({ 
    queryKey: ['/api/ai/availability'] 
  });
  queryClient.invalidateQueries({ 
    queryKey: ['/api/ai/providers'] 
  });
  queryClient.invalidateQueries({ 
    queryKey: ['/api/ai/providers/default'] 
  });
}