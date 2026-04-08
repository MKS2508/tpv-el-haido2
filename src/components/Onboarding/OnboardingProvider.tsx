import { createContext, type JSX, useContext } from 'solid-js';
import { useOnboarding } from '@/hooks/useOnboarding';

type OnboardingContextType = ReturnType<typeof useOnboarding>;

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: JSX.Element;
}

export function OnboardingProvider(props: OnboardingProviderProps) {
  const onboarding = useOnboarding();

  return (
    <OnboardingContext.Provider value={onboarding}>{props.children}</OnboardingContext.Provider>
  );
}

export function useOnboardingContext(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

export default OnboardingProvider;
