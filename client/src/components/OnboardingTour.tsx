import React from 'react';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/use-onboarding-tour';

interface OnboardingTourProps {
  userRole: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ userRole }) => {
  const {
    isTourRunning,
    stepIndex,
    tourSteps,
    handleJoyrideCallback,
  } = useOnboardingTour(userRole);

  return (
    <Joyride
      callback={(data: CallBackProps) => handleJoyrideCallback(data)}
      continuous
      hideCloseButton
      run={isTourRunning}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      steps={tourSteps}
      styles={{
        options: {
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          width: 300,
          zIndex: 10000,
        },
        buttonClose: {
          display: 'none',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          fontSize: 14,
        },
        buttonBack: {
          color: 'hsl(var(--primary))',
          marginRight: 10,
          fontSize: 14,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: 14,
        },
        spotlight: {
          backgroundColor: 'transparent',
        },
        tooltip: {
          borderRadius: 'var(--radius)',
          fontSize: 14,
        },
      }}
    />
  );
};

export default OnboardingTour;