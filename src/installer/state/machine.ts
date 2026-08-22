/**
 * Wizard state machine — navegación reactiva entre los 7 steps del installer.
 *
 * TR-19.C: signal-based, sin Solid `createStore` porque el state del wizard
 * es chico (un step + un bag de options + progress + result). `createStore`
 * agregaría overhead conceptual sin beneficio. Si crece, migrar.
 *
 * Single source of truth para:
 *  - `step`: InstallStep actual (welcome → ... → done)
 *  - `installOptions`: parcial acumulado a medida que el user avanza
 *  - `downloadProgress`: InstallProgress live (downloading / verifying / extracting)
 *  - `installResult`: InstallResult al finalizar installApp()
 *
 * Consumido por:
 *  - <InstallerApp /> (Switch sobre step)
 *  - Cada step component lee `state()` y llama acciones (`next`, `back`,
 *    `setOptions`, `setDownloadProgress`, `setInstallResult`, `reset`)
 */

import { type Accessor, createSignal } from 'solid-js';
import {
  DEFAULT_INSTALL_OPTIONS,
  INSTALL_STEPS,
  type InstallOptions,
  type InstallProgress,
  type InstallResult,
  type InstallStep,
} from '../contracts';

export interface WizardState {
  step: InstallStep;
  installOptions: Partial<InstallOptions>;
  downloadProgress?: InstallProgress;
  installResult?: InstallResult;
}

export interface WizardMachine {
  /** Reactive accessor del state completo. Leer dentro de effects/JSX. */
  state: Accessor<WizardState>;
  /** Step actual (helper reactivo sobre `state().step`). */
  currentStep: Accessor<InstallStep>;
  /** Avanza al siguiente step en INSTALL_STEPS. No-op si ya está en `done`. */
  next: () => void;
  /** Retrocede al step anterior. No-op si ya está en `welcome`. */
  back: () => void;
  /** Salta a un step arbitrario (e.g., desde Review para editar path). */
  goto: (step: InstallStep) => void;
  /** Merge de options parciales sobre el bag acumulado. */
  setOptions: (options: Partial<InstallOptions>) => void;
  /** Update del download progress (downloading / verifying / extracting). */
  setDownloadProgress: (progress: InstallProgress) => void;
  /** Setea result y, si success=true, avanza a `done`. */
  setInstallResult: (result: InstallResult) => void;
  /** Reset al welcome step con defaults limpios. */
  reset: () => void;
}

function initialState(): WizardState {
  return {
    step: 'welcome',
    installOptions: { ...DEFAULT_INSTALL_OPTIONS },
  };
}

/**
 * Crea una instancia de WizardMachine. Cada <InstallerApp /> monta la suya
 * (single-instance per window, pero el factory es stateless).
 */
export function createWizardMachine(): WizardMachine {
  const [state, setState] = createSignal<WizardState>(initialState());

  const idxOf = (step: InstallStep): number => INSTALL_STEPS.indexOf(step);

  return {
    state,
    currentStep: () => state().step,

    next() {
      const idx = idxOf(state().step);
      if (idx >= 0 && idx < INSTALL_STEPS.length - 1) {
        setState((prev) => ({ ...prev, step: INSTALL_STEPS[idx + 1] }));
      }
    },

    back() {
      const idx = idxOf(state().step);
      if (idx > 0) {
        setState((prev) => ({ ...prev, step: INSTALL_STEPS[idx - 1] }));
      }
    },

    goto(step) {
      if (INSTALL_STEPS.includes(step)) {
        setState((prev) => ({ ...prev, step }));
      }
    },

    setOptions(options) {
      setState((prev) => ({
        ...prev,
        installOptions: { ...prev.installOptions, ...options },
      }));
    },

    setDownloadProgress(progress) {
      setState((prev) => ({ ...prev, downloadProgress: progress }));
    },

    setInstallResult(result) {
      setState((prev) => ({
        ...prev,
        installResult: result,
        step: result.success ? 'done' : prev.step,
      }));
    },

    reset() {
      setState(initialState());
    },
  };
}
