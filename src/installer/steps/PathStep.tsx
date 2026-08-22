/**
 * PathStep — step 3 del wizard. Radio entre default XDG path
 * (`~/.local/bin/tpv-el-haido`) y custom path. Avanza a `components`.
 *
 * El `installPath` que persiste el contract es la ruta completa del binario
 * (e.g., `~/.local/bin/tpv-el-haido`). El default ya viene con el binario
 * name appended en `DEFAULT_INSTALL_OPTIONS`. Si el user elige custom,
 * reemplazamos el path completo.
 */

import { createSignal, Show } from 'solid-js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { StepContainer } from '../components/StepContainer';
import { DEFAULT_INSTALL_OPTIONS } from '../contracts';
import type { InstallerStrings } from '../i18n/es';
import type { WizardMachine } from '../state/machine';

interface PathStepProps {
  machine: WizardMachine;
  t: InstallerStrings;
}

type Choice = 'default' | 'custom';

export function PathStep(props: PathStepProps) {
  // Init from machine state — si user volvió atrás desde review, preserva elección.
  // Lectura única al mount; no es necesario tracking reactivo porque el path
  // solo cambia via setOptions() en este mismo step.
  const currentPath =
    // eslint-disable-next-line solid/reactivity
    props.machine.state().installOptions.installPath ?? DEFAULT_INSTALL_OPTIONS.installPath;
  const initialChoice: Choice =
    currentPath === DEFAULT_INSTALL_OPTIONS.installPath ? 'default' : 'custom';

  const [choice, setChoice] = createSignal<Choice>(initialChoice);
  const [customPath, setCustomPath] = createSignal(currentPath);

  const handleNext = () => {
    const finalPath = choice() === 'default' ? DEFAULT_INSTALL_OPTIONS.installPath : customPath();
    props.machine.setOptions({ installPath: finalPath });
    props.machine.next();
  };

  return (
    <StepContainer step="path" title={props.t.path.title}>
      <Card>
        <CardHeader>
          <CardTitle>{props.t.path.heading}</CardTitle>
          <CardDescription>{props.t.path.description}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-3">
            <label class="flex items-start gap-3 rounded-md border border-input p-3 cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="install-path"
                value="default"
                checked={choice() === 'default'}
                onChange={() => setChoice('default')}
                class="mt-1 h-4 w-4 accent-primary"
              />
              <div class="flex-1 space-y-1">
                <div class="text-sm font-medium">{props.t.path.defaultPath}</div>
                <code class="block text-xs text-muted-foreground">
                  {DEFAULT_INSTALL_OPTIONS.installPath}
                </code>
              </div>
            </label>

            <label class="flex items-start gap-3 rounded-md border border-input p-3 cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="install-path"
                value="custom"
                checked={choice() === 'custom'}
                onChange={() => setChoice('custom')}
                class="mt-1 h-4 w-4 accent-primary"
              />
              <div class="flex-1 space-y-2">
                <Label class="text-sm font-medium">{props.t.path.customPath}</Label>
                <Show when={choice() === 'custom'}>
                  <Input
                    type="text"
                    value={customPath()}
                    onInput={(e) => setCustomPath(e.currentTarget.value)}
                    placeholder={props.t.path.customPathPlaceholder}
                    class="font-mono text-xs"
                  />
                </Show>
              </div>
            </label>
          </div>

          <p class="text-xs text-muted-foreground">{props.t.path.xdgExplanation}</p>
        </CardContent>
      </Card>

      <div class="flex justify-between gap-2">
        <Button variant="outline" onClick={() => props.machine.back()}>
          {props.t.common.back}
        </Button>
        <Button onClick={handleNext}>{props.t.common.next}</Button>
      </div>
    </StepContainer>
  );
}

export default PathStep;
