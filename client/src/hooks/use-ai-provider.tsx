import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Type for the API response
interface AiProviderAvailabilityResponse {
  available: boolean;
  message: string;
  role?: string;
}

/**
 * Hook to check if AI providers are available for the current user's tenant/team
 * This is used to conditionally render AI-related features in the UI
 */
export function useAiProviderAvailability() {
  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<AiProviderAvailabilityResponse>({
    queryKey: ['/api/ai/providers/available'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ai/providers/available');
        
        if (!response.ok) {
          // Handle 401 specifically - don't show error toast for auth issues
          if (response.status === 401) {
            return { available: false, message: 'Not authenticated' };
          }
          
          throw new Error(`Error checking AI provider availability: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching AI provider availability:', error);
        toast({
          title: 'Error',
          description: 'Failed to check AI provider availability',
          variant: 'destructive',
        });
        throw error;
      }
    },
    // Only refetch on window focus if we're authenticated
    refetchOnWindowFocus: (query) => {
      const data = query.state.data as AiProviderAvailabilityResponse | undefined;
      return data?.message !== 'Not authenticated';
    },
  });

  return {
    aiProvidersAvailable: data?.available || false,
    isLoadingProviders: isLoading,
    errorMessage: data?.message || error?.message,
    refetchProviders: refetch,
    isAdmin: data?.role === 'admin_or_creator'
  };
}