import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAiProviderAvailability } from '@/hooks/use-ai-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  featureDescription = 'AI-powered features'
}: AIFeatureGuardProps) {
  const { isAvailable, isLoading, error } = useAiProviderAvailability();

  // Show loading state while checking availability
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state if there was an error checking availability
  if (error) {
    if (hideOnUnavailable) return null;
    
    return fallback || (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to check availability of {featureDescription}. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // AI features are available, render children
  if (isAvailable) {
    return <>{children}</>;
  }

  // AI features are not available
  if (hideOnUnavailable) return null;
  
  return fallback || (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-900">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {featureDescription} are not available. Contact your administrator to set up AI providers for your team.
      </AlertDescription>
    </Alert>
  );
}