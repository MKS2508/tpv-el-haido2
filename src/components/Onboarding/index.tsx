import { Motion, Presence } from '@motionone/solid';
import { Match, Switch } from 'solid-js';
import { StepIndicator } from './components/StepIndicator';
import { useOnboardingContext } from './OnboardingProvider';
import { CompleteStep } from './steps/CompleteStep';
import { CreateUsersStep } from './steps/CreateUsersStep';
import { ImportDataStep } from './steps/ImportDataStep';
import { StorageModeStep } from './steps/StorageModeStep';
import { ThemeStep } from './steps/ThemeStep';
import { WelcomeStep } from './steps/WelcomeStep';

export function Onboarding() {
  const {
    state,
    nextStep,
    previousStep,
    skipStep,
    setStorageMode,
    importFromFile,
    loadSeedData,
    applyImportedData,
    createUser,
    deleteUser,
    completeOnboarding,
  } = useOnboardingContext();

  return (
    <div class="min-h-screen bg-background flex flex-col items-center justify-start p-4 sm:p-8 relative">
      <div class="w-full max-w-4xl relative z-10 space-y-8">
        <div class="text-center space-y-2">
          <p class="text-muted-foreground">Configura tu experiencia en segundos</p>
        </div>

        <StepIndicator
          currentStep={state().currentStep}
          completedSteps={state().completedSteps}
          skippedSteps={state().skippedSteps}
        />

        <div class="relative flex items-start justify-center w-full">
          <Presence exitBeforeEnter>
            <Motion.div
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              transition={{ duration: 0.4, easing: [0.23, 1, 0.32, 1] }}
              class="w-full"
            >
              <Switch fallback={null}>
                <Match when={state().currentStep === 'welcome'}>
                  <WelcomeStep onNext={nextStep} />
                </Match>
                <Match when={state().currentStep === 'storage'}>
                  <StorageModeStep
                    onNext={nextStep}
                    onBack={previousStep}
                    selectedMode={state().selectedStorageMode}
                    onSelectMode={setStorageMode}
                  />
                </Match>
                <Match when={state().currentStep === 'import'}>
                  <ImportDataStep
                    onNext={nextStep}
                    onBack={previousStep}
                    onSkip={skipStep}
                    onFileSelect={importFromFile}
                    onLoadSeedData={loadSeedData}
                    onApplyData={applyImportedData}
                    importedData={state().importedData}
                    onClearData={() => {
                      // Note: useOnboarding doesn't have a clearImportedData action,
                      // but we can just skip or overwrite it.
                      // For now, nextStep/previousStep will handle state updates.
                    }}
                  />
                </Match>
                <Match when={state().currentStep === 'users'}>
                  <CreateUsersStep
                    onNext={nextStep}
                    onBack={previousStep}
                    users={state().createdUsers}
                    onCreateUser={createUser}
                    onDeleteUser={deleteUser}
                  />
                </Match>
                <Match when={state().currentStep === 'theme'}>
                  <ThemeStep onNext={nextStep} onBack={previousStep} onSkip={skipStep} />
                </Match>
                <Match when={state().currentStep === 'complete'}>
                  <CompleteStep state={state()} onComplete={completeOnboarding} />
                </Match>
              </Switch>
            </Motion.div>
          </Presence>
        </div>
      </div>
      <div class="mt-8 text-center text-xs text-muted-foreground opacity-50 relative z-10">
        TPV Haido &copy; {new Date().getFullYear()} - Sistema de Gestion Profesional
      </div>
    </div>
  );
}

export default Onboarding;
