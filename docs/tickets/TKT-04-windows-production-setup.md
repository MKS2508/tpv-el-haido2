# TKT-04 - Windows Production Setup: Build NSIS en Máquina del Bar + First Install

**Milestone**: 0.4.0.D
**Priority**: 🔥 CRITICAL
**Status**: proposed (REFORMULADO post-r1)
**Created**: 2026-05-09
**Reformulated**: 2026-05-09 (post r1 - sin GitHub, build en bar)
**Assigned**: -
**Estimated**: 1-2h (cuando todo lo previo está done)
**Decision doc**: [`r1-deployment-architecture-2026-05-09.md`](../decisions/r1-deployment-architecture-2026-05-09.md)

## Context

R1 D4 lockeada: **build NSIS directo en máquina Windows del bar (1 vez)**. Después todo via OTA contra `updates.mks2508.systems`.

**Razones**:
- Hetzner Cloud sin nested virt → dockur/windows descartado (verificado con `/dev/kvm` ausente)
- Cross-compile Mac M1 (cargo-xwin) tiene mixed reports → asymmetric risk
- Sin GitHub Actions (D1: sin GitHub)
- Build nativo en Windows = garantizado, sin sorpresas cross-compile

**Trade-offs aceptados**:
- ⚠️ Toolchain Tauri queda en máquina prod (puede uninstall después)
- ⚠️ Internet del bar puede ser lento (descarga deps)
- ✅ 1 sola vez, después todo OTA via tpv-cloud

## Scope

### IN scope

#### Pre-flight (desde Mac/laptop de waxin)
- ✅ Confirmar TKT-01.1 done (master license hardening) y TKT-08 done (tauri.conf.json apuntando a updates.mks2508.systems)
- ✅ Verificar tpv-cloud (TKT-07) está vivo y endpoints responden
- ✅ Verificar acceso al `tauri-private-key.key` (minisign) — necesario para firmar
- ✅ Configurar acceso remoto a Windows del bar (RDP, AnyDesk, OpenSSH server)

#### En la máquina Windows del bar (via remote session)
- ✅ Instalar prerequisites:
  - WebView2 Runtime (Tauri requirement)
  - rustup + Rust toolchain (`x86_64-pc-windows-msvc` target)
  - Bun (`scoop install bun` o instalador)
  - Visual Studio Build Tools 2022 (C++ workload, mínimo)
  - git
- ✅ Clonar repo: `git clone https://github.com/MKS2508/tpv-el-haido2`
- ✅ Setear env vars:
  - `MASTER_LICENSE_EMAIL`
  - `MASTER_LICENSE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY` (contenido del minisign private key)
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (si aplicable)
- ✅ Build:
  ```cmd
  cd tpv-el-haido2
  bun install
  bun run tauri build
  ```
- ✅ Output esperado: `src-tauri/target/release/bundle/nsis/` con 4 archivos (`createUpdaterArtifacts: true`):
  - `TPV-El-Haido_0.4.0_x64-setup.exe` + `.exe.sig` (first install manual)
  - `TPV-El-Haido_0.4.0_x64-setup.nsis.zip` + `.nsis.zip.sig` (**OTA Tauri**, lo que se sube al endpoint)
- ✅ Ejecutar setup.exe (passive mode)
- ✅ Verificar app arranca y se conecta a `updates.mks2508.systems`
- ✅ Validar license activation (master credentials online via tpv-cloud)
- ✅ Crear orden test (smoke functional)

#### Post-install
- ✅ SCP los 4 artefactos al volume Coolify (`/srv/binaries/dl/0.4.0/`) desde Mac/laptop:
  - `.exe` + `.exe.sig` (first install)
  - `.nsis.zip` + `.nsis.zip.sig` (OTA)
- ✅ INSERT row en `releases` (tpv-cloud-db) para version 0.4.0
- ✅ Verificar endpoint:
  ```bash
  curl -I https://updates.mks2508.systems/dl/0.4.0/TPV-El-Haido_0.4.0_x64-setup.exe
  # Esperado: 200
  curl https://updates.mks2508.systems/updates/windows/x86_64/0.0.0
  # Esperado: 200 con JSON v2 apuntando a 0.4.0
  ```

### OUT of scope
- ❌ Smoke test OTA (TKT-10 lo hace después)
- ❌ Cleanup license-server old (TKT-11)
- ❌ Code signing Authenticode (deferred 0.3.0, SmartScreen warning aceptable)
- ❌ Printer setup (TKT-02 deferred)

## Dependencies

- **TKT-01.1** (master license hardening) — release build sin esto = inseguro
- **TKT-07** (tpv-cloud deployed + healthy) — app necesita endpoint vivo al arrancar
- **TKT-08** (tauri.conf.json updated) — sino la app apunta a GitHub (broken)

## Acceptance Criteria

### Pre-flight (verificable desde Mac)
- [ ] **TKT-01.1, 07, 08 done**: confirmados en sus respectivos tickets
- [ ] **Endpoint vivo**: `curl https://updates.mks2508.systems/health` → 200
- [ ] **Minisign private key accesible**: archivo encontrado, password (si aplica) en hand
- [ ] **Remote access ready**: AnyDesk/RDP/SSH conecta a Windows del bar

### En máquina del bar
- [ ] **Prerequisites instalados**: rustup, bun, VS Build Tools, WebView2
- [ ] **Repo cloned**: `tpv-el-haido2/` en disco con branch `main`
- [ ] **Env vars seteadas**: MASTER_LICENSE_*, TAURI_SIGNING_*
- [ ] **Build success**: `bun run tauri build` completa sin errors
- [ ] **Artifacts verificados**: 4 archivos en `bundle/nsis/` — `setup.exe`, `setup.exe.sig`, `setup.nsis.zip`, `setup.nsis.zip.sig`
- [ ] **Install OK**: setup.exe corre passive mode, app instalada en `%LOCALAPPDATA%\TPV-El-Haido\`
- [ ] **App arranca**: TPV abre sin crash, splash funciona
- [ ] **License active**: master license activa (online vía tpv-cloud o offline fallback)
- [ ] **Smoke functional**: crear orden test, ver productos, navegar sections sin crash

### Post-install
- [ ] **Volume populated**: 4 artefactos accesibles via `https://updates.mks2508.systems/dl/0.4.0/...` (`.exe`, `.exe.sig`, `.nsis.zip`, `.nsis.zip.sig`)
- [ ] **DB row**: `releases` table tiene entry para `0.4.0` `windows` `x86_64`
- [ ] **Endpoint update test**: `curl /updates/windows/x86_64/0.0.0` → 200 con JSON

## Technical Notes

### Setup remote access

**Opción AnyDesk** (preferida, más fácil):
- Install AnyDesk en Windows del bar
- Anotar AnyDesk ID + password
- Connect desde Mac

**Opción OpenSSH Server** (Windows 10+ built-in):
```powershell
# En PowerShell as Admin en Windows del bar
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

**Opción RDP** (built-in Windows Pro): Settings → Remote Desktop → Enable.

### Install prerequisites en Windows

```powershell
# Scoop (package manager simple)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Tools
scoop install git
scoop install bun

# Rust
# Download rustup-init.exe desde https://www.rust-lang.org/tools/install
# Run + select "1) Proceed with installation (default)"

rustup target add x86_64-pc-windows-msvc

# Visual Studio Build Tools (C++)
# Download desde https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Install "Desktop development with C++" workload

# WebView2 Runtime (probable ya esté en Win11, en Win10 puede faltar)
# Download evergreen installer: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### Setear env vars (User-level, persistentes)

```powershell
# Master license (R1 D5 master license fallback in env)
[Environment]::SetEnvironmentVariable("MASTER_LICENSE_EMAIL", "admin@haido.local", "User")
[Environment]::SetEnvironmentVariable("MASTER_LICENSE_KEY", "HAI-MASTER-DEV-KEY-2026", "User")

# Tauri signing (solo durante build, opcional desde .env si waxin prefiere)
$env:TAURI_SIGNING_PRIVATE_KEY = "<contenido del key file, multilínea>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password si aplica>"
```

**Importante**: el `TAURI_SIGNING_PRIVATE_KEY` es para EL build, NO para la app instalada. Solo necesario en sesión de build, no persistente.

### Build commands

```cmd
cd C:\path\to\tpv-el-haido2
bun install
bun run prebuild
bun run tauri build
```

**Esperado**: ~5-15min primer build (cargo + Rust deps lento), siguientes builds más rápidos por cache.

**Output**:
```
src-tauri/target/release/bundle/nsis/
├── TPV-El-Haido_0.4.0_x64-setup.exe
└── TPV-El-Haido_0.4.0_x64-setup.exe.sig
```

### Riesgos conocidos

- **AEAT sidecar Windows**: el `prebuild` script intenta build sidecar AEAT con bun --target. Verificar que produce `aeat-bridge-x86_64-pc-windows-msvc.exe`. Si no, NSIS empaqueta sin sidecar y AEAT runtime falla.
- **WebView2 missing**: si Win10 sin WebView2, app no arranca. Tauri NSIS bundle puede usar `downloadBootstrapper` (default) que descarga WebView2 en install (requiere internet en bar durante install).
- **VS Build Tools versión**: Tauri requiere VS 2019+. Si bar tiene old PC, asegurar 2022.
- **Cargo cache size**: build genera ~5-10GB en `target/`. Verificar disk space.
- **Antivirus interference**: Windows Defender puede flaggear cargo build. Add exclusion para `target/` directory si lento.
- **Internet del bar**: descarga inicial cargo deps + WebView2 puede ser lenta. Considerar pre-descargar deps en Mac y copiar `~/.cargo` (pero hashes pueden no coincidir).
- **Pubkey/private key mismatch**: si firmas con clave distinta a la del pubkey en `tauri.conf.json` → todos los OTA updates futuros rechazados. Verificar match ANTES de build.

### SCP upload commands (desde Mac post-build)

```bash
LAB1=lab1-helsinki  # alias SSH
VERSION=0.4.0
TPV_CLOUD_UUID=<uuid de tpv-cloud, lookup via coolify-cli>

# Path real del volume depende de Coolify config:
# Probable: /data/coolify/applications/${TPV_CLOUD_UUID}/binaries/dl/${VERSION}/
# Verificar con coolify-cli show o exec ls

scp ./build-output/TPV-El-Haido_${VERSION}_x64-setup.exe \
    ./build-output/TPV-El-Haido_${VERSION}_x64-setup.exe.sig \
    ./build-output/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip \
    ./build-output/TPV-El-Haido_${VERSION}_x64-setup.nsis.zip.sig \
    $LAB1:/data/coolify/applications/${TPV_CLOUD_UUID}/binaries/dl/${VERSION}/
```

### INSERT release row

```bash
SIG_CONTENT=$(cat ./build-output/TPV-El-Haido_0.4.0_x64-setup.nsis.zip.sig)

coolify-cli exec tpv-cloud-db <<SQL
psql -U postgres -d tpv_cloud <<EOF
INSERT INTO releases (version, target, arch, url, signature, pub_date, notes)
VALUES (
  '0.4.0',
  'windows',
  'x86_64',
  'https://updates.mks2508.systems/dl/0.4.0/TPV-El-Haido_0.4.0_x64-setup.nsis.zip',
  \$\$${SIG_CONTENT}\$\$,
  NOW(),
  'Initial production release'
);
EOF
SQL
```

(escapar correctamente, el sig tiene multilínea)

## Sub-tasks

### Pre-flight (Mac)
- [ ] 1. Verificar TKT-01.1, 07, 08 status `done`
- [ ] 2. Confirmar minisign private key accesible
- [ ] 3. Setup remote access (AnyDesk preferido)

### En Windows del bar (via remote)
- [ ] 4. Instalar Scoop, git, bun, rustup, VS Build Tools, WebView2
- [ ] 5. `rustup target add x86_64-pc-windows-msvc`
- [ ] 6. Setear env vars MASTER_LICENSE_* (User-level)
- [ ] 7. git clone repo
- [ ] 8. `bun install`
- [ ] 9. Setear env vars TAURI_SIGNING_* (sesión actual)
- [ ] 10. `bun run tauri build`
- [ ] 11. Verificar artifacts en `bundle/nsis/`
- [ ] 12. Run setup.exe
- [ ] 13. App arranca + license activa + smoke test crear orden

### Post-install (Mac)
- [ ] 14. SCP setup.exe + .sig al volume Coolify
- [ ] 15. Verificar curl -I al .exe → 200
- [ ] 16. INSERT row en releases table
- [ ] 17. curl `/updates/windows/x86_64/0.0.0` → 200 con JSON
- [ ] 18. Documentar findings en este ticket

## Blocked by

- TKT-01.1 (master license hardening) — DONE antes de build release
- TKT-07 (tpv-cloud) — DONE antes (app needs endpoint live)
- TKT-08 (tauri.conf.json) — DONE antes (sino app apunta a GitHub)

## Blocks

- TKT-10 (smoke test OTA) — necesita app 0.4.0 instalada y running

## Findings

*(Post-execución llenar)*

- Tiempo build: __min
- Errores Cargo: __
- AEAT sidecar Win build OK?: __
- WebView2 ya instalado?: __
- App arranca clean?: __
- License activa OK?: __
- Master license offline o online via tpv-cloud?: __

## References

- r1 decision: D4 (build en bar)
- Tauri Windows build: https://v2.tauri.app/start/build/windows/
- WebView2 runtime: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- minisign docs: https://jedisct1.github.io/minisign/

## Changelog

- **2026-05-09 (r1)**: Reformulado. Original decía "GitHub releases + cross-compile Mac". Lockeado en r1: build directo en máquina del bar, sin GitHub, after-OTA todo from tpv-cloud.
