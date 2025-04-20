import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

/**
 * Custom hook to check if AI features should be available for the current user
 * 
 * @returns Object containing:
 *  - isAvailable: boolean indicating if AI features are available
 *  - isLoading: boolean indicating if the check is in progress
 *  - error: error object if the check failed
 */
export function useAiProviderAvailability() {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/ai/availability'],
    // No explicit queryFn needed as we use the default fetcher
    staleTime: 5 * 60 * 1000, // 5 minutes - reasonable caching
    retry: 1, // Only retry once to avoid spamming logs on failure
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
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/ai/providers'],
    // Don't fetch if AI features aren't available (determined by useAiProviderAvailability)
    enabled: queryClient.getQueryData(['/api/ai/availability'])?.available === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
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
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/ai/providers/default'],
    // Don't fetch if AI features aren't available
    enabled: queryClient.getQueryData(['/api/ai/availability'])?.available === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
  });

  return {
    provider: data?.provider,
    isLoading,
    error
  };
}