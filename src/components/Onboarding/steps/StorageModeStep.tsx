import { CloudIcon, DatabaseIcon, HardDriveIcon } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StorageMode } from '@/services/storage-adapter.interface';

interface StorageModeStepProps {
  onNext: () => void;
  onBack: () => void;
  selectedMode: StorageMode | null;
  onSelectMode: (mode: StorageMode) => void;
}

export function StorageModeStep(props: StorageModeStepProps) {
  const modes = [
    {
      id: 'sqlite' as StorageMode,
      title: 'SQLite (Recomendado)',
      description: 'Almacenamiento local persistente y rapido. Ideal para la mayoria de casos.',
      icon: HardDriveIcon,
      recommended: true,
    },
    {
      id: 'http' as StorageMode,
      title: 'HTTP API',
      description:
        'Conecta con un servidor centralizado para sincronizar datos entre dispositivos.',
      icon: CloudIcon,
    },
    {
      id: 'indexeddb' as StorageMode,
      title: 'IndexedDB',
      description:
        'Almacenamiento nativo del navegador. Sencillo pero limitado al navegador actual.',
      icon: DatabaseIcon,
    },
  ];

  return (
    <Card class="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle class="text-2xl">Modo de Almacenamiento</CardTitle>
        <CardDescription>
          Elige como quieres guardar tus datos. Puedes cambiar esto mas tarde en la configuracion.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4">
          <For each={modes}>
            {(mode) => (
              <button
                type="button"
                onClick={() => props.onSelectMode(mode.id)}
                class={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:bg-accent',
                  props.selectedMode === mode.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground'
                )}
              >
                <div
                  class={cn(
                    'mt-1 p-2 rounded-md',
                    props.selectedMode === mode.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <mode.icon class="h-5 w-5" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">{mode.title}</span>
                    <Show when={mode.recommended}>
                      <span class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Recomendado
                      </span>
                    </Show>
                  </div>
                  <p class="text-sm text-muted-foreground mt-1">{mode.description}</p>
                </div>
              </button>
            )}
          </For>
        </div>
      </CardContent>
      <CardFooter class="flex justify-between">
        <Button variant="outline" onClick={props.onBack}>
          Anterior
        </Button>
        <Button onClick={props.onNext} disabled={!props.selectedMode}>
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
}

export default StorageModeStep;
