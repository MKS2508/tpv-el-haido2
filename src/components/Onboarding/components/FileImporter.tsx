import { ok } from '@mks2508/no-throw';
import { FileIcon, UploadIcon, XIcon } from 'lucide-solid';
import { createMemo, createSignal, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { getImportDataCounts } from '@/lib/onboarding-utils';
import { createOperationStateSignal } from '@/lib/state-helpers';
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
  const importOp = createOperationStateSignal<void>();
  let inputRef: HTMLInputElement | undefined;

  const isLoading = createMemo(() => importOp.state().status === 'pending');
  const importError = createMemo(() => {
    const s = importOp.state();
    return s.status === 'failed' ? s.error.message : null;
  });

  const processFile = (file: File) =>
    importOp.execute(async () => {
      if (!file.name.endsWith('.json')) {
        throw new Error('Solo se permiten archivos JSON');
      }
      const success = await props.onFileSelect(file);
      if (!success) {
        throw new Error('Error al procesar el archivo. Verifica el formato.');
      }
      return ok(undefined);
    });

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

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    await processFile(files[0]);
  };

  const handleFileInput = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    await processFile(files[0]);
    target.value = '';
  };

  const handleClear = () => {
    importOp.reset();
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
          <button
            type="button"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            class={cn(
              'relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
              isDragging()
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              isLoading() && 'opacity-50 pointer-events-none'
            )}
          >
            <UploadIcon
              class={cn('h-10 w-10', isDragging() ? 'text-primary' : 'text-muted-foreground')}
            />
            <div class="text-center">
              <p class="font-medium">
                {isLoading() ? 'Procesando...' : 'Arrastra un archivo JSON aqui'}
              </p>
              <p class="text-sm text-muted-foreground">o haz clic para seleccionar</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={props.accept ?? '.json'}
              onInput={handleFileInput}
              class="hidden"
              disabled={isLoading()}
            />
          </button>
          <Show when={importError()}>
            <p class="text-sm text-destructive text-center">{importError()}</p>
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
