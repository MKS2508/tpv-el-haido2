---
type: handoff
unit: lane-tpv-full-channel-kill
target_lane: tpv-full-channel-kill
status: queued
created: 2026-08-29
priority: P2 (elimina 404 roto en prod)
base: main
scope: src-tauri/, src/{services,hooks,components,App.tsx,Sections/SettingsPanel.tsx}, src-tauri/Cargo.toml, src-tauri/tauri.conf.json
out_of_scope: hub (desktop-release-hub), wraith-linux, mks-ota crate, ota/* (parcial D10-D)
---

# tpv-full-channel-kill

Matar el canal OTA **full** de tpv-el-haido2 (que estaba usando `tauri-plugin-updater`
con endpoint 404 desde M6 — 2026-08-28). El canal OTA **parcial** vía `mks-ota`
queda intacto (es el usado por D10-D para bundle OTA sin tocar el binario).

El módulo `src-tauri/src/ota/mod.rs:3` ya documenta: "Convive con el canal nativo
(`tauri-plugin-updater`) sin mezclarse". Tras esta lane, solo queda `mks-ota`.

## Cambios (orden top-down)

### Tier 1: Rust / Tauri config

#### 1. `src-tauri/Cargo.toml`
Eliminar líneas 25-26:
```
tauri-plugin-updater = "^2"
tauri-plugin-process = "^2"
```

#### 2. `src-tauri/src/lib.rs`
Eliminar línea 570:
```rust
        .plugin(tauri_plugin_updater::Builder::new().build())
```
Verificar que NO quede `tauri_plugin_updater` ni `tauri_plugin_process` en el archivo.

#### 3. `src-tauri/tauri.conf.json`
Eliminar el bloque entero `plugins.updater` (líneas 57-67):
```json
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IERCMEJCRjQ0MzM0RUJCQjEKUldTeHUwNHpSTDhMMjUwd042MUg0eHZhU1c4R21BR0JPSVB0cW1SYkt3NkM5Wk5sQzlWcmxVVVUK",
      "endpoints": [
        "https://haido.releases.mks2508.systems/api/updates/linux/{{arch}}/{{current_version}}"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
```
Tras la edición, el archivo termina con `}` (último `bundle` close).

### Tier 2: Frontend (TS/Solid)

#### 4. `src/services/platform/TauriPlatformService.ts`
- Línea 4: eliminar `import { relaunch } from '@tauri-apps/plugin-process';`
- Línea 5: eliminar `import { check, type Update } from '@tauri-apps/plugin-updater';`
- Líneas 35: eliminar `private cachedUpdate: Update | null = null;`
- Líneas 97-144 (sección UPDATER entera): eliminar `checkForUpdates()` y `downloadAndInstall()`
- Si el campo `cachedUpdate` era el único uso del tipo `Update`, eliminar también el import que ya está quitado

La interfaz `PlatformService` puede mantener `checkForUpdates()` y `downloadAndInstall()`
como stubs no-op o eliminarlos. Decisión: **eliminarlos de la interfaz** y de la clase.
Si otros PlatformService impls los tienen, también quitar.

#### 5. `src/hooks/useUpdater.ts`
**Kill file.** Eliminar el archivo completo. El hook es 100% updater plugin.

#### 6. `src/components/UpdateChecker.tsx`
**Kill file.** Eliminar el archivo completo. Auto-check on mount y dialogs de
download desaparecen. El operador no verá UI de "Update available" — esto es
intencional: el canal full estaba roto, y el parcial es transparente.

#### 7. `src/components/VersionInfo.tsx`
Matar el uso del hook, mantener la página de "acerca de" simplificada:
- Línea 15: eliminar `import { useUpdater } from '@/hooks/useUpdater';`
- Líneas 27-37: eliminar la desestructuración de useUpdater
- Línea 39-53 (onMount que carga versión): MANTENER — sigue leyendo `@tauri-apps/api/app`
- Líneas 55-58 (`handleCheck`): eliminar
- Líneas 60-72 (`progressPercent`, `formatLastChecked`): eliminar (eran del updater)
- Líneas 75-77 (`onMount(() => void handleCheck())`): eliminar
- Líneas 136-273 (sección "Estado de actualizaciones" + progress + botones Update): eliminar
- Líneas 274-287 (Info adicional): mantener
- Líneas 288-305 (Sistema actualizable): eliminar (era copy engañosa — full update ya no aplica, solo parcial)
- Líneas 306-324 (Protección por licencia): mantener
- Líneas 326-350 (Información del producto): mantener

El componente queda con: header, datos beneficiario, info adicional, protección
por licencia, info producto. Sin la sección de updates.

#### 8. `src/App.tsx`
- Línea 36: eliminar `import UpdateChecker from '@/components/UpdateChecker';`
- Buscar dónde se usaba `<UpdateChecker />` (probablemente en algún layout) y
  eliminar el JSX

#### 9. `src/components/Sections/SettingsPanel.tsx`
- Línea 64: el import `import VersionInfo from '@/components/VersionInfo';` SE MANTIENE
  (VersionInfo sigue existiendo, solo cambia contenido)

### Tier 3: Verificación

```bash
# 1. Cero refs al plugin updater en todo el repo (excluyendo node_modules/target)
grep -rn "tauri-plugin-updater\|tauri_plugin_updater\|@tauri-apps/plugin-updater\|@tauri-apps/plugin-process" . \
  --include="*.toml" --include="*.rs" --include="*.json" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=target --exclude-dir=dist
# Expected: 0 matches

# 2. useUpdater NO se importa en ningún sitio
grep -rn "from '@/hooks/useUpdater'\|from '../hooks/useUpdater'" src/ --include="*.ts" --include="*.tsx"
# Expected: 0 matches

# 3. OTA parcial intacto
grep -rn "mks_ota\|ota/" src-tauri/src/ --include="*.rs"
# Expected: matches intactos (ota/poller.rs, ota/mod.rs, etc.)

# 4. Typecheck
bun run typecheck
# Expected: 0 errors

# 5. Frontend build (si hay script de build precommit)
bun run build
# Expected: 0 errors
```

## NO TOCAR (out of scope)

- `src-tauri/src/ota/` (parcial D10-D) — intacto
- `mks-ota` dep en Cargo.toml:50 — esencial
- Hub (desktop-release-hub) — NO añadir endpoint Tauri-shape (lo arreglaremos después)
- `tauri-plugin-opener`, `tauri-plugin-http`, `tauri-plugin-shell`, `tauri-plugin-dialog`
  — otros plugins, intactos

## Trade-off conocido (UX)

El operador del TPV **ya no ve** el UI "Nueva versión disponible / Actualizar ahora"
en Ajustes. Las actualizaciones del binario completo requieren un nuevo deploy
externo (rebuild + reinstalar AppImage/deb). Las actualizaciones OTA del bundle
(hooks, skills, contenido parcial) siguen aplicándose transparentes vía `mks-ota`
en runtime, sin UI.

Esto es **menos deuda que D** (dejar TODO como está con 404 silencioso) porque:
- Elimina config muerta que miente
- Elimina el try/catch silencioso en useUpdater.ts:222-230 que ocultaba el 404
- Deja un único canal documentado (`mks-ota`)
- El "downside UX" no es real: el feature no funcionaba de todas formas

## Smoke E2E (lo haré yo tras merge)

```bash
# OTA parcial sigue vivo
$ curl "https://haido.releases.mks2508.systems/api/components/haido-frontend/latest?target=any&arch=any"
# Expected: 200 + JSON con manifest
```

## Report contract

Persiste tu reporte a `/tmp/tpv-full-channel-kill-report.md` ANTES de terminar
(waxin lock 2026-08-18: return value de agente idle se pierde, fichero sobrevive).
Schema axon-artifacts estándar.
