/**
 * ComponentsStep — step 4 del wizard. Tres checkboxes para componentes
 * opcionales de integración desktop. Avanza a `review`.
 *
 * Defaults del contract (DEFAULT_INSTALL_OPTIONS):
 *  - createDesktopEntry: true
 *  - installIcon: true
 *  - addToPath: true
 *
 * Cada toggle escribe via `machine.setOptions({...})` — si el user vuelve
 * atrás desde review, los valores persistidos se preservan.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { StepContainer } from '../components/StepContainer';
import type { InstallerStrings } from '../i18n/es';
import type { WizardMachine } from '../state/machine';

interface ComponentsStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
}

export function ComponentsStep(props: ComponentsStepProps) {
  const opts = () => props.machine.state().installOptions;

  return (
    <StepContainer step="components" title={props.t.components.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.components.heading}</CardTitle>
          <CardDescription>{props.t.components.description}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between gap-4 rounded-md border border-input p-3">
            <div class="flex-1 space-y-1">
              <p class="text-sm font-medium leading-none">{props.t.components.desktopEntry}</p>
            </div>
            <Switch
              checked={opts().createDesktopEntry ?? true}
              onChange={(v) => props.machine.setOptions({ createDesktopEntry: v })}
            />
          </div>

          <div class="flex items-center justify-between gap-4 rounded-md border border-input p-3">
            <div class="flex-1 space-y-1">
              <p class="text-sm font-medium leading-none">{props.t.components.icon}</p>
            </div>
            <Switch
              checked={opts().installIcon ?? true}
              onChange={(v) => props.machine.setOptions({ installIcon: v })}
            />
          </div>

          <div class="flex items-center justify-between gap-4 rounded-md border border-input p-3">
            <div class="flex-1 space-y-1">
              <p class="text-sm font-medium leading-none">{props.t.components.addToPath}</p>
            </div>
            <Switch
              checked={opts().addToPath ?? true}
              onChange={(v) => props.machine.setOptions({ addToPath: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-between gap-2">
        <Button variant="outline" onClick={() => props.machine.back()}>
          {props.t.common.back}
        </Button>
        <Button onClick={() => props.machine.next()}>{props.t.common.next}</Button>
      </div>
    </StepContainer>
  );
}

export default ComponentsStep;
