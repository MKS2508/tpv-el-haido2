/**
 * ReviewStep — step 5 del wizard. Resumen de los choices del user antes
 * de instalar. Botones "Atrás" + "Instalar". El user puede volver a
 * cualquier step previo con `machine.goto(step)` (futuro: links clickables,
 * TR-19.C MVP solo prev step).
 *
 * El state machine persiste installOptions, así que al volver y forward
 * otra vez no se pierden selecciones.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { StepContainer } from '../components/StepContainer';
import { DEFAULT_INSTALL_OPTIONS } from '../contracts';
import type { InstallerStrings } from '../i18n/es';
import type { WizardMachine } from '../state/machine';

interface ReviewStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
}

export function ReviewStep(props: ReviewStepProps) {
  const opts = () => props.machine.state().installOptions;
  const yesNo = (v: boolean | undefined) => (v === false ? props.t.review.no : props.t.review.yes);

  return (
    <StepContainer step="review" title={props.t.review.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.review.heading}</CardTitle>
          <CardDescription>{props.t.review.description}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <dl class="divide-y divide-border rounded-md border border-input">
            <div class="flex justify-between gap-4 p-3 text-sm">
              <dt class="text-muted-foreground">{props.t.review.summaryPath}</dt>
              <dd class="text-right font-mono text-xs">
                {opts().installPath ?? DEFAULT_INSTALL_OPTIONS.installPath}
              </dd>
            </div>
            <div class="flex justify-between gap-4 p-3 text-sm">
              <dt class="text-muted-foreground">{props.t.review.summaryDesktop}</dt>
              <dd class="font-medium">{yesNo(opts().createDesktopEntry)}</dd>
            </div>
            <div class="flex justify-between gap-4 p-3 text-sm">
              <dt class="text-muted-foreground">{props.t.review.summaryIcon}</dt>
              <dd class="font-medium">{yesNo(opts().installIcon)}</dd>
            </div>
            <div class="flex justify-between gap-4 p-3 text-sm">
              <dt class="text-muted-foreground">{props.t.review.summaryPathSymlink}</dt>
              <dd class="font-medium">{yesNo(opts().addToPath)}</dd>
            </div>
            <div class="flex justify-between gap-4 p-3 text-sm">
              <dt class="text-muted-foreground">{props.t.review.summaryLanguage}</dt>
              <dd class="font-medium uppercase">{opts().language ?? 'es'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div class="flex justify-between gap-2">
        <Button variant="outline" onClick={() => props.machine.back()}>
          {props.t.common.back}
        </Button>
        <Button onClick={() => props.machine.next()}>{props.t.review.install}</Button>
      </div>
    </StepContainer>
  );
}

export default ReviewStep;
