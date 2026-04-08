import { CloudOff, Download, RefreshCw, Wifi, X } from 'lucide-solid';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { getPlatformService } from '@/services/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAStatus() {
  const [isOnline, setIsOnline] = createSignal(navigator.onLine);
  const [showOffline, setShowOffline] = createSignal(false);
  const [installPrompt, setInstallPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = createSignal(false);
  const [updateAvailable, setUpdateAvailable] = createSignal(false);

  onMount(() => {
    if (getPlatformService().isTauri()) return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    onCleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    });
  });

  const handleInstall = async () => {
    const prompt = installPrompt();
    if (!prompt) return;

    await prompt.prompt();
    const result = await prompt.userChoice;

    if (result.outcome === 'accepted') {
      console.log('[PWA] App installed');
    }

    setInstallPrompt(null);
    setShowInstall(false);
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const dismissInstall = () => setShowInstall(false);
  const dismissOffline = () => setShowOffline(false);

  if (getPlatformService().isTauri()) return null;

  return (
    <>
      <Show when={showOffline()}>
        <div class="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4">
          <div class="bg-destructive text-destructive-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
            <CloudOff class="h-5 w-5 flex-shrink-0" />
            <div class="flex-1">
              <p class="font-medium text-sm">Sin conexión</p>
              <p class="text-xs opacity-90">Los cambios se guardarán localmente</p>
            </div>
            <button type="button" onClick={dismissOffline} class="p-1 hover:bg-white/20 rounded">
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </Show>

      <Show when={showInstall() && installPrompt()}>
        <div class="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4">
          <div class="bg-card border rounded-lg shadow-lg p-4">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Download class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-sm">Instalar TPV El Haido</p>
                <p class="text-xs text-muted-foreground mt-1">
                  Accede más rápido y úsalo sin conexión
                </p>
                <div class="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall}>
                    Instalar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissInstall}>
                    Ahora no
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={updateAvailable()}>
        <div class="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4">
          <div class="bg-card border rounded-lg shadow-lg p-4">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <RefreshCw class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-sm">Actualización disponible</p>
                <p class="text-xs text-muted-foreground mt-1">
                  Hay una nueva versión de la aplicación
                </p>
                <div class="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleUpdate}>
                    Actualizar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={!isOnline()}>
        <div class="fixed top-2 right-2 z-50">
          <div class="bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Wifi class="h-3 w-3" />
            <span>Offline</span>
          </div>
        </div>
      </Show>
    </>
  );
}
