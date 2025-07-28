import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTour } from './TourProvider';
import { HelpCircle, Play, CheckCircle, Clock, Users, Zap, BarChart3, Code2 } from 'lucide-react';

const categoryIcons = {
  onboarding: Clock,
  feature: Zap,
  admin: Users,
  advanced: Code2
};

const categoryColors = {
  onboarding: 'bg-blue-100 text-blue-800 border-blue-200',
  feature: 'bg-green-100 text-green-800 border-green-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  advanced: 'bg-orange-100 text-orange-800 border-orange-200'
};

interface TourLauncherProps {
  variant?: 'button' | 'card' | 'floating';
  className?: string;
}

export function TourLauncher({ variant = 'button', className = '' }: TourLauncherProps) {
  const { availableTours, startTour, completedTours, isRunning } = useTour();
  const [isOpen, setIsOpen] = useState(false);

  const categorizedTours = availableTours.reduce((acc, tour) => {
    if (!acc[tour.category]) {
      acc[tour.category] = [];
    }
    acc[tour.category].push(tour);
    return acc;
  }, {} as Record<string, typeof availableTours>);

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    setIsOpen(false);
  };

  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
              disabled={isRunning}
            >
              <HelpCircle className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Guided Tours & Help
              </DialogTitle>
              <DialogDescription>
                Take a guided tour to learn about specific features or get help with common tasks.
              </DialogDescription>
            </DialogHeader>
            <TourGrid onStartTour={handleStartTour} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Interactive Tours
          </CardTitle>
          <CardDescription>
            Learn the platform with step-by-step guided tours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TourGrid onStartTour={handleStartTour} compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className} disabled={isRunning}>
          <HelpCircle className="w-4 h-4 mr-2" />
          Take a Tour
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Guided Tours & Help
          </DialogTitle>
          <DialogDescription>
            Take a guided tour to learn about specific features or get help with common tasks.
          </DialogDescription>
        </DialogHeader>
        <TourGrid onStartTour={handleStartTour} />
      </DialogContent>
    </Dialog>
  );
}

interface TourGridProps {
  onStartTour: (tourId: string) => void;
  compact?: boolean;
}

function TourGrid({ onStartTour, compact = false }: TourGridProps) {
  const { availableTours, completedTours } = useTour();

  const categorizedTours = availableTours.reduce((acc, tour) => {
    if (!acc[tour.category]) {
      acc[tour.category] = [];
    }
    acc[tour.category].push(tour);
    return acc;
  }, {} as Record<string, typeof availableTours>);

  const categoryOrder = ['onboarding', 'feature', 'admin', 'advanced'];

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => {
        const tours = categorizedTours[category];
        if (!tours?.length) return null;

        const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <CategoryIcon className="w-5 h-5" />
              <h3 className="font-semibold capitalize text-lg">
                {category === 'onboarding' ? 'Getting Started' : 
                 category === 'feature' ? 'Feature Tours' :
                 category === 'admin' ? 'Admin Features' : 
                 'Advanced Features'}
              </h3>
            </div>
            
            <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {tours.map(tour => {
                const isCompleted = completedTours.includes(tour.id);
                
                return (
                  <Card key={tour.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-base mb-1">{tour.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{tour.description}</p>
                        </div>
                        {isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-500 ml-2 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={categoryColors[tour.category as keyof typeof categoryColors]}
                          >
                            {tour.steps.length} steps
                          </Badge>
                          {isCompleted && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => onStartTour(tour.id)}
                          variant={isCompleted ? "outline" : "default"}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {isCompleted ? 'Replay' : 'Start'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {Object.keys(categorizedTours).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tours available for your current role.</p>
        </div>
      )}
    </div>
  );
}