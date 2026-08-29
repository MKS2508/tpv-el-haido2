import {
  Building2,
  Info,
  KeyRound,
  Lock,
  Shield,
  User,
} from 'lucide-solid';
import { createSignal, onMount } from 'solid-js';
import { cn } from '@/lib/utils';
import { isTauri } from '@/services/platform';

interface VersionInfoProps {
  class?: string;
}

export function VersionInfo(props: VersionInfoProps) {
  const [currentVersion, setCurrentVersion] = createSignal<string | null>(null);

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
