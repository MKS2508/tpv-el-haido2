import { FileIcon, UploadIcon, XIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      e.target.value = '';
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
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-primary" />
            <span className="font-medium">Datos importados</span>
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Productos:</span>
            <span className="font-medium">{counts.products}</span>
          </div>
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Categorias:</span>
            <span className="font-medium">{counts.categories}</span>
          </div>
          {counts.tables > 0 && (
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-muted-foreground">Mesas:</span>
              <span className="font-medium">{counts.tables}</span>
            </div>
          )}
          {counts.users > 0 && (
            <div className="flex justify-between p-2 bg-background rounded">
              <span className="text-muted-foreground">Usuarios:</span>
              <span className="font-medium">{counts.users}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isLoading && 'opacity-50 pointer-events-none'
        )}
      >
        <UploadIcon className={cn('h-10 w-10', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-center">
          <p className="font-medium">
            {isLoading ? 'Procesando...' : 'Arrastra un archivo JSON aqui'}
          </p>
          <p className="text-sm text-muted-foreground">
            o haz clic para seleccionar
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}

export default FileImporter;
