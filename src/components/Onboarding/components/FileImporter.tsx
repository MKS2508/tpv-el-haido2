import { createMemo, createSignal } from 'solid-js';
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

export function FileImporter({
  onFileSelect,
  importedData,
  onClear,
  accept = '.json',
}: FileImporterProps) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      if (!file.name.endsWith('.json')) {
        setError('Solo se permiten archivos JSON');
        return;
      }

      setIsLoading(true);
      const success = await onFileSelect(file);
      setIsLoading(false);

      if (!success) {
        setError('Error al procesar el archivo. Verifica el formato.');
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      setIsLoading(true);
      const success = await onFileSelect(file);
      setIsLoading(false);

      if (!success) {
        setError('Error al procesar el archivo. Verifica el formato.');
      }

      e.currentTarget.value = '';
    },
    [onFileSelect]
  );

  const handleClear = useCallback(() => {
    setError(null);
    onClear?.();
  }, [onClear]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (importedData) {
    const counts = getImportDataCounts(importedData);

    return (
      <div class="border rounded-lg p-4 bg-muted/50">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <FileIcon class="h-5 w-5 text-primary" />
            <span class="font-medium">Datos importados</span>
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <XIcon class="h-4 w-4" />
            </Button>
          )}
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
          {counts.tables > 0 && (
            <div class="flex justify-between p-2 bg-background rounded">
              <span class="text-muted-foreground">Mesas:</span>
              <span class="font-medium">{counts.tables}</span>
            </div>
          )}
          {counts.users > 0 && (
            <div class="flex justify-between p-2 bg-background rounded">
              <span class="text-muted-foreground">Usuarios:</span>
              <span class="font-medium">{counts.users}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
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
          accept={accept}
          onInput={handleFileInput}
          class="hidden"
          disabled={isLoading()}
        />
      </div>
      {error() && (
        <p class="text-sm text-destructive text-center">{error()}</p>
      )}
    </div>
  );
}

export default FileImporter;
