import { AlertCircle, CheckCircle2, Clock, Download, RefreshCw, X } from 'lucide-solid';
import { onCleanup, onMount, Show } from 'solid-js';
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
  onMount(() => {
    if (!autoCheck()) return;

    updater.checkForUpdates();

    const interval = setInterval(() => {
      updater.checkForUpdates();
    }, checkInterval());

    onCleanup(() => clearInterval(interval));
  });

  const progressPercent = () =>
    updater.progress()?.contentLength
      ? Math.round((updater.progress()!.downloaded / updater.progress()!.contentLength!) * 100)
      : 0;

  const handleRetryNow = async () => {
    const available = await updater.checkForUpdates();
    if (available) {
      await updater.downloadAndInstall();
    } else {
      updater.dismissPendingUpdate();
    }
  };

  return (
    <>
      <Dialog open={updater.available()} onOpenChange={(open) => !open && updater.dismissUpdate()}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Download class="h-5 w-5 text-primary" />
              Nueva actualización disponible
            </DialogTitle>
            <DialogDescription>
              Versión {updater.version()} está disponible para descargar.
            </DialogDescription>
          </DialogHeader>

          <Show when={updater.notes()}>
            <div class="max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-sm">
              <p class="font-medium mb-1">Novedades:</p>
              <p class="text-muted-foreground whitespace-pre-wrap">{updater.notes()}</p>
            </div>
          </Show>

          <Show when={updater.downloading() && updater.progress()}>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Descargando...</span>
                <span>{progressPercent()}%</span>
              </div>
              <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent()}%` }}
                />
              </div>
              <Show when={updater.progress()?.contentLength}>
                <p class="text-xs text-muted-foreground text-center">
                  {(updater.progress()!.downloaded / 1024 / 1024).toFixed(1)} MB /{' '}
                  {(updater.progress()!.contentLength! / 1024 / 1024).toFixed(1)} MB
                </p>
              </Show>
            </div>
          </Show>

          <Show when={updater.error()}>
            <div class="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle class="h-4 w-4" />
              <span>{updater.error()}</span>
            </div>
          </Show>

          <DialogFooter class="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={updater.dismissUpdate}
              disabled={updater.downloading()}
            >
              <X class="h-4 w-4 mr-2" />
              Más tarde
            </Button>
            <Button onClick={updater.downloadAndInstall} disabled={updater.downloading()}>
              <Show
                when={updater.downloading()}
                fallback={
                  <>
                    <CheckCircle2 class="h-4 w-4 mr-2" />
                    Actualizar ahora
                  </>
                }
              >
                <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
                Instalando...
              </Show>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={updater.hasDeferredUpdate()}
        onOpenChange={(open) => !open && updater.dismissPendingUpdate()}
      >
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Clock class="h-5 w-5 text-amber-500" />
              Actualización pendiente
            </DialogTitle>
            <DialogDescription>
              Versión {updater.pendingUpdate()?.version} está descargada y esperando para
              instalarse.
            </DialogDescription>
          </DialogHeader>

          <div class="rounded-md bg-muted p-3 text-sm space-y-1">
            <p class="font-medium">Motivo del aplazamiento:</p>
            <p class="text-muted-foreground">{updater.pendingUpdate()?.reason}</p>
            <p class="text-xs text-muted-foreground pt-2">
              Se aplicará automáticamente cuando no haya pedidos en pantalla y la caja esté
              inactiva.
            </p>
          </div>

          <DialogFooter class="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={updater.dismissPendingUpdate}
              disabled={updater.downloading()}
            >
              <X class="h-4 w-4 mr-2" />
              Recordar más tarde
            </Button>
            <Button onClick={handleRetryNow} disabled={updater.downloading()}>
              <Show
                when={!updater.downloading()}
                fallback={
                  <>
                    <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
                    Reintentando…
                  </>
                }
              >
                <CheckCircle2 class="h-4 w-4 mr-2" />
                Reintentar ahora
              </Show>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Manual check button component for settings
export function UpdateCheckButton() {
  const updater = useUpdater();

  return (
    <Button
      variant="outline"
      onClick={updater.checkForUpdates}
      disabled={updater.checking()}
      class="w-full"
    >
      <Show
        when={!updater.checking()}
        fallback={
          <>
            <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
            Buscando actualizaciones...
          </>
        }
      >
        <Show
          when={!updater.available()}
          fallback={
            <>
              <Download class="h-4 w-4 mr-2 text-primary" />
              Actualización disponible
            </>
          }
        >
          <Show
            when={!updater.error()}
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
        </Show>
      </Show>
    </Button>
  );
}

export default UpdateChecker;
