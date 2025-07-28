import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTour } from './TourProvider';
import { Trophy, Star, Target, Award, CheckCircle, Clock, Users, Zap, Code2 } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'progress' | 'exploration' | 'mastery' | 'engagement';
  requirement: {
    type: 'tours_completed' | 'category_completed' | 'consecutive_days' | 'help_usage';
    value: number | string[] | string;
  };
  reward?: string;
}

const achievements: Achievement[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first guided tour',
    icon: Target,
    category: 'progress',
    requirement: { type: 'tours_completed', value: 1 },
    reward: 'Welcome Badge'
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Complete the welcome onboarding tour',
    icon: CheckCircle,
    category: 'progress',
    requirement: { type: 'tours_completed', value: ['first-time-user'] },
    reward: 'Onboarding Master'
  },
  {
    id: 'feature-explorer',
    title: 'Feature Explorer',
    description: 'Complete 3 different feature tours',
    icon: Zap,
    category: 'exploration',
    requirement: { type: 'tours_completed', value: 3 },
    reward: 'Explorer Badge'
  },
  {
    id: 'admin-certified',
    title: 'Admin Certified',
    description: 'Complete all administrative tours',
    icon: Users,
    category: 'mastery',
    requirement: { type: 'category_completed', value: 'admin' },
    reward: 'Admin Certification'
  },
  {
    id: 'power-user',
    title: 'Power User',
    description: 'Complete all available tours',
    icon: Star,
    category: 'mastery',
    requirement: { type: 'tours_completed', value: 10 },
    reward: 'Master User Status'
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features Master',
    description: 'Complete all advanced feature tours',
    icon: Code2,
    category: 'mastery',
    requirement: { type: 'category_completed', value: 'advanced' },
    reward: 'Technical Expert'
  }
];

export function TourAchievements({ compact = false }: { compact?: boolean }) {
  const { completedTours, availableTours } = useTour();
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    const saved = localStorage.getItem('sahayaa-achievements');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sahayaa-achievements', JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements]);

  useEffect(() => {
    const newAchievements: string[] = [];

    achievements.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) return;

      let isUnlocked = false;

      switch (achievement.requirement.type) {
        case 'tours_completed':
          if (Array.isArray(achievement.requirement.value)) {
            isUnlocked = achievement.requirement.value.every(tourId => 
              completedTours.includes(tourId)
            );
          } else if (typeof achievement.requirement.value === 'number') {
            isUnlocked = completedTours.length >= achievement.requirement.value;
          }
          break;

        case 'category_completed':
          if (typeof achievement.requirement.value === 'string') {
            const categoryTours = availableTours.filter(tour => 
              tour.category === achievement.requirement.value
            );
            const completedCategoryTours = categoryTours.filter(tour =>
              completedTours.includes(tour.id)
            );
            isUnlocked = categoryTours.length > 0 && 
                        completedCategoryTours.length === categoryTours.length;
          }
          break;
      }

      if (isUnlocked) {
        newAchievements.push(achievement.id);
      }
    });

    if (newAchievements.length > 0) {
      setUnlockedAchievements(prev => [...prev, ...newAchievements]);
    }
  }, [completedTours, availableTours, unlockedAchievements]);

  const totalProgress = (completedTours.length / Math.max(availableTours.length, 1)) * 100;

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Progress</h4>
          <Badge variant="outline">
            {completedTours.length}/{availableTours.length} tours
          </Badge>
        </div>
        <Progress value={totalProgress} className="h-2" />
        <div className="flex flex-wrap gap-1">
          {unlockedAchievements.slice(0, 3).map(achievementId => {
            const achievement = achievements.find(a => a.id === achievementId);
            if (!achievement) return null;
            
            const Icon = achievement.icon;
            return (
              <Badge key={achievement.id} variant="secondary" className="text-xs">
                <Icon className="w-3 h-3 mr-1" />
                {achievement.title}
              </Badge>
            );
          })}
          {unlockedAchievements.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{unlockedAchievements.length - 3} more
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Tour Progress & Achievements
        </CardTitle>
        <CardDescription>
          Track your learning progress and unlock achievements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Overall Progress</h4>
            <span className="text-sm text-gray-600">
              {completedTours.length}/{availableTours.length} tours completed
            </span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </div>

        {/* Achievements Grid */}
        <div>
          <h4 className="font-medium mb-3">Achievements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              const Icon = achievement.icon;
              
              // Calculate progress for this achievement
              let progress = 0;
              if (achievement.requirement.type === 'tours_completed') {
                if (Array.isArray(achievement.requirement.value)) {
                  const completed = achievement.requirement.value.filter(tourId => 
                    completedTours.includes(tourId)
                  ).length;
                  progress = (completed / achievement.requirement.value.length) * 100;
                } else if (typeof achievement.requirement.value === 'number') {
                  progress = Math.min((completedTours.length / achievement.requirement.value) * 100, 100);
                }
              } else if (achievement.requirement.type === 'category_completed') {
                if (typeof achievement.requirement.value === 'string') {
                  const categoryTours = availableTours.filter(tour => 
                    tour.category === achievement.requirement.value
                  );
                  const completedCategoryTours = categoryTours.filter(tour =>
                    completedTours.includes(tour.id)
                  );
                  progress = categoryTours.length > 0 
                    ? (completedCategoryTours.length / categoryTours.length) * 100 
                    : 0;
                }
              }

              return (
                <div 
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isUnlocked 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      isUnlocked ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isUnlocked ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className={`font-medium text-sm ${
                          isUnlocked ? 'text-green-800' : 'text-gray-700'
                        }`}>
                          {achievement.title}
                        </h5>
                        {isUnlocked && (
                          <Badge variant="secondary" className="text-xs">
                            Unlocked
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs mb-2 ${
                        isUnlocked ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {achievement.description}
                      </p>
                      {!isUnlocked && progress > 0 && (
                        <div className="space-y-1">
                          <Progress value={progress} className="h-1" />
                          <span className="text-xs text-gray-500">
                            {Math.round(progress)}% complete
                          </span>
                        </div>
                      )}
                      {achievement.reward && isUnlocked && (
                        <Badge variant="outline" className="text-xs">
                          {achievement.reward}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {completedTours.length}
            </div>
            <div className="text-xs text-gray-600">Tours Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {unlockedAchievements.length}
            </div>
            <div className="text-xs text-gray-600">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(totalProgress)}%
            </div>
            <div className="text-xs text-gray-600">Progress</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}