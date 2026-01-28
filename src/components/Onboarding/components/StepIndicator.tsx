import { For, Show } from 'solid-js';
import { CheckIcon } from 'lucide-solid';
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

export function StepIndicator(props: StepIndicatorProps) {
  const currentIndex = () => ONBOARDING_STEPS.indexOf(props.currentStep);

  return (
    <div class="w-full px-4 py-6">
      <div class="flex items-center justify-between">
        <For each={ONBOARDING_STEPS}>
          {(step, index) => {
            const isCompleted = () => props.completedSteps.includes(step);
            const isSkipped = () => (props.skippedSteps ?? []).includes(step);
            const isCurrent = () => step === props.currentStep;
            const isPast = () => index() < currentIndex();

            return (
              <div class="flex flex-1 items-center">
                {/* Step circle */}
                <div class="flex flex-col items-center">
                  <div
                    class={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                      isCurrent() && 'border-primary bg-primary text-primary-foreground',
                      isCompleted() && !isCurrent() && 'border-primary bg-primary text-primary-foreground',
                      isSkipped() && !isCurrent() && 'border-muted-foreground bg-muted text-muted-foreground',
                      !isCurrent() && !isCompleted() && !isSkipped() && 'border-muted-foreground bg-background text-muted-foreground'
                    )}
                  >
                    <Show
                      when={isCompleted() && !isCurrent()}
                      fallback={<span class="text-sm font-medium">{index() + 1}</span>}
                    >
                      <CheckIcon class="h-5 w-5" />
                    </Show>
                  </div>
                  <span
                    class={cn(
                      'mt-2 text-xs font-medium hidden sm:block',
                      isCurrent() && 'text-foreground',
                      !isCurrent() && 'text-muted-foreground'
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
                {/* Connector line */}
                <Show when={index() < ONBOARDING_STEPS.length - 1}>
                  <div
                    class={cn(
                      'h-0.5 flex-1 mx-2',
                      isPast() || isCompleted() ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default StepIndicator;
