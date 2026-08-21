---
type: handoff
unit: TR-15-paso1
status: ready
---

# Handoff — TR-15 Paso 1: `release.ts publish --client-credentials`

**Contexto (no re-derivar, ya está decidido y verificado):**
- Decisión lockeada: `docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md` — OAuth2
  `client_credentials` estándar contra Pocket ID, cero cambios en `desktop-release-hub`.
- Task-request completo: `docs/task-requests/TR-15-auth-ci-release-hub-client-credentials.md`
  — este handoff ejecuta **solo el Paso 1** de ese TR (el código en este repo).
- **Paso 0 ya está hecho y verificado end-to-end** (client Pocket ID `ci-tpv-haido` creado,
  `sub=client-e54c5644-8557-4aa5-bbfb-b44cce7957c8` confirmado por token real, probado 200 OK
  contra `GET /api/admin/projects` del hub de producción). Las credenciales viven en
  `.env.local` (gitignored, ya copiado a este worktree) como `RELEASE_HUB_CLIENT_ID` /
  `RELEASE_HUB_CLIENT_SECRET`. **No las imprimas, no las loguees, no las commitees.**

## Objetivo

En `scripts/release.ts`, añadir un modo `publish --client-credentials` que autentique vía
OAuth2 `client_credentials` (Pocket ID) en vez del flujo PKCE humano — pensado para CI headless.

## Mapa del archivo (ya localizado, no busques desde cero)

- `OIDC_ISSUER_URL` (línea 50) — reusar para el discovery del `client_credentials` grant.
- `IPublishOptions` interface (cerca de línea 182) + `parsePublishOptions()` (línea 187) —
  añadir aquí el parseo del flag `--client-credentials` (boolean, sin valor).
- `discoverOidc()` (línea 316) — ya hace discovery OIDC; reusar el `token_endpoint` que
  devuelve en vez de hardcodear la URL.
- `loadValidToken()` (línea 462) — el flujo PKCE humano, **NO TOCAR**.
- `publish()` (línea 1042) — el bloque `// 1. Auth` (líneas 1045-1069) es el punto de
  inserción: si `opts.clientCredentials` es true, en vez de `loadValidToken()` (PKCE cache),
  hacer un `POST` a `token_endpoint` con `grant_type=client_credentials`, `client_id` /
  `client_secret` leídos de `process.env.RELEASE_HUB_CLIENT_ID` /
  `process.env.RELEASE_HUB_CLIENT_SECRET` (fallar con error claro si no están seteadas), y usar
  el `access_token` devuelto como `accessToken` para el resto de la función — **sin tocar nada
  de lo que viene después** (build/discover/upload por target ya es agnóstico del método de auth).
- El resto de `publish()` (build, `discoverArtifacts`, `uploadArtifact`, retry-on-401) **no se
  toca** — el nuevo modo solo reemplaza cómo se obtiene `accessToken`.

## Constraints (hard, no negociables)

1. **No tocar `loadValidToken`/`authLogin`/PKCE** — el flujo humano sigue funcionando igual.
2. **No cachear a disco el token de `client_credentials`** — vive solo en memoria del proceso,
   se descarta al salir (contraste deliberado con `TOKEN_CACHE_PATH`, que es solo para PKCE).
3. **Reusar `uploadArtifact`/`discoverArtifacts`/el loop de targets existente** — no duplicar
   lógica de publish.
4. **No imprimir `RELEASE_HUB_CLIENT_SECRET` ni el `access_token` completo en logs** (mismo
   nivel de cuidado que el resto del script con el token PKCE).
5. **`--client-credentials` y la ausencia de auth PKCE cacheada son compatibles** — no debe
   requerir `auth login` previo cuando se usa este flag.

## Smoke a correr (SOLO esto, NO más)

Las credenciales en `.env.local` son reales de producción. Autorizado únicamente:

```bash
# Cargar env
export $(grep RELEASE_HUB_CLIENT_ID .env.local) $(grep RELEASE_HUB_CLIENT_SECRET .env.local)

# Verifica que el modo mintea un token real (discovery + client_credentials grant).
# Si tu implementación expone esto de forma aislada (función testeable), pruébala directo.
# Si no, usa --dry-run (el publish real seguirá pidiendo --skip-build + artifacts reales,
# que NO tenemos en este worktree — no lo intentes, fallará por falta de build, es esperado).
bun run scripts/release.ts publish --client-credentials --dry-run --target macos-arm64 --slug haido
```

**NO ejecutes `publish --client-credentials` SIN `--dry-run`** — eso dispararía un upload real
al hub de producción. Ese smoke end-to-end (con `--skip-build` y un artifact real) lo hace el
orquestador/waxin manualmente después de verificar tu código, no tú en este sibling.

## Report contract

Escribe `/tmp/tr15-paso1-report.md` ANTES de terminar, con: `filesChanged` (`git diff --stat`),
`verifyPassed` (qué corriste — typecheck/lint/el dry-run de arriba), `verifyOutput` (raw),
`introducedWorkarounds: []` (vacío o justificado), `architecturalConcerns: []` (o flag si algo
no encaja), `stopReason: null` (o por qué paraste).

**No hagas commit.** El orquestador revisa el diff y commitea si verifica verde.
