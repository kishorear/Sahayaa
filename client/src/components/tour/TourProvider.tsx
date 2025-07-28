import React, { createContext, useContext, useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, X, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

interface TourStep extends Step {
  id: string;
  title: string;
  category?: string;
  requiresRole?: string[];
}

interface TourDefinition {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'feature' | 'admin' | 'advanced';
  requiresRole?: string[];
  steps: TourStep[];
  autoStart?: boolean;
  showProgress?: boolean;
}

interface TourContextType {
  currentTour: string | null;
  startTour: (tourId: string) => void;
  stopTour: () => void;
  restartTour: () => void;
  skipTour: () => void;
  isRunning: boolean;
  availableTours: TourDefinition[];
  completedTours: string[];
  markTourCompleted: (tourId: string) => void;
  tourProgress: { current: number; total: number };
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

// Tour definitions
const tourDefinitions: TourDefinition[] = [
  {
    id: 'first-time-user',
    name: 'Welcome to Sahayaa AI',
    description: 'Get started with the basics of your AI support system',
    category: 'onboarding',
    autoStart: true,
    showProgress: true,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Sahayaa AI!',
        target: 'body',
        content: 'Welcome to your AI-powered customer support platform. Let me show you around and help you get started with the key features.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        id: 'dashboard',
        title: 'Your Dashboard',
        target: '[data-tour="dashboard"]',
        content: 'This is your main dashboard where you can see ticket statistics, team performance, and system health at a glance.',
        placement: 'bottom',
      },
      {
        id: 'tickets',
        title: 'Ticket Management',
        target: '[data-tour="tickets"]',
        content: 'View, manage, and respond to customer support tickets. AI helps categorize and prioritize them automatically.',
        placement: 'bottom',
      },
      {
        id: 'chat',
        title: 'AI Chat Assistant',
        target: '[data-tour="chat"]',
        content: 'Your AI assistant helps answer questions, create tickets, and provides intelligent suggestions for customer issues.',
        placement: 'left',
      },
      {
        id: 'settings',
        title: 'Settings & Configuration',
        target: '[data-tour="settings"]',
        content: 'Configure AI providers, customize your chat widget, manage team members, and adjust system settings.',
        placement: 'left',
      }
    ]
  },
  {
    id: 'admin-features',
    name: 'Admin Features Tour',
    description: 'Explore advanced administrative features and system management',
    category: 'admin',
    requiresRole: ['admin', 'creator'],
    showProgress: true,
    steps: [
      {
        id: 'user-management',
        title: 'User Management',
        target: '[data-tour="user-management"]',
        content: 'Manage team members, assign roles, and configure access permissions for your support team.',
        placement: 'bottom',
      },
      {
        id: 'ai-providers',
        title: 'AI Provider Configuration',
        target: '[data-tour="ai-providers"]',
        content: 'Configure multiple AI providers like OpenAI, Google AI, and Anthropic. Set up failover and load balancing.',
        placement: 'bottom',
      },
      {
        id: 'analytics',
        title: 'Advanced Analytics',
        target: '[data-tour="analytics"]',
        content: 'Deep dive into performance metrics, customer satisfaction scores, and AI effectiveness analytics.',
        placement: 'bottom',
      },
      {
        id: 'integrations',
        title: 'System Integrations',
        target: '[data-tour="integrations"]',
        content: 'Connect with external tools like Jira, Slack, email systems, and custom webhook integrations.',
        placement: 'bottom',
      }
    ]
  },
  {
    id: 'chat-widget-setup',
    name: 'Chat Widget Setup',
    description: 'Learn how to embed and customize your chat widget',
    category: 'feature',
    showProgress: true,
    steps: [
      {
        id: 'widget-generation',
        title: 'Generate Widget Code',
        target: '[data-tour="widget-generation"]',
        content: 'Generate customized widget code for your website. Configure appearance, behavior, and branding.',
        placement: 'right',
      },
      {
        id: 'widget-customization',
        title: 'Widget Customization',
        target: '[data-tour="widget-customization"]',
        content: 'Customize colors, position, welcome messages, and chat behavior to match your brand.',
        placement: 'bottom',
      },
      {
        id: 'widget-testing',
        title: 'Test Your Widget',
        target: '[data-tour="widget-testing"]',
        content: 'Test the widget functionality, AI responses, and ticket creation before deploying to production.',
        placement: 'bottom',
      },
      {
        id: 'widget-deployment',
        title: 'Deploy to Website',
        target: '[data-tour="widget-deployment"]',
        content: 'Copy the generated code and embed it in your website. Monitor performance and user interactions.',
        placement: 'top',
      }
    ]
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Deep Dive',
    description: 'Master your analytics dashboard and reporting features',
    category: 'feature',
    showProgress: true,
    steps: [
      {
        id: 'metrics-overview',
        title: 'Key Metrics Overview',
        target: '[data-tour="metrics-overview"]',
        content: 'Monitor ticket volume, response times, resolution rates, and customer satisfaction scores.',
        placement: 'bottom',
      },
      {
        id: 'ai-performance',
        title: 'AI Performance Metrics',
        target: '[data-tour="ai-performance"]',
        content: 'Track AI accuracy, auto-resolution rates, confidence scores, and recommendation effectiveness.',
        placement: 'bottom',
      },
      {
        id: 'team-performance',
        title: 'Team Performance',
        target: '[data-tour="team-performance"]',
        content: 'Analyze individual and team performance, workload distribution, and productivity metrics.',
        placement: 'bottom',
      },
      {
        id: 'custom-reports',
        title: 'Custom Reports',
        target: '[data-tour="custom-reports"]',
        content: 'Create custom reports, export data, and set up automated reporting for stakeholders.',
        placement: 'top',
      }
    ]
  },
  {
    id: 'fastmcp-features',
    name: 'FastMCP & Vector Search',
    description: 'Explore advanced AI features with vector search and document processing',
    category: 'advanced',
    showProgress: true,
    steps: [
      {
        id: 'vector-search',
        title: 'Vector Search System',
        target: '[data-tour="vector-search"]',
        content: 'Your FastMCP system provides semantic search through your knowledge base using AI embeddings.',
        placement: 'bottom',
      },
      {
        id: 'document-ingestion',
        title: 'Document Processing',
        target: '[data-tour="document-ingestion"]',
        content: 'Upload and process documents automatically. The system extracts knowledge and makes it searchable.',
        placement: 'bottom',
      },
      {
        id: 'ai-agents',
        title: 'Multi-Agent System',
        target: '[data-tour="ai-agents"]',
        content: 'Specialized AI agents work together: chat processing, instruction lookup, and ticket analysis.',
        placement: 'bottom',
      },
      {
        id: 'rag-capabilities',
        title: 'RAG Enhancement',
        target: '[data-tour="rag-capabilities"]',
        content: 'Retrieval Augmented Generation enhances AI responses with relevant context from your knowledge base.',
        placement: 'top',
      }
    ]
  }
];

interface TourProviderProps {
  children: React.ReactNode;
  userRole?: string;
}

export function TourProvider({ children, userRole = 'user' }: TourProviderProps) {
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>(() => {
    const saved = localStorage.getItem('sahayaa-completed-tours');
    return saved ? JSON.parse(saved) : [];
  });

  const availableTours = tourDefinitions.filter(tour => 
    !tour.requiresRole || tour.requiresRole.includes(userRole)
  );

  const currentTourDefinition = currentTour 
    ? tourDefinitions.find(t => t.id === currentTour)
    : null;

  const tourProgress = currentTourDefinition 
    ? { current: stepIndex + 1, total: currentTourDefinition.steps.length }
    : { current: 0, total: 0 };

  useEffect(() => {
    localStorage.setItem('sahayaa-completed-tours', JSON.stringify(completedTours));
  }, [completedTours]);

  const startTour = (tourId: string) => {
    const tour = tourDefinitions.find(t => t.id === tourId);
    if (tour) {
      setCurrentTour(tourId);
      setStepIndex(0);
      setIsRunning(true);
    }
  };

  const stopTour = () => {
    setCurrentTour(null);
    setIsRunning(false);
    setStepIndex(0);
  };

  const restartTour = () => {
    if (currentTour) {
      setStepIndex(0);
      setIsRunning(true);
    }
  };

  const skipTour = () => {
    stopTour();
  };

  const markTourCompleted = (tourId: string) => {
    if (!completedTours.includes(tourId)) {
      setCompletedTours(prev => [...prev, tourId]);
    }
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (currentTour && status === STATUS.FINISHED) {
        markTourCompleted(currentTour);
      }
      stopTour();
    }
  };

  // Custom tooltip component
  const TooltipComponent = ({ step, tooltipProps, primaryProps, skipProps, backProps, index, size, isLastStep }: any) => (
    <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm" {...tooltipProps}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
          {currentTourDefinition?.showProgress && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                Step {index + 1} of {size}
              </Badge>
              {step.category && (
                <Badge variant="secondary" className="text-xs">
                  {step.category}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={skipProps.onClick}
          className="p-1 h-auto"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="text-gray-700 mb-4">
        {step.content}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={backProps.onClick}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={restartTour}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Restart
          </Button>
          <Button
            onClick={primaryProps.onClick}
            size="sm"
            className="flex items-center gap-1"
          >
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ArrowRight className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <TourContext.Provider value={{
      currentTour,
      startTour,
      stopTour,
      restartTour,
      skipTour,
      isRunning,
      availableTours,
      completedTours,
      markTourCompleted,
      tourProgress
    }}>
      {children}
      {currentTourDefinition && (
        <Joyride
          steps={currentTourDefinition.steps}
          run={isRunning}
          stepIndex={stepIndex}
          callback={handleJoyrideCallback}
          continuous={true}
          showProgress={false}
          showSkipButton={false}
          spotlightClicks={true}
          disableOverlayClose={true}
          tooltipComponent={TooltipComponent}
          styles={{
            options: {
              primaryColor: 'hsl(var(--primary))',
              backgroundColor: 'white',
              textColor: 'hsl(var(--foreground))',
              overlayColor: 'rgba(0, 0, 0, 0.4)',
              spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
            },
            spotlight: {
              borderRadius: '8px',
            }
          }}
        />
      )}
    </TourContext.Provider>
  );
}