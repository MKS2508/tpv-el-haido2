import { AlertCircle, CheckCircle2, Download, RefreshCw, X } from 'lucide-solid';
import { Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdater } from '@/hooks/useUpdater';

interface UpdateCheckerProps {
  autoCheck?: boolean;
  checkInterval?: number; // in milliseconds
}

export function UpdateChecker(props: UpdateCheckerProps) {
  const autoCheck = () => props.autoCheck ?? true;
  const checkInterval = () => props.checkInterval ?? 60 * 60 * 1000; // 1 hour default

  const updater = useUpdater();

  // Auto-check on mount and periodically
  if (autoCheck()) {
    updater.handleCheck();
    setInterval(() => updater.handleCheck(), checkInterval());
  }

  const progressPercent = () => {
    const p = updater.progress();
    if (!p.total) return 0;
    return Math.round((p.downloaded / p.total) * 100);
  };

  const isBusy = () => ['checking', 'downloading', 'installing', 'relaunching'].includes(updater.state());
  const isDownloading = () => ['downloading', 'installing', 'relaunching'].includes(updater.state());

  return (
    <>
      {/* Main update available dialog */}
      <Dialog
        open={updater.updateAvailable()}
        onOpenChange={(open) => !open && updater.state() === 'available' && updater.handleCheck()}
      >
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Download class="h-5 w-5 text-primary" />
              Nueva actualización disponible
            </DialogTitle>
            <DialogDescription>
              Versión {updater.remoteVersion()} está disponible para descargar.
            </DialogDescription>
          </DialogHeader>

          <Show when={isDownloading()}>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">
                  {updater.state() === 'relaunching' ? 'Reiniciando...' : 'Descargando...'}
                </span>
                <span class="font-medium">{progressPercent()}%</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progressPercent()}%` }}
                />
              </div>
              <Show when={updater.progress().total > 0}>
                <p class="text-xs text-muted-foreground text-center">
                  {(updater.progress().downloaded / 1024 / 1024).toFixed(1)} MB de{' '}
                  {(updater.progress().total / 1024 / 1024).toFixed(1)} MB
                </p>
              </Show>
            </div>
          </Show>

          <Show when={updater.state() === 'error'}>
            <div class="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle class="h-4 w-4" />
              <span>{updater.error()}</span>
            </div>
          </Show>

          <Show when={updater.state() === 'installed'}>
            <div class="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 class="h-4 w-4" />
              <span>Actualización instalada — reinicia la app para aplicar los cambios</span>
            </div>
          </Show>

          <DialogFooter class="flex gap-2 sm:gap-0">
            <Show when={!isDownloading() && updater.state() !== 'installed'}>
              <Button
                variant="outline"
                onClick={() => updater.handleCheck()}
                disabled={isBusy()}
              >
                <X class="h-4 w-4 mr-2" />
                Más tarde
              </Button>
            </Show>
            <Show when={updater.updateAvailable() && !isDownloading()}>
              <Button onClick={updater.handleDownloadInstall} disabled={isBusy()}>
                <Download class="h-4 w-4 mr-2" />
                Actualizar ahora
              </Button>
            </Show>
            <Show when={isDownloading()}>
              <Button disabled>
                <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
                {updater.state() === 'relaunching' ? 'Reiniciando...' : 'Instalando...'}
              </Button>
            </Show>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Manual check button component for settings
export function UpdateCheckButton() {
  const updater = useUpdater();
  const isBusy = () => ['checking', 'downloading', 'installing', 'relaunching'].includes(updater.state());

  return (
    <Button
      variant="outline"
      onClick={updater.handleCheck}
      disabled={isBusy()}
      class="w-full"
    >
      <Show
        when={!isBusy()}
        fallback={
          <>
            <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
            Buscando actualizaciones...
          </>
        }
      >
        <Show
          when={updater.updateAvailable()}
          fallback={
            <Show
              when={updater.state() !== 'error'}
              fallback={
                <>
                  <AlertCircle class="h-4 w-4 mr-2 text-destructive" />
                  Error al buscar
                </>
              }
            >
              <RefreshCw class="h-4 w-4 mr-2" />
              Buscar actualizaciones
            </Show>
          }
        >
          <>
            <Download class="h-4 w-4 mr-2 text-primary" />
            Actualización disponible
          </>
        </Show>
      </Show>
    </Button>
  );
}

export default UpdateChecker;
