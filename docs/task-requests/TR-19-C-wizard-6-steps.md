---
type: task-request
id: TR-19.C
title: wizard-6-steps — Download/Components/Review/Install/Done steps (excl Welcome ya en A)
status: open
priority: medium
zone: client
ts: 2026-08-22
parent: TR-19
parentMilestone: track/wizard-linux-build
blockedBy: [TR-19.A.2]
effort: large
lockedBy: r7-tpv-sidecar-installer-2026-08-22
acceptance:
  - `src/installer/steps/DownloadStep.tsx` — fetch metadata (version, size, sha256) desde desktop-release-hub, display + "Download" button → invoca `installer:download`
  - `src/installer/steps/PathStep.tsx` — radio buttons (`~/.local/bin` default vs custom path), display XDG paths explanation
  - `src/installer/steps/ComponentsStep.tsx` — checkboxes (.desktop entry, icon, add to PATH), all default ON
  - `src/installer/steps/ReviewStep.tsx` — summary screen de los choices del usuario, "Back" + "Install" buttons
  - `src/installer/steps/InstallStep.tsx` — progress bar + log inline + cancel button, consume `onProgress` events
  - `src/installer/steps/DoneStep.tsx` — success screen + "Launch TPV" button (exec `~/.local/bin/tpv-el-haido`) + "Close" button
  - State machine (`useWizardMachine` o similar) para navegar entre 7 steps (Welcome ya hecho en A)
  - `src/installer/i18n/{es,en}.ts` expandidos con strings de los 6 steps
  - `src/installer/InstallerApp.tsx` actualizado para usar la state machine + renderizar el step actual
  - bun run typecheck + bun run lint + bun run build EXIT 0
  - 0 nuevos errores lint
  - Reusa componentes TPV: `<Card>`, `<Button>`, `<Input>`, `<Switch>`, theme system
outOfScope:
  - IPC handlers reales (eso es TR-19.B — paralelizable)
  - Modificar contratos IPC (LOCKED en A, contratos son punto único de verdad)
  - Build distribución (TR-19.D)
  - Modificar scripts/install-linux.sh (TR-19.D)
---

# TR-19.C — wizard-6-steps

## Contexto

TR-19.A implementó solo el WelcomeStep. Faltan 6 steps: Download, Path, Components, Review, Install, Done. Este TR los implementa, junto con la state machine que navega entre los 7 steps totales.

**Paralelizable con TR-19.B**: C consume los contratos IPC de A (`contracts.ts`) y la state machine se mock-ea con `MockDownloader`/`MockInstaller` durante el desarrollo. Cuando B termina, B enchufa los handlers reales via `invoke()` y C los consume via `ipc/handlers.ts`.

## State machine design

```typescript
// src/installer/state/machine.ts
type Step = 'welcome' | 'download' | 'path' | 'components' | 'review' | 'install' | 'done'

interface WizardState {
  step: Step
  installOptions: Partial<InstallOptions>     // populated as user advances
  downloadProgress?: InstallProgress
  installResult?: InstallResult
}

type Action =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; step: Step }
  | { type: 'SET_OPTIONS'; options: Partial<InstallOptions> }
  | { type: 'SET_DOWNLOAD_PROGRESS'; progress: InstallProgress }
  | { type: 'SET_INSTALL_RESULT'; result: InstallResult }
  | { type: 'RESET' }
```

## Plan (compact)

### Paso 1 — Crear state machine

```typescript
// src/installer/state/machine.ts
import { createSignal } from 'solid-js'
import type { InstallOptions, InstallProgress, InstallResult } from '../contracts'

export type Step = 'welcome' | 'download' | 'path' | 'components' | 'review' | 'install' | 'done'
export interface WizardState {
  step: Step
  installOptions: Partial<InstallOptions>
  downloadProgress?: InstallProgress
  installResult?: InstallResult
}

export function createWizardMachine() {
  const [state, setState] = createSignal<WizardState>({
    step: 'welcome',
    installOptions: {
      language: 'es',
      installPath: '~/.local/bin',
      createDesktopEntry: true,
      installIcon: true,
      addToPath: true,
    },
  })

  const STEP_ORDER: Step[] = ['welcome', 'download', 'path', 'components', 'review', 'install', 'done']

  return {
    state,
    next() {
      const current = state().step
      const idx = STEP_ORDER.indexOf(current)
      if (idx < STEP_ORDER.length - 1) {
        setState('step', STEP_ORDER[idx + 1])
      }
    },
    back() {
      const current = state().step
      const idx = STEP_ORDER.indexOf(current)
      if (idx > 0) {
        setState('step', STEP_ORDER[idx - 1])
      }
    },
    setOptions(options: Partial<InstallOptions>) {
      setState('installOptions', (prev) => ({ ...prev, ...options }))
    },
    setDownloadProgress(progress: InstallProgress) {
      setState('downloadProgress', progress)
    },
    setInstallResult(result: InstallResult) {
      setState('installResult', result)
      if (result.success) setState('step', 'done')
    },
    reset() {
      setState({ step: 'welcome', installOptions: { /* defaults */ } })
    },
  }
}
```

### Paso 2 — `DownloadStep.tsx`

```tsx
import { Show, createSignal } from 'solid-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StepContainer } from '../components/StepContainer'
import { downloadArtifact } from '../ipc/handlers'
import type { WizardMachine } from '../state/machine'

interface Props {
  machine: WizardMachine
  t: InstallerStrings
}

export function DownloadStep(props: Props) {
  const [downloading, setDownloading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      await downloadArtifact({
        url: 'https://haido.releases.mks2508.systems/api/releases/haido/latest/linux-x64',
        checksumSha256: props.machine.state().installOptions.checksumSha256 || '',
      })
      props.machine.next()
    } catch (e) {
      setError(String(e))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <StepContainer step="download" title={t.download.title}>
      <Card>
        <CardHeader>
          <CardTitle>{t.download.heading}</CardTitle>
          <CardDescription>{t.download.description}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Show when={error()}>
            <div class="text-destructive text-sm">{error()}</div>
          </Show>
          <Show when={!downloading()} fallback={
            <div class="space-y-2">
              <Progress value={50} />  // Subscribe to downloadProgress via machine
              <p class="text-sm text-muted-foreground">{t.download.downloading}</p>
            </div>
          }>
            <Button onClick={handleDownload} class="w-full touch-target">
              {t.download.start}
            </Button>
          </Show>
        </CardContent>
      </Card>
    </StepContainer>
  )
}
```

### Paso 3 — `PathStep.tsx`, `ComponentsStep.tsx`, `ReviewStep.tsx`, `InstallStep.tsx`, `DoneStep.tsx`

Similar estructura con `<StepContainer>` + `<Card>` + form controls del TPV. Reusa `useAppTheme()` para theme system.

`InstallStep` consume `onProgress` callback:
```tsx
import { onMount, onCleanup } from 'solid-js'
import { onProgress, installApp } from '../ipc/handlers'

export function InstallStep(props: Props) {
  let unlisten: (() => void) | undefined

  onMount(async () => {
    unlisten = await onProgress((progress) => {
      props.machine.setDownloadProgress(progress)
    })
    try {
      const result = await installApp(props.machine.state().installOptions as InstallOptions)
      props.machine.setInstallResult(result)
    } catch (e) {
      props.machine.setInstallResult({
        success: false,
        error: { code: 'INSTALL_FAILED', message: String(e), recoverable: false },
      })
    }
  })

  onCleanup(() => unlisten?.())

  return (
    <StepContainer step="install" title={t.install.title}>
      <Progress value={props.machine.state().downloadProgress?.percent ?? 0} />
      <p>{props.machine.state().downloadProgress?.message ?? t.install.preparing}</p>
    </StepContainer>
  )
}
```

### Paso 4 — `InstallerApp.tsx` actualizado

```tsx
import { Show, Match, Switch } from 'solid-js'
import { WizardMachine, createWizardMachine } from './state/machine'
import { WelcomeStep } from './steps/WelcomeStep'
import { DownloadStep } from './steps/DownloadStep'
// ... imports

export function InstallerApp(props: InstallerAppProps) {
  const machine = createWizardMachine()
  const t = props.language === 'en' ? en : es

  return (
    <Switch>
      <Match when={machine.state().step === 'welcome'}>
        <WelcomeStep machine={machine} t={t} onNext={() => machine.next()} />
      </Match>
      <Match when={machine.state().step === 'download'}>
        <DownloadStep machine={machine} t={t} />
      </Match>
      <Match when={machine.state().step === 'path'}>
        <PathStep machine={machine} t={t} />
      </Match>
      <Match when={machine.state().step === 'components'}>
        <ComponentsStep machine={machine} t={t} />
      </Match>
      <Match when={machine.state().step === 'review'}>
        <ReviewStep machine={machine} t={t} />
      </Match>
      <Match when={machine.state().step === 'install'}>
        <InstallStep machine={machine} t={t} />
      </Match>
      <Match when={machine.state().step === 'done'}>
        <DoneStep machine={machine} t={t} />
      </Match>
    </Switch>
  )
}
```

### Paso 5 — i18n expansion

```typescript
// src/installer/i18n/es.ts
export const es = {
  welcome: { /* ...existing... */ },
  download: {
    title: 'Descargar TPV El Haido',
    heading: 'Última versión disponible',
    description: 'Se descargará la versión más reciente del TPV desde el servidor de releases.',
    start: 'Iniciar descarga',
    downloading: 'Descargando...',
  },
  path: { /* install path choice */ },
  components: { /* checkboxes */ },
  review: { /* summary */ },
  install: {
    title: 'Instalando...',
    preparing: 'Preparando instalación...',
  },
  done: {
    title: 'Instalación completa',
    launch: 'Abrir TPV',
    close: 'Cerrar',
  },
} as const satisfies InstallerStrings
```

(Misma estructura en `en.ts`.)

### Paso 6 — Verificación

```bash
bun run typecheck      # EXIT 0
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0
```

## Reglas duras

- **NO tocar** `src/installer/contracts.ts` (LOCKED en A)
- **NO tocar** `src-tauri/src/lib.rs` (eso es B)
- **Worktree isolation OBLIGATORIO** — `isolation: "worktree"` en Agent
- **Reusar** theme + shadcn/ui del TPV siempre
- **NO commitear** debug logs
- **NO push** a remote
- **REPORTE A FICHERO**: `/tmp/tr19c-wizard-6-steps-<ts>.md`

## Skills on-demand

- `guidelines`, `axon-artifacts`

## Output esperado

Reporte en `/tmp/tr19c-wizard-6-steps-<ts>.md` + resumen 3-5 bullets.