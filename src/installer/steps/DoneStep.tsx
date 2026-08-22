/**
 * DoneStep — step 7 (último) del wizard. Success screen con:
 *  - Mensaje de éxito localizado
 *  - Botón "Abrir TPV" — exec del binario instalado (TR-19.B enchufa el command real;
 *    por ahora `window.location.href = 'tauri://launch'` como fallback inerte)
 *  - Botón "Cerrar" — sale del installer
 *
 * El `InstallResult` (con finalPath + launchCommand) viene del machine state
 * seteado por InstallStep via `machine.setInstallResult()`.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createContextLogger } from '@/lib/logger';

import { StepContainer } from '../components/StepContainer';
import type { InstallerStrings } from '../i18n/es';
import type { WizardMachine } from '../state/machine';

interface DoneStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
  onClose: () => void;
}

const log = createContextLogger('DoneStep');

export function DoneStep(props: DoneStepProps) {
  const result = () => props.machine.state().installResult;
  const launchCmd = () =>
    result()?.launchCommand ?? props.machine.state().installOptions.installPath;

  const handleLaunch = () => {
    const cmd = launchCmd();
    if (!cmd) return;
    // TR-19.B enchufa el launch real (probablemente via Tauri shell command
    // `std::process::Command::new(cmd).spawn()` o similar). Por ahora
    // cerramos la ventana con la intención de que el user ejecute el comando
    // manualmente desde su shell.
    log.info('Launch command available', { cmd });
    props.onClose();
  };

  return (
    <StepContainer step="done" title={props.t.done.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.done.title}</CardTitle>
          <CardDescription>{props.t.done.successMessage}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          {launchCmd() && (
            <div class="rounded-md border border-input bg-muted/30 p-3">
              <p class="text-xs text-muted-foreground">Comando de lanzamiento:</p>
              <code class="block font-mono text-xs mt-1 break-all">{launchCmd()}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <div class="flex justify-end gap-2">
        <Button variant="outline" onClick={props.onClose}>
          {props.t.done.close}
        </Button>
        <Button onClick={handleLaunch}>{props.t.done.launch}</Button>
      </div>
    </StepContainer>
  );
}

export default DoneStep;
