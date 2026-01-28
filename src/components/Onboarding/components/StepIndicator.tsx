import { CheckIcon } from 'lucide-react';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/models/Onboarding';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps?: OnboardingStep[];
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Bienvenida',
  storage: 'Almacenamiento',
  import: 'Importar Datos',
  users: 'Usuarios',
  theme: 'Apariencia',
  complete: 'Completado',
};

export function StepIndicator({
  currentStep,
  completedSteps,
  skippedSteps = [],
}: StepIndicatorProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-between">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isSkipped = skippedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isPast = index < currentIndex;

          return (
            <div key={step} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isCompleted && !isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isSkipped && !isCurrent && 'border-muted-foreground bg-muted text-muted-foreground',
                    !isCurrent && !isCompleted && !isSkipped && 'border-muted-foreground bg-background text-muted-foreground'
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium hidden sm:block',
                    isCurrent && 'text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2',
                    isPast || isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StepIndicator;
