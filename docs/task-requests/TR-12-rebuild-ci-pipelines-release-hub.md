# TR-12 — Borrar y rehacer pipelines Linux x64 + RPi ARM64 (build en GH Actions, publish al release-hub)

**Ticket**: nuevo, crear TKT si hace falta
**Phase**: sin numerar (candidato 0.4.2/0.6.0, decidir post-ejecución — mismo criterio que TR-07/TR-11)
**Priority**: medium (mejora de dev workflow, no bloquea producción de esta noche)
**Estimated**: 2-3h (incluye investigación de auth CI→hub, no es solo YAML)

## Estado (2026-08-21, re-check tras merge de TR-08/TR-10 en `949981a`)

Los workflows nuevos (`linux-x64-deploy.yml`, `linux-arm64-deploy.yml`) ya existen y corren,
pero siguen **rotos al 100%, con 2 blockers apilados** — ninguno de los dos resuelto todavía:

1. **`bun install --frozen-lockfile` 404 en `@mks2508/tickmaster-{core,sdk}`** (run
   `32420104820`, 55s, desde que TR-08 metió esas deps en `package.json` sin publicarlas nunca).
   Root cause + fix → `TR-13-tickmaster-packaging-unification.md` + decisión
   `docs/decisions/r3-tickmaster-packaging-2026-08-21.md`.
2. **`linuxdeploy` falla en bundling AppImage** (run `32417966021`, ~11min in, previo a que
   tickmaster entrara en el install):
   `failed to decode secret key: ... Invalid symbol 32, offset 9` — el GitHub Secret
   `TAURI_SIGNING_PRIVATE_KEY` tiene un espacio embebido rompiendo el base64. Acción directa de
   waxin (tiene la key real, anti-leak rule) — resetear el secret limpio, re-run.

Resolver blocker 1 destapa el 2 (no CI verde todavía tras TR-13 solo). El resto de este TR
(objetivo original: auth CI→hub para publish automático) sigue sin arrancar — no hay evidencia
de que se haya investigado la parte de auth PKCE-en-headless-runner descrita más abajo.

## Estado (2026-08-21, cierre de blockers 1+2 + investigación del gap de auth)

Ambos blockers de arriba **resueltos** — CI verde real (firma minisign verificada, no solo "job
success") en Linux x64 y ARM64 tras TR-13 (tickmaster) + 4 blockers adicionales descubiertos en
la propia verificación de CI (passphrase incorrecta, pubkey duplicada hardcodeada en los
workflows, `xdg-utils` faltante en ARM64 — ver `docs/progress-log.md` para la cadena completa).

El gap de auth CI→hub (objetivo original de este TR) **investigado con evidencia real** (código
fuente de `desktop-release-hub`/`auth-oidc-elysia`, no solo lectura de docs) y decidido: ver
`docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md` (OAuth2 `client_credentials`
contra Pocket ID, cero cambios en `desktop-release-hub`). Ejecución →
`docs/task-requests/TR-15-auth-ci-release-hub-client-credentials.md`.

## Contexto — por qué se borran las actuales

Diagnosticado hoy (axon + `gh run view --log-failed`): `.github/workflows/linux-x64-deploy.yml` y
`rpi-deploy.yml` (de enero, ~3.5 meses antes de la decisión r1-D1) están **rotos al 100%** desde
que hay historial visible:

- **linux-x64-deploy.yml**: falla en TODOS los runs (10/10 revisados) — `Dockerfile:4` pinea
  `FROM rust:1.83-bookworm`, y una dependencia transitiva (`time v0.3.47`) ya requiere la feature
  `edition2024` de Cargo, no estabilizada hasta Cargo 1.85. Muere en `cargo build`, antes de tocar
  código de la app.
- **rpi-deploy.yml**: los jobs quedan `queued` indefinidamente (runner `ubuntu-latest-arm64`
  self-hosted que no existe/no está registrado) — nunca llega a correr.
- Ambos usan `npm ci` (el proyecto es 100% Bun hoy), acciones deprecadas
  (`actions-rs/toolchain@v1`), y **publican a GitHub Releases** (`softprops/action-gh-release@v1`
  + `latest.json`/`latest-x64.json` apuntando a `github.com/.../releases/download/...`) — esto
  es exactamente lo que la decisión **r1-D1** (2026-05-09) eliminó: *"Sin GitHub: distribución
  100% via Coolify, no GitHub Releases ni Actions"*.

## Objetivo (clarificado por waxin, no asumir la lectura simple)

**Build en GitHub Actions SÍ, publish a GitHub Releases NO.** El resultado final debe:
1. Compilar el TPV en CI (push a `main` como smoke, opcionalmente en tags para releases reales)
   para Linux x64 y RPi ARM64, con toolchain actualizado (Bun, Rust stable vía
   `dtolnay/rust-toolchain`, deps del sistema correctas — mismo patrón que ya se resolvió hoy
   a mano en `supermicro-pcbar` para TR-07, reusar esa lista de paquetes como referencia).
2. Firmar los artefactos con la minisign key existente (secrets de GitHub:
   `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — verificar si ya están
   seteados en el repo o hay que crearlos).
3. **Publicar al release-hub** (`haido.releases.mks2508.systems`, mismo proyecto `haido` que ya
   usa `scripts/release.ts`) — NO a GitHub Releases. Nada de `latest.json` apuntando a
   `github.com`, nada de `softprops/action-gh-release`.

## Gap técnico real a resolver — auth CI → release-hub (NO decidir por tu cuenta, investigar y proponer)

`scripts/release.ts publish` usa **Pocket ID OIDC PKCE loopback** (D12, decisión lockeada
r2-2026-05-10): abre un navegador local, captura el callback en `127.0.0.1:54321`. **Esto NO
funciona en un runner headless de GitHub Actions** — no hay navegador, no hay usuario interactivo.

Opciones a investigar y presentar en el plan (no elegir una sin evidencia):

1. **Nuevo mecanismo de auth service-to-service en desktop-release-hub** (API key / client
   credentials, no PKCE) — requiere tocar el repo externo `mks2508/desktop-release-hub`
   (`apps/server`, posiblemente `auth-oidc-elysia`). Más correcto arquitectónicamente (sin
   credenciales long-lived humanas en CI) pero más trabajo — puede que amerite su propio TR
   separado en vez de meterlo dentro de este.
2. **Token PKCE cacheado como GitHub Secret**, refrescado manualmente cuando expire (mismo
   `~/.config/release-hub/token.json` que usa `release.ts` hoy, pegado como secret) — más rápido
   de implementar, pero reintroduce el problema que D12 quería evitar (credencial long-lived,
   aunque esta vez como GitHub Secret en vez de en disco de un humano). Documentar el trade-off
   explícitamente si se recomienda esta opción.
3. **CI solo hace build + sign, sube como GitHub Actions artifact (NO Release, NO github.com
   público)** — el publish real al hub sigue siendo un paso manual (`release.ts publish
   --skip-build` con el artefacto ya compilado por CI, descargado del run) hasta que la opción 1
   exista. Es el path de menor blast radius y menos trabajo nuevo, mantiene todo lo demás igual.

El decomposer debe investigar (leer `desktop-release-hub` si es necesario, verificar si ya existe
algo tipo API key en el schema — recordar que 0.4.1.C dejó `api_keys` como tabla `deferred` en el
schema Drizzle del hub, ver progress-log 0.4.1.B) y **recomendar una opción con evidencia**,
dejando las otras documentadas. Si la opción 1 resulta significativamente más grande que el resto
de este TR, proponerla como TR/ticket separado y ejecutar la opción 3 como interim en este TR —
no bloquear todo el TR-12 esperando una feature nueva del hub.

## Constraints

- **NO GitHub Releases, NO `latest.json`/`latest-x64.json` apuntando a `github.com`** — el
  endpoint de updates sigue siendo `haido.releases.mks2508.systems/api/updates/...`
  exclusivamente.
- **NO regenerar la minisign key.**
- Toolchain: Bun (no npm/node), Rust vía `dtolnay/rust-toolchain@stable` (no
  `actions-rs/toolchain@v1`, deprecada).
- Deps de sistema Linux: usar la lista real verificada hoy en `supermicro-pcbar`
  (`webkit2gtk-4.1`, `appmenu-gtk-module`, `libayatana-appindicator`, `fuse2`, `patchelf` —
  equivalentes Ubuntu/apt del workflow viejo ya estaban bastante cerca,
  `libappindicator3-dev`/`libayatana-appindicator3-dev` es el nombre apt, verificar cuál es
  redundante).
- RPi ARM64: el workflow viejo asumía un runner `ubuntu-latest-arm64` que no existe — investigar
  si GitHub ofrece runners ARM64 nativos hoy (más barato/simple) vs. necesitar un self-hosted
  runner real en una Pi (relacionado con RPI-BAR/futuro hardware, coordinar con el estado de
  TR-08 si aplica, pero son máquinas distintas — RPI-BAR es la impresora, no un build target).
- Trigger: push a `main` como smoke build (sin publish), tags `v*` para el flujo completo
  (build + sign + publish al hub) — mismo patrón de gating por tag que tenía el workflow viejo,
  solo cambiando el destino del publish.

## Acceptance

- `.github/workflows/linux-x64-deploy.yml` y `rpi-deploy.yml` viejos eliminados.
- Nuevos workflows (mismo nombre o renombrados si tiene sentido) compilan verde en push a `main`.
- Ningún workflow referencia `softprops/action-gh-release`, `github.com/.../releases/download`,
  ni genera `latest.json` con esa forma.
- Publish al hub funciona de alguna forma (automática si la opción de auth lo permite, o
  documentado como paso manual interim si no) — no queda como "TODO" sin resolver ni como mock.
- Sin secrets reales expuestos en ningún log/commit.

## Suggested executor agent

`task-decomposer` primero — el gap de auth CI→hub necesita investigación real (leer
`desktop-release-hub`, decidir con evidencia) antes de poder escribir YAML concreto. Luego
`task-executor`. Dado que esto puede tocar un repo externo (`desktop-release-hub`) si se recomienda
la opción 1, aplicar el mismo criterio que TR-08 M2: cambio pequeño/mecánico ahí = ejecutar
directo con evidencia documentada; cambio grande = proponer como TR separado, no ejecutar sin
confirmar.

## Notas operativas

- No hay overlap de archivos con TR-07/08/10/11 (todos en `src/`/`scripts/`, esto es
  `.github/workflows/` + posiblemente `Dockerfile`).
- Doc sync (roadmap.spec.yml + progress-log) diferido, mismo patrón que el resto de la sesión.
