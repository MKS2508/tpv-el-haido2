/**
 * WelcomeStep — único step funcional en TR-19.A.
 *
 * Smoke test del installer mode:
 *  - Renderiza title + description localizados
 *  - Botón "Cancelar" cierra la ventana (window.close() como stub hasta TR-19.A.2)
 *  - Botón "Siguiente" loguea placeholder (navegación real viene en TR-19.C)
 *
 * Reusa `<Card>`/`<Button>` del TPV + StepContainer compartido.
 */

import { Button } from '@/components/ui/button';
import type { InstallerStrings } from '../i18n/es';

interface WelcomeStepProps {
  /** Strings ya localizados (es | en) */
  t: InstallerStrings;
  /** Callback del botón "Siguiente" — TR-19.A log placeholder, TR-19.C navega a download */
  onNext: () => void;
  /** Callback del botón "Cancelar" — cierra ventana */
  onCancel: () => void;
}

export function WelcomeStep(props: WelcomeStepProps) {
  return (
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">{props.t.welcome.description}</p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" onClick={() => props.onCancel()}>
          {props.t.welcome.cancel}
        </Button>
        <Button onClick={() => props.onNext()}>{props.t.welcome.next}</Button>
      </div>
    </div>
  );
}

export default WelcomeStep;
