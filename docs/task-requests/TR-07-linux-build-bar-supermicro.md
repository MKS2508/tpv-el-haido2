# TR-07 — Build Linux nativo en máquina definitiva del bar (Supermicro) + install + publish al hub

**Ticket**: TKT-20-linux-build-supermicro-bar (nuevo, crear si no existe)
**Phase**: nueva sub-fase — pendiente de numerar en roadmap.spec.yml (candidato: 0.4.2 o reabrir 0.3.0, decidir post-ejecución)
**Priority**: critical (bloquea producción real en el bar)
**Estimated**: 2-3h
**Precedente directo**: `docs/progress-log.md` sección "2026-05-10 — 0.4.0.D done: Windows production build + publish" — mismo playbook, target distinto.

## Contexto (importante — pivot de arquitectura)

La decisión r1 (D4, 2026-05-09) asumía Windows como target de producción del bar, y en mayo se
construyó y publicó un instalador NSIS Windows firmado (0.4.0.D, commit `a1ab707`). **Eso quedó
huérfano**: la máquina definitiva del bar resultó ser un mini PC Linux, no Windows.

**Máquina real**:
- Host: `supermicro-pcbar.vpn.mks2508.local` (Tailscale, IP `100.64.0.11`)
- Usuario: `mks` (grupos: `wheel` → sudo probable, `nopasswdlogin`)
- OS: **CachyOS x86_64** (Arch-based), kernel `7.1.3-2-cachyos`, DE: COSMIC
- HW: Intel i7-9700 (8 cores) @ 4.70GHz, 15.43 GiB RAM, disco btrfs 461GB (13% usado)
- Ya accesible por SSH (waxin ya conectó manualmente, sesión tmux local `supermicro` abierta)
- Nota conectividad: Ghostty manda `TERM=xterm-ghostty` que CachyOS rechaza (`missing or unsuitable
  terminal`) — usar `TERM=xterm-256color ssh ...` o instalar terminfo remoto
  (`infocmp -x | ssh <host> -- tic -x -`) antes de cualquier sesión no interactiva.
- Existe también `RPI-BAR` en el mismo tailnet (Raspberry Pi, separada, prevista para 0.5.0/printer
  — NO tocar en esta tarea, es otra máquina).

## Objetivo

**Build nativo completo end-to-end en la propia máquina del bar** (mismo patrón que 0.4.0.D con
Windows, pero Linux x64 nativo por SSH, no cross-compile):

1. Compilar el TPV para Linux x64 en `supermicro-pcbar`
2. Instalarlo y **dejarlo corriendo ahí** (verificar boot + funcional básico)
3. Firmar el artefacto (minisign, mismo par de claves que macOS/Windows — pubkey en
   `tauri.conf.json` NO se toca)
4. Publicar el release al hub (`haido.releases.mks2508.systems`, proyecto `haido` ya existe)
5. Verificar que el endpoint de updates responde bien para el target linux

## Output esperado del decomposer

`.plan.md` con fases claras. Sugerido:

### Phase A — Pre-flight (Mac, antes de tocar la remota)
1. Confirmar hub healthy: `curl https://haido.releases.mks2508.systems/api/health` → 200 (ya
   verificado hoy por axon, debería seguir healthy)
2. Confirmar release actual del proyecto haido (`GET /api/updates/linux/x86_64/0.0.0` — probablemente
   204, no hay release linux todavía)
3. Revisar `scripts/build-release.ts` (`ReleaseTarget` type, `BUILD_TARGETS` map, línea ~56-176) —
   **no soporta `linux-x64` hoy**, hay que añadir la entrada. Verificar contra docs oficiales Tauri 2
   el formato correcto del bundle Linux:
   - Bundle updater: `src-tauri/target/<triple>/release/bundle/appimage/*.AppImage.tar.gz` (+ `.sig`)
   - Installer humano: `*.AppImage` suelto (o `.deb` si se genera, decidir cuál sirve de "installer" —
     mirar cómo se resolvió `installerSubdir`/`installerExt` para macOS/Windows como referencia,
     mismo patrón para linux)
   - `updaterPlatformKey` Tauri: `linux-x86_64`
   - Triple: `x86_64-unknown-linux-gnu`
4. Revisar `tauri.conf.json` → `bundle.targets` — confirmar si ya incluye `appimage`/`deb` o hay que
   añadirlos explícitamente (`"targets": "all"` ya está seteado según CLAUDE.md, probablemente ya
   cubre Linux, pero verificar)
5. AEAT sidecar: `CLAUDE.md` documenta que `build-aeat-sidecar.ts` ya soporta cross-compile
   `linux-x64` vía `bun --target=bun-linux-x64` — confirmar que el binario correcto
   (`aeat-bridge-x86_64-unknown-linux-gnu`) se genera o generará en el build

### Phase B — Extender tooling (Mac, código)
6. Añadir entrada `linux-x64` a `BUILD_TARGETS` en `scripts/build-release.ts` (seguir exactamente el
   patrón de `windows-x64`/`macos-arm64`, incluidos `canonicalName`, `ALL_TARGETS`, help text)
7. Verificar `scripts/release.ts` no tiene lógica hardcoded que excluya linux (buscar los mismos
   sitios donde Windows tuvo el bug de `.nsis.zip` vs `-setup.exe` — puede que Linux tenga un mismatch
   similar entre `.AppImage.tar.gz` esperado por el script vs lo que Tauri 2.10 realmente emite; **si
   hay mismatch, documentarlo igual que se hizo con Windows y decidir si se bypassea con curl manual
   o se arregla el script** — priorizar avanzar, no bloquear en el refactor)

### Phase C — Build en la máquina del bar (SSH no-interactivo)
8. `TERM=xterm-256color ssh supermicro-pcbar.vpn.mks2508.local '<comando>'` para cada paso (o
   `ssh -tt` si algún comando requiere pty, evitando el error de terminfo)
9. Verificar/instalar deps de build Tauri en Arch/CachyOS (pacman): toolchain rust (`rustup` o
   `rust` del repo), `webkit2gtk-4.1`, `base-devel`, `curl`, `wget`, `file`, `openssl`,
   `appmenu-gtk-module`, `libappindicator-gtk3`, `librsvg`, `patchelf` — confirmar cuáles faltan
   antes de instalar nada (no asumir, `pacman -Qi <pkg>` primero)
10. Verificar `bun` instalado (`bun --version`); instalar si falta
11. `git clone` (o `git pull` si ya existe) el repo en la remota
12. Copiar la private key de signing (mismo patrón que Windows: `tauri-keys/tpv-el-haido.key` desde
    Mac vía `scp`, NUNCA commitear) + resolver passphrase (BW item `HAIDO` campo `PASSPHRASE`, mismo
    flow que `build-release.ts` ya implementa)
13. Setear `MASTER_LICENSE_EMAIL`/`MASTER_LICENSE_KEY` a nivel user (mismo patrón Windows — 0.4.0.A
    sigue sin hacer, o sea el build usará el fallback hardcoded si no se setean; **documentar esto
    como gap conocido, no bloquear**)
14. Build: `bun install` → `bun run scripts/build-release.ts --target linux-x64` (una vez añadido en
    Phase B) o `bun run tauri build` directo si el script no queda listo a tiempo — priorizar tener
    ALGO firmado y publicado esta noche sobre tener el script perfecto
15. Verificar artefactos generados + firmas (`.sig` presentes y con contenido válido)

### Phase D — Instalar y correr en la máquina del bar
16. Instalar el `.AppImage` (o `.deb` si se generó y es más nativo para CachyOS/Arch — decidir cuál,
    AppImage es portable y no requiere pacman) — dejarlo ejecutable y arrancado
17. Verificar boot: app abre, license activa (o falla con mensaje claro si 0.4.0.A pendiente lo
    rompe — reportar, no arreglar en esta tarea salvo que sea trivial)
18. Smoke funcional mínimo: crear un producto/orden de prueba si la UI lo permite sin fricción

### Phase E — Publish al hub + verificación (Mac)
19. Subir artefacto + `.sig` al hub — usar `scripts/release.ts publish` si quedó funcional tras Phase
    B, o el mismo bypass curl multipart que se usó para Windows si no
    (`POST https://admin.releases.mks2508.systems/api/admin/projects/haido/releases`)
20. Verificar: `curl https://haido.releases.mks2508.systems/api/updates/linux/x86_64/0.0.0` → 200 con
    JSON del release recién subido
21. Verificar `curl -I` del `/api/dl/...` del artefacto → 200

## Constraints

- **NO regenerar minisign key** — reusar la existente, pubkey en `tauri.conf.json` no cambia
- **NO commitear la private key** en ningún punto (ni en el repo remoto del bar)
- Si hay que elegir entre AppImage vs deb como installer humano, preferir **AppImage** (portable,
  sin pacman, más parecido al patrón "un solo binario" que ya se usa en macOS/Windows) salvo que
  algo lo bloquee — documentar la decisión en el plan, no hace falta preguntar a waxin salvo blocker real
- Mantener el mismo naming canónico: `tpv-haido-<version>-linux-x64<ext>`
- Version actual del proyecto: confirmar en `tauri.conf.json` antes de publicar (evitar colisión con
  releases ya existentes darwin/windows 0.1.0)

## Riesgos a documentar en el plan

- Deps de build Arch pueden faltar (paquete exacto `webkit2gtk-4.1` vs `webkit2gtk` según versión
  CachyOS/Arch — verificar nombre real en `pacman -Ss webkit2gtk`)
- AEAT sidecar Linux — si el binario cross-compilado no arranca nativo (glibc version mismatch u
  otro), documentar como gap, no bloquear el resto del smoke
- `TERM=xterm-ghostty` puede afectar cualquier subproceso SSH lanzado por el agente si hereda el env
  del proceso padre — el executor debe exportar `TERM=xterm-256color` explícito en cada comando SSH
- Mismatch de convención de artefacto Linux en `release.ts` (paralelo al bug ya conocido de Windows
  `.nsis.zip` vs `-setup.exe`) — probable, no asumir que "just works"

## Acceptance

- App instalada y corriendo en `supermicro-pcbar` (Linux x64, CachyOS)
- Artefacto Linux firmado y publicado en el hub, visible en `/api/updates/linux/x86_64/0.0.0`
- Download URL pública responde 200
- Gaps conocidos (0.4.0.A license hardening, AEAT sidecar Linux si falla) documentados, no bloquean

## Suggested executor agent

`task-executor` — bounded, single machine, mismo playbook que 0.4.0.D ya ejecutado con éxito.
Requiere Bash con acceso a la tailnet (SSH) — confirmar que el sandbox del executor puede alcanzar
`100.64.0.11` antes de asumir; si no puede, reportar y waxin ejecuta los comandos SSH él mismo con el
executor guiando paso a paso.

## Notas operativas

- Precedente Windows (0.4.0.D) tuvo 5 bloqueadores no triviales (PATH, tsgo cast, icon.ico, encoding
  BW passphrase, SSH disconnect matando el build) — leer esa sección del progress-log ANTES de
  empezar, varios de esos fixes ya están en el repo (commits `e3b732d`, `27b8e05`, `10145d8`) y no
  deberían repetirse, pero el patrón de "detached build para sobrevivir SSH disconnect" (`Start-Process`
  en Windows) puede necesitar equivalente Linux (`nohup`/`tmux`/`setsid` + `disown`) si el build tarda.
- Doc sync (roadmap.spec.yml + progress-log) se hace DESPUÉS de verificar esta tarea completa, en un
  solo pase — no tocar el SSOT durante la ejecución.
