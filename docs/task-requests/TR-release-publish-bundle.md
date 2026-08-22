# TR-release-publish-bundle — `release.ts publish-bundle` + wiring OTA CI

**Ticket**: nuevo (cierra el wiring diferido de TR-14 / TR-15 sobre el canal OTA)
**Phase**: sin numerar (extensión directa de 0.4.1.G release-CLI; mismo espacio que `publish`)
**Priority**: medium — el upload de bundles al hub hoy es 100% manual, esto lo automatiza
**Estimated**: 1-1.5h (casi todo reuso de helpers de `publish`, sin decisiones de auth nuevas)

## Contexto

TR-14 dejó armado el workflow `ota-bundle-deploy.yml` (build + ed25519 sign + contract verify
+ artifact upload) pero **sin paso de publish al hub** — el step "Publish instructions"
termina imprimiendo un snippet de `curl` manual a `POST /api/admin/projects/haido/bundles`
(confirmado leyendo el yaml actual: `"Requiere sesion Pocket ID en el navegador -- release.ts no
cubre bundles todavia"`).

TR-15 (`docs/task-requests/TR-15-auth-ci-release-hub-client-credentials.md`) resolvió el auth
CI→hub compartido (`client_credentials` contra Pocket ID, `RELEASE_HUB_CLIENT_ID`/
`RELEASE_HUB_CLIENT_SECRET` ya en GitHub Secrets) y lo wireó en `linux-x64-deploy.yml` /
`linux-arm64-deploy.yml`. En su **Paso 2.7** explícitamente deferió esto:

> "wiring en `ota-bundle-deploy.yml` — confirmado leyendo el step actual que `release.ts` no
> cubre bundles todavía — eso es feature nueva (nuevo comando/script de upload multipart para
> `/api/admin/projects/haido/bundles`), no wiring de lo ya existente. Fuera de scope de esta
> ronda de TR-15. Candidato a TR-16 o extensión de TR-14 si waxin lo prioriza."

Este TR cierra ese hueco: implementa el sub-comando nuevo en `release.ts` y lo wirea en el
workflow de OTA con el mismo gating/fallback que TR-15 ya lockeó para los pipelines nativos.

`desktop-release-hub` no se toca (verificado por TR-15: el `requireAuth()` que ya protege
`/api/admin/projects/.../bundles` valida cualquier Bearer JWT firmado por Pocket ID vía JWKS,
sin mirar el grant type).

## Objetivo

1. **`scripts/release.ts publish-bundle`** — sub-comando nuevo que sube un `bundle.zip` firmado
   por `build-bundle.ts pack` al endpoint `POST ${hub}/api/admin/projects/${slug}/bundles`
   (multipart/form-data, mismo `adminGuard` que el resto de `/api/admin/*`).
2. **Auto-discovery del bundle** — por defecto escanea `releases/bundles/*/bundle.zip` y elige
   el más reciente (lex-sort por nombre de directorio, que es `YYYY.MM.DD-N`); `--bundle <path>`
   apunta a un archivo concreto. Metadata (`bundleVersion` / `minNativeVersion` /
   `maxNativeVersion` / `signature`) se prioriza de flags CLI y cae al `manifest.json` hermano
   del zip si existen los campos allí.
3. **Auth reutilizando lo ya verificado** — mismo helper `mintAccessToken(opts)` de TR-15:
   `client_credentials` (default en CI) **o** PKCE cacheado (humano).
4. **`--dry-run`** — loguea el shape del request (URL, headers relevantes sin el Bearer, multipart
   fields y sus valores) sin hacer `POST`. Con `--client-credentials --dry-run`, mintea el
   token real (excepción ya lockeada por TR-15, no la reabro).
5. **Wiring en `.github/workflows/ota-bundle-deploy.yml`** — reemplazar el step "Publish
   instructions" por el patrón TR-15 (gate por tag + check env vars + `publish-bundle
   --client-credentials --skip-build` con fallback a instrucciones manuales si falla o si
   faltan los secrets — nunca un job rojo sin salida).

## Decisiones de diseño

- **`IPublishBundleOptions` separado de `IPublishOptions`** — el `publish` nativo tiene
  conceptos propios (`targets[]`, `notes`, `mapTargetToServer`). Reusar la interfaz con
  campos opcionales llenaría `IPublishOptions` de booleanos condicionales
  (`opts.targets` no tiene sentido para un bundle). Interfaz nueva + `parsePublishBundleOptions`
  separado.
- **`mintAccessToken` reutilizado tal cual** — vive en `release.ts:626` y ya está exportado en
  el grafo interno del archivo. El truco de TR-15 (mintear token real incluso en `--dry-run`
  cuando hay `--client-credentials`) vive en el helper y se respeta automáticamente.
- **Multipart con `FormData` + `Blob`** — mismo patrón exacto que `uploadArtifact()` ya usa
  para el canal nativo (`scripts/release.ts:1118-1126`). El campo file es `bundle` (documentado
  en `scripts/build-bundle.ts:166-168` — "Subida al hub (multipart): bundleVersion,
  minNativeVersion, maxNativeVersion, signature y el fichero en el campo `bundle`").
- **Firma del bundle = ed25519 base64 (NO minisign)** — el canal nativo usa minisign
  (`signature` = minisign armored string), el OTA usa ed25519 raw base64 (64 bytes —
  documentado en `docs/ota/canal-parcial.md:36-40`). Distinto formato, distinto tamaño. La
  CLI no debe confundirlos — `publish-bundle` trabaja sólo con ed25519, extraído del
  `manifest.json`.
- **Sin retry en 401** — copiado del patrón nativo (que sí lo hace, pero con refresh de token),
  lo omito en esta primera versión porque ya es complicado en `publish`. Si falla 401, el
  caller re-ejecuta; constante con la regla "feature nueva mínima viable, refactor cuando
  duela".

## Constraints

- **No tocar el flujo `publish` existente** — surgical extension. Cero diff en
  `parsePublishOptions`, `publish()`, `uploadArtifact()`, `mapTargetToServer`, OIDC helpers.
  Si necesito refactorizar algo, lo propongo en TR aparte.
- **No tocar `linux-x64-deploy.yml` / `linux-arm64-deploy.yml`** — TR-15 ya lockeó su wiring.
- **No commitear `client_id`/`client_secret`** — anti-leak de toda la vida.
- **DOCUMENTED-FIELDS-ASSUMED** (caveat abajo) — los nombres exactos de los multipart fields
  (`bundleVersion`, `minNativeVersion`, `maxNativeVersion`, `signature`, `bundle`) están
  documentados por dos fuentes:
  1. El comentario inline de `scripts/build-bundle.ts:166-168` ("Subida al hub: ...
     el fichero en el campo `bundle`").
  2. El step summary del workflow actual (`ota-bundle-deploy.yml:117-119` —
     `bundleVersion, minNativeVersion, maxNativeVersion, signature, bundle`).
  No pude leer `desktop-release-hub` source (no clonado en `~/repos/` en este entorno);
  la doc está coherente entre las dos fuentes y se alinea con la convención REST obvia del
  endpoint. Si en el smoke contra el hub real difieren (ej: `bundle` se llama `file`,
  `signature` se llama `bundle_signature`), el caller verá `400 missing field` claro —
  fix quirúrgico de 1-línea.

## Caveat

> **DOCUMENTED-FIELDS-ASSUMED**: multipart field names para `POST /api/admin/projects/haido/bundles`
> NO verificados contra el código real de `desktop-release-hub` en este entorno (el repo
> no está clonado localmente — `/Users/mks/repos/` solo tiene `auth-oidc-elysia`). Los nombres
> usados (`bundleVersion`, `minNativeVersion`, `maxNativeVersion`, `signature`, `bundle`) vienen
> de documentación inline en este repo (`scripts/build-bundle.ts:166-168` y el step summary
> del workflow existente). Smoke contra el hub real los confirmará; mismatch se ve como `400
> missing field` y se arregla con un patch de nombres.

## Acceptance

- ✅ `bun run typecheck` pasa en verde.
- ✅ `bun run scripts/release.ts publish-bundle --help` muestra el nuevo sub-comando y sus flags.
- ✅ `bun run scripts/release.ts publish-bundle --dry-run --client-credentials --slug haido
   --bundle /tmp/test-bundle.zip` (con dummy zip + dummy `manifest.json` sidecar) loguea el
   request shape (URL, headers, multipart fields, valores) sin hacer `POST` real.
- ✅ El hub endpoint usado es `POST ${hub}/api/admin/projects/${slug}/bundles` (mismo path
   que el snippet de `curl` manual que el workflow reemplazaba).
- ✅ El código respeta el patrón `Result<T, ResultError<...>>` de toda la CLI: cero `throw`,
   cero `try/catch` global, todos los errores via `resultError(code, message)` con códigos
   distintos (`BUNDLE_NOT_FOUND`, `MANIFEST_PARSE_FAILED`, `UPLOAD_FAILED`, etc.).
- ✅ Diff de `release.ts` surgical — solo añade funciones nuevas (`parsePublishBundleOptions`,
   `discoverBundles`, `loadBundleMetadata`, `uploadBundle`, `publishBundle`) y un branch en el
   `main()` dispatcher. Cero cambios a `publish`, `mintAccessToken`, OIDC helpers, etc.
- ✅ `ota-bundle-deploy.yml` ya no tiene el snippet de `curl` manual. En tags `v*` corre
   `bun run scripts/release.ts publish-bundle --client-credentials --skip-build --slug haido`
   gated por `RELEASE_HUB_CLIENT_ID/SECRET`. Si faltan o falla → fallback a instrucciones
   manuales + `exit 0` (mismo patrón que TR-15 en los workflows nativos).
- ✅ `actionlint .github/workflows/ota-bundle-deploy.yml` limpio.
- ✅ Report escrito en `/tmp/tr-release-publish-bundle-report.md` antes de cerrar (schema
   lockeado por el orquestador).

## Suggested executor agent

`task-executor` directo — la feature es mecánica (reuso de helpers de TR-15), no necesita
`.plan.md` separado. Cualquier decisión nueva que aparezca en ejecución → flag en el report y
para, no improvisa.

## Notas operativas

- Doc sync (`docs/roadmap.model.yml` + `docs/progress-log.md`) deferred — mismo patrón que el
  resto de la sesión, axon lo cierra en un solo pase al final.
- Si en smoke real el hub rechaza los nombres de campos, el fix es trivial (renombrar strings)
  y se cierra en un segundo round; no bloquea la subida del primer commit.
