import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useTour } from './TourProvider';
import { HelpCircle, BookOpen, Play, X, Lightbulb } from 'lucide-react';

interface ContextualHelpProps {
  context: string;
  suggestions?: {
    tourId: string;
    title: string;
    description: string;
  }[];
  tips?: string[];
  className?: string;
}

export function ContextualHelp({ 
  context, 
  suggestions = [], 
  tips = [], 
  className = '' 
}: ContextualHelpProps) {
  const { startTour, availableTours } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-suggest relevant tours based on context
  const contextualTours = suggestions.length > 0 
    ? suggestions.map(s => availableTours.find(t => t.id === s.tourId)).filter(Boolean)
    : availableTours.filter(tour => 
        tour.steps.some(step => {
          const target = typeof step.target === 'string' ? step.target : '';
          const content = typeof step.content === 'string' ? step.content : '';
          return target.includes(context) || 
                 content.toLowerCase().includes(context.toLowerCase());
        })
      ).slice(0, 2);

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    setIsOpen(false);
  };

  if (dismissed) return null;

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-gray-600 p-1 h-auto"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-medium">Quick Help</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissed(true)}
                  className="p-1 h-auto"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              {tips.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Tips
                  </h5>
                  <ul className="space-y-1">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-sm text-gray-600 pl-2 border-l-2 border-gray-200">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {contextualTours.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Recommended Tours
                  </h5>
                  <div className="space-y-2">
                    {contextualTours.map(tour => {
                      if (!tour) return null;
                      
                      return (
                        <div 
                          key={tour.id} 
                          className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tour.name}</p>
                            <p className="text-xs text-gray-500">{tour.steps.length} steps</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStartTour(tour.id)}
                            className="ml-2"
                          >
                            Start
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {contextualTours.length === 0 && tips.length === 0 && (
                <p className="text-sm text-gray-500">
                  No specific help available for this section.
                </p>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Hook for smart help suggestions based on user behavior
export function useSmartHelp() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { completedTours, availableTours } = useTour();

  useEffect(() => {
    // Smart suggestions based on user progress
    const newSuggestions: string[] = [];

    // If user hasn't completed onboarding
    if (!completedTours.includes('first-time-user')) {
      newSuggestions.push('first-time-user');
    }

    // If user is admin but hasn't seen admin features
    const hasAdminTours = availableTours.some(t => t.category === 'admin');
    const completedAdminTours = completedTours.filter(id => 
      availableTours.find(t => t.id === id)?.category === 'admin'
    );
    
    if (hasAdminTours && completedAdminTours.length === 0) {
      newSuggestions.push('admin-features');
    }

    setSuggestions(newSuggestions);
  }, [completedTours, availableTours]);

  return suggestions;
}

// Component for tour progress indicator
export function TourProgress() {
  const { currentTour, tourProgress, isRunning } = useTour();

  if (!isRunning || !currentTour) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="bg-white shadow-lg border">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Tour in progress</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {tourProgress.current} / {tourProgress.total}
            </Badge>
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-1 mt-2">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ 
                width: `${(tourProgress.current / tourProgress.total) * 100}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}