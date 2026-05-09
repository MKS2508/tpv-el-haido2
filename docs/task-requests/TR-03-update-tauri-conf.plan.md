---
type: task-plan
source: docs/task-requests/TR-03-update-tauri-conf.md
status: draft
changes: 2
effort: pequeno
commit-strategy: single
commit-prefix: feat-phase(0.4.0.C)
---

# TR-03 Plan — Update tauri.conf.json Updater Endpoints

> Generado por task-decomposer. Ejecutor: NO modificar código fuera de `src-tauri/tauri.conf.json`
> y `docs/deployment/releases.md`. Decision doc lockeada: `docs/decisions/r1-deployment-architecture-2026-05-09.md` (D5).

---

## Pre-flight checks (verificar antes de tocar nada)

```bash
# 1. Git status limpio
git status
# Esperado: solo cambios en .claude/ o limpio

# 2. Verificar private key accesible (CRÍTICO — abort si missing)
ls -la "tauri-keys/tpv-el-haido.key"
# ESPERADO: archivo existe, permisos -rw-------
# Si no existe → ABORT. Sin private key no se pueden firmar releases futuros.

# 3. Verificar que el pubkey en tauri.conf.json coincide con tpv-el-haido.key.pub
PUBKEY_CONF=$(python3 -c "import json; d=json.load(open('src-tauri/tauri.conf.json')); print(d['plugins']['updater']['pubkey'])")
PUBKEY_DECODED=$(echo "$PUBKEY_CONF" | base64 -d)
PUBKEY_FILE=$(cat "tauri-keys/tpv-el-haido.key.pub")
echo "=== pubkey en tauri.conf.json (decoded) ==="
echo "$PUBKEY_DECODED"
echo "=== pubkey en tauri-keys/tpv-el-haido.key.pub ==="
echo "$PUBKEY_FILE"
# ESPERADO: ambas líneas muestran "22139D4B044E2153" en el fingerprint
# La clave raw debe ser: RWRTIU4ES50TIuj15TqtqdXx/+ZPOrsIutgA1Nx4LKXCqe997jlvyOkf

# 4. Confirmar createUpdaterArtifacts está en true (ya verificado en research)
python3 -c "import json; d=json.load(open('src-tauri/tauri.conf.json')); print('createUpdaterArtifacts:', d['bundle']['createUpdaterArtifacts'])"
# ESPERADO: createUpdaterArtifacts: True

# 5. TR-02 status (tpv-cloud debe estar deployed para test real)
curl -s --max-time 5 https://updates.mks2508.systems/health || echo "NOT REACHABLE (tr-02 pendiente)"
# ESPERADO para test completo: {"status":"ok","version":"0.1.0","db":"connected"}
# Si NOT REACHABLE: Phase C (test local) solo valida que la request sale. Phase D skip hasta TR-02 complete.
```

**Blockers hard**:
- Si `tauri-keys/tpv-el-haido.key` no existe → **ABORT completo**. Sin private key, cualquier release que se construya con esta config no podrá firmarse.
- Si el fingerprint del pubkey en `tauri.conf.json` NO es `22139D4B044E2153` → **INVESTIGAR antes de editar**.

**Warning (NO blocker)**:
- `tauri-signing.pub` contiene un pubkey DISTINTO (`CF5C37360EC34A45`). Este archivo es una key rotada o de prueba anterior. **Ignorar completamente** — el pubkey activo es el de `tauri-keys/tpv-el-haido.key.pub`.

---

## Tabla de cambios

| Archivo | Linea | Tipo | Descripcion |
|---------|-------|------|-------------|
| `src-tauri/tauri.conf.json` | 58-60 | EDIT | Reemplazar `plugins.updater.endpoints` (GitHub URL → `updates.mks2508.systems`) |
| `src-tauri/tauri.conf.json` | 60 (nuevo) | ADD | Añadir `plugins.updater.windows.installMode: "passive"` |
| `docs/deployment/releases.md` | — | CREATE | Guía completa del proceso de release |

---

## Phase A — Verify minisign keys

**Estimación**: 5 min
**Criterio de cierre**: Pubkey confirmada, private key accesible, fingerprints coinciden.

### A.1 — Verificar fingerprint match

```bash
# Extraer y decodificar pubkey actual del tauri.conf.json
python3 -c "
import json, base64
d = json.load(open('src-tauri/tauri.conf.json'))
pubkey_b64 = d['plugins']['updater']['pubkey']
decoded = base64.b64decode(pubkey_b64).decode()
print('Decoded pubkey from tauri.conf.json:')
print(decoded)
"
# ESPERADO:
# untrusted comment: minisign public key: 22139D4B044E2153
# RWRTIU4ES50TIuj15TqtqdXx/+ZPOrsIutgA1Nx4LKXCqe997jlvyOkf

# Comparar con el archivo .pub en disco
cat tauri-keys/tpv-el-haido.key.pub
# ESPERADO: líneas idénticas a las de arriba

# Verificar que tauri-keys/tpv-el-haido.key existe y tiene contenido
wc -c tauri-keys/tpv-el-haido.key
# ESPERADO: >100 bytes (es el private key encriptado en base64)
```

**Nota**: El `tauri-signing.pub` (fingerprint `CF5C37360EC34A45`) es una key diferente — probablemente de una sesión de testing previa. NO confundir. El private key activo que corresponde al pubkey embebido en `tauri.conf.json` es `tauri-keys/tpv-el-haido.key` (fingerprint `22139D4B044E2153`).

### A.2 — Verificar TAURI_SIGNING_PRIVATE_KEY para builds

```bash
# El private key está en tauri-keys/tpv-el-haido.key (base64 encriptado)
# Para builds de producción se necesita este env var:
cat tauri-keys/tpv-el-haido.key | head -1
# Verificar que es base64 (empieza con "dW50cn..." que es "untrusted comment")

# El .env del proyecto lo tiene declarado?
grep -i "TAURI_SIGNING\|TAURI_PRIVATE" .env 2>/dev/null || echo "not in .env"
# Si está en .env, bien. Si no, el ejecutor debe saber dónde está.
```

**Gap aclarado**: El private key está en `tauri-keys/tpv-el-haido.key`. Es un archivo encriptado con contraseña (rsign format, visible por el header "rsign encrypted secret key"). El executor necesita conocer la **passphrase** para usarlo en builds (`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env var). Verificar que está documentada o en `.env`.

---

## Phase B — Edit tauri.conf.json

**Estimación**: 5 min
**Criterio de cierre**: `src-tauri/tauri.conf.json` editado con diff exacto. `grep github.com/MKS2508` devuelve vacío.

### B.1 — Diff exacto

**SCHEMA TAURI 2**: El updater en Tauri 2 vive en `plugins.updater` (NO en `bundle.updater`). El config `windows.installMode` también va dentro de `plugins.updater`. El `createUpdaterArtifacts: true` vive en `bundle` (ya está correcto).

**Estado actual** (líneas 56-62 de `src-tauri/tauri.conf.json`):
```json
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDIyMTM5RDRCMDQ0RTIxNTMKUldSVElVNEVTNTBUSXVqMTVUcXRxZFh4LytaUE9yc0l1dGdBMU54NExLWENxZTk5N2psdnlPa2YK",
      "endpoints": [
        "https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/latest.json"
      ]
    }
  }
```

**Estado target** (post-edit):
```json
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDIyMTM5RDRCMDQ0RTIxNTMKUldSVElVNEVTNTBUSXVqMTVUcXRxZFh4LytaUE9yc0l1dGdBMU54NExLWENxZTk5N2psdnlPa2YK",
      "endpoints": [
        "https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
```

**Cambios exactos**:
1. Reemplazar `https://github.com/MKS2508/tpv-el-haido2/releases/latest/download/latest.json` por `https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}`
2. Añadir bloque `"windows": { "installMode": "passive" }` después del array `endpoints`
3. **pubkey: NO TOCAR** — idéntica a la actual

### B.2 — Verification post-edit

```bash
# Verificar GitHub URL eliminada
grep "github.com" src-tauri/tauri.conf.json
# ESPERADO: sin output (0 coincidencias)

# Verificar endpoint nuevo
grep "updates.mks2508.systems" src-tauri/tauri.conf.json
# ESPERADO: 1 línea con la URL

# Verificar installMode passive
grep "passive" src-tauri/tauri.conf.json
# ESPERADO: 1 línea con "passive"

# Verificar pubkey intacta
python3 -c "
import json, base64
d = json.load(open('src-tauri/tauri.conf.json'))
pubkey = d['plugins']['updater']['pubkey']
decoded = base64.b64decode(pubkey).decode()
assert '22139D4B044E2153' in decoded, 'PUBKEY FINGERPRINT CHANGED - ABORT'
assert 'RWRTIU4ES50TIuj15TqtqdXx' in decoded, 'PUBKEY RAW KEY CHANGED - ABORT'
print('OK: pubkey unchanged, fingerprint 22139D4B044E2153')
"
# ESPERADO: "OK: pubkey unchanged, fingerprint 22139D4B044E2153"

# Verificar JSON válido
python3 -c "import json; json.load(open('src-tauri/tauri.conf.json')); print('JSON valid')"
# ESPERADO: "JSON valid"

# Verificar createUpdaterArtifacts intacto
python3 -c "
import json
d = json.load(open('src-tauri/tauri.conf.json'))
assert d['bundle']['createUpdaterArtifacts'] == True
print('OK: createUpdaterArtifacts=true')
"
# ESPERADO: "OK: createUpdaterArtifacts=true"
```

---

## Phase C — Test local request

**Estimación**: 10-15 min
**Criterio de cierre**: `check()` desde DevTools emite una request HTTP visible a `updates.mks2508.systems`. La response es procesable por Tauri (no crash).

**Prerequisito**: TR-02 (tpv-cloud) debe estar deployed y healthy. Si no lo está, Phase C solo valida que la URL está bien formada — la request saldrá pero recibirá connection refused o timeout.

### C.1 — Arrancar dev mode

```bash
bun run tauri dev
# Esperar a que abre la ventana de la app
# NO cerrar la terminal
```

### C.2 — Llamar check() desde DevTools

En la ventana de la app Tauri, abrir DevTools (F12 o Cmd+Opt+I en macOS):

```javascript
// En la consola de DevTools:
const { check } = await import('@tauri-apps/plugin-updater')
const update = await check()
console.log('update result:', JSON.stringify(update, null, 2))
```

**Resultados esperados**:
- Si tpv-cloud deployed + running + DB vacía (sin releases): `update` es `null` (204 No Content)
- Si tpv-cloud deployed + running + release insertada mayor que 0.1.0: `update.shouldUpdate = true`
- Si tpv-cloud NOT deployed: exception `NetworkError` o similar — la URL está bien, el server no responde

**Lo que importa en Phase C**: Que la request sale hacia `updates.mks2508.systems` (NO a github.com). Verificar en Network tab de DevTools.

### C.3 — Verificar en Network tab

1. En DevTools → Network tab
2. Filtrar por `updates.mks2508.systems` o simplemente ver todas las requests
3. Buscar request a `https://updates.mks2508.systems/updates/windows/x86_64/0.1.0`
   (en macOS sería `darwin/aarch64/0.1.0` o similar)
4. Verificar:
   - URL: contiene `updates.mks2508.systems/updates/`
   - NO contiene `github.com`
   - Status: 200, 204, o error de red (si TR-02 pendiente)

**Si el Network tab de Tauri webview no muestra las requests**: usar la consola para capturar la URL directamente:

```javascript
// En DevTools:
const originalFetch = window.fetch
window.fetch = (url, ...args) => {
  console.log('[fetch intercepted]', url)
  return originalFetch(url, ...args)
}
// Luego llamar check() — debería loggear la URL del updater
const { check } = await import('@tauri-apps/plugin-updater')
await check()
```

**Nota**: Tauri puede no usar `window.fetch` para las requests del updater (usa el plugin Rust). En ese caso, confiar en los logs de la Phase D (Coolify logs).

---

## Phase D — Verify request en server

**Estimación**: 5-10 min
**Prerequisito**: TR-02 deployed y Phase C ejecutada.

### D.1 — Coolify logs filtrado

```bash
# Ver logs de tpv-cloud filtrando por update requests
coolify-cli logs tpv-cloud --since 5m | grep -i "update\|GET /updates"

# Si el CLI necesita UUID en vez de nombre:
APP_ID=$(coolify-cli list | grep tpv-cloud | awk '{print $1}')
coolify-cli logs "$APP_ID" --since 5m | grep -i "update\|GET"
```

**ESPERADO en los logs de tpv-cloud**:
```
[API] GET /updates/windows/x86_64/0.1.0
[UpdateService] Update check { target: 'windows', arch: 'x86_64', currentVersion: '0.1.0', ... }
[UpdateService] No releases found { target: 'windows', arch: 'x86_64' }
```
O si hay un release insertado:
```
[UpdateService] Update check { ..., hasUpdate: true }
```

### D.2 — Verificar HTTPS cert válido

```bash
curl -sv https://updates.mks2508.systems/health 2>&1 | grep -E "SSL|certificate|issuer"
# ESPERADO: "SSL certificate verify ok" + issuer "Let's Encrypt"
```

Si el cert no es válido, Tauri rechaza la request por defecto (`dangerousInsecureTransportProtocol: false`). La app simplemente no actualizará.

---

## Phase E — Crear docs/deployment/releases.md

**Estimación**: 15-20 min
**Criterio de cierre**: `docs/deployment/releases.md` existe con los 5 pasos del release process documentados.

### E.1 — Crear directorio y archivo

El directorio `docs/deployment/` no existe actualmente. Crearlo y escribir el archivo.

**Contenido de `docs/deployment/releases.md`**:

````markdown
# Release Process — TPV El Haido

> Proceso completo para publicar una nueva versión del TPV.
> Requiere acceso a: `tauri-keys/tpv-el-haido.key` + passphrase + SSH/scp a tpv-cloud volume.

## Prerequisitos

- `bun` instalado (>= 1.1.43)
- `cargo` + Tauri CLI instalados
- Acceso SSH al servidor donde corre tpv-cloud (para subir binarios)
- `psql` o acceso al Coolify dashboard para insertar row en releases table
- **TAURI_SIGNING_PRIVATE_KEY**: contenido base64 de `tauri-keys/tpv-el-haido.key`
- **TAURI_SIGNING_PRIVATE_KEY_PASSWORD**: passphrase del private key

## Paso 1 — Bump version

Editar `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`:

```json
// tauri.conf.json
{
  "version": "0.4.1"  // nueva version
}
```

```toml
# Cargo.toml
[package]
version = "0.4.1"
```

Commit el bump:
```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to 0.4.1"
git push
```

## Paso 2 — Build del installer con firma

En la máquina de build (Windows para NSIS nativo, o la máquina de desarrollo):

```bash
# Exportar env vars para signing
export TAURI_SIGNING_PRIVATE_KEY=$(cat tauri-keys/tpv-el-haido.key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<passphrase>"

# Build con firma automática
bun run tauri build

# Output esperado:
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.4.1_x64-setup.exe
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.4.1_x64-setup.exe.sig
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.4.1_x64-setup.nsis.zip
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.4.1_x64-setup.nsis.zip.sig
```

**Nota**: Tauri genera automáticamente `.sig` cuando `TAURI_SIGNING_PRIVATE_KEY` está configurado y `createUpdaterArtifacts: true`.

## Paso 3 — Subir binarios al volume de tpv-cloud

```bash
VERSION="0.4.1"
BINARY_DIR="src-tauri/target/release/bundle/nsis"
SERVER="<usuario>@lab1-helsinki.mks2508.systems"  # o IP directa
VOLUME_PATH="/data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}"

# Crear directorio en server
ssh "$SERVER" "mkdir -p ${VOLUME_PATH}"

# Subir archivos
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.exe" "${SERVER}:${VOLUME_PATH}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.exe.sig" "${SERVER}:${VOLUME_PATH}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip" "${SERVER}:${VOLUME_PATH}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig" "${SERVER}:${VOLUME_PATH}/"

# Verificar upload
ssh "$SERVER" "ls -lh ${VOLUME_PATH}/"
# Esperado: 4 archivos (.exe, .exe.sig, .nsis.zip, .nsis.zip.sig)
```

**Nota sobre el path del volume**: El path exacto depende de cómo Coolify gestione el volume `tpv-cloud-binaries`. Verificar con `docker inspect tpv-cloud | grep Mounts` en el server para confirmar el path real en el host.

## Paso 4 — Insertar row en releases table

```bash
VERSION="0.4.1"
TARGET="windows"
ARCH="x86_64"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
URL="https://updates.mks2508.systems/dl/${VERSION}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip"
NOTES="Release ${VERSION}"

# Leer signature del archivo .sig
SIGNATURE=$(cat "src-tauri/target/release/bundle/nsis/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig")

# Conectar a la DB (obtener DATABASE_URL de Coolify env vars)
DATABASE_URL=$(coolify-cli env tpv-cloud | grep DATABASE_URL | cut -d= -f2-)

psql "$DATABASE_URL" -c "
INSERT INTO releases (version, target, arch, url, signature, pub_date, notes, created_at)
VALUES (
  '${VERSION}',
  '${TARGET}',
  '${ARCH}',
  '${URL}',
  '${SIGNATURE}',
  '${PUB_DATE}',
  '${NOTES}',
  NOW()
) ON CONFLICT (version, target, arch) DO UPDATE SET
  url = EXCLUDED.url,
  signature = EXCLUDED.signature,
  pub_date = EXCLUDED.pub_date,
  notes = EXCLUDED.notes;
"
# ESPERADO: INSERT 0 1
```

**Alternativa via Coolify dashboard**: Apps → tpv-cloud-db → Databases → Open in Adminer/pgAdmin → ejecutar SQL manualmente.

## Paso 5 — Verify endpoint

```bash
VERSION_ACTUAL="0.1.0"  # version que tiene el cliente instalado
NEW_VERSION="0.4.1"     # version nueva subida

# Verificar que el endpoint devuelve update disponible
curl -s "https://updates.mks2508.systems/updates/windows/x86_64/${VERSION_ACTUAL}" | python3 -m json.tool
# ESPERADO:
# {
#   "version": "0.4.1",
#   "notes": "Release 0.4.1",
#   "pub_date": "...",
#   "url": "https://updates.mks2508.systems/dl/0.4.1/TPV-El-Haido_0.4.1_x64-setup.nsis.zip",
#   "signature": "..."
# }

# Verificar que cliente con version actual recibe update
curl -s -o /dev/null -w "%{http_code}" "https://updates.mks2508.systems/updates/windows/x86_64/${VERSION_ACTUAL}"
# ESPERADO: 200

# Verificar que cliente con version nueva NO recibe update (ya al día)
curl -s -o /dev/null -w "%{http_code}" "https://updates.mks2508.systems/updates/windows/x86_64/${NEW_VERSION}"
# ESPERADO: 204
```

## Tabla resumen de archivos de release

| Archivo | Uso |
|---------|-----|
| `TPV-El-Haido_X.Y.Z_x64-setup.exe` | Installer NSIS completo (primera instalación) |
| `TPV-El-Haido_X.Y.Z_x64-setup.exe.sig` | Firma minisign del installer |
| `TPV-El-Haido_X.Y.Z_x64-setup.nsis.zip` | Artifact OTA (comprimido para updates) |
| `TPV-El-Haido_X.Y.Z_x64-setup.nsis.zip.sig` | Firma minisign del artifact OTA |

**El updater Tauri usa el `.nsis.zip` + `.nsis.zip.sig` para OTA. El `.exe` es para instalación manual inicial.**

## Keys de firma

- **Public key fingerprint**: `22139D4B044E2153`
- **Private key**: `tauri-keys/tpv-el-haido.key` (encriptado con passphrase)
- **Public key file**: `tauri-keys/tpv-el-haido.key.pub`
- **NUNCA commitear el private key ni la passphrase**
````

---

## Phase F — Commit

**Estimación**: 5 min
**Criterio de cierre**: Commit con tag `[#TR-03]` en el mensaje, solo los 2 archivos correctos staged.

### F.1 — Stage y commit

```bash
# Verificar qué hay staged
git diff --stat HEAD

# Añadir solo los 2 archivos de este TR
git add src-tauri/tauri.conf.json
git add docs/deployment/releases.md

# Verificar que no hay nada extra staged
git status
# ESPERADO: solo esos 2 archivos staged

# Commit con bun run commit (gemini-commit-wizard)
bun run commit
```

**Si se hace commit manual** (no via wizard):

```bash
git commit -m "$(cat <<'EOF'
feat-phase(0.4.0.C): update tauri updater endpoint to tpv-cloud + add release docs [#TR-03]

<technical>
- src-tauri/tauri.conf.json: replace plugins.updater.endpoints from GitHub URL
  to https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}
- src-tauri/tauri.conf.json: add plugins.updater.windows.installMode="passive"
  for silent OTA installs without admin prompt
- src-tauri/tauri.conf.json: pubkey unchanged (fingerprint 22139D4B044E2153)
- docs/deployment/releases.md: full release process guide (build, sign, scp, INSERT, verify)
</technical>

<changelog>
## [Feature] OTA update endpoint migrated to tpv-cloud
- TPV now checks updates.mks2508.systems instead of GitHub releases
- Windows OTA installs are now silent (passive mode, no admin prompt)
- Release process documented: bump, build, sign, upload, DB insert, verify
</changelog>
EOF
)"
```

---

## Milestones (claude tasks)

Una `TaskCreate` por milestone. Crear todas upfront con metadata + `addBlockedBy`.

| # | Subject | Estimate | addBlockedBy | role |
|---|---|---|---|---|
| M1 | M1 — Verify minisign keys (private key accesible, fingerprint match) | 5m | — | — |
| M2 | M2 — Edit tauri.conf.json (endpoint + installMode passive) | 5m | M1 | — |
| M3 | M3 — Create docs/deployment/releases.md | 15m | M1 | — |
| M4 | M4 — Test local request + verify server logs + commit | 15m | M2, M3 | **canonical** |

**Metadata común a todas las milestones**:
- `roadmapItemId: "TR-03"`
- `phase: "0.4.0.C"`
- `tags: ["TR-03", "milestone:M<n>", "phase:0.4.0.C", "category:config"]`
- `category: "config"`
- `priority: "critical"`

**Metadata específica de M4 (canonical)**:
- `role: "canonical"`

**Nota**: M1 y M3 no tienen dependencia entre sí — pueden ejecutarse en paralelo si hay 2 agentes. M2 requiere M1 (necesita confirmar el fingerprint antes de editar). M4 requiere M2 + M3.

---

## Decisiones tomadas

### DT-1: `plugins.updater` (NO `bundle.updater`)

En Tauri 2, el updater config vive en `plugins.updater`, no en `bundle.updater`. El campo `bundle.createUpdaterArtifacts` sí vive en `bundle` (ambas ubicaciones correctas para sus respectivos campos). El prompt original referenciaba `bundle.updater.windows.installMode` — eso es Tauri 1 syntax. En Tauri 2 el `windows` block va dentro de `plugins.updater`.

**Verificado**: `tauri.conf.json` usa `$schema: "https://schema.tauri.app/config/2"` — es Tauri 2.

### DT-2: Private key identificada en tauri-keys/tpv-el-haido.key

El research identificó DOS public keys en el repo:
- `tauri-signing.pub` → fingerprint `CF5C37360EC34A45` (key diferente, probablemente testing)
- `tauri-keys/tpv-el-haido.key.pub` → fingerprint `22139D4B044E2153` (coincide con pubkey en tauri.conf.json)

La key activa es la segunda. El executor debe usar `tauri-keys/tpv-el-haido.key` para builds.

### DT-3: Pubkey en diff del prompt (error tipográfico)

El prompt de input muestra en el "estado target" un pubkey con un segmento duplicado (`IXVqMTVUcXRxZFh4` repetido). Esto es un error tipográfico — **la pubkey NO debe cambiar**. El constraint `"NO regenerar pubkey"` está lockeado en r1 y TKT-08. El plan usa el pubkey actual sin modificar.

### DT-4: Phase C condicionada a TR-02

El test real de la request (Phase C + D) solo es verificable si tpv-cloud está deployed. Si TR-02 está pendiente cuando se ejecute este plan, el executor puede:
- Completar M1, M2, M3 (no dependen de tpv-cloud)
- Commitear con M4 marcando el test como "pendiente TR-02"
- O esperar a que TR-02 complete para hacer el test completo

Recomendado: commitear M2+M3 primero, testear en Phase D cuando TR-02 esté live.

### DT-5: docs/deployment/releases.md — formato conciso con comandos reales

Incluye comandos psql para INSERT directo en DB (más robusto que UI) + scp para subir binarios + curl para verificar. También tabla de artifacts para aclarar qué archivo usa el OTA vs la instalación manual (`.nsis.zip` vs `.exe`).

---

## Dependencias y orden de ejecución

```
M1 (verify keys) ←── BLOCKING — abort si private key missing
  ↓
M2 (edit tauri.conf.json)    M3 (releases.md)
            ↓                      ↓
            M4 (test + verify + commit) ← CANONICAL
                   ↑
              (si TR-02 deployed)
```

TR-02 (`tpv-cloud`) debe estar running para la verificación completa de M4. Los milestones M1-M3 son independientes de TR-02.

---

## Risk register

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R1 | `tauri-keys/tpv-el-haido.key` protegido por passphrase desconocida | Media | **CRÍTICO** (sin passphrase no se pueden firmar releases) | Verificar passphrase en pre-flight. Si perdida → generar nueva keypair Y actualizar pubkey en TODOS los builds ya distribuidos (o rompen OTA) |
| R2 | `tauri-signing.pub` confusión — key diferente usada por error | Media | Alto (OTA broken, clientes rechazan updates) | Plan documenta claramente cuál key usar. Pre-flight verifica fingerprint `22139D4B044E2153` |
| R3 | tpv-cloud NOT deployed cuando se ejecuta Phase C/D | Alta | Bajo (test parcial) | Phase C/D condicionadas a TR-02. El config edit es válido sin test completo. |
| R4 | `installMode: "passive"` no soportado en versión de Tauri actual | Baja | Bajo (fallback a UI básica, OTA sigue funcionando) | Verificar en `@tauri-apps/plugin-updater` changelog. Tauri 2.9.0 lo soporta. |
| R5 | Tauri usa `.nsis.zip` para OTA pero DB insert apunta a `.exe` | Media | **CRÍTICO** (OTA broken, firma no coincide) | `releases.md` documenta usar `.nsis.zip` + `.nsis.zip.sig` para la DB, no el `.exe` |

---

## Git context

- Rama sugerida: `main`
  (el proyecto trabaja directamente en main, sin feature branches — ver git log)
- Commit prefix: `feat-phase(0.4.0.C)`
- Tag para hook: `[#TR-03]` — incluir en TODOS los commits de este task
  para que el hook `post-tool-use-bash` linkee el commit a la UDA `gitcommit`
- Estrategia: `single` (un commit al final, en M4 canonical)

> El hook `post-tool-use-bash` de `@mks-agentics/task-sync` lee el tag `[#TR-03]`
> del mensaje de commit y popula las UDAs `gitcommit` + `gitcommits` +
> `gitcommitscount` en TW (si dual mode activo en el repo).
> Si NO hay TW (FS only), el tag es noop — el commit sigue siendo válido.
