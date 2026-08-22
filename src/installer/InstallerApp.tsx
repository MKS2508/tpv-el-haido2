/**
 * InstallerApp — entrypoint UI del installer mode (sidecar wizard).
 *
 * Arquitectura sidecar (ver docs/decisions/r7-tpv-sidecar-installer-2026-08-22.md):
 *  - El binario del TPV detecta el flag `--install` en main.rs (gate en TR-19.A.2)
 *  - Si está, monta <InstallerApp /> en vez de <App /> (POS normal)
 *  - TR-19.A NO toca main.rs (alto blast radius, separado)
 *
 * TR-19.A solo implementa Welcome step. TR-19.C agrega los 6 steps restantes
 * (download → path → components → review → install → done).
 */

import { useAppTheme } from '@/lib/theme-context';
import { StepContainer } from './components/StepContainer';
import { en } from './i18n/en';
import type { InstallerStrings } from './i18n/es';
import { es } from './i18n/es';
import { WelcomeStep } from './steps/WelcomeStep';

export interface InstallerAppProps {
  /** Lenguaje del wizard. Default: `es`. TR-19.A detecta de env o flag (futuro). */
  language?: 'es' | 'en';
}

/**
 * Cierra la ventana del installer. TR-19.A usa `window.close()` como stub;
 * TR-19.A.2 enchufa un Tauri command `app.exit(0)` para que el binario salga
 * con código 0 explícito (revisable desde CI / wrapper bash).
 */
function closeWindow(): void {
  // TODO(TR-19.A.2): reemplazar por `await invoke('app:exit')` cuando se
  // gate el modo installer en main.rs. Por ahora `window.close()` es el
  // fallback estándar y suficiente para el smoke test.
  window.close();
}

/**
 * Handler del botón "Siguiente" en Welcome step.
 * TR-19.A: log placeholder (smoke test del componente).
 * TR-19.C: navega al step `download`.
 */
function handleNext(): void {
  // eslint-disable-next-line no-console
  console.log('[TR-19.A smoke test] Welcome → next step placeholder (TR-19.C wires navigation)');
}

export function InstallerApp(props: InstallerAppProps) {
  // Hook de theme del TPV — reusa el sistema activo (12 temas disponibles).
  // Si no hay provider arriba (caso edge del smoke test), useAppTheme() tira.
  const appTheme = useAppTheme();
  const themeLabel = () => {
    const core = appTheme.themeManager();
    const id = appTheme.currentTheme();
    const found = core?.getAvailableThemes().find((t) => t.id === id);
    return found?.label ?? id;
  };

  const t: InstallerStrings = props.language === 'en' ? en : es;

  return (
    <StepContainer
      step="welcome"
      title={t.welcome.title}
      footer={
        <div class="px-6 pb-6 pt-0 text-xs text-muted-foreground">
          {t.app.name} — {t.app.version} 0.1.3 · theme: {themeLabel()}
        </div>
      }
    >
      <WelcomeStep t={t} onNext={handleNext} onCancel={closeWindow} />
    </StepContainer>
  );
}

export default InstallerApp;
