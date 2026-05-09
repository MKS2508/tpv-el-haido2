# TKT-08 - Update tauri.conf.json Updater Endpoints (sin GitHub)

**Milestone**: 0.4.0.C
**Priority**: 🔥 CRITICAL
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 30m
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

R1 D1 + D5 lockeadas: sacar GitHub completamente de la ecuación. El updater debe apuntar a `updates.mks2508.systems` (servido por tpv-cloud, TKT-07).

Estado actual `src-tauri/tauri.conf.json`:
```json
"updater": {
  "pubkey": "<minisign pubkey>",
  "endpoints": [
    "https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/latest.json"
  ]
}
```

Estado target (Tauri 2 syntax — `plugins.updater`, NO `bundle.updater`):
```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "<minisign pubkey, NO cambiar>",
      "endpoints": [
        "https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}"
      ],
      "windows": { "installMode": "passive" }
    }
  }
}
```

**Nota Tauri 2**: el `endpoints`, `pubkey`, `windows.installMode` van en `plugins.updater`, NO en `bundle.updater` (eso era Tauri 1). El `createUpdaterArtifacts` SÍ sigue en `bundle` (es build-time, genera `.nsis.zip` + `.sig` para OTA). Confirmado por decomposer TR-03 leyendo schema oficial.

Reemplaza TKT-01 (audit GitHub updater) — superseded por r1.

## Scope

### IN scope
- ✅ Editar `src-tauri/tauri.conf.json` updater section
- ✅ Verificar minisign pubkey en `plugins.updater.pubkey` sigue siendo válida (NO cambiar)
- ✅ Verificar `bundle.createUpdaterArtifacts: true` (build-time, genera `.nsis.zip` para OTA)
- ✅ Verificar Tauri 2 schema dinámico `{{target}}/{{arch}}/{{current_version}}` soportado en `plugins.updater.endpoints`
- ✅ Añadir `plugins.updater.windows.installMode: "passive"` para OTA silencioso (sin admin prompt)
- ✅ Verificar passphrase del private key (`tauri-keys/tpv-el-haido.key`) accesible — sino regenerar keypair
- ✅ Test local: `bun run tauri dev` → llamar `checkUpdate()` → ver request al endpoint nuevo
- ✅ Documentar el cambio en `/docs/deployment/releases.md` o similar

### OUT of scope
- ❌ Build NSIS (eso es TKT-04)
- ❌ Smoke test end-to-end OTA (TKT-10)
- ❌ Subir release a tpv-cloud (eso lo hace TKT-04)

## Dependencies

- **Blocks on**: TKT-07 (tpv-cloud) — el endpoint debe estar vivo y respondiendo correctamente para verificar request

## Acceptance Criteria

- [ ] **tauri.conf.json editado**: `plugins.updater.endpoints` apunta a `https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}` (NOTA: `plugins.updater`, no `bundle.updater` — Tauri 2 syntax)
- [ ] **GitHub URL eliminada**: ningún string `github.com/MKS2508/tpv-el-haido2/releases` en tauri.conf.json
- [ ] **plugins.updater.windows.installMode**: configurado como `"passive"`
- [ ] **bundle.createUpdaterArtifacts**: confirmado `true` (build-time, sigue en `bundle`)
- [ ] **Minisign pubkey**: verificada match con `tauri-keys/tpv-el-haido.key.pub` (fingerprint `22139D4B044E2153`) — NO cambiar key
- [ ] **Test request**: en dev mode, el updater hace GET al endpoint nuevo y recibe respuesta válida (200 con JSON o 204)
- [ ] **Docs**: pasos de release documentados (cómo subir nuevo binary + actualizar manifest)

## Technical Notes

### Schema Tauri 2 dinámico

Tauri sustituye automáticamente:
- `{{target}}` → `windows`, `darwin`, `linux`
- `{{arch}}` → `x86_64`, `aarch64`
- `{{current_version}}` → versión actual de la app instalada

Server (tpv-cloud) recibe la request con valores reales y compara semver.

### Multi-endpoint (optional, NO incluido en r1)

Tauri soporta array de endpoints (try in order, first 200 wins). r1 lockeó solo 1 endpoint (Coolify SLA suficiente para 1 cliente). Si en el futuro waxin quiere fallback, añadir aquí.

### Verification del minisign pubkey

```bash
# Pubkey actual en tauri.conf.json (base64)
PUBKEY=$(jq -r '.bundle.updater.pubkey' src-tauri/tauri.conf.json)

# Decode y verificar que parece minisign pubkey
echo "$PUBKEY" | base64 -d | head -2
# Esperado:
# untrusted comment: minisign public key: ...
# RWR... (key data)
```

NO regenerar la pubkey — si cambia, todos los clientes ya instalados rejectarán updates futuros.

### Test local

```bash
# 1. Build dev (con endpoint apuntando a updates.mks2508.systems)
bun run tauri dev

# 2. En DevTools de la app:
import { check } from '@tauri-apps/plugin-updater'
const update = await check()
console.log(update)
# Esperado: si tpv-cloud devuelve 204 → update is null
#           si devuelve 200 → update con shouldUpdate true
```

### Riesgos

- **Pubkey leak**: si waxin perdió el `tauri-private-key.key`, no se pueden firmar nuevos updates → clientes no aceptarán binaries. **Verificar acceso al private key ANTES** de cualquier flow de release.
- **Schema mismatch**: si tpv-cloud devuelve JSON con keys distintas a las esperadas por Tauri 2, updater falla silencioso. Schema esperado:
  ```json
  { "version", "notes", "pub_date", "url", "signature" }
  ```
- **HTTPS cert válido**: el cert de `updates.mks2508.systems` debe ser válido (Let's Encrypt vía Coolify). Si cert inválido, Tauri rechaza por default (`dangerousInsecureTransportProtocol: false` por defecto).

## Sub-tasks

- [ ] 1. Leer `src-tauri/tauri.conf.json` actual completo
- [ ] 2. Verificar acceso al private minisign key (NO commitear, solo verificar existe)
- [ ] 3. Editar `bundle.updater.endpoints` con URL nueva
- [ ] 4. Añadir `bundle.updater.windows.installMode: "passive"`
- [ ] 5. Confirmar `bundle.createUpdaterArtifacts: true`
- [ ] 6. Run `bun run tauri dev` y testear `check()` from DevTools
- [ ] 7. Verificar que la request llega a tpv-cloud (logs Coolify)
- [ ] 8. Crear/actualizar `/docs/deployment/releases.md` con pasos para release

## Blocked by

- TKT-07 (tpv-cloud deployed y healthy) — necesario para test request

## Blocks

- TKT-04 (build en bar) — necesita tauri.conf.json final
- TKT-10 (smoke test OTA) — necesita config correcta

## References

- Decision doc: [`r1`](../decisions/r1-deployment-architecture-2026-05-09.md)
- Tauri updater config: https://v2.tauri.app/plugin/updater/
- Schema v2 explained: research del agent2 en r1 prep
