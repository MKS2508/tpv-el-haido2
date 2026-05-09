# Release Process — TPV El Haido

> Proceso completo para publicar una nueva versión del TPV.
> Requiere acceso a: `tauri-keys/tpv-el-haido.key` + passphrase + SSH/scp a Coolify volume.

## Prerequisitos

- `bun` instalado (>= 1.1.43)
- `cargo` + Tauri CLI instalados
- `minisign` instalado (`brew install minisign`)
- Acceso SSH al servidor Coolify (para subir binarios al volume)
- `psql` o acceso al Coolify dashboard para insertar row en releases table
- **TAURI_SIGNING_PRIVATE_KEY**: contenido base64 de `tauri-keys/tpv-el-haido.key`
- **TAURI_SIGNING_PRIVATE_KEY_PASSWORD**: passphrase del private key (guardada en password manager)

## Keys de firma

- **Public key fingerprint**: 3BDF42C4B23623D2
- **Private key**: `tauri-keys/tpv-el-haido.key` (encriptado con passphrase)
- **Public key file**: `tauri-keys/tpv-el-haido.key.pub`
- **NUNCA commitear el private key ni la passphrase**

## Paso 1 — Bump version

Editar `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`:

```json
// tauri.conf.json
{
  "version": "0.X.Y"  // nueva version
}
```

```toml
# Cargo.toml
[package]
version = "0.X.Y"
```

Commit el bump:
```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to 0.X.Y"
git push
```

## Paso 2 — Build del installer con firma

```bash
# Exportar env vars para signing
export TAURI_SIGNING_PRIVATE_KEY=$(cat tauri-keys/tpv-el-haido.key)
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<passphrase>"

# Build con firma automática
bun run tauri build

# Output esperado:
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.X.Y_x64-setup.exe
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.X.Y_x64-setup.exe.sig
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.X.Y_x64-setup.nsis.zip
# src-tauri/target/release/bundle/nsis/TPV-El-Haido_0.X.Y_x64-setup.nsis.zip.sig
```

**Nota**: Tauri genera automáticamente `.sig` cuando `TAURI_SIGNING_PRIVATE_KEY` está configurado y `createUpdaterArtifacts: true`.

## Paso 3 — Subir binarios al volume de tpv-cloud

```bash
VERSION="0.X.Y"
BINARY_DIR="src-tauri/target/release/bundle/nsis"
SERVER="<usuario>@lab1-helsinki.mks2508.systems"  # o IP directa

# Crear directorio en server (via Coolify volume mount)
# El volume tpv-cloud-binaries se monta en /data/coolify/volumes/
ssh "$SERVER" "mkdir -p /data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}"

# Subir archivos
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.exe" \
    "${SERVER}:/data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.exe.sig" \
    "${SERVER}:/data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip" \
    "${SERVER}:/data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}/"
scp "${BINARY_DIR}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig" \
    "${SERVER}:/data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}/"

# Verificar upload
ssh "$SERVER" "ls -lh /data/coolify/volumes/tpv-cloud-binaries/dl/${VERSION}/"
# Esperado: 4 archivos (.exe, .exe.sig, .nsis.zip, .nsis.zip.sig)
```

## Paso 4 — Insertar row en releases table

```bash
VERSION="0.X.Y"
TARGET="windows"
ARCH="x86_64"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
URL="https://updates.mks2508.systems/dl/${VERSION}/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip"

# Leer signature del archivo .sig
SIGNATURE=$(cat "src-tauri/target/release/bundle/nsis/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig")

# Obtener DATABASE_URL desde Coolify
DATABASE_URL=$(coolify-cli env tpv-cloud | grep DATABASE_URL | cut -d= -f2-)

psql "$DATABASE_URL" -c "
INSERT INTO releases (version, target, arch, url, signature, pub_date, notes, created_at)
VALUES (
  '\${VERSION}',
  '\${TARGET}',
  '\${ARCH}',
  '\${URL}',
  '\${SIGNATURE}',
  '\${PUB_DATE}',
  'Release \${VERSION}',
  NOW()
) ON CONFLICT (version, target, arch) DO UPDATE SET
  url = EXCLUDED.url,
  signature = EXCLUDED.signature,
  pub_date = EXCLUDED.pub_date,
  notes = EXCLUDED.notes;
"
# Esperado: INSERT 0 1
```

**Alternativa via Coolify dashboard**: Apps → tpv-cloud → Databases → Open in Adminer → ejecutar SQL manualmente.

## Paso 5 — Verify endpoint

```bash
VERSION_ACTUAL="0.1.0"  # version que tiene el cliente instalado
NEW_VERSION="0.X.Y"     # version nueva subida

# Verificar que el endpoint devuelve update disponible
curl -s "https://updates.mks2508.systems/updates/windows/x86_64/${VERSION_ACTUAL}" | python3 -m json.tool
# Esperado (204 si no hay release en DB):
# [vacío] HTTP 204 No Content

# Verificar que endpoint devuelve 200 con JSON si release existe
curl -s -o /dev/null -w "%{http_code}" \
  "https://updates.mks2508.systems/updates/windows/x86_64/${VERSION_ACTUAL}"
# Esperado: 200 o 204

# Test completo con release en DB
curl -s "https://updates.mks2508.systems/updates/windows/x86_64/${VERSION_ACTUAL}"
# Esperado:
# {
#   "version": "0.X.Y",
#   "notes": "Release 0.X.Y",
#   "pub_date": "...",
#   "url": "https://updates.mks2508.systems/dl/0.X.Y/TPV-El-Haido_0.X.Y_x64-setup.nsis.zip",
#   "signature": "..."
# }
```

## Tabla resumen de archivos de release

| Archivo | Uso |
|---------|-----|
| `TPV-El-Haido_X.Y.Z_x64-setup.exe` | Installer NSIS completo (primera instalación manual) |
| `TPV-El-Haido_X.Y.Z_x64-setup.exe.sig` | Firma minisign del installer |
| `TPV-El-Haido_X.Y.Z_x64-setup.nsis.zip` | Artifact OTA (compresado, usado por el updater) |
| `TPV-El-Haido_X.Y.Z_x64-setup.nsis.zip.sig` | Firma minisign del artifact OTA |

**El updater Tauri usa el `.nsis.zip` + `.nsis.zip.sig` para OTA. El `.exe` es para instalación manual inicial.**
