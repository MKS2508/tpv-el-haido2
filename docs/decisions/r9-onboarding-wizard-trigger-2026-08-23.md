---
type: adr
id: r9
title: Onboarding first-run wizard — DB persistence + structural mount (TR-19 scope split)
status: locked
ts: 2026-08-23
lockedBy: waxin (AskUserQuestion with previews, 2026-08-23)
supersedes:
  - TR-19.B∪C∪D∪F scope conflation (installer wizard ≠ onboarding wizard)
  - lib/onboarding-utils.ts:225-246 shouldShowOnboarding product/users heuristic (derrotada por seedProductsIfNeeded)
  - models/Onboarding.ts:64 localStorage ONBOARDING_STORAGE_KEY (frágil, no sobrevive wipe)
affects:
  - src/App.tsx (mount + reorder seed)
  - src/hooks/useOnboarding.ts (DB-backed flag)
  - src/lib/onboarding-utils.ts (heurística simplificada)
  - src-tauri/src/database.rs (nueva tabla app_state)
  - src-tauri/src/lib.rs (invoke_handler — nuevos commands)
  - src/hooks/useAppState.ts (nuevo, thin TS wrapper)
  - docs/task-requests/TR-19 (scope clarification: TR-19 = installer wizard, post-install wizard es r9)
---

# r9 — Onboarding first-run wizard: DB persistence + structural mount

## Contexto

TR-19 series (TR-19.A through TR-19.F) implementaron el **wizard installer de TPV** — el flujo al que se entra con `./tpv-el-haido.AppImage --install` y que vive en `src/installer/InstallerApp.tsx`. Ese wizard **instala la app** en `~/.local/bin`, registra `.desktop`, etc. TR-19 reportó "done" para ese alcance.

**Lo que TR-19 NO implementó** (y eso es lo que Waxin acaba de descubrir en el bar): el wizard **de first-run onboarding** — el que se dispara automáticamente al abrir el TPV por primera vez post-instalación, y que recoge preferencias (storage mode, import data, crear usuario admin, theme) antes de llevar al Home. Ese wizard existe como código (`src/components/Onboarding/index.tsx` + 6 steps en `src/components/Onboarding/steps/`), pero **tres bugs concurrentes lo dejaron muerto en producción:**

1. **Estructural** — `<Onboarding />` nunca se monta en el árbol de Solid. `OnboardingProvider` solo aparece anidado dentro de `<Match when={activeSection() === 'settings'}>` (App.tsx:570), exclusivamente para dar contexto al callback `restartOnboarding()` del botón "Reiniciar wizard" de Settings. El componente top-level nunca se importa.
2. **Heurística derrotada** — `shouldShowOnboarding()` (lib/onboarding-utils.ts:222-246) retorna `false` cuando `productsCount > 0`. Pero `seedProductsIfNeeded` (App.tsx:131-148) auto-siembra productos desde `products.json` **antes** de evaluar la heurística. Resultado: `shouldShow === false` siempre.
3. **Persistencia frágil** — el flag de "wizard completed" se guardaba en `localStorage['tpv-onboarding-completed']` (models/Onboarding.ts:64). No sobrevive a wipe del profile WebKit. La DB SQLite solo tiene 8 tablas business data (no existe `app_state` ni equivalente).

Waxin en el bar (v0.1.4 → doble click → app abre directo, sin wizard) confirmó el bug.

## Decisión

**Onboarding wizard dispara once-per-install con flag persistente en DB SQLite (nueva tabla `app_state`), montado a top-level en App.tsx, gateado ANTES de `seedProductsIfNeeded`.**

Tres locks explícitos en AskUserQuestion con previews:

### (a) Trigger: once-per-install (Recommended)

```
Install fresca → check app_state['wizard.completed']
                ├── null/false → dispara wizard 6 steps
                └── 'true' → NO dispara

Auto-update 0.1.4 → 0.1.5 → 'true' → NO dispara (auto-update no es install)
Clean install nueva máquina → null → dispara
```

Pro: el usuario ve el wizard **una vez por instalación**. Patrón estándar (Slack, VS Code).
Con: si en una versión futura hay un step nuevo importante, el usuario no lo ve. Mitigación: el botón "Ejecutar Asistente de Configuración" en Settings (TR-19.C) sigue disponible — solo había que cablearlo al show real (lo arregla este mismo PR).

### (b) Persistencia: Tauri command + DB (Recommended)

```sql
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

```rust
#[tauri::command]
fn get_app_state(key: String) -> Option<String>
#[tauri::command]
fn set_app_state(key: String, value: String) -> Result<(), String>
```

Frontend thin wrapper `src/hooks/useAppState.ts` con `getAppState(key)`/`setAppState(key, value)` vía `invoke`.

Pro: persistente (sobrevive uninstall AppImage, queda en `~/.local/share/...`)
Pro: inspeccionable vía `sqlite3 ... 'SELECT * FROM app_state'`
Pro: misma storage que el resto del POS
Pro: extensible a otros flags (`storage.mode`, `first.dashboard.view`, etc.)
Con: nueva tabla + migración + 2 IPC commands (~150 LOC)

### (c) Orden: wizard PRIMERO (Recommended)

```
App mount
  → splash + license guards
  → if onboarding.shouldShow():
      mount <Onboarding />   ← wizard corre aquí, App principal NO se monta
  → after completeOnboarding():
      seedProductsIfNeeded (ahora con productsCount === 0)
      mount <Sidebar /> + secciones
```

Pro: el wizard es el primer contacto UX
Pro: cero race con seed (seed espera a que wizard termine)
Pro: si el wizard termina sin seed, el usuario ve App vacía (correcto — son sus preferences)

## Alternativas evaluadas

| Trigger | Persistence | Order |
|---|---|---|
| **once-per-install (LOCKED)** | **DB app_state (LOCKED)** | **wizard-then-seed (LOCKED)** |
| per-version (ver wizard cada upgrade) | JSON config file existente `write_json_config` | seed-then-wizard (heurística cambiada) |
| hybrid (per-install + botón settings) | localStorage (status quo — frágil) | heurística-only sin order change |

Per-version rechazada: fricción innecesaria en updates que no cambian steps. JSON rechazado: `app_state` table es más extensible. localStorage rechazado: es exactamente el bug que diagnosticamos. Seed-then-wizard rechazado: seedProducts no controla el estado del wizard y la heurística siempre sería false.

## Cambios concretos

1. **src-tauri/src/database.rs** — nueva tabla app_state + helpers:
   ```rust
   const CREATE_APP_STATE: &str = r#"
     CREATE TABLE IF NOT EXISTS app_state (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL
     );
   "#;
   // append al ensure_schema existente
   ```

2. **src-tauri/src/lib.rs** — 2 nuevos commands:
   ```rust
   #[tauri::command]
   fn get_app_state(key: String, db: State<Db>) -> Result<Option<String>, String>
   
   #[tauri::command]
   fn set_app_state(key: String, value: String, db: State<Db>) -> Result<(), String>
   ```
   Registrar en `invoke_handler` (lib.rs:627-677).

3. **src/hooks/useAppState.ts** (nuevo) — TS wrapper Result-based:
   ```ts
   export async function getAppState(key: string): Promise<Result<string | null, ...>>
   export async function setAppState(key: string, value: string): Promise<Result<void, ...>>
   ```

4. **src/lib/onboarding-utils.ts** — heurística simplificada:
   ```ts
   export function shouldShowOnboarding(params: {
     forceOnboarding: boolean;
     onboardingCompleted: boolean;
   }): boolean {
     return params.forceOnboarding || !params.onboardingCompleted;
   }
   ```

5. **src/hooks/useOnboarding.ts** — DB en vez de localStorage:
   - `onMount`: `getAppState('wizard.completed')` en vez de localStorage
   - `completeOnboarding`: `setAppState('wizard.completed', 'true')` en vez de localStorage.setItem
   - **Migración one-shot**: si localStorage tiene valor pero DB no, copiar DB + borrar localStorage (vacuums users que ya completaron wizard antes del fix)
   - Eliminar la lectura de `productsCount`/`usersCount` del `shouldShow` memo

6. **src/App.tsx** — surgical 2 cambios:
   - `import { Onboarding } from '@/components/Onboarding'` (línea ~30)
   - `const onboarding = useOnboarding()` en body
   - Insertar ANTES del `<Show when={store.state.selectedUser}>` (~línea 434):
     ```tsx
     <Show
       when={onboarding.shouldShow() && !showAppSplash() && !showLicenseSplash()}
       fallback={null}
     >
       <OnboardingProvider>
         <Onboarding />
       </OnboardingProvider>
     </Show>
     ```
   - Mover `seedProductsIfNeeded` a disparar **dentro de** `completeOnboarding` (no en mount)

7. **Settings > Reiniciar wizard** — verificar que sigue funcionando. El botón usa `useOnboardingContext().restartOnboarding` que borra el flag DB y resetea state. Sin cambios al botón — pero ahora **sí renderiza el wizard** porque la rama condicional top-level existe.

## Trade-offs aceptados

- **+150 LOC Rust + TS** — nuevo comando, nueva tabla, nuevo wrapper. No es un one-liner; es un fix de superficie completa, pero acotado a la vertical onboarding.
- **`forceOnboarding` env var** sigue funcionando (config.ts:114-117). Útil para QA/dev: `VITE_FORCE_ONBOARDING=true bun run tauri dev` lo dispara siempre.
- **Migración one-shot de localStorage → DB** — un solo `if` lazy al mount. Si waxin abre app v0.1.5 con localStorage=true, se copia a DB=true y se borra localStorage. Transparente para el usuario.

## Out of scope

- **Installer wizard** (`--install` mode, `src/installer/InstallerApp.tsx`) — ese es TR-19, otro track. Tiene un bug separado (race en `currentWindow.label` o `catch` silencioso en `main.tsx:202`) que NO se aborda en este fix.
- **Per-version wizard** — descartado explícitamente en la decisión. Si en el futuro hay steps nuevos importantes, se libera con bump de `app_state['wizard.completed']` reset + release notes.
- **Otras flags en `app_state`** — la tabla queda abierta para `storage.mode`, `first.dashboard.view`, etc., pero solo se usa `wizard.completed` en este PR.

## Riesgos identificados

1. **`seedProductsIfNeeded` corre más tarde** — si alguien dependía de que el seed ejecutara en mount para tener datos en algún effect, rompería. Mitigación: solo se mueven `seedProductsIfNeeded` y dependencias que leían `products.length`. Audit en task-executor.
2. **Mount nuevo del wizard en App.tsx** puede romper tests existentes si los hay (cero test coverage per CLAUDE.md, así que riesgo 0).
3. **Botón Settings > Reiniciar wizard** — verificar manually que el botón ahora navega al wizard (antes solo cambiaba el flag). El botón sigue calling `restartOnboarding`, que ahora sí tiene efecto porque el show top-level escucha `shouldShow`.
4. **Compatibilidad DB** — la migración es additive (`CREATE IF NOT EXISTS`). DBs existentes de v0.1.4 solo tienen 8 tablas; al abrir v0.1.5 la nueva tabla se crea silenciosa. Sin riesgo de data loss.

## Validación post-decisión

- [ ] typecheck verde (tsgo / tsc)
- [ ] lint verde (sin nuevos errors)
- [ ] vite build verde
- [ ] Smoke manual en `bun run tauri dev`: con DB vacía + localStorage limpio → 6 steps visibles
- [ ] Smoke manual: con `wizard.completed=true` en DB → app abre directo a Home/Login
- [ ] Grep verify: `Onboarding` en `App.tsx` ≥ 1 referencia top-level, `app_state` CREATE TABLE en `database.rs`, `get_app_state`/`set_app_state` en `invoke_handler`
- [ ] Settings > Reiniciar wizard funciona (resetea flag y muestra wizard)
- [ ] Re-ship v0.1.5 con estos fixes

## Locked por

waxin, 2026-08-23, AskUserQuestion con previews para cada decisión de las 3 (trigger, persistencia, order).
