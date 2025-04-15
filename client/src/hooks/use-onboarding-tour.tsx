import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

// Define tour steps for different user roles
export const adminTourSteps: Step[] = [
  {
    target: '.admin-dashboard',
    content: 'Welcome to the Admin Dashboard! This is where you can manage all aspects of the support system.',
    disableBeacon: true,
  },
  {
    target: '.tickets-section',
    content: 'Here you can view and manage all support tickets across your organization.',
  },
  {
    target: '.analytics-section',
    content: 'Monitor the performance of your support team with detailed analytics.',
  },
  {
    target: '.user-management',
    content: 'Add, remove, or modify user accounts and permissions from here.',
  },
  {
    target: '.ai-providers',
    content: 'Configure AI providers that power the intelligent features of the system.',
  },
  {
    target: '.knowledge-base',
    content: 'Manage your knowledge base documents to improve customer self-service.',
  },
  {
    target: '.profile-menu',
    content: 'Access your profile settings and preferences here.',
  },
];

export const supportTourSteps: Step[] = [
  {
    target: '.support-dashboard',
    content: 'Welcome to the Support Dashboard! Here you can manage customer tickets and inquiries.',
    disableBeacon: true,
  },
  {
    target: '.active-tickets',
    content: 'View and respond to tickets assigned to you.',
  },
  {
    target: '.search-box',
    content: 'Quickly search for tickets by ID, customer name, or keywords.',
  },
  {
    target: '.knowledge-search',
    content: 'Find relevant knowledge base articles to help resolve customer issues faster.',
  },
  {
    target: '.profile-menu',
    content: 'Access your profile settings and preferences here.',
  },
];

export const userTourSteps: Step[] = [
  {
    target: '.user-dashboard',
    content: 'Welcome to your Support Portal! Here you can manage your support requests.',
    disableBeacon: true,
  },
  {
    target: '.create-ticket',
    content: 'Click here to create a new support ticket.',
  },
  {
    target: '.my-tickets',
    content: 'View all your existing support tickets and their status.',
  },
  {
    target: '.help-center',
    content: 'Browse our knowledge base for self-help articles and guides.',
  },
  {
    target: '.profile-menu',
    content: 'Access your profile settings and preferences here.',
  },
];

// Custom hook for managing onboarding tour
export const useOnboardingTour = (userRole: string) => {
  // Store whether the tour has been completed
  const [hasTourCompleted, setHasTourCompleted] = useLocalStorage(
    `${userRole}-tour-completed`, 
    false
  );
  
  // Controls if the tour is running
  const [isTourRunning, setIsTourRunning] = useState<boolean>(false);
  
  // Step index
  const [stepIndex, setStepIndex] = useState<number>(0);
  
  // Get the appropriate steps based on user role
  const getTourSteps = () => {
    switch (userRole) {
      case 'administrator':
        return adminTourSteps;
      case 'support_engineer':
        return supportTourSteps;
      case 'user':
        return userTourSteps;
      default:
        return adminTourSteps;
    }
  };
  
  const { toast } = useToast();
  
  // Initialize tour for new users
  useEffect(() => {
    if (!hasTourCompleted) {
      // Delay starting the tour to ensure UI is fully loaded
      const timer = setTimeout(() => {
        setIsTourRunning(true);
        toast({
          title: 'Welcome to your guided tour!',
          description: 'Let us show you around the interface.',
        });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [hasTourCompleted, toast]);
  
  // Handle tour callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    
    if (type === 'step:after' && action === 'next') {
      // Update step index
      setStepIndex(index + 1);
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Tour was finished or skipped
      setIsTourRunning(false);
      setHasTourCompleted(true);
      
      if (status === STATUS.FINISHED) {
        toast({
          title: 'Tour completed!',
          description: 'You can restart the tour anytime from your profile settings.',
        });
      }
    }
  };
  
  // Start the tour manually
  const startTour = () => {
    setStepIndex(0);
    setIsTourRunning(true);
    toast({
      title: 'Starting guided tour',
      description: 'Follow along to learn about key features.',
    });
  };
  
  // Reset the tour (mark as not completed)
  const resetTour = () => {
    setHasTourCompleted(false);
    setStepIndex(0);
    toast({
      title: 'Tour reset',
      description: 'The tour will start the next time you log in.',
    });
  };
  
  return {
    isTourRunning,
    stepIndex,
    tourSteps: getTourSteps(),
    handleJoyrideCallback,
    startTour,
    resetTour,
    hasTourCompleted,
  };
};

// Additional hook for local storage
export const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void] => {
  // Get from local storage then parse stored json or return initialValue
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };
  
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);
  
  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  // Listen for changes to this local storage key in other documents
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key]);
  
  return [storedValue, setValue];
};