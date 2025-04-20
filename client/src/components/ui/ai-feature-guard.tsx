import React from 'react';
import { useAiProviderAvailability } from '@/hooks/use-ai-provider';
import { Loader2, AlertCircle, ShieldAlert } from 'lucide-react';

type AIFeatureGuardProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  hideOnUnavailable?: boolean;
  featureDescription?: string;
};

/**
 * Component that conditionally renders AI-powered features only when available
 * 
 * @param children The AI-powered feature components to conditionally render
 * @param fallback Optional component to show when AI is unavailable
 * @param loadingComponent Optional component to show during loading
 * @param hideOnUnavailable Whether to hide completely when unavailable (default: false)
 * @param featureDescription Optional description of the feature for error messages
 */
export function AIFeatureGuard({
  children,
  fallback,
  loadingComponent,
  hideOnUnavailable = false,
  featureDescription = "This AI feature"
}: AIFeatureGuardProps) {
  const { isAvailable, isLoading, error } = useAiProviderAvailability();

  // While loading, show loading component or default loading state
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Checking AI availability...</span>
      </div>
    );
  }

  // If error occurred, show error state
  if (error) {
    return hideOnUnavailable ? null : (
      <div className="p-4 border rounded-md bg-muted">
        <div className="flex items-center text-destructive mb-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="font-medium">Error checking AI availability</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {featureDescription} is temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }

  // If AI isn't available, show fallback or default unavailable state
  if (!isAvailable) {
    if (hideOnUnavailable) {
      return null;
    }

    return fallback || (
      <div className="p-4 border rounded-md bg-muted">
        <div className="flex items-center text-amber-500 mb-2">
          <ShieldAlert className="h-4 w-4 mr-2" />
          <span className="font-medium">AI Features Unavailable</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {featureDescription} is not available for your account. 
          Please contact your administrator to enable AI features for your team.
        </p>
      </div>
    );
  }

  // AI is available, render the feature
  return <>{children}</>;
}