import { createSignal, Show } from 'solid-js';
import { FileIcon, UploadIcon, XIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import { getImportDataCounts } from '@/lib/onboarding-utils';
import { cn } from '@/lib/utils';
import type { ImportData } from '@/models/Onboarding';

interface FileImporterProps {
  onFileSelect: (file: File) => Promise<boolean>;
  importedData: ImportData | null;
  onClear?: () => void;
  accept?: string;
}

export function FileImporter(props: FileImporterProps) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let inputRef: HTMLInputElement | undefined;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      setError('Solo se permiten archivos JSON');
      return;
    }

    setIsLoading(true);
    const success = await props.onFileSelect(file);
    setIsLoading(false);

    if (!success) {
      setError('Error al procesar el archivo. Verifica el formato.');
    }
  };

  const handleFileInput = async (e: Event) => {
    setError(null);
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsLoading(true);
    const success = await props.onFileSelect(file);
    setIsLoading(false);

    if (!success) {
      setError('Error al procesar el archivo. Verifica el formato.');
    }

    target.value = '';
  };

  const handleClear = () => {
    setError(null);
    props.onClear?.();
  };

  const handleClick = () => {
    inputRef?.click();
  };

  return (
    <Show
      when={props.importedData}
      fallback={
        <div class="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            class={cn(
              'relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
              isDragging() ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              isLoading() && 'opacity-50 pointer-events-none'
            )}
          >
            <UploadIcon class={cn('h-10 w-10', isDragging() ? 'text-primary' : 'text-muted-foreground')} />
            <div class="text-center">
              <p class="font-medium">
                {isLoading() ? 'Procesando...' : 'Arrastra un archivo JSON aqui'}
              </p>
              <p class="text-sm text-muted-foreground">
                o haz clic para seleccionar
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={props.accept ?? '.json'}
              onInput={handleFileInput}
              class="hidden"
              disabled={isLoading()}
            />
          </div>
          <Show when={error()}>
            <p class="text-sm text-destructive text-center">{error()}</p>
          </Show>
        </div>
      }
    >
      {(importedData) => {
        const counts = getImportDataCounts(importedData());

        return (
          <div class="border rounded-lg p-4 bg-muted/50">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <FileIcon class="h-5 w-5 text-primary" />
                <span class="font-medium">Datos importados</span>
              </div>
              <Show when={props.onClear}>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <XIcon class="h-4 w-4" />
                </Button>
              </Show>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex justify-between p-2 bg-background rounded">
                <span class="text-muted-foreground">Productos:</span>
                <span class="font-medium">{counts.products}</span>
              </div>
              <div class="flex justify-between p-2 bg-background rounded">
                <span class="text-muted-foreground">Categorias:</span>
                <span class="font-medium">{counts.categories}</span>
              </div>
              <Show when={counts.tables > 0}>
                <div class="flex justify-between p-2 bg-background rounded">
                  <span class="text-muted-foreground">Mesas:</span>
                  <span class="font-medium">{counts.tables}</span>
                </div>
              </Show>
              <Show when={counts.users > 0}>
                <div class="flex justify-between p-2 bg-background rounded">
                  <span class="text-muted-foreground">Usuarios:</span>
                  <span class="font-medium">{counts.users}</span>
                </div>
              </Show>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

export default FileImporter;
