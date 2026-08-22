/**
 * InstallStep — step 6 del wizard. Ejecuta la instalación:
 *  1. Subscribe a `installer:onProgress` para live progress UI
 *  2. Llama `installer:install` (TR-19.B enchufa el handler Rust real)
 *  3. Si success=true → machine.next() (auto a `done`)
 *  4. Si success=false → muestra error + botón "Cancelar" (vuelve a review)
 *
 * El log inline muestra los últimos N mensajes emitidos por el progress.
 */

import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { createContextLogger } from '@/lib/logger';

import { StepContainer } from '../components/StepContainer';
import type { InstallOptions } from '../contracts';
import type { InstallerStrings } from '../i18n/es';
import { installApp, onProgress, rollback } from '../ipc/handlers';
import type { WizardMachine } from '../state/machine';

const log = createContextLogger('installer.InstallStep');

interface InstallStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
}

const MAX_LOG_LINES = 20;

export function InstallStep(props: InstallStepProps) {
  const [running, setRunning] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);
  const [logLines, setLogLines] = createSignal<string[]>([]);

  let unsubscribe: (() => void) | undefined;

  const appendLog = (line: string) => {
    setLogLines((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
    });
  };

  onCleanup(() => {
    unsubscribe?.();
  });

  onMount(async () => {
    const options = props.machine.state().installOptions as InstallOptions;
    if (!options.installPath) {
      setErrorMsg('Missing installPath in wizard state');
      setRunning(false);
      return;
    }

    // eslint-disable-next-line solid/reactivity
    unsubscribe = onProgress((progress) => {
      props.machine.setDownloadProgress(progress);
      appendLog(progress.message || `${progress.phase} (${progress.percent}%)`);
    });

    appendLog(`${props.t.install.preparing}`);

    try {
      const result = await installApp(options);
      log.success('install completed', { success: result.success });
      props.machine.setInstallResult(result);
      // setInstallResult ya navega a 'done' si success=true.
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      log.error('installApp threw', err);
      appendLog(`ERROR: ${err.message}`);
      setErrorMsg(err.message);
      // Intentar rollback best-effort (no bloqueante).
      try {
        await rollback({
          success: false,
          error: { code: 'INSTALL_FAILED', message: err.message, recoverable: false },
        });
      } catch (rollbackErr) {
        log.warn('rollback failed', { error: String(rollbackErr) });
      }
    } finally {
      setRunning(false);
      unsubscribe?.();
      unsubscribe = undefined;
    }
  });

  const progressPct = () => props.machine.state().downloadProgress?.percent ?? 0;
  const phase = () => props.machine.state().downloadProgress?.phase;

  return (
    <StepContainer step="install" title={props.t.install.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.install.title}</CardTitle>
          <CardDescription>{errorMsg() ?? phase() ?? props.t.install.preparing}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Progress value={progressPct()} indeterminate={running() && progressPct() === 0} />

          <div class="rounded-md border border-input bg-muted/30 p-3 text-xs font-mono text-muted-foreground max-h-48 overflow-y-auto">
            <Show when={logLines().length > 0} fallback={<p class="opacity-50">…</p>}>
              <For each={logLines()}>{(line) => <div>{line}</div>}</For>
            </Show>
          </div>

          <Show when={errorMsg()}>
            <div class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p class="font-medium">{props.t.install.errorTitle}</p>
              <p class="mt-1 text-xs opacity-90">{errorMsg()}</p>
            </div>
          </Show>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-2">
        <Show
          when={running()}
          fallback={
            <Show when={errorMsg()} fallback={null}>
              <Button variant="outline" onClick={() => props.machine.goto('review')}>
                {props.t.common.back}
              </Button>
            </Show>
          }
        >
          <Button
            variant="outline"
            onClick={() => {
              // Cancel best-effort: rollback parcial + goto review.
              // eslint-disable-next-line solid/reactivity
              void rollback({ success: false }).finally(() => {
                setRunning(false);
                props.machine.goto('review');
              });
            }}
          >
            {props.t.install.cancel}
          </Button>
        </Show>
      </div>
    </StepContainer>
  );
}

export default InstallStep;
