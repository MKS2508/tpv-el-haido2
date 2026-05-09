# TR-04 — Build NSIS en Máquina del Bar + First Install + Upload

**Ticket**: [TKT-04](../tickets/TKT-04-windows-production-setup.md)
**Phase**: 0.4.0.D
**Priority**: critical
**Estimated**: 1-2h
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Build Tauri NSIS installer **directamente en máquina Windows del bar** (1 vez). Después del primer install, todos los updates futuros via OTA contra `updates.mks2508.systems`.

## Output esperado del decomposer

`.plan.md` con 3 phases claras:

### Phase A: Pre-flight (Mac, antes de conectar al bar)
1. Verificar TR-01, TR-02, TR-03 status `done`
2. `curl https://updates.mks2508.systems/health` → 200
3. Verificar minisign `tauri-private-key.key` accesible
4. Setup remote access tool (AnyDesk preferido)

### Phase B: Build en Windows del bar (via remote session)
5. Install prerequisites (rustup, bun, VS Build Tools, WebView2, git)
6. `rustup target add x86_64-pc-windows-msvc`
7. Setear env vars User-level (`MASTER_LICENSE_EMAIL`, `MASTER_LICENSE_KEY`)
8. Setear env vars sesión (`TAURI_SIGNING_PRIVATE_KEY`, password si aplica)
9. `git clone tpv-el-haido2 + bun install`
10. `bun run tauri build`
11. Verificar 4 artifacts en `bundle/nsis/`: `*.exe`, `*.exe.sig`, `*.nsis.zip`, `*.nsis.zip.sig` (Tauri 2 OTA usa el `.nsis.zip`, NO el `.exe`)
12. Run setup.exe (passive mode)
13. Verify app arranca, license activa, smoke functional (crear orden test)

### Phase C: Upload + Release row (Mac, post-install)
14. SCP los 4 artefactos (.exe, .exe.sig, .nsis.zip, .nsis.zip.sig) al volume Coolify (`/srv/binaries/dl/0.4.0/`)
15. Verificar `curl -I` ambos: `.exe` (first install URL) y `.nsis.zip` (URL que devolverá el endpoint /updates/...)
16. INSERT row en `releases` table — `url` apunta al **`.nsis.zip`** y `signature` es el contenido del **`.nsis.zip.sig`**
17. Verify `curl /updates/windows/x86_64/0.0.0` → 200 con JSON

## Constraints

- **NO regenerar minisign key** (preserva pubkey en tauri.conf.json)
- **NO setear TAURI_SIGNING_* persistente** en Windows del bar (solo durante build session, sino leak risk)
- **MASTER_LICENSE_* SÍ persistente User-level** (necesario para app runtime)
- **NSIS install mode**: `currentUser` + `passive` (no admin prompt)
- **Sin printer** (TKT-02 deferred, sigue con app instalable y operable manualmente)

## Riesgos críticos a documentar en plan

- AEAT sidecar Windows build (verificar `prebuild` script genera `aeat-bridge-x86_64-pc-windows-msvc.exe`)
- WebView2 ya instalado o downloadBootstrapper funcional (requiere internet en bar)
- VS Build Tools 2022 (no 2019 viejo)
- Pubkey/private key match (verificar pre-build)

## Dependencies

- TR-01 done (master license hardening)
- TR-02 done (tpv-cloud healthy)
- TR-03 done (tauri.conf.json updated)

## Acceptance

Ver `Acceptance Criteria` completo en TKT-04 (3 secciones: pre-flight, máquina bar, post-install).

## Suggested executor agent

Multi-step + remote work → considerar **plan-architect** primero para split fino, luego `task-executor` por phase. Phase A puede ser background mientras B se ejecuta interactivo.

## Notas operativas

- Phase B requiere **sesión interactiva** del usuario (waxin) con remote desktop al bar — no es 100% automatizable.
- Phase C es scripts post-build, automatizable por executor.
