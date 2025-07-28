import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { TourLauncher } from '@/components/tour/TourLauncher';
import { TourAchievements } from '@/components/tour/TourAchievements';
import { ContextualHelp } from '@/components/tour/ContextualHelp';
import { useTour } from '@/components/tour/TourProvider';
import { useAuth } from '@/hooks/use-auth';
import { 
  HelpCircle, 
  Play, 
  RotateCcw, 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  Code2,
  CheckCircle,
  BookOpen,
  Target,
  Star,
  Award,
  Settings,
  MessageSquare
} from 'lucide-react';

const categoryIcons = {
  onboarding: Clock,
  feature: Zap,
  admin: Users,
  advanced: Code2
};

const categoryDescriptions = {
  onboarding: "Learn the basics and get started with your AI support system",
  feature: "Explore specific features and functionality in detail", 
  admin: "Master administrative features and system management",
  advanced: "Deep dive into advanced technical features and integrations"
};

export default function ToursPage() {
  const { user } = useAuth();
  const { 
    availableTours, 
    startTour, 
    completedTours, 
    isRunning,
    currentTour 
  } = useTour();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categorizedTours = availableTours.reduce((acc, tour) => {
    if (!acc[tour.category]) {
      acc[tour.category] = [];
    }
    acc[tour.category].push(tour);
    return acc;
  }, {} as Record<string, typeof availableTours>);

  const filteredTours = selectedCategory === 'all' 
    ? availableTours 
    : availableTours.filter(tour => tour.category === selectedCategory);

  const tourStats = {
    total: availableTours.length,
    completed: completedTours.length,
    inProgress: currentTour ? 1 : 0,
    remaining: availableTours.length - completedTours.length
  };

  const completionPercentage = availableTours.length > 0 
    ? Math.round((completedTours.length / availableTours.length) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-tour="tours-header">
              Interactive Tours & Help
            </h1>
            <p className="text-gray-600 mt-2">
              Learn the platform with step-by-step guided tours and contextual help
            </p>
          </div>
          
          <div className="flex gap-3">
            <ContextualHelp 
              context="tours-page" 
              tips={[
                "Start with the 'Welcome to Sahayaa AI' tour if you're new",
                "Tours are role-based - you'll only see tours relevant to your permissions",
                "Track your progress with achievements and completion badges",
                "Tours can be restarted anytime if you need a refresher"
              ]}
            />
            <Button 
              variant="outline" 
              onClick={() => startTour('first-time-user')}
              disabled={isRunning}
              data-tour="start-welcome-tour"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Welcome Tour
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-tour="tour-stats">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tours</p>
                  <p className="text-2xl font-bold text-blue-600">{tourStats.total}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{tourStats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-2xl font-bold text-purple-600">{completionPercentage}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-orange-600">{tourStats.remaining}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tours List */}
          <div className="lg:col-span-2">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Tours</TabsTrigger>
                <TabsTrigger value="onboarding">Getting Started</TabsTrigger>
                <TabsTrigger value="feature">Features</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-6">
                <div className="space-y-4" data-tour="tours-list">
                  {selectedCategory !== 'all' && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        {React.createElement(categoryIcons[selectedCategory as keyof typeof categoryIcons], {
                          className: "w-6 h-6"
                        })}
                        <h3 className="text-xl font-semibold capitalize">
                          {selectedCategory === 'onboarding' ? 'Getting Started' : 
                           selectedCategory === 'feature' ? 'Feature Tours' :
                           selectedCategory === 'admin' ? 'Admin Features' : 
                           'Advanced Features'}
                        </h3>
                      </div>
                      <p className="text-gray-600">
                        {categoryDescriptions[selectedCategory as keyof typeof categoryDescriptions]}
                      </p>
                    </div>
                  )}

                  {filteredTours.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No tours available
                        </h3>
                        <p className="text-gray-600">
                          No tours are available for this category or your current role.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredTours.map(tour => {
                        const isCompleted = completedTours.includes(tour.id);
                        const isCurrentTour = currentTour === tour.id;
                        const CategoryIcon = categoryIcons[tour.category];

                        return (
                          <Card 
                            key={tour.id} 
                            className={`hover:shadow-md transition-shadow ${
                              isCurrentTour ? 'ring-2 ring-blue-500' : ''
                            }`}
                          >
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <CategoryIcon className="w-5 h-5 text-gray-500" />
                                    <h3 className="text-lg font-semibold">
                                      {tour.name}
                                    </h3>
                                    {isCompleted && (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                    {isCurrentTour && (
                                      <Badge variant="default" className="animate-pulse">
                                        In Progress
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mb-3">
                                    {tour.description}
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-xs">
                                      {tour.steps.length} steps
                                    </Badge>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        tour.category === 'onboarding' ? 'bg-blue-100 text-blue-800' :
                                        tour.category === 'feature' ? 'bg-green-100 text-green-800' :
                                        tour.category === 'admin' ? 'bg-purple-100 text-purple-800' :
                                        'bg-orange-100 text-orange-800'
                                      }`}
                                    >
                                      {tour.category === 'onboarding' ? 'Getting Started' : 
                                       tour.category === 'feature' ? 'Feature' :
                                       tour.category === 'admin' ? 'Admin' : 
                                       'Advanced'}
                                    </Badge>
                                    {isCompleted && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                        Completed
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 ml-4">
                                  {isCompleted && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => startTour(tour.id)}
                                      disabled={isRunning}
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" />
                                      Replay
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    onClick={() => startTour(tour.id)}
                                    disabled={isRunning}
                                    variant={isCompleted ? "outline" : "default"}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    {isCompleted ? 'Restart' : 'Start'}
                                  </Button>
                                </div>
                              </div>
                              
                              {tour.steps.length > 0 && (
                                <div className="border-t pt-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Tour includes:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    {tour.steps.slice(0, 4).map((step, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        {step.title}
                                      </div>
                                    ))}
                                    {tour.steps.length > 4 && (
                                      <div className="flex items-center gap-2 text-gray-500">
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                                        +{tour.steps.length - 4} more steps
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Tour Launcher */}
            <Card data-tour="quick-launcher">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Quick Launch
                </CardTitle>
                <CardDescription>
                  Start a tour or get help
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TourLauncher variant="card" />
              </CardContent>
            </Card>

            {/* Achievements */}
            <div data-tour="achievements">
              <TourAchievements />
            </div>

            {/* Role Info */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Your Access Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Role</span>
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Available Tours</span>
                      <span className="text-sm font-medium">
                        {availableTours.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completion</span>
                      <span className="text-sm font-medium">
                        {completionPercentage}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}