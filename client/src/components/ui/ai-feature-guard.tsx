import { ReactNode } from "react";
import { useAIProvider } from "@/hooks/use-ai-provider";
import { Loader2, AlertTriangle } from "lucide-react";

interface AIFeatureGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  showAlertOnUnavailable?: boolean;
}

/**
 * Component that conditionally renders children based on AI provider availability
 * Use this to wrap components that require AI functionality
 * 
 * @param children - Components that use AI features
 * @param fallback - Optional component to render when AI is unavailable
 * @param loadingFallback - Optional component to render while checking AI availability
 * @param showAlertOnUnavailable - Whether to show a warning message when AI is unavailable
 */
export function AIFeatureGuard({
  children,
  fallback,
  loadingFallback,
  showAlertOnUnavailable = false,
}: AIFeatureGuardProps) {
  const { isAvailable, isLoading, error } = useAIProvider();

  // While checking availability, show loading state
  if (isLoading) {
    return loadingFallback ? (
      <>{loadingFallback}</>
    ) : (
      <div className="flex items-center gap-2 text-muted-foreground p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking AI availability...</span>
      </div>
    );
  }

  // If AI is unavailable, show fallback or alert
  if (!isAvailable) {
    // If error occurred during availability check
    if (error) {
      console.error("Error checking AI availability:", error);
    }

    // If fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }

    // If showAlertOnUnavailable is true, show alert message
    if (showAlertOnUnavailable) {
      return (
        <div className="flex items-center gap-2 p-3 text-amber-600 bg-amber-50 rounded-md border border-amber-200">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm">
            <p className="font-medium">AI feature unavailable</p>
            <p className="text-amber-500">
              Contact your administrator to set up AI providers for your team.
            </p>
          </div>
        </div>
      );
    }

    // If no fallback and no alert, render nothing
    return null;
  }

  // If AI is available, render children
  return <>{children}</>;
}