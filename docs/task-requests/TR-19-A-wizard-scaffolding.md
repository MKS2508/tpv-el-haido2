---
type: task-request
id: TR-19.A
title: sidecar-bootstrap — setup estructura + IPC contracts + Welcome step (SIN tocar lib.rs)
status: open
priority: medium
zone: client
ts: 2026-08-22
parent: TR-19
parentMilestone: track/wizard-linux-build
blockedBy: []
effort: small
research: docs/research/wizard-linux-candidates-2026-08-22.md (winner: Tauri sidecar)
lockedBy: r7-tpv-sidecar-installer-2026-08-22
supersedes: scope original (Electron standalone)
acceptance:
  - Estructura `src/installer/` creada dentro del TPV app con TypeScript estricto
  - `src/installer/contracts.ts` con tipos IPC LOCKED: `InstallerAPI`, `InstallOptions`, `InstallProgress`, `InstallResult` (punto único de verdad para B+C)
  - `src/installer/InstallerApp.tsx` con un único step "Welcome" funcional (botón "Cerrar" → exit code 0)
  - Componentes UI REUSAN los del TPV (`<Card>`, `<Button>`, theme system) — cero design system paralelo
  - i18n setup mínimo (es + en) reusando infra del TPV si existe, sino inline mínimo
  - `src/installer/ipc/handlers.ts` con stubs tipados para `installer:download`, `installer:install`, `installer:rollback` (handlers reales en TR-19.B)
  - `src/installer/index.ts` con export del componente raíz (`<InstallerApp />`) — gateado por flag `--install` en lib.rs (gate es TR-19.A.2, no este TR)
  - `bun run typecheck` + `bun run lint` + `bun run build` EXIT 0 (NO rompe build del TPV root)
  - `bun run tauri build` EXIT 0 (smoke test del bundle TPV — el código del installer se compila dentro)
  - `README.md` en `src/installer/` documentando la arquitectura sidecar + cómo probar manualmente
outOfScope:
  - **NO toca `src-tauri/src/lib.rs`** — eso es TR-19.A.2 entrypoint detection (separado, alto blast radius, requiere review humano)
  - Lógica real de descarga/instalación (eso es TR-19.B)
  - Wizard UI completa multi-step (eso es TR-19.C)
  - Build distribución / signing (eso es TR-19.D)
  - Modificación de `scripts/install-linux.sh` (queda como wrapper en TR-19.D)
  - Integración real con desktop-release-hub (eso es TR-19.B)
  - Code signing del installer (NA — mismo binario TPV)
  - Auto-update del installer (NA — viaja con TPV)
---

# TR-19.A — sidecar-bootstrap

## Contexto

TR-19 (parent) cambió de Electron standalone a **Tauri sidecar** después de push-back de waxin. Ver [r7](../decisions/r7-tpv-sidecar-installer-2026-08-22.md) para la decisión completa.

**Concepto clave**: el instalador NO es un binario separado. Es el **mismo TPV El Haido ejecutándose con flag `--install`**. El entrypoint (`src-tauri/src/lib.rs`) detecta el flag y monta el wizard installer en vez del POS. **PERO este TR-19.A NO toca el lib.rs** — el gate `--install` está en TR-19.A.2 (separado por blast radius).

Este TR establece:
1. Estructura de directorios `src/installer/` dentro del TPV
2. Tipos IPC locked (contratos que B+C consumirán)
3. Welcome step mínimo (smoke test del componente)
4. Stubs IPC (handlers reales vienen en B)

## Plan (compact)

### Paso 1 — Crear estructura `src/installer/`

```
src/installer/
├── README.md                       # arquitectura sidecar + cómo probar
├── contracts.ts                    # ★ LOCKED — InstallerAPI, InstallOptions, etc.
├── index.ts                        # export del componente raíz
├── InstallerApp.tsx                # entrypoint UI (gate por --install flag)
├── ipc/
│   └── handlers.ts                 # stubs tipados (TR-19.B enchufa los reales)
├── services/
│   ├── release-hub.ts              # stub — descarga signed artifact (TR-19.B)
│   └── install.ts                  # stub — file ops + .desktop registration (TR-19.B)
├── steps/
│   └── WelcomeStep.tsx             # ★ único step funcional en este TR
├── components/
│   └── StepContainer.tsx           # wrapper compartido (los 7 steps lo usan)
└── i18n/
    ├── es.ts                       # strings español
    └── en.ts                       # strings inglés
```

### Paso 2 — `contracts.ts` (LOCKED)

```typescript
/**
 * Contratos IPC para el installer mode.
 * LOCKED en TR-19.A — TR-19.B y TR-19.C consumen esto sin divergencia.
 */

export type InstallStep =
  | 'welcome'
  | 'download'
  | 'path'
  | 'components'
  | 'review'
  | 'install'
  | 'done'

export interface InstallOptions {
  /** Ruta destino. MVP: solo `~/.local/bin/tpv-el-haido`. Default: ~/.local/bin */
  installPath: string
  /** Crear entrada .desktop en ~/.local/share/applications/ */
  createDesktopEntry: boolean
  /** Instalar icono en ~/.local/share/icons/ */
  installIcon: boolean
  /** Lenguaje del wizard (es|en) */
  language: 'es' | 'en'
  /** URL del signed artifact en desktop-release-hub */
  downloadUrl: string
  /** SHA256 esperado del artifact para verificación */
  checksumSha256: string
  /** ¿Incluir en PATH del usuario? */
  addToPath: boolean
}

export interface InstallProgress {
  /** Step actual del wizard */
  step: InstallStep
  /** Fase de la operación (download/install/etc) */
  phase: 'idle' | 'downloading' | 'verifying' | 'extracting' | 'registering' | 'complete' | 'error'
  /** 0-100 */
  percent: number
  /** Mensaje user-facing */
  message: string
  /** Bytes descargados (si downloading) */
  bytesDownloaded?: number
  /** Bytes totales (si downloading) */
  bytesTotal?: number
}

export interface InstallResult {
  success: boolean
  /** Path final donde quedó el AppImage */
  finalPath?: string
  /** Comando para lanzar (e.g., '~/.local/bin/tpv-el-haido') */
  launchCommand?: string
  /** Error si success=false */
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
}

/**
 * API expuesta via Tauri IPC commands.
 * El frontend la consume via `invoke<T>('installer:...')`.
 */
export interface InstallerAPI {
  // Step 1: download
  'installer:download': (options: { url: string; checksumSha256: string }) => Promise<{
    path: string
    bytes: number
  }>

  // Step 2: install (copy + .desktop + icon)
  'installer:install': (options: InstallOptions) => Promise<InstallResult>

  // Step 3: rollback (si falla install)
  'installer:rollback': (state: Partial<InstallResult>) => Promise<void>

  // Step 4: uninstall (separado, TR-19.B.2)
  'installer:uninstall': (installPath: string) => Promise<void>

  // Step 5: progress events (frontend subscribe via Tauri event listener)
  'installer:onProgress': (callback: (progress: InstallProgress) => void) => () => void
}
```

### Paso 3 — `InstallerApp.tsx` (Welcome step único)

Reusa `<Card>`, `<Button>`, theme system del TPV:

```tsx
import { Show } from 'solid-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppTheme } from '@/lib/theme-context'
import type { InstallStep } from './contracts'
import { es } from './i18n/es'
import { en } from './i18n/en'

interface InstallerAppProps {
  language?: 'es' | 'en'
}

export const InstallerApp = (props: InstallerAppProps) => {
  const appTheme = useAppTheme()
  const t = props.language === 'en' ? en : es
  const [step, setStep] = (() => {
    // Gateado por el flag --install en lib.rs (TR-19.A.2)
    // Por ahora, este componente se monta solo si el flag está presente
    return null
  })

  return (
    <div class="min-h-screen flex items-center justify-center bg-background text-foreground">
      <Card class="w-[600px]">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Show when={appTheme.currentTheme()}>
              {(theme) => <span>{theme.label}</span>}
            </Show>
            {t.welcome.title}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <p>{t.welcome.description}</p>
          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // TODO(TR-19.A.2): close window via Tauri command
                window.close()
              }}
            >
              {t.welcome.cancel}
            </Button>
            <Button
              onClick={() => {
                // TODO(TR-19.C): navegar a DownloadStep
                console.log('[TR-19.A smoke test] Welcome → next step placeholder')
              }}
            >
              {t.welcome.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InstallerApp
```

### Paso 4 — `ipc/handlers.ts` (stubs)

```typescript
import type { InstallOptions, InstallResult, InstallProgress } from '../contracts'

/**
 * Stubs IPC — handlers reales implementados en TR-19.B.
 * Por ahora retornan errores tipados para que el frontend pueda tipar las llamadas.
 */

export async function downloadArtifact(
  options: { url: string; checksumSha256: string }
): Promise<{ path: string; bytes: number }> {
  throw new Error('Not implemented — see TR-19.B')
}

export async function installApp(options: InstallOptions): Promise<InstallResult> {
  throw new Error('Not implemented — see TR-19.B')
}

export async function rollback(state: Partial<InstallResult>): Promise<void> {
  console.warn('[TR-19.A stub] rollback called', state)
}

export async function uninstall(installPath: string): Promise<void> {
  throw new Error('Not implemented — see TR-19.B.2')
}

export type ProgressCallback = (progress: InstallProgress) => void
export function onProgress(callback: ProgressCallback): () => void {
  console.warn('[TR-19.A stub] progress subscription registered')
  return () => console.warn('[TR-19.A stub] progress subscription removed')
}
```

### Paso 5 — `index.ts`

```typescript
export { InstallerApp, type InstallerAppProps } from './InstallerApp'
export * from './contracts'
```

### Paso 6 — `i18n/es.ts` + `i18n/en.ts`

Strings mínimos para el Welcome step (TR-19.C expandirá a los 7 steps completos):

```typescript
// es.ts
export const es = {
  welcome: {
    title: 'Instalar TPV El Haido',
    description: 'Esta aplicación le guiará en la instalación de TPV El Haido en su sistema.',
    cancel: 'Cancelar',
    next: 'Siguiente',
  },
} as const

// en.ts
export const en = {
  welcome: {
    title: 'Install TPV El Haido',
    description: 'This wizard will guide you through installing TPV El Haido on your system.',
    cancel: 'Cancel',
    next: 'Next',
  },
} as const
```

### Paso 7 — Verificación

```bash
bun run typecheck      # EXIT 0 (TS strict)
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0 (Vite build del TPV, incluye src/installer/)
bun run tauri build    # EXIT 0 (smoke test del bundle TPV)
```

### Paso 8 — Smoke test manual

Hasta que TR-19.A.2 implemente el gate `--install`, el smoke test es:
1. Importar `<InstallerApp />` en una página de prueba del TPV (dev only)
2. Verificar que el Welcome step renderiza con theme system
3. Botón "Cancelar" cierra la ventana
4. Botón "Siguiente" loguea el placeholder

## Decisiones aLocked en este TR

- **MVP**: solo `~/.local/bin` (user-level). `/opt/tpv-el-haido` excluido (ver r7).
- **Componentes UI**: reusa TPV directamente (zero duplication).
- **IPC**: contratos locked en `contracts.ts`. B+C consumen sin divergencia.
- **i18n**: es + en. Strings centralizados en `i18n/`.
- **NO toca lib.rs**: ese cambio es TR-19.A.2 (separado).

## Reporte esperado

Persiste a `/tmp/tr19a-sidecar-bootstrap-<ts>.md` con:
- TL;DR (✓/✗ cada acceptance criterion)
- Diff resumido por archivo (estructura nueva)
- Output verbatim de verificaciones
- Smoke test del Welcome step (screenshot ASCII o descripción)
- Stop reason
- Anomalías

## Notas para el executor

- **NO tocar** `src-tauri/src/lib.rs`. Alto blast radius. Eso es TR-19.A.2.
- **NO tocar** `scripts/install-linux.sh`. Eso es TR-19.D.
- **NO romper** el build root. El installer se compila DENTRO del bundle del TPV.
- **Reusar** theme system + shadcn/ui del TPV. NO crear componentes paralelos.
- **NO commitear** — waxin hace el commit después de verificar.
- **NO push** a remote.
- Persiste reporte a `/tmp/tr19a-sidecar-bootstrap-<ts>.md` ANTES de retornar.

## Sub-decomposition sugerida (si effort > 4h continuos)

- **TR-19.A.1** (este, ~2-3h LLM): estructura + contracts + Welcome step + stubs
- **TR-19.A.2** (~1-2h LLM, **REQUIERE REVIEW HUMANO**): entrypoint detection en `src-tauri/src/lib.rs` + tests
- **TR-19.A.3** (~1h LLM): wire-up de IPC stubs en `tauri.conf.json` capabilities