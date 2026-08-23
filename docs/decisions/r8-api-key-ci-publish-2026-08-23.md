---
type: decision
id: r8-api-key-ci-publish-2026-08-23
date: 2026-08-23
locked_by: waxin (recovery from v0.1.4 publish 401)
status: locked
supersedes: [r4-auth-ci-hub-client-credentials-2026-08-21] (parcialmente — para publish, NO para ingest)
---

# Decision — CI publish auth via per-project API key (replaces client_credentials)

## Contexto

TR-15 lockeo `client_credentials` (OAuth2 RFC 6749 §4.4) como el path de auth
para `publish` desde CI. Verificado end-to-end en tag v0.1.3 (2026-08-21).

El mismo dia (2026-08-22) se bumpeo `@mks2508/auth-oidc-elysia` de 0.1.1 → 0.2.0
en el hub. La 0.2.0 AGREGO enforcement de `audience` y `allowedClientIds` dentro
de `verifyAccessToken` (diff verificado independientemente en `/tmp/auth-oidc-check/`):

- 0.1.1: `jose.jwtVerify(token, jwks, { issuer })` — NO chequea aud
- 0.2.0: `jose.jwtVerify(token, jwks, { issuer, ...audience ? { audience } : {} })`
  + post-verify `allowedClientIds` check (devuelve `AuthErrorCode.ClientNotAllowed`)

El sub de `ci-tpv-haido` (`client-e54c5644-...`) esta en `OIDC_ADMIN_SUBS` (no
era el problema), pero su `client_id` NO esta en `allowedClientIds` (solo
`f9a3a4ad-...` del build runner de agentics) y su `aud` no matchea
`ingestAudience`. Resultado: 401 fail-closed en CADA publish attempt post-bump.

El `m2m-auth-fix` (commit ad5d108) quito `adminSubs` del global plugin pero NO
toco `audience`/`allowedClientIds` — son gates separados que aplican a TODO
raw access_token (sesion O M2M). El fix desbloquea el build runner de agentics
para `/api/artifacts/ingest` (donde si tiene aud+client_id correctos), pero
no resuelve el publish de ci-tpv-haido.

Adicionalmente: el `verifyAccessToken` 0.2.0 deriva `clientId` del claim `aud`
via `deriveClientIdFromAud(payload.aud)`, no del OIDC `client_id`. Esto
conflacta "que M2M client esta llamando" con "que audience declara" — para que
dos clients coexistan en `allowedClientIds`, sus aud deben ser unicos. Esto
bloquea de raiz cualquier intento de "agregar ci-tpv-haido a la allowlist"
sin rediseñar el modelo de aud del Pocket ID provider.

## Decision

Para `publish` desde CI: **per-project API key con scope `releases:write`**,
generada via admin UI, persistida como GitHub Secret `RELEASE_HUB_API_KEY`,
pasada como `Authorization: Bearer rhk_<key>`.

El hub ya implementa `apiKeyOrAdminGuard('releases:write')` en
`apps/server/src/lib/api-key-auth.ts` que valida el prefijo `rhk_` ANTES del
gate de audience/allowedClientIds del auth plugin — bypass total del M2M gate.

Para `client_credentials`: queda como fallback deprecated, NO removal. Solo
util si alguien genera un OIDC client cuyo `aud` matchee `ingestAudience`
(mecanismo no implementado hoy en Pocket ID para multiples clients).

## Rationale

- Cero cambios al hub, cero cambios a Pocket ID, cero config nueva
- El path `apiKeyOrAdminGuard` ya estaba implementado y verificado en prod
  (feature `track/api-keys-per-project` cerrada en 0.4.1.C)
- Cada proyecto tiene su propia key — blast radius limitado a revoke
- Compatible con el patron de la industria (GitHub PATs, GitLab deploy keys)

## Trade-offs aceptados

- Waxin tiene que generar la key manualmente en admin UI (one-time setup)
- La key tiene que estar en GitHub Secrets — si se filtra, revoke + regenerate
- Waxin rotara keys cuando rote Pocket ID OIDC secret

## Fuera de scope

- Multiples API keys por proyecto (un revoke atomico es suficiente)
- API key con scope `bundles:write` (no se usa en CI hoy)
- Reemplazo de `client_credentials` para el build runner de agentics (funciona)

## Recovery de v0.1.4

Waxin tiene que:
1. Generar `rhk_<key>` para haido en admin UI con scope `releases:write`
2. Guardar como GitHub Secret `RELEASE_HUB_API_KEY`
3. Una vez merge + push del codigo de esta decision:
   - `git tag -d v0.1.4 && git push origin :refs/tags/v0.1.4`
   - `git tag v0.1.4 && git push origin v0.1.4`
   - CI corre con nuevo publish step → ✅

## Supersedes

`docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md` — para
`publish` desde CI. NO para `agentics build runner → ingest` (ahi client_credentials
sigue siendo el path correcto, y ahora tambien funciona tras m2m-auth-fix).
