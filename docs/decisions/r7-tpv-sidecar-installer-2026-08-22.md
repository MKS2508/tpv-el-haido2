---
type: adr
id: r7
title: Wizard Linux installer — Tauri sidecar pattern (Electron descartado)
status: locked
ts: 2026-08-22
lockedBy: waxin
supersedes: TR-19 scope original (Electron standalone)
affects:
  - track/wizard-linux-build
  - docs/research/wizard-linux-candidates-2026-08-22.md (winner cambia)
  - TR-19 (parent)
  - TR-19.A (reescrito a sidecar)
---

# r7 — Wizard Linux installer: Tauri sidecar (Electron descartado)

## Contexto

TR-19 research (`docs/research/wizard-linux-candidates-2026-08-22.md`) evaluó 5 candidatos y eligió **Electron standalone** (4.4/5) como winner. El plan A-E fue despachado con TR-19.A Electron scaffolding.

Waxin preguntó: **"electron? y tauri?"** — push-back legítimo. El proyecto es 100% Tauri 2; meter Electron introduce stack paralelo.

## Opciones evaluadas en esta re-evaluación

| Aspecto | Electron standalone | Tauri standalone | **Tauri sidecar (LOCKED)** |
|---|---|---|---|
| Bundle extra | ~150MB (Chromium embebido) | ~10-15MB (system webview) | **0MB** (reusa TPV) |
| Runtime | Chromium propio | system webview | system webview |
| Stack coherence | ❌ paralelo | ✅ mismo framework | ✅✅ **mismo binario** |
| Code signing Linux | docs maduros, tooling extra | tauri signing (mismo TPV) | reusa signing TPV |
| Auto-update installer | electron-updater separado | tauri-updater (mismo) | NA — viaja con TPV |
| Componentes UI | React + shadcn | React + shadcn | reusa TPV (theme, i18n) |
| DX maintenance | 2 runtimes/debuggers | 2 build pipelines | **1 binario, 1 release** |
| Esfuerzo | A-E ya planeados (~26-40h) | A-E similar (~24-36h) | refactor entrypoint (~2-3h) + A-E truncado |

## Decisión

**Tauri sidecar** — el instalador NO es un binario separado. Es el **mismo TPV El Haido ejecutándose en modo `--install`**. El entrypoint (`src-tauri/src/lib.rs`) detecta el flag y monta el wizard installer en vez del POS.

```bash
# Lo que el usuario hace:
./tpv-el-haido-0.1.0.AppImage                    # abre POS normal
./tpv-el-haido-0.1.0.AppImage --install          # monta wizard installer
./tpv-el-haido-0.1.0.AppImage --install --uninstall  # uninstall flow
```

## Trade-offs aceptados

- **Costo upfront**: refactor del entrypoint del TPV (~2-3h). Branch en `main()` que dispatchea a `InstallerApp` o `PosApp`.
- **Costo conceptual**: el código del installer vive en `src/installer/` dentro del proyecto TPV (no en `apps/installer-linux/`). Esto es feature, no bug — un dev que toca el installer ya está en el codebase del TPV.
- **`scripts/install-linux.sh` deprecado**: el bash install se reemplaza por un wrapper que ejecuta `./tpv-el-haido.AppImage --install`. El bash actual se queda como fallback ultra-minimalista (`chmod +x`, link simbólico) por si el AppImage falla.

## Cambios concretos

1. `src-tauri/src/lib.rs` — branch en `main()`:
   ```rust
   fn main() {
     if std::env::args().any(|a| a == "--install") {
       tauri::Builder::default()
         .setup(|app| { /* mount InstallerApp */ })
         .run(tauri::generate_context!())
     } else {
       // existing POS flow
     }
   }
   ```

2. `src/installer/` (nuevo dir dentro del TPV):
   ```
   src/installer/
   ├── InstallerApp.tsx           # entrypoint UI del installer
   ├── steps/                     # 7 steps reusando shadcn/ui + theme TPV
   ├── services/release-hub.ts    # signed artifact downloader
   ├── services/install.ts        # file ops + .desktop registration
   └── ipc/handlers.ts            # Tauri commands (download, install, rollback)
   ```

3. `scripts/install-linux.sh` — reemplazar bash install por wrapper de sidecar:
   ```bash
   #!/usr/bin/env bash
   # Wrapper: ejecuta el installer mode del AppImage
   APPIMAGE_DIR="$HOME/.local/share/tpv-el-haido"
   APPIMAGE="$APPIMAGE_DIR/tpv-el-haido.AppImage"
   mkdir -p "$APPIMAGE_DIR"
   # ... (mover AppImage desde Downloads si existe)
   chmod +x "$APPIMAGE"
   "$APPIMAGE" --install
   ```

4. **TR-19.A reescrito** — `docs/task-requests/TR-19-A-sidecar-bootstrap.md`:
   - Setup entrypoint branch (`--install` detection)
   - Welcome step mínimo reusando `<Card>`/`<Button>` del TPV
   - IPC contract locked: `installer:download`, `installer:install`, `installer:rollback`
   - Smoke test: `./tpv-el-haido.AppImage --install` monta wizard

5. **TR-19.B/C/D/E** — aplican idénticos pero contra `src/installer/` en vez de `apps/installer-linux/`. B∥C paralelizable via worktree siblings (single-writer solo en `src/installer/ipc/contracts.ts`).

6. **Research addendum** — `docs/research/wizard-linux-candidates-2026-08-22.md`:
   - Winner cambia de **Electron 4.4/5** → **Tauri sidecar** (nueva evaluación interna)
   - Razón: stack coherence + bundle size + DX
   - El análisis de los 5 candidatos sigue siendo válido como contexto

## Out of scope MVP (consistente con r6 + esta decisión)

- `/opt/tpv-el-haido` (root install) — excluido del MVP. Solo `~/.local/bin` (user-level).
- Wizard first-launch post-instalación (separado, Tauri-native, otro track futuro).
- macOS/Windows installer (Linux only).

## Riesgos identificados

1. **Refactor del entrypoint rompe tests del TPV** — mitigación: el branch `--install` solo se activa con flag explícito; path normal intacto. Smoke test: `bun run tauri build && ./AppImage` (sin flag) debe abrir POS.
2. **Sidecar installer crece bundle del TPV** si mete código de download + install + i18n — mitigación: lazy-load del módulo `src/installer/` (no se incluye en el bundle del POS normal, solo se carga cuando `--install` está presente).
3. **Code signing cubre installer + POS** — el binario es uno, el signing también. Trade-off positivo.
4. **`scripts/install-linux.sh` deprecado** — usuarios existentes que usaron el bash install pueden romper. Mitigación: el wrapper bash ejecuta sidecar con fallback mínimo.

## Validación post-decisión

- [ ] TR-19.A reescrito como sidecar bootstrap
- [ ] Research addendum publicado (winner actualizado)
- [ ] SSOT `track/wizard-linux-build` notes actualizadas con sidecar approach
- [ ] TR-18 (gemini integration) cerrado como `done (partial)` + TR-18.b abierto si se quiere integrar AI-notes
- [ ] Working tree commit consolidado (install gemini + scripts + sidecar scaffolding + research addendum)

## Locked por

waxin, 2026-08-22, "la que quieras. dale" en respuesta a la pregunta sobre Electron vs Tauri.