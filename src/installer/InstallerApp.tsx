/**
 * InstallerApp — entrypoint UI del installer mode (sidecar wizard).
 *
 * Arquitectura sidecar (ver docs/decisions/r7-tpv-sidecar-installer-2026-08-22.md):
 *  - El binario del TPV detecta el flag `--install` en main.rs (gate en TR-19.A.2)
 *  - Si está, monta <InstallerApp /> en vez de <App /> (POS normal)
 *
 * TR-19.A: solo WelcomeStep. TR-19.C: state machine + 6 steps restantes
 * (download → path → components → review → install → done) +
 * InstallerApp.tsx Switch sobre `machine.state().step`.
 *
 * Theme: reusa `useAppTheme()` del TPV (12 temas). El installer hereda
 * automáticamente el look & feel del POS — sin design system paralelo.
 */

import { Match, Switch } from 'solid-js';

import { useAppTheme } from '@/lib/theme-context';

import { en } from './i18n/en';
import type { InstallerStrings } from './i18n/es';
import { es } from './i18n/es';
import { createWizardMachine, type WizardMachine } from './state/machine';
import { ComponentsStep } from './steps/ComponentsStep';
import { DoneStep } from './steps/DoneStep';
import { DownloadStep } from './steps/DownloadStep';
import { InstallStep } from './steps/InstallStep';
import { PathStep } from './steps/PathStep';
import { ReviewStep } from './steps/ReviewStep';
import { WelcomeStep } from './steps/WelcomeStep';

export interface InstallerAppProps {
  /** Lenguaje del wizard. Default: `es`. */
  language?: 'es' | 'en';
}

/**
 * Cierra la ventana del installer. TR-19.A.2 enchufa un Tauri command
 * `app.exit(0)` para salida con código 0 explícito; por ahora `window.close()`
 * es el fallback estándar.
 */
function closeWindow(): void {
  window.close();
}

export function InstallerApp(props: InstallerAppProps) {
  const appTheme = useAppTheme();
  const themeLabel = () => {
    const core = appTheme.themeManager();
    const id = appTheme.currentTheme();
    const found = core?.getAvailableThemes().find((t) => t.id === id);
    return found?.label ?? id;
  };

  // eslint-disable-next-line solid/reactivity
  const t: InstallerStrings = props.language === 'en' ? en : es;
  const machine: WizardMachine = createWizardMachine();

  return (
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      {/* Wizard step indicator (minimal — solo context del user). */}
      <header class="px-6 py-3 text-xs text-muted-foreground border-b border-border/40 flex items-center justify-between">
        <span>
          {t.app.name} — {t.app.version} 0.1.3
        </span>
        <span>theme: {themeLabel()}</span>
      </header>

      {/* Step content via Switch — cada step es self-contained, recibe machine + t. */}
      <main class="flex-1">
        <Switch fallback={<UnknownStep t={t} />}>
          <Match when={machine.currentStep() === 'welcome'}>
            <WelcomeStep t={t} onNext={() => machine.next()} onCancel={closeWindow} />
          </Match>
          <Match when={machine.currentStep() === 'download'}>
            <DownloadStep machine={machine} t={t} />
          </Match>
          <Match when={machine.currentStep() === 'path'}>
            <PathStep machine={machine} t={t} />
          </Match>
          <Match when={machine.currentStep() === 'components'}>
            <ComponentsStep machine={machine} t={t} />
          </Match>
          <Match when={machine.currentStep() === 'review'}>
            <ReviewStep machine={machine} t={t} />
          </Match>
          <Match when={machine.currentStep() === 'install'}>
            <InstallStep machine={machine} t={t} />
          </Match>
          <Match when={machine.currentStep() === 'done'}>
            <DoneStep machine={machine} t={t} onClose={closeWindow} />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

/**
 * Fallback para step desconocido (defensa contra bug en INSTALL_STEPS).
 * En producción esto debería ser imposible — INSTALL_STEPS es `as const`.
 */
function UnknownStep(_props: { t: InstallerStrings }) {
  return (
    <div class="p-6 text-sm text-muted-foreground">
      <p>Unknown wizard step — please report this bug.</p>
    </div>
  );
}

export default InstallerApp;
