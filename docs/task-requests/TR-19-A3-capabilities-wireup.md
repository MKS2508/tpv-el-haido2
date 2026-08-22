---
type: task-request
id: TR-19.A.3
title: capabilities-wireup — registrar installer IPC commands en tauri.conf.json
status: open
priority: medium
zone: client
ts: 2026-08-22
parent: TR-19
parentMilestone: track/wizard-linux-build
blockedBy: [TR-19.A.2]
effort: small
lockedBy: r7-tpv-sidecar-installer-2026-08-22
acceptance:
  - `src-tauri/tauri.conf.json` capabilities incluye 4 comandos installer:
    installer:download, installer:install, installer:rollback, installer:uninstall
  - `src-tauri/capabilities/installer.json` (o equivalente) con permisos para
    file ops, dialog (file picker), http (download), shell (chmod/install)
  - Smoke test: el frontend puede invocar `invoke('installer:download', ...)` sin error de permissions
  - bun run typecheck + bun run lint + bun run build EXIT 0
  - 0 nuevos errores lint
outOfScope:
  - Implementar handlers reales (eso es TR-19.B)
  - Modificar capabilities del POS (eso es TR-19.A.3.POS, separado)
---

# TR-19.A.3 — capabilities-wireup

## Contexto

TR-19.A.2 (entrypoint-detection) registró 4 IPC command stubs en `lib.rs`:
`installer:download`, `installer:install`, `installer:rollback`, `installer:uninstall`.

**Sin registrar en capabilities, los comandos no son invocables desde el frontend.** Tauri 2.x requiere lista explícita en `tauri.conf.json` capabilities o `capabilities/*.json`.

Este TR wire el permiso. **5 min agent inline, sin worktree** (scope chiquito).

## Plan (compact)

### Paso 1 — Crear `src-tauri/capabilities/installer.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "installer-capability",
  "description": "Permisos para el installer mode (--install flag). Se carga SOLO en windows con label 'installer'.",
  "windows": ["installer"],
  "permissions": [
    "core:default",
    "core:webview:allow-create-webviewWindow",
    "core:window:allow-close",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-dir",
    "fs:allow-mkdir",
    "fs:allow-exists",
    "http:default",
    "shell:default",
    "shell:allow-execute",
    "shell:allow-open",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "update-desktop-database",
          "cmd": "update-desktop-database",
          "args": ["~/.local/share/applications"]
        },
        {
          "name": "chmod",
          "cmd": "chmod",
          "args": ["+x", { "validator": ".+" }]
        }
      ]
    }
  ]
}
```

(Si el formato diffiere de cómo está estructurado el capabilities actual del proyecto, ajustar — el agent debe LEER `src-tauri/capabilities/default.json` PRIMERO para mantener consistencia.)

### Paso 2 — Verificar `src-tauri/tauri.conf.json` no necesita cambios

Probablemente `tauri.conf.json` ya tiene `"app.security.capabilities"` apuntando a un dir. Si está apuntando a `capabilities/*.json` (multi-file), entonces agregar `installer.json` al dir basta. Si apunta a un solo archivo, hay que merger el installer permissions al existente.

### Paso 3 — Verificar invocación

Crear smoke test mínimo en `src/installer/__smoke__.ts` (temporal, NO commitear):

```typescript
import { invoke } from '@tauri-apps/api/core'
try {
  await await invoke('installer:download', { url: 'test', checksumSha256: 'a'.repeat(64) })
} catch (e) {
  // Esperamos error porque el stub retorna Err(\"not wired yet — see TR-19.B\")
  // Lo importante es que NO sea error de permissions
  console.assert(!String(e).includes('not allowed') && !String(e).includes('permission'))
}
```

### Paso 4 — Verificación

```bash
bun run typecheck      # EXIT 0
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0
bunx tauri build --no-bundle  # EXIT 0 (compila capabilities)
```

## Reglas duras

- **NO tocar** `src-tauri/capabilities/default.json` (POS permissions, separado)
- **NO modificar** `src-tauri/src/lib.rs` (eso es TR-19.B)
- **NO commitear** smoke test files (temporales)
- **NO push** a remote
- **REPORTE A FICHERO**: `/tmp/tr19a3-capabilities-wireup-<ts>.md` con frontmatter + diff + verificaciones + smoke test output

## Skills on-demand

- `guidelines` — coding rules
- `axon-artifacts` — schema reportes

## Output esperado

Reporte en `/tmp/tr19a3-capabilities-wireup-<ts>.md` + resumen 3-5 bullets.