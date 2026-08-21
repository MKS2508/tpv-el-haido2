# TR-16 — Activar whitelist de admin (`OIDC_ADMIN_SUBS`) en `desktop-release-hub`

**Ticket**: nuevo
**Phase**: sin numerar — hardening de seguridad, no bloquea producción del bar
**Priority**: medium (no explotable por un atacante externo random hoy — Pocket ID es
passkey-only, homelab sin registro abierto — pero viola least-privilege en un endpoint que
puede borrar releases/licenses/proyectos de producción)
**Estimated**: 15-30min (es una env var + verificación, no hay código que tocar)
**Repo afectado**: `desktop-release-hub` (externo, `/Users/mks/repos/desktop-release-hub` local)
+ su despliegue en Coolify (`release-hub-server`, uuid `d79mh3d95qhlpdd7hmmdn2sn`). **Cero
cambios de código en este repo (`tpv-el-haido2`)** ni en `desktop-release-hub` — el mecanismo
de whitelist ya existe, solo falta poblarlo.

## Contexto (hallazgo de TR-15, investigado con evidencia real, no solo lectura de código)

Durante la ejecución de TR-15 se confirmó, leyendo `desktop-release-hub/apps/server/src/config.ts:27`
y `@mks2508/auth-oidc-elysia/src/middleware.ts:118-161`:

> `oidcAdminSubs? — CSV of admin subject UUIDs from Pocket ID. Empty = any authenticated user`

`OIDC_ADMIN_SUBS` **no existe** como env var en `release-hub-server` (confirmado con
`coolify-cli env d79mh3d95qhlpdd7hmmdn2sn`). El check en el middleware es
`if (config.adminSubs?.length && !config.adminSubs.includes(sub))` — si la lista está vacía o
ausente, el `&&` corta corto y **el check nunca se ejecuta**: cualquier JWT válido de Pocket ID
(firma + issuer correctos, sin chequeo de `aud` ni de qué client lo emitió) pasa el `adminGuard`
de TODAS las rutas `/api/admin/*` (proyectos, releases, licenses, bundles — crear, editar,
**borrar**).

**Confirmado empírico contra producción** (no solo lectura de código): `GET /api/admin/projects`
sin token → `401`; con el Bearer de `ci-tpv-haido` (client M2M creado en TR-15, sin relación
alguna con el propósito de esa ruta) → `200`.

### Superficie de exposición real (investigado en esta ronda)

- Pocket ID tiene **~15 OIDC clients** registrados en la instancia homelab (`gateway-broker`,
  `Vaultwarden`, `Headscale`, `Cloudreve`, `Coolify Dashboard`, `mks-cli`, `mesh-panel`,
  `gateway-proxy`, `mks-devenv-service`, etc. — listados vía Admin API, `GET /api/oidc/clients`).
  Cualquiera de ellos, si mintea un token `client_credentials` (o usa uno cacheado) por su
  propio motivo, técnicamente también pasa como admin del release-hub — sin que eso tenga nada
  que ver con su propósito real.
- `desktop-release-hub` es **single-tenant hoy**: `GET /api/admin/projects` devuelve un único
  proyecto (`haido`). No hay otros tenants que compliquen la whitelist.
- Pocket ID tiene **un único usuario humano**: `mks2508` (waxin), sub
  `678e7ffd-a0ef-4923-ac76-51bce345f169` (confirmado vía `GET /api/users` con el Admin API key).
  Este es el sub que usa el flujo humano PKCE del admin UI (`admin.releases.mks2508.systems`,
  client `release-hub-cli`, id `70e7daf3-f393-4db9-b9e7-05e8775d7f6c` — ese mismo id es el
  `OIDC_CLIENT_ID` ya configurado en el propio `release-hub-server`, confirmado).

## Objetivo

Poblar `OIDC_ADMIN_SUBS` en Coolify (`release-hub-server`) con la whitelist real, exacta,
mínima — nada de "por si acaso":

```
OIDC_ADMIN_SUBS=678e7ffd-a0ef-4923-ac76-51bce345f169,client-e54c5644-8557-4aa5-bbfb-b44cce7957c8
```

- `678e7ffd-a0ef-4923-ac76-51bce345f169` — waxin (humano, admin UI vía `release-hub-cli`).
- `client-e54c5644-8557-4aa5-bbfb-b44cce7957c8` — `ci-tpv-haido` (M2M, CI de este repo, TR-15).

## Constraints

- **No tocar código** — ni en `tpv-el-haido2` ni en `desktop-release-hub`. El mecanismo de
  whitelist (`middleware.ts:118-161`) ya existe y ya funciona, solo está desactivado por
  ausencia de la env var.
- **Verificar ANTES de dar por bueno**: tras setear la var (puede requerir restart del servicio
  para recargar env, no redeploy de código), repetir el smoke de TR-15
  (`GET /api/admin/projects` con el token de `ci-tpv-haido`) — debe seguir devolviendo `200`
  (está en la whitelist). Y probar CON un token de un client NO whitelisteado (ej. mintear uno
  para `mks-cli` u otro de los 15, si es trivial) — debe devolver `401`/`403` ahora, donde antes
  devolvía `200`. Sin este segundo test, no hay evidencia de que el fix cierre el gap real.
- **No romper el flujo humano de waxin** — el sub `678e7ffd-a0ef-4923-ac76-51bce345f169` tiene
  que quedar en la lista o waxin se bloquea a sí mismo del admin UI del hub.
- **No romper TR-15** — el sub `client-e54c5644-8557-4aa5-bbfb-b44cce7957c8` tiene que quedar en
  la lista o el próximo tag real rompe el publish automático.
- Anti-leak: nada de esto son secrets (son subs/UUIDs, identificadores públicos dentro del JWT,
  no credenciales) — pueden vivir en el TR y en el commit sin problema.

## Acceptance

- `OIDC_ADMIN_SUBS` seteada en Coolify con exactamente los 2 subs de arriba.
- Servicio reiniciado (o confirmado que recargó env sin restart si Coolify lo hace automático).
- Smoke positivo: `ci-tpv-haido` sigue con `200` en `/api/admin/projects`.
- Smoke negativo: un token de un client NO whitelisteado (o sin whitelistear temporalmente el de
  `ci-tpv-haido` para probar el caso negativo con ESE mismo token) devuelve `401`/`403` — prueba
  real de que el gate ahora filtra, no solo que sigue dejando pasar a todos.
- El flujo humano de waxin (login PKCE al admin UI) sigue funcionando tras el cambio — verificar
  a mano, no asumir.
- Documentar el resultado en este mismo TR (sección "Estado") + una línea en el progress-log de
  `tpv-el-haido2` (aunque el cambio viva en otro repo, el hallazgo se originó aquí).

## Estado (2026-08-21, ejecutado y verificado — OK explícito de waxin)

Ejecutado en el orden del TR:

1. ✅ `OIDC_ADMIN_SUBS` seteada en `release-hub-server` (`coolify-cli env --set`) con exactamente
   los 2 subs propuestos. Confirmado leyendo la var de vuelta.
2. ✅ `coolify-cli restart d79mh3d95qhlpdd7hmmdn2sn` — servicio `running:healthy` tras el restart
   (verificado con `coolify-cli list`, no con `status` — su formato de salida no matchea
   `running:healthy` como substring, nota para la próxima vez).
3. ✅ **Smoke positivo**: token real de `ci-tpv-haido` (client de TR-15) → `GET /api/admin/projects`
   → `200`. Sigue pasando, como debía.
4. ✅ **Smoke negativo**: creado un client M2M desechable (`tr16-negative-test`, NO en la
   whitelist) — vía la misma Admin API key, sin tocar el secret de ningún servicio real — token
   real minteado → `GET /api/admin/projects` → **`401`** (antes del fix, cualquier token válido
   daba `200` aquí). Prueba directa de que el gate ahora filtra de verdad. Client desechable
   borrado después (`DELETE /api/oidc/clients/<id>` → `204`).
5. ⏸️ **Flujo humano de waxin — no verificado empíricamente** (requeriría una ceremonia passkey
   real en navegador, fuera de lo que puedo ejecutar). Garantía indirecta: mismo mecanismo de
   whitelist que el smoke positivo/negativo ya probaron, y el sub de waxin
   (`678e7ffd-a0ef-4923-ac76-51bce345f169`) está en la lista — si algo estuviera mal, sería un
   error de transcripción del UUID, no de lógica. **Pendiente: waxin confirma a mano** que sigue
   entrando a `admin.releases.mks2508.systems` sin problema.

**Veredicto: `closed-with-flagged-edge`** — el gate está activo y verificado en ambos sentidos
(positivo/negativo); el único punto sin prueba directa es el login humano, que queda como
verificación de un minuto para waxin, no como bloqueante técnico.

## Suggested executor agent

Directo (yo, axon) — es una env var + 2 smokes de verificación, no hay ambigüedad de diseño ni
código que decomponer. Requiere `coolify-cli env --set` (ya usado en modo lectura esta sesión,
falta confirmar que tengo permiso de escritura) + el Admin API key de Pocket ID que waxin ya
entregó esta sesión (para mintear el token de prueba del client no-whitelisteado). **No ejecutar
sin OK explícito de waxin** — toca auth de producción de un servicio que no es este repo, y un
error en la whitelist bloquea al propio waxin de su panel de admin.

## Notas operativas

- Origen: hallazgo colateral de TR-15 (`docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md`,
  `docs/progress-log.md` entrada 2026-08-21 continuación 2).
- Repo del hub: `/Users/mks/repos/desktop-release-hub` (local) — no requiere clonar de nuevo.
- Doc sync (roadmap.spec.yml + progress-log) diferido, igual que el resto — axon lo hace después.
