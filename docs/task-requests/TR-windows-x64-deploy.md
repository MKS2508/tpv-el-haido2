# TR-20 — Pipeline CI para Windows x64 (build en GH Actions, publish al release-hub)

**Ticket**: nuevo
**Phase**: sin numerar (cierra el último gap de cobertura de CI nativa — TR-12/TR-15 dejaron
Linux x64+ARM64 verde para `v0.1.3` 2026-08-21; Windows queda como único target sin workflow)
**Priority**: high — el TPV del bar de mi hermano corre en Windows, sigue requiriendo build
manual on-host para cada release (el último release `windows-x64` en el hub es `0.1.0` desde
mayo; el canal del bar lleva 4 meses sin actualizarse vía CI)
**Estimated**: 1-2h (es ~95% pattern-follow de `linux-x64-deploy.yml`, ver objetivo)
**Status**: in_progress

## Contexto

`linux-x64-deploy.yml` y `linux-arm64-deploy.yml` ya están verdes y en producción
(`v0.1.3` verificado end-to-end real el 2026-08-21, ver
`docs/task-requests/TR-12-rebuild-ci-pipelines-release-hub.md` + `TR-15` para el detalle de
auth CI→hub). El wiring de publish (`release.ts publish --client-credentials --skip-build`)
ya funciona y los secrets `RELEASE_HUB_CLIENT_ID`/`SECRET` ya están seteados en
`MKS2508/tpv-el-haido2` (TR-15 paso 2).

`progress-log.md` (FIX H entrada del 2026-08-22) lo flagea explícitamente como el último gap
estructural de CI:

> **`windows-x64-deploy.yml`** no existe (2-3h GH Actions en `windows-latest`) — único target
> de producción (Windows bar PC) requiere build manual on-host.

`scripts/build-release.ts` ya soporta el target `windows-x64` (`x86_64-pc-windows-msvc`,
artifacts `.nsis.zip` para OTA + `*-setup.exe` para installer, mismo `TAURI_SIGNING_PRIVATE_KEY`
minisign que Linux) — la pieza que falta es solo el workflow de GH Actions. `scripts/release.ts`
también soporta `--target windows-x64` (verificado por grep: línea 76 `ALL_RELEASE_TARGETS` y
línea 141 mapping `{serverTarget: 'windows', serverArch: 'x86_64'}`).

## Objetivo (claro: pattern-follow del workflow Linux)

**Un workflow nuevo** (`.github/workflows/windows-x64-deploy.yml`) que sea el mismo patrón que
`linux-x64-deploy.yml:1-108` con los mínimos cambios Windows-específicos justificados (ver
`Constraints` abajo). NO es feature nueva — es cerrar el gap de cobertura.

Concretamente:

1. **Triggers** (mismos que Linux): `push` a `main` (smoke build), tags `v*` (release real),
   `workflow_dispatch` (manual).
2. **Build + sign** vía `bun run scripts/build-release.ts --target windows-x64` con
   `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` de GH Secrets (mismo
   tratamiento que Linux — minisign vía el signer de Tauri, NO Authenticode/EV; el code signing
   real de Windows es la `track/code-signing-multiplatform` queued, fuera de scope).
3. **Verify signature** del OTA bundle contra la pubkey embebida (`tauri.conf.json` →
   `RWSxu04zRL8L250wN61H4xvaSW8GmAGBOIPtqmRbKw6C9ZNlC9VrlUUU` — mismo pubkey que
   `linux-x64-deploy.yml:69`, una sola clave para todo el proyecto, no se regenera).
4. **Upload artifact** (`windows-x64-release`, retention 30d, mismo patrón).
5. **Publish al release-hub** en tag push, TR-15 wiring: `release.ts publish
   --client-credentials --skip-build --target windows-x64 --slug haido`, gateado por
   `RELEASE_HUB_CLIENT_ID`/`SECRET` en env vars, fallback a instrucciones manuales en
   `$GITHUB_STEP_SUMMARY` si faltan o falla (mismo patrón de `if [ -z ... ]` + `manual_instructions()`
   shell function de `linux-x64-deploy.yml:84-107`).

**Diferencias vs Linux workflow (todas justificadas)**:

| Diff | Linux | Windows | Justificación |
|---|---|---|---|
| Runner | `ubuntu-latest` | `windows-latest` | requerido por `x86_64-pc-windows-msvc` triple |
| System deps | `apt-get install` (webkit2gtk, fuse, patchelf, minisign, etc.) | **ninguno** — pre-instalado en windows-latest (MSVC, WebView2 runtime) | MSVC viene con el runner image; webkit2gtk es irrelevante |
| Install minisign | vía apt (parte del bloque de deps) | vía `choco install minisign -y` en su propio step | minisign NO viene pre-instalado en windows-latest |
| Shell default | bash | pwsh (windows default) — `shell: bash` explícito en los steps que lo necesitan (verify, publish) | `find`, `base64 -d`, `${VAR}` expansion, `[ -z ... ]` — todo bash, no PowerShell |
| Verify step de toolchain | n/a (todo se instala via apt) | nuevo step "Verify MSVC + WebView2 (pre-installed)" | documentar que el runner ya trae MSVC, fail-fast si no |
| Bundle artifacts | 1 (`*.AppImage`) | 2 (`*.nsis.zip` para OTA + `*-setup.exe` para installer) | Tauri produce ambos en Windows; ambos se firman, ambos se suben al hub |
| Signature verify target | `*.AppImage` | `*.nsis.zip` | el `.nsis.zip` es el OTA bundle que el cliente actualiza via el hub; el `setup.exe` es para first-install |

## Constraints

- **NO tocar `linux-x64-deploy.yml` ni `linux-arm64-deploy.yml`** — son la referencia. Si mientras
  se hace este workflow se detecta algo a mejorar en los Linux, anotarlo para un TR separado,
  no lo edites aquí.
- **NO regenerar la minisign key** — la pubkey embebida en `tauri.conf.json` es la misma que
  usa `linux-x64-deploy.yml:69` y el cliente desktop ya la trae. Cambiarla invalida todos los
  clientes actuales hasta que se redistribuya el `.exe` con la nueva pubkey.
- **NO usar `actions-rs/toolchain@v1`** (deprecada) — `dtolnay/rust-toolchain@stable` igual que
  Linux.
- **NO usar npm** — el proyecto es 100% Bun (`bun install --frozen-lockfile`).
- **NO instalar MSVC via `microsoft-visualstudio/setup-vcpp-tools@v1`** — windows-latest ya
  trae el Build Tools 2022 pre-instalado y `dtolnay/rust-toolchain@stable` lo auto-detecta. Si
  en el futuro deja de venir, mover a la action de install; por ahora solo se verifica.
- **NO firmar con Authenticode / EV** (code signing de Windows real, certificado de OV/EV,
  Azure Artifact Signing) — eso vive en `track/code-signing-multiplatform` queued, separado.
  El bar PC no exige firma Authenticode hoy, solo minisign para que el updater acepte la
  descarga.
- **NO publicar a GitHub Releases** — publish va 100% al release-hub (`haido.releases.mks2508.systems`)
  via `release.ts publish`, no `softprops/action-gh-release`. Misma decisión r1-D1 que aplicó
  TR-12.
- **Fallback manual siempre presente** en el publish step — si los secrets faltan O el publish
  falla, el workflow sigue subiendo el artifact y emite instrucciones manuales en
  `$GITHUB_STEP_SUMMARY`; nunca un rojo sin salida.
- **Anti-leak**: `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` /
  `RELEASE_HUB_CLIENT_ID` / `RELEASE_HUB_CLIENT_SECRET` nunca en commit, log, doc versionado.
  Si aparecen en logs (chocolatey, bash trace, etc.) → STOP, redactar, re-run.

## Acceptance

- `.github/workflows/windows-x64-deploy.yml` creado, syntax OK (verificado con
  `bunx actionlint .github/workflows/windows-x64-deploy.yml` o equivalente manual).
- Side-by-side review contra `linux-x64-deploy.yml` solo muestra los diffs listados arriba (más
  la presencia de la pubkey idéntica, el `if startsWith(github.ref, 'refs/tags/')` para
  upload/publish, el fallback manual en publish).
- Push a `main` (smoke build) corre verde en `windows-latest` — produce artifacts en
  `releases/<version>/windows-x64/` con `.exe`, `.exe.sig`, `.nsis.zip`, `.nsis.zip.sig`,
  signature verify step exit 0 con `minisign -Vm`.
- Tag `v*` push → mismo flow + upload artifact + (si secrets están seteados) publish automático
  al release-hub via `release.ts publish --client-credentials --skip-build --target windows-x64
  --slug haido`, confirmado por log de CI + `GET /api/admin/projects/haido/releases` mostrando
  la nueva fila para `windows-x64`.
- Tag `v*` push SIN secrets `RELEASE_HUB_CLIENT_ID`/`SECRET` → upload artifact OK + `$GITHUB_STEP_SUMMARY`
  contiene las 4 líneas de instrucciones manuales (mismo formato que `linux-x64-deploy.yml:86-93`,
  con `--target windows-x64`).
- Sin secrets reales expuestos en commit/log/doc.

## Suggested executor agent

`task-executor` directo — es 95% pattern-follow, no hay decisión arquitectónica que merezca un
`.plan.md`. El único punto que el ejecutor debe verificar contra el código real (no asumir) es
que `release.ts publish --target windows-x64 --client-credentials` realmente funciona end-to-end
(grep ya confirma `windows-x64` en `ALL_RELEASE_TARGETS` y en el `serverTarget` mapping, pero
el smoke real contra el hub se hace en el primer tag `v*` post-merge).

## Notas operativas

- No hay overlap con TR-12/TR-13/TR-14/TR-15 — todos ya merged (TR-15 cierre 2026-08-21),
  este TR cierra el gap que ellos dejaron listado como follow-up en `progress-log.md`.
- Doc sync (`roadmap.spec.yml` + `progress-log.md`) deferido — axon lo hace después en un solo
  pase, mismo criterio que el resto de la sesión.
- Una vez verde, el canal `windows-x64` en el hub va a estar atrasado (última versión `0.1.0`
  desde mayo) — el primer tag post-merge va a publicar la versión actual (`0.1.3` o la que
  esté en `tauri.conf.json` al momento del tag). Si se quiere evitar el salto brusco, bumpear
  manualmente `windows-x64` a `0.1.3` en el hub antes del primer tag automático (decisión de
  waxin, no parte de este TR).
