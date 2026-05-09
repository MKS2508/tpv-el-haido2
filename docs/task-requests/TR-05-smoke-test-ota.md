# TR-05 — Smoke Test OTA End-to-End

**Ticket**: [TKT-10](../tickets/TKT-10-smoke-test-ota.md)
**Phase**: 0.4.0.E
**Priority**: critical
**Estimated**: 30min
**Decision doc**: [r1](../decisions/r1-deployment-architecture-2026-05-09.md)

## Brief para decomposer

Validation final del ciclo OTA: bumpear version 0.4.0 → 0.4.1, build, publicar, verificar que la app en el bar detecta + descarga + verifica firma + instala + restart correctamente.

Si esto pasa GREEN → 0.4.0 done.

## Output esperado del decomposer

`.plan.md` con:

1. Bump version en 3 files (`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`)
2. Build NSIS en máquina del bar (toolchain ya instalado por TR-04). Genera 4 archivos: `.exe`, `.exe.sig`, `.nsis.zip`, `.nsis.zip.sig`
3. Verify artifacts 0.4.1 (los 4)
4. SCP los 4 al volume Coolify `/srv/binaries/dl/0.4.1/`
5. INSERT row en `releases` table — `url` apunta al **`.nsis.zip`**, `signature` es contenido del **`.nsis.zip.sig`** (NO del `.exe.sig`)
6. Test endpoint con curl (0.4.0 → 200, 0.4.1 → 204)
7. Trigger update check en TPV (bar)
8. Verify download → minisign verify → install → restart
9. Verify app 0.4.1 funcional (login, orden test, license)
10. Document timing + findings en TKT-10

## Constraints

- Bump SOLO patch version (0.4.0 → 0.4.1) — NO minor/major sin razón
- "Notes" entry en releases table debe ser razonable ("Smoke test OTA")
- Verificar logs Coolify durante el flow (sin errors)
- Si minisign verify falla → ABORT, investigar pubkey/private key mismatch

## Dependencies

- TR-04 done (TPV 0.4.0 instalado y running en bar)
- TR-02, TR-03 done

## Riesgos a verificar en plan

- HTTPS cert válido para `updates.mks2508.systems` (Let's Encrypt vía Coolify)
- Volume path real puede no ser exactamente `/data/coolify/applications/...` — verificar con `coolify-cli show tpv-cloud`
- NSIS install path consistente entre 0.4.0 y 0.4.1 (passive mode, currentUser)
- SQL escaping de signature multi-línea (use dollar-quoted `$$...$$`)

## Acceptance

Ver `Acceptance Criteria` completo en TKT-10.

## Suggested executor agent

`task-executor` (multi-step pero scripted). Phase 7-9 require interactive desktop session (verificación visual en bar).

## Output del smoke

Documentar en TKT-10 sección `Findings`:
- Tiempo total flow OTA (segundos desde check() hasta restart)
- Errors encontrados (cualquiera)
- Performance subjetiva
- Improvements para próximo release
