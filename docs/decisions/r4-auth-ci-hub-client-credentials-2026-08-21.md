# r4 — Auth CI→release-hub: OAuth2 client_credentials (Pocket ID)

**Fecha lock**: 2026-08-21
**Lockeado por**: AskUserQuestion + preview, 2 rondas (waxin pidió investigar Pocket ID antes de
elegir en la primera ronda — "busca docu de pocket id y pensamos la mejor"), confirmación
explícita "client_secret estándar (Recommended)" en la segunda.
**Contexto de bloqueo**: TR-12 (rebuild CI pipelines Linux x64/ARM64) — objetivo original nunca
arrancado ("auth CI→hub para publish automático"), analizado con 3 opciones en el TR pero sin
evidencia real hasta esta investigación.

---

## Contexto

`scripts/release.ts publish` usa **Pocket ID OIDC PKCE loopback** (decisión previa D12,
r2-2026-05-10): abre navegador, captura callback en `127.0.0.1:54321`. No funciona en un runner
headless de GitHub Actions — no hay navegador ni usuario interactivo. TR-12 dejó 3 opciones sin
decidir: (1) auth service-to-service nueva en el hub, (2) cachear el token PKCE humano como GH
Secret, (3) quedarse con build+sign+artifact manual.

Investigación de esta ronda (leído código real, no asumido):

- **`apiKeys` table en el schema Drizzle del hub** (`packages/shared/src/schema.ts:196`) existe y
  la migración `0000` ya está aplicada — pero tiene **cero consumidores**: ninguna ruta del
  servidor la lee, ningún middleware la verifica. Es scaffold muerto de 0.4.1.C, nunca se
  construyó encima.
- **`auth-guard.ts`** (`adminGuard`) solo chequea `ctx.isAuthenticated`, derivado por
  `createAuthMiddleware` de `@mks2508/auth-oidc-elysia`.
- **`middleware.ts`** (línea 145-165 del paquete `auth-oidc-elysia`): si no hay session-cookie
  válida, cae a "raw Pocket ID access_token vía JWKS" — verifica **cualquier** Bearer JWT firmado
  por Pocket ID contra su JWKS + issuer, **sin mirar qué grant lo emitió**.
- **`oidc-client.ts:162-185`** (`verifyAccessToken`): `jose.jwtVerify(token, jwks, {issuer})` —
  solo firma + issuer, sin chequeo de `aud`/scope. Cualquier JWT válido de ese issuer pasa.
- **Pocket ID soporta `client_credentials` nativamente** (4 grants: authorization_code,
  refresh_token, device_code, client_credentials — confirmado en docs oficiales). El `sub` del
  token resultante es **determinista**: `client-{ID}`. Scopes de identidad (`openid`/`profile`)
  se eliminan del token de máquina; el `aud` se fija al `resource` pedido.

**Conclusión**: la Opción 1 de TR-12 (auth service-to-service) no necesita tocar
`desktop-release-hub` en absoluto. El middleware ya acepta un Bearer JWT de un cliente
`client_credentials` de Pocket ID — solo falta whitelistear su `sub` en `OIDC_ADMIN_SUBS` (env
var, sin redeploy de código) y darle a CI una forma de obtener ese JWT sin browser.

## Decisión lockeada

**OAuth2 `client_credentials` estándar (client_id + client_secret) contra Pocket ID**, en vez de:
cachear el token PKCE humano como GH Secret (opción 2, reintroduce el problema que D12 quería
evitar), o quedarse manual (opción 3, no automatiza nada), o federated credentials vía OIDC de
GitHub Actions (variante sin secrets estáticos — documentada por Pocket ID solo para
K8s/AWS IAM/Azure Entra/Tailscale, NO confirmada para GitHub Actions; mismo mecanismo genérico
JWT-bearer pero requeriría un spike de verificación antes de comprometerse — queda como fast-follow
opcional, no bloquea este lock).

```
Pocket ID (ejecutado 2026-08-21 vía Admin API key, no UI manual):
  POST /api/oidc/clients {name: ci-tpv-haido, grant_types incluye client_credentials por defecto}
  → id real: e54c5644-8557-4aa5-bbfb-b44cce7957c8
  → sub real confirmado por token: client-e54c5644-8557-4aa5-bbfb-b44cce7957c8
    (patrón client-{UUID} — el UUID real, NO "client-ci-tpv-haido" como asumía este preview
    originalmente; corregido tras verificación con token real, no con supuesto de docs)

Coolify (desktop-release-hub): OIDC_ADMIN_SUBS NO existe hoy → "vacío = cualquier autenticado
  es admin" (config.ts:27, middleware.ts:118-161) → el client nuevo YA pasa el adminGuard sin
  tocar Coolify. Verificado empírico: 401 sin token, 200 con el Bearer del client nuevo contra
  GET /api/admin/projects en producción. Hallazgo de seguridad fuera de scope de este TR.

release.ts (tpv-el-haido2, código nuevo, EN CURSO vía sibling tr15-cc/minimax):
  publish --client-credentials
    POST {token_endpoint}
      grant_type=client_credentials
      client_id / client_secret (env vars RELEASE_HUB_CLIENT_ID/SECRET)
    → access_token → Bearer en publish

CI (linux-x64/arm64-deploy.yml, tag push):
  env: RELEASE_HUB_CLIENT_ID / RELEASE_HUB_CLIENT_SECRET (GH Secrets, ya seteados 2026-08-21)
  run: release.ts publish --client-credentials --skip-build
```

**Rationale**: cero cambios en `desktop-release-hub` (repo externo) — el middleware ya soporta
esto sin código nuevo, solo config (Pocket ID client + env var). El único código nuevo vive en
`tpv-el-haido2` (`release.ts`), donde sí puedo delegar a un executor sin cruzar repos.

**Trade-off aceptado**: sigue siendo un secret estático (`client_secret`) en GH Secrets — misma
clase de riesgo que `TAURI_SIGNING_PRIVATE_KEY`, pero de blast radius acotado: ese `sub` concreto
es lo único que hay que revocar/rotar si se filtra (no toca la sesión personal de waxin en el
hub, no toca otros clientes). No es zero-secret — la variante federated sí lo sería, pero no está
confirmada para GitHub Actions.

**No decidido en esta ronda** (fuera de scope, no bloquea el lock): si vale la pena el spike de
federated credentials como fast-follow una vez esta opción esté en producción y probada.

## Siguiente

`TR-15-auth-ci-release-hub-client-credentials.md` (nuevo, este mismo turno) — scope split por
owner: Pocket ID client + `OIDC_ADMIN_SUBS` (waxin, acción de credencial fuera de mi tooling),
patch de `release.ts` (delegable a task-executor), GH Secrets + wiring en los workflows (yo,
tengo `gh` en este repo). Depende de: nada nuevo, todo el código de sign+build ya está verde
(TR-12 blockers 1+2 resueltos, TR-13/TR-14 cerrados). Bloquea: cierre real de TR-12 (objetivo
original).
