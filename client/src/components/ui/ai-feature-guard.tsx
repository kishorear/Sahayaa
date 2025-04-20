import { ReactNode } from "react";
import { useAiProviderAvailability } from "@/hooks/use-ai-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface AiFeatureGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  tooltipMessage?: string;
}

/**
 * A component that conditionally renders AI features based on whether
 * AI providers are configured for the current user's tenant/team
 */
export function AiFeatureGuard({
  children,
  fallback,
  tooltipMessage = "AI features are not available for your account. Contact your administrator."
}: AiFeatureGuardProps) {
  const { 
    aiProvidersAvailable, 
    isLoadingProviders, 
    errorMessage 
  } = useAiProviderAvailability();

  // Show a loading state
  if (isLoadingProviders) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span className="text-sm">Checking AI availability...</span>
      </div>
    );
  }

  // If AI providers are available, render the children
  if (aiProvidersAvailable) {
    return <>{children}</>;
  }

  // If fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Otherwise render a tooltip explaining why the feature is unavailable
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-muted-foreground cursor-not-allowed opacity-50">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltipMessage}</p>
          {errorMessage && errorMessage !== "Not authenticated" && (
            <p className="text-xs mt-1 text-destructive">
              {errorMessage}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}