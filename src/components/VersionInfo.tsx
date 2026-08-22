import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Info,
  KeyRound,
  Lock,
  RefreshCw,
  Shield,
  User,
} from 'lucide-solid';
import { createSignal, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { useUpdater } from '@/hooks/useUpdater';
import { cn } from '@/lib/utils';
import { isTauri } from '@/services/platform';

interface VersionInfoProps {
  class?: string;
}

export function VersionInfo(props: VersionInfoProps) {
  const [currentVersion, setCurrentVersion] = createSignal<string | null>(null);
  const [lastChecked, setLastChecked] = createSignal<Date | null>(null);

  const {
    available,
    checking,
    downloading,
    error,
    progress,
    version: newVersion,
    notes,
    checkForUpdates,
    downloadAndInstall,
  } = useUpdater();

  onMount(async () => {
    if (!isTauri()) {
      setCurrentVersion('PWA 1.0.0');
      return;
    }

    try {
      // Lazy load getVersion to prevent transformCallback errors in PWA
      const { getVersion } = await import('@tauri-apps/api/app');
      const version = await getVersion();
      setCurrentVersion(version);
    } catch (_e) {
      setCurrentVersion('dev');
    }
  });

  const handleCheck = async () => {
    await checkForUpdates();
    setLastChecked(new Date());
  };

  const progressPercent = () =>
    progress()?.contentLength
      ? Math.round((progress()!.downloaded / progress()!.contentLength!) * 100)
      : 0;

  const formatLastChecked = () => {
    const date = lastChecked();
    if (!date) return null;
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Auto-check on mount
  onMount(() => {
    void handleCheck();
  });

  return (
    <div class={cn('space-y-6', props.class)}>
      {/* Header con logo y versión */}
      <div class="flex items-center gap-4">
        <img src="/logo.svg" alt="TPV El Haido" class="h-20 w-24" />
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-foreground">TPV El Haido</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">Versión</span>
            <span class="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
              v{currentVersion() || '...'}
            </span>
          </div>
          <p class="text-xs text-muted-foreground">
            Software de digitalización y gestión de procesos creado ad hoc para Bar El Haido
          </p>
        </div>
      </div>

      {/* Datos del beneficiario */}
      <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 class="h-4 w-4 text-primary" />
          Datos del beneficiario
        </h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="flex items-center gap-2">
            <User class="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span class="text-muted-foreground text-xs">Titular</span>
              <p class="font-medium text-foreground">GERMAN ASENSIO BLASCO</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Shield class="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span class="text-muted-foreground text-xs">NIF</span>
              <p class="font-medium text-foreground">16639695T</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Building2 class="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span class="text-muted-foreground text-xs">Establecimiento</span>
              <p class="font-medium text-foreground">Bar El Haido</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Info class="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <span class="text-muted-foreground text-xs">Tipo</span>
              <p class="font-medium text-foreground">PYME — Hostelería</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estado de actualizaciones */}
      <div
        class={cn(
          'rounded-lg border p-4 transition-colors',
          available()
            ? 'border-primary/50 bg-primary/5'
            : error()
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-success/50 bg-success/5'
        )}
      >
        <div class="flex items-start gap-3">
          <div
            class={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              available()
                ? 'bg-primary/10 text-primary'
                : error()
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-success/10 text-success'
            )}
          >
            <Show when={available()}>
              <Download class="h-5 w-5" />
            </Show>
            <Show when={!available() && !error()}>
              <CheckCircle2 class="h-5 w-5" />
            </Show>
            <Show when={error()}>
              <AlertCircle class="h-5 w-5" />
            </Show>
          </div>

          <div class="flex-1 space-y-1">
            <Show
              when={available()}
              fallback={
                <Show
                  when={error()}
                  fallback={
                    <>
                      <p class="font-medium text-success">Sistema actualizado</p>
                      <p class="text-sm text-muted-foreground">
                        Tienes la última versión instalada
                      </p>
                    </>
                  }
                >
                  <p class="font-medium text-destructive">Error al verificar</p>
                  <p class="text-sm text-muted-foreground">{error()}</p>
                </Show>
              }
            >
              <p class="font-medium text-primary">Nueva versión disponible: {newVersion()}</p>
              <p class="text-sm text-muted-foreground">Hay una actualización lista para instalar</p>
            </Show>
          </div>
        </div>

        {/* Notas de versión */}
        <Show when={available() && notes()}>
          <div class="mt-4 rounded-md bg-muted/50 p-3">
            <p class="text-xs font-medium text-muted-foreground mb-1">
              Novedades en {newVersion()}:
            </p>
            <p class="text-sm text-foreground whitespace-pre-wrap">{notes()}</p>
          </div>
        </Show>

        {/* Barra de progreso */}
        <Show when={downloading() && progress()}>
          <div class="mt-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Descargando...</span>
              <span class="font-medium">{progressPercent()}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent()}%` }}
              />
            </div>
            <Show when={progress()?.contentLength}>
              <p class="text-xs text-muted-foreground text-center">
                {(progress()!.downloaded / 1024 / 1024).toFixed(1)} MB de{' '}
                {(progress()!.contentLength! / 1024 / 1024).toFixed(1)} MB
              </p>
            </Show>
          </div>
        </Show>

        {/* Botones de acción */}
        <div class="mt-4 flex flex-wrap gap-2">
          <Show when={available()}>
            <Button onClick={downloadAndInstall} disabled={downloading()} class="flex-1">
              <Show
                when={!downloading()}
                fallback={
                  <>
                    <RefreshCw class="mr-2 h-4 w-4 animate-spin" />
                    Instalando...
                  </>
                }
              >
                <Download class="mr-2 h-4 w-4" />
                Actualizar ahora
              </Show>
            </Button>
          </Show>

          <Button
            variant={available() ? 'outline' : 'default'}
            onClick={handleCheck}
            disabled={checking() || downloading()}
            class={available() ? '' : 'flex-1'}
          >
            <Show
              when={!checking()}
              fallback={
                <>
                  <RefreshCw class="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              }
            >
              <RefreshCw class="mr-2 h-4 w-4" />
              Buscar actualizaciones
            </Show>
          </Button>
        </div>

        {/* Última verificación */}
        <Show when={lastChecked()}>
          <p class="mt-3 text-xs text-muted-foreground text-center">
            Última verificación: hoy a las {formatLastChecked()}
          </p>
        </Show>
      </div>

      {/* Info adicional */}
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <div class="flex items-start gap-3">
          <Info class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div class="space-y-2 text-sm text-muted-foreground">
            <p>
              Las actualizaciones incluyen nuevas funciones, mejoras de rendimiento y correcciones
              de seguridad.
            </p>
            <p>El sistema verifica automáticamente si hay actualizaciones disponibles cada hora.</p>
          </div>
        </div>
      </div>

      {/* Sistema actualizable */}
      <div class="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <RefreshCw class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <p class="font-semibold text-foreground">Sistema actualizable</p>
            <p class="text-sm text-muted-foreground">
              Actualizaciones OTA (Over-The-Air) firmadas digitalmente. El sistema verifica e
              instala nuevas versiones de forma automática sin intervención del usuario,
              garantizando que la solución se mantiene actualizada con las últimas funcionalidades y
              parches de seguridad.
            </p>
          </div>
        </div>
      </div>

      {/* Protección por licencia */}
      <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Lock class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <p class="font-semibold text-foreground">Protección por licencia</p>
            <p class="text-sm text-muted-foreground">
              Este software requiere una licencia válida para su funcionamiento. La licencia es
              otorgada únicamente por el responsable del desarrollo y/o por GERMAN ASENSIO BLASCO
              como titular del establecimiento. El sistema es completamente inutilizable sin previa
              activación y verificación de licencia, impidiendo copias ilegales o uso fraudulento de
              la solución.
            </p>
          </div>
        </div>
      </div>

      {/* Información del producto */}
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-foreground">Información del producto</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-md bg-muted/50 px-3 py-2">
            <span class="text-muted-foreground">Identificador</span>
            <p class="font-medium text-foreground">com.elhaido.tpv</p>
          </div>
          <div class="rounded-md bg-muted/50 px-3 py-2">
            <span class="text-muted-foreground">Categoría Kit Digital</span>
            <p class="font-medium text-foreground">VI — Gestión de Procesos</p>
          </div>
          <div class="rounded-md bg-muted/50 px-3 py-2 flex items-start gap-2">
            <KeyRound class="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span class="text-muted-foreground">Licencia</span>
              <p class="font-medium text-foreground">Activación obligatoria</p>
            </div>
          </div>
          <div class="rounded-md bg-muted/50 px-3 py-2">
            <span class="text-muted-foreground">Plataforma</span>
            <p class="font-medium text-foreground">{isTauri() ? 'Desktop (Tauri)' : 'Web (PWA)'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionInfo;
