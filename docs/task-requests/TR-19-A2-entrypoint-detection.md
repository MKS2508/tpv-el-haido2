---
type: task-request
id: TR-19.A.2
title: entrypoint-detection — wire --install flag (Rust + frontend)
status: open
priority: medium
zone: client
ts: 2026-08-22
parent: TR-19
parentMilestone: track/wizard-linux-build
blockedBy: [TR-19.A]
effort: small
lockedBy: r7-tpv-sidecar-installer-2026-08-22
acceptance:
  - `src-tauri/src/main.rs` detecta `--install` flag en `std::env::args()` y dispatchea a nueva entry `tpv_el_haido_lib::run_installer_mode()`
  - `src-tauri/src/lib.rs` exporta `pub fn run_installer_mode()` que crea BrowserWindow con label "installer"
  - El builder installer registra Tauri commands específicos (stubs OK, handlers reales en TR-19.B)
  - Frontend `src/main.tsx` detecta window label === 'installer' y monta `<InstallerApp />` dentro de `<ThemeProvider>` (en vez de `<App />`)
  - `src/App.tsx` y resto del frontend NO tocado
  - Smoke test 1: `bun run tauri build --no-bundle && ./src-tauri/target/release/tpv-el-haido` → abre POS normal (regression check)
  - Smoke test 2: `./src-tauri/target/release/tpv-el-haido --install` → abre Welcome step del installer
  - `bun run typecheck` + `bun run lint` + `bun run build` EXIT 0
  - 0 nuevos errores lint en src-tauri/src/* o src/main.tsx
outOfScope:
  - IPC commands reales (eso es TR-19.B)
  - Capabilities wire-up (eso es TR-19.A.3)
  - Wizard UI multi-step completa (eso es TR-19.C)
  - Build distribución / signing (eso es TR-19.D)
  - Modificación de `scripts/install-linux.sh` (TR-19.D)
---

# TR-19.A.2 — entrypoint-detection (--install flag)

## Contexto

TR-19.A estableció la estructura `src/installer/` con `InstallerApp`, IPC contracts LOCKED, WelcomeStep funcional. Falta el **gate** que monta `<InstallerApp />` cuando el binario se invoca con `--install`.

Este TR wire el flag `--install` desde el binario Rust al frontend SolidJS. Blast radius: entrypoint Rust (`main.rs`) + window setup (`lib.rs`) + frontend bootstrap (`main.tsx`). Por eso el agent ejecutor debe usar **worktree isolation**.

## Estado actual del codebase

- `src-tauri/src/main.rs` (5 líneas):
  ```rust
  #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
  fn main() {
      tpv_el_haido_lib::run()
  }
  ```

- `src-tauri/src/lib.rs` exporta `pub fn run()` (Tauri builder del POS normal, ~150 líneas, con todos los commands ya registrados).

- `src/main.tsx` monta `<App />` dentro de `<ThemeProvider>` con initializeLogger + service worker registration.

- `src-tauri/tauri.conf.json` SIN `--cli` plugin. Los args se leen directo de `std::env::args()` en `main.rs`.

## Plan (compact)

### Paso 1 — Modificar `src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--install") {
        tpv_el_haido_lib::run_installer_mode()
    } else {
        tpv_el_haido_lib::run()
    }
}
```

### Paso 2 — Agregar `run_installer_mode()` en `src-tauri/src/lib.rs`

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ... existing POS setup (unchanged)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run_installer_mode() {
    tauri::Builder::default()
        .setup(|app| {
            // BrowserWindow con label "installer" + URL inicial index.html
            let win = tauri::WebviewWindowBuilder::new(
                app,
                "installer",
                tauri::WebviewUrl::App("index.html".into())
            )
            .title("TPV El Haido — Installer")
            .inner_size(800.0, 600.0)
            .resizable(false)
            .center()
            .build()?;

            Ok(())
        })
        // IPC commands del installer (stubs OK por ahora, TR-19.B enchufa los reales)
        .invoke_handler(tauri::generate_handler![
            // stubs (registrar aquí para que el frontend pueda tiparlos)
            // TR-19.B reemplaza estos con implementación real
            installer_stub::download,
            installer_stub::install,
            installer_stub::rollback,
            installer_stub::uninstall,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application in installer mode");
}

// Stubs para IPC — TR-19.B implementa los reales
mod installer_stub {
    use serde::Serialize;

    #[derive(Serialize)]
    struct ErrorPayload {
        code: String,
        message: String,
    }

    #[tauri::command]
    pub fn download(url: String, checksum_sha256: String) -> Result<String, String> {
        Err("installer:download not wired yet — see TR-19.B".into())
    }

    #[tauri::command]
    pub fn install(options: serde_json::Value) -> Result<String, String> {
        Err("installer:install not wired yet — see TR-19.B".into())
    }

    #[tauri::command]
    pub fn rollback(state: serde_json::Value) -> Result<(), String> {
        Ok(()) // stub no-op
    }

    #[tauri::command]
    pub fn uninstall(install_path: String) -> Result<(), String> {
        Err("installer:uninstall not wired yet — see TR-19.B.2".into())
    }
}
```

### Paso 3 — Modificar `src/main.tsx` (montar InstallerApp según window label)

```tsx
// Al final del archivo (reemplazar el render() actual):
import { InstallerApp } from '@/installer';
import App from './App';

async function bootstrap() {
  // ... existing logger init + service worker setup

  const isInstaller = await detectInstallerMode();
  const root = document.getElementById('root')!;

  if (isInstaller) {
    render(
      () => (
        <ThemeProvider>
          <InstallerApp language="es" />
        </ThemeProvider>
      ),
      root,
    );
  } else {
    render(
      () => (
        <ThemeProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </ThemeProvider>
      ),
      root,
    );
  }
}

async function detectInstallerMode(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const win = getCurrentWebviewWindow();
    return win.label === 'installer';
  } catch {
    return false;
  }
}

bootstrap();
```

### Paso 4 — Verificación

```bash
# Build + typecheck
bun run typecheck      # EXIT 0
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0

# Compile Rust binary
bunx tauri build --no-bundle  # EXIT 0

# Smoke test 1 — regression check POS normal
./src-tauri/target/release/tpv-el-haido    # debe abrir POS (label "main" o similar)

# Smoke test 2 — installer mode
./src-tauri/target/release/tpv-el-haido --install    # debe abrir Welcome step
```

### Paso 5 — Verificación con `cargo check` (Rust-specific)

```bash
cd src-tauri
cargo check    # EXIT 0
cargo build    # EXIT 0
```

## Reglas duras

- **NO tocar** `src/App.tsx`, `src/components/`, ni nada fuera de `src-tauri/src/{main,lib}.rs` y `src/main.tsx`
- **NO reemplazar** el flujo POS — `run()` sigue siendo el entrypoint normal
- **NO agregar deps nuevas** — usar `@tauri-apps/api/webviewWindow` que ya está instalado
- **NO commitear** — waxin hace el commit después de verificar
- **NO push** a remote
- **Worktree isolation OBLIGATORIO** — agent con `isolation: "worktree"` para no romper main

## Reporte esperado

Persiste a `/tmp/tr19a2-entrypoint-detection-<ts>.md` con:
- TL;DR (✓/✗ cada acceptance criterion)
- Diff resumido por archivo (main.rs, lib.rs, main.tsx)
- Output verbatim de verificaciones (typecheck, lint, build, cargo check)
- Smoke test results (POS normal + installer mode)
- Mockup ASCII del Welcome step renderizado en installer mode
- Stop reason
- Anomalías (especialmente Rust errors de compilación si aparecen)

## Notas para el executor

- **TR-19.A.3 (capabilities wire-up) es SIGUIENTE**, no este TR. Los IPC commands son stubs registrados en el builder pero NO se exponen via `tauri.conf.json` capabilities — eso es A.3.
- Si `cargo check` reporta errores de tipos (e.g., `WebviewWindowBuilder` API drift en Tauri 2.x), verifica la versión exacta en `src-tauri/Cargo.toml` y ajusta la API call. Reporta el drift.
- Si el smoke test 1 (POS normal sin flag) falla después de tus cambios → PARAR, eso es regression. Reporta.
- Si el smoke test 2 (--install) abre POS normal en vez de installer → bug en `detectInstallerMode()` o en el builder. Reporta con screenshot.

## Out of scope explícito (re-confirmado)

- ❌ Modificar `src/App.tsx` (POS normal sigue funcionando idéntico)
- ❌ Agregar capabilities en `tauri.conf.json` (TR-19.A.3)
- ❌ Implementar download/install real en Rust (TR-19.B)
- ❌ Wizard multi-step completo (TR-19.C)
- ❌ Modificar `scripts/install-linux.sh` (TR-19.D)