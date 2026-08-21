# TR-14 — Pipeline CI para el canal OTA parcial (bundles JS)

**Ticket**: nuevo
**Phase**: sin numerar (relacionado con TR-12, comparte el gap de auth CI→hub)
**Priority**: medium — el canal OTA ya funciona manual (`build-bundle.ts` + upload a mano),
esto es automatizarlo
**Estimated**: 1.5-2h (nuevo workflow + decisión de auth, no es solo YAML)

## Contexto

waxin construyó (en paralelo a TR-13, misma noche) un canal OTA completo para bundles JS —
ver `docs/ota/canal-parcial.md` (cliente Tauri) y
`/Users/mks/repos/desktop-release-hub/docs/handoffs/ota-bundles-js-hub-side.md` (lado hub,
verificado contra código real, no supuesto). Matriz ya lockeada por waxin (no reabrir):

| Cambio | Canal |
|---|---|
| CSS, layout, textos, lógica UI Solid, adaptador de impresora (TS) | JS parcial (OTA) |
| Comando Rust nuevo, cambio de firma, dependencia nativa/sidecar | Nativo (release-hub, sin tocar) |

Hoy el empaquetado es 100% manual: `bun run scripts/build-bundle.ts pack --min X --max Y
[--build]` produce el zip firmado en `releases/bundles/`, y la subida al hub real (`POST` al
endpoint admin de bundles, mismo Pocket ID PKCE que el resto de `/api/admin/*`) no tiene ningún
script — ni `release.ts` ni `build-bundle.ts` hacen la parte de upload todavía.

**Bloqueo compartido con TR-12**: el mismo gap de auth CI→hub que TR-12 ya documentó (PKCE
loopback no funciona en un runner headless) aplica igual acá — el endpoint de bundles está bajo
el mismo `requireAuth()` que projects/releases/licenses.

**Estado del lado hub** (waxin lo está cerrando en paralelo a este TR, verificar al ejecutar si
ya está hecho): bug 2.1 del handoff (`maxNativeVersion` pelada se comporta como "solo esa
versión" en vez de cota superior inclusive) es el único bloqueador real para que el canal
funcione contra el hub de producción en vez del hub falso local.

## Objetivo

1. **Nuevo workflow** `ota-bundle-deploy.yml` (o el nombre que decida el ejecutor, consistente
   con `linux-x64-deploy.yml`/`linux-arm64-deploy.yml` existentes) — build + sign del bundle JS
   vía `build-bundle.ts pack`, sin tocar el pipeline nativo existente.
2. **Trigger dual, no uno solo** (lockeado por waxin en conversación, no relitigar):
   - Path-filter automático (`paths:`/`paths-ignore:`) — dispara en push a `main` cuando el diff
     toca solo `src/**`/`package.json` frontend y nada de `src-tauri/**`.
   - Override manual (`workflow_dispatch` con input, o mecanismo equivalente) — para forzar un
     bundle sin depender del filtro, o para debugear.
3. **Decisión de auth CI→hub para el publish real** — el ejecutor NO decide esto a ciegas.
   Opciones a evaluar (mismo espacio que TR-12 ya dejó abierto, reusar ese análisis en vez de
   rehacerlo):
   - (a) CI solo hace build+sign, sube como GitHub Actions artifact — publish real al hub sigue
     siendo manual (`build-bundle.ts pack` + upload a mano) hasta que exista auth
     service-to-service. **Recomendado como primer incremento** dado que el lado hub todavía
     tiene un bug conocido (2.1) sin cerrar a la fecha de este TR — no automatizar un publish
     real contra algo que puede estar fallando en silencio.
   - (b) Auth service-to-service real (API key / client credentials) en
     `desktop-release-hub`/`auth-oidc-elysia` — correcto arquitectónicamente pero cross-repo,
     candidato a su propio TR separado si se elige esta vía.
   - (c) Token PKCE cacheado como GitHub Secret — más rápido, reintroduce credencial long-lived
     como secret de CI (mismo trade-off que TR-12 ya documentó, no repetirlo aquí sin releer
     ese análisis).
4. Verificar el zip generado contra el contrato documentado en el handoff del hub (`index.html`
   en la raíz, `bundleVersion` tipo `2026.08.21-1`, `signature` base64 64 bytes) antes de darlo
   por bueno.

## Constraints

- NO tocar `linux-x64-deploy.yml`/`linux-arm64-deploy.yml` (pipeline nativo) salvo que el
  path-filter del nuevo workflow requiera ajustar algo mínimo ahí para evitar builds nativos
  duplicados en el mismo push — si hace falta, proponerlo explícito en el plan, no aplicarlo
  a ciegas.
- NO implementar (b) ni (c) sin decisión explícita de waxin — el primer incremento entregable
  de este TR es (a) como mínimo mientras se decide el resto.
- NO asumir que el bug 2.1 del hub ya está cerrado — verificar al ejecutar (waxin dijo que lo
  estaba cerrando en paralelo la misma noche de este TR).
- Reusar la clave pública ya generada (`src-tauri/ota-bundle-pubkey.txt`) y el `deviceId`
  (sha256 de `/etc/machine-id`) tal cual documentados — no regenerar nada de eso.

## Suggested executor agent

`task-decomposer` primero (toca CI + una decisión de auth no trivial, vale un `.plan.md`) →
`task-executor` para el incremento (a) una vez el plan esté claro.

## Notas operativas

- Doc sync (roadmap.spec.yml + progress-log) diferido, igual que el resto — axon lo hace
  después en un solo pase.
- Repo del hub es `/Users/mks/repos/desktop-release-hub` si el plan necesita leer el endpoint
  admin de bundles para confirmar el contrato exacto de subida.

## Estado (2026-08-21, auth CI→hub resuelto por TR-15, wiring de bundles queda deferred)

TR-15 (`docs/task-requests/TR-15-auth-ci-release-hub-client-credentials.md`) resolvió el auth
CI→hub compartido (OAuth2 `client_credentials` contra Pocket ID, GH Secrets `RELEASE_HUB_CLIENT_ID`/
`SECRET` ya seteados) y lo wireó en `linux-x64-deploy.yml`/`linux-arm64-deploy.yml`. El wiring
equivalente en `ota-bundle-deploy.yml` **no se hizo en esa ronda**: confirmado leyendo el step
actual que `release.ts` no tiene ningún path de upload de bundles (ni siquiera manual con
`fetch` — el step imprime instrucciones de `curl` a mano a `POST /api/admin/projects/haido/bundles`).
Cerrar esto de verdad requiere escribir ese comando nuevo en `release.ts` (o un script aparte)
primero — es feature nueva, no wiring de algo que ya exista. El auth ya está resuelto y
disponible (mismas env vars `RELEASE_HUB_CLIENT_ID`/`SECRET`); falta el código de upload.
