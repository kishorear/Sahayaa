import React, { useEffect } from 'react';
import { useTour } from './TourProvider';
import { useAuth } from '@/hooks/use-auth';

/**
 * Component that automatically triggers the welcome tour for new users
 * Place this component at the root of authenticated pages
 */
export function NewUserTourTrigger() {
  const { user } = useAuth();
  const { startTour, completedTours, isRunning } = useTour();

  useEffect(() => {
    // Only trigger for authenticated users
    if (!user || isRunning) return;

    // Check if user has completed the welcome tour
    const hasCompletedWelcome = completedTours.includes('first-time-user');
    
    // Check if this is their first visit (no tours completed)
    const isNewUser = completedTours.length === 0;

    // Auto-start welcome tour for new users after a brief delay
    if (isNewUser && !hasCompletedWelcome) {
      const timer = setTimeout(() => {
        startTour('first-time-user');
      }, 2000); // 2 second delay to let the page load

      return () => clearTimeout(timer);
    }
  }, [user, completedTours, isRunning, startTour]);

  // This component renders nothing - it's just a trigger
  return null;
}

/**
 * Hook that provides smart tour suggestions based on user behavior
 */
export function useSmartTourSuggestions() {
  const { user } = useAuth();
  const { completedTours, availableTours } = useTour();

  const suggestions = React.useMemo(() => {
    if (!user) return [];

    const recommendations: string[] = [];

    // Welcome tour for new users
    if (!completedTours.includes('first-time-user')) {
      recommendations.push('first-time-user');
    }

    // Admin features for admin/creator users
    if (['admin', 'creator'].includes(user.role.toLowerCase())) {
      if (!completedTours.includes('admin-features')) {
        recommendations.push('admin-features');
      }
    }

    // Chat widget setup for creators
    if (user.role.toLowerCase() === 'creator') {
      if (!completedTours.includes('chat-widget-setup')) {
        recommendations.push('chat-widget-setup');
      }
    }

    // Analytics tour if user has completed basic onboarding
    if (completedTours.includes('first-time-user') && !completedTours.includes('analytics-dashboard')) {
      recommendations.push('analytics-dashboard');
    }

    // Advanced features for experienced users
    if (completedTours.length >= 2 && !completedTours.includes('fastmcp-features')) {
      recommendations.push('fastmcp-features');
    }

    return recommendations.slice(0, 3); // Limit to top 3 suggestions
  }, [user, completedTours]);

  return suggestions;
}