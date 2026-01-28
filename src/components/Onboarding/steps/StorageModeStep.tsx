import { CloudIcon, DatabaseIcon, HardDriveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StorageMode } from '@/services/storage-adapter.interface';

interface StorageModeStepProps {
  onNext: () => void;
  onBack: () => void;
  selectedMode: StorageMode | null;
  onSelectMode: (mode: StorageMode) => void;
}

export function StorageModeStep({
  onNext,
  onBack,
  selectedMode,
  onSelectMode,
}: StorageModeStepProps) {
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
      description: 'Conecta con un servidor centralizado para sincronizar datos entre dispositivos.',
      icon: CloudIcon,
    },
    {
      id: 'indexeddb' as StorageMode,
      title: 'IndexedDB',
      description: 'Almacenamiento nativo del navegador. Sencillo pero limitado al navegador actual.',
      icon: DatabaseIcon,
    },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Modo de Almacenamiento</CardTitle>
        <CardDescription>
          Elige como quieres guardar tus datos. Puedes cambiar esto mas tarde en la configuracion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:bg-accent',
                selectedMode === mode.id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'mt-1 p-2 rounded-md',
                  selectedMode === mode.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <mode.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{mode.title}</span>
                  {mode.recommended && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Anterior
        </Button>
        <Button onClick={onNext} disabled={!selectedMode}>
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
}

export default StorageModeStep;
