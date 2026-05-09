# TKT-10 - Smoke Test OTA End-to-End

**Milestone**: 0.4.0.E
**Priority**: 🔥 CRITICAL
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 30m
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

R1 D9: validation final que el ciclo OTA funciona end-to-end antes de declarar 0.4.0 done. Smoke test = bumpear version, publicar release, verificar que la app en el bar detecta + descarga + instala + restart correcto.

Sin este test, no sabemos si TKT-04 (build en bar) y TKT-07/08 (cloud + endpoints) están realmente coordinados.

## Scope

### IN scope
- ✅ Bumpear version local (0.4.0 → 0.4.1) en `package.json` + `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml`
- ✅ Build NSIS local en máquina del bar (ya tiene toolchain por TKT-04)
- ✅ Tauri build con `createUpdaterArtifacts: true` genera 4 archivos:
  - `setup.exe` + `setup.exe.sig` (first install manual)
  - `setup.nsis.zip` + `setup.nsis.zip.sig` (**OTA — lo que Tauri descarga**)
- ✅ Subir los 4 archivos al volume Coolify (`/srv/binaries/dl/0.4.1/`)
- ✅ Insertar row en `releases` table:
  ```sql
  INSERT INTO releases (version, target, arch, url, signature, pub_date, notes)
  VALUES ('0.4.1', 'windows', 'x86_64', 'https://updates.mks2508.systems/dl/0.4.1/...', '<sig>', NOW(), 'Smoke test OTA');
  ```
- ✅ Abrir TPV en máquina del bar (versión 0.4.0 instalada)
- ✅ Trigger update check (manual o automatic on startup)
- ✅ Verificar: download → minisign verify → install → restart → app es 0.4.1

### OUT of scope
- ❌ Code signing Authenticode (deferred 0.3.0)
- ❌ Rollback procedure formal (manual fallback OK por ahora)
- ❌ Multi-device test (un solo cliente bar inicial)

## Dependencies

- TKT-04 (build en bar done, app 0.4.0 instalada y running)
- TKT-07 (tpv-cloud deployed y healthy)
- TKT-08 (tauri.conf.json apunta a updates.mks2508.systems)

## Acceptance Criteria

- [ ] **Build 0.4.1**: 4 artefactos generados — `.exe`, `.exe.sig`, `.nsis.zip`, `.nsis.zip.sig`
- [ ] **Upload OK**: 4 archivos en `/srv/binaries/dl/0.4.1/`, todos accesibles via HTTPS
- [ ] **DB row**: `releases.url` apunta al **`.nsis.zip`** (no `.exe`), `releases.signature` es contenido del **`.nsis.zip.sig`**
- [ ] **Endpoint test**: `curl https://updates.mks2508.systems/updates/windows/x86_64/0.4.0` → 200 con JSON v2 apuntando al `.nsis.zip` 0.4.1
- [ ] **Endpoint test**: `curl https://updates.mks2508.systems/updates/windows/x86_64/0.4.1` → 204 No Content
- [ ] **Cliente detecta**: TPV 0.4.0 al hacer `check()` retorna `update.shouldUpdate = true` con version 0.4.1
- [ ] **Download OK**: `update.downloadAndInstall()` descarga sin errors
- [ ] **Minisign verify**: la firma se valida (sin error de signature mismatch)
- [ ] **Install OK**: NSIS installer corre en passive mode (sin admin prompt)
- [ ] **Restart OK**: app cierra + arranca en 0.4.1
- [ ] **Functional check**: app 0.4.1 abre, login funciona, crea orden test, license valida

## Technical Notes

### Comandos para upload del binary

```bash
# Desde Mac/laptop con SSH a lab1
LAB1=lab1-helsinki  # tu alias SSH
VERSION=0.4.1

# Upload los 4 archivos (exe = first install, nsis.zip = OTA)
scp ./setup-build/TPV-El-Haido_${VERSION}_x64-setup.exe \
    ./setup-build/TPV-El-Haido_${VERSION}_x64-setup.exe.sig \
    ./setup-build/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip \
    ./setup-build/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig \
    $LAB1:/data/coolify/applications/<tpv-cloud-uuid>/binaries/dl/${VERSION}/

# Verify ambos accesibles (.exe para humanos, .nsis.zip para Tauri OTA)
curl -I https://updates.mks2508.systems/dl/${VERSION}/TPV-El-Haido_${VERSION}_x64-setup.exe
curl -I https://updates.mks2508.systems/dl/${VERSION}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip
# Esperado: 200 OK ambos
```

### Insertar row en `releases` table

Idealmente vía endpoint admin del tpv-cloud (si lo añadimos), o directo SQL:

```bash
# Via coolify-cli exec a tpv-cloud-db
coolify-cli exec tpv-cloud-db "psql -U postgres -d tpv_cloud -c \"
INSERT INTO releases (version, target, arch, url, signature, pub_date, notes)
VALUES (
  '0.4.1',
  'windows',
  'x86_64',
  'https://updates.mks2508.systems/dl/0.4.1/TPV-El-Haido_0.4.1_x64-setup.nsis.zip',
  '<contenido de TPV-El-Haido_0.4.1_x64-setup.nsis.zip.sig>',
  NOW(),
  'Smoke test OTA'
);\""
```

**TODO TKT-07.X** (post-MVP): añadir endpoint POST `/admin/releases` autenticado para insertar releases sin SQL directo.

### Trigger update check desde TPV

```typescript
// En TPV (SolidJS)
import { check } from '@tauri-apps/plugin-updater'

const update = await check()
if (update?.available) {
  console.log(`Update available: ${update.version}`)
  await update.downloadAndInstall()
  // App restart automático tras install (passive mode)
}
```

Si TPV ya tiene `useUpdater.ts` con UI, usar ese flow. Si solo es startup auto-check, esperar 30s tras login y verificar.

### Verificación logs

```bash
# Server side
coolify-cli logs tpv-cloud --since 5m
# Esperado: GET /updates/windows/x86_64/0.4.0 → 200 (con request del cliente)

# Cliente side (TPV en bar)
# Abrir DevTools de Tauri → Console
# Esperado: logs de check, download, install
```

### Riesgos

- **Pubkey/sig mismatch**: si firmas con clave distinta a la del pubkey en tauri.conf.json → cliente rechaza. Verificar `tauri-private-key.key` accesible y matches pubkey antes de build.
- **HTTPS cert**: cert válido para `updates.mks2508.systems` (Let's Encrypt vía Coolify). Si invalid, Tauri rechaza por default.
- **Volume path**: el path real del volume en lab1 puede no ser `/data/coolify/applications/...` — verificar via Coolify UI o `coolify-cli show tpv-cloud`.
- **NSIS install path**: passive mode instala bajo `%LOCALAPPDATA%`. Si version anterior estaba en otra ruta (por ejemplo `Program Files` con MSI), update fallaría. Verificar que TKT-04 instaló en current user mode.
- **Database row con sig escaped**: el contenido del `.sig` tiene multi-líneas, escapar correctamente en SQL (usar dollar-quoted strings `$$...$$` o herramienta segura).

## Sub-tasks

- [ ] 1. Bump version a 0.4.1 en package.json + tauri.conf.json + Cargo.toml
- [ ] 2. Build NSIS en máquina del bar
- [ ] 3. Verificar setup.exe + .sig generados
- [ ] 4. SCP files al volume Coolify lab1
- [ ] 5. INSERT row en releases table tpv-cloud-db
- [ ] 6. curl endpoint check: 0.4.0 → 200, 0.4.1 → 204
- [ ] 7. En TPV (bar): trigger check() o esperar auto-check
- [ ] 8. Verificar download + install + restart sin errors
- [ ] 9. App nueva 0.4.1: login + orden test + license OK
- [ ] 10. Documentar findings (logs, timing, errores) en este ticket

## Blocked by

- TKT-04 (build en bar done)
- TKT-07 (tpv-cloud healthy)
- TKT-08 (tauri.conf.json updated)

## Blocks

- TKT-11 (cleanup license-server old) — solo cleanup tras smoke OK

## Findings

*(Post-execución)*

- Tiempo total flow OTA:
- Errors encontrados:
- Performance subjective:
- Improvements para próximo release:

## References

- TKT-04, TKT-07, TKT-08 (depencies)
- Tauri updater docs: https://v2.tauri.app/plugin/updater/
- r1 decision: D5 (endpoints), D9 (orden execution)
