# TR-15 — Auth CI→release-hub vía OAuth2 client_credentials (Pocket ID)

**Ticket**: nuevo
**Phase**: sin numerar (cierra el objetivo original de TR-12; también destraba el publish
automático de TR-14 — el endpoint `/api/admin/bundles` comparte el mismo `requireAuth()` que
projects/releases/licenses)
**Priority**: medium — el publish real (nativo y OTA) sigue funcionando manual hoy, esto lo
automatiza
**Estimated**: 1-1.5h (más config que código — ver split por owner abajo)
**Decisión previa**: `docs/decisions/r4-auth-ci-hub-client-credentials-2026-08-21.md` (lockeada,
no relitigar el mecanismo)

## Contexto

TR-12 dejó el objetivo real ("auth CI→hub para publish automático") sin arrancar, con 3 opciones
analizadas pero ninguna con evidencia. Esta ronda investigó código real (no solo docs) de
`desktop-release-hub`:

- `apiKeys` (tabla Drizzle, migración `0000` aplicada) — **cero consumidores**, scaffold muerto de
  0.4.1.C. No usarla, no construir nada encima.
- `auth-guard.ts` + `@mks2508/auth-oidc-elysia` (`middleware.ts`/`oidc-client.ts`) — **ya validan
  cualquier Bearer JWT firmado por Pocket ID vía JWKS+issuer**, sin mirar el grant type. Confirmado
  leyendo el código fuente, no asumido.
- Pocket ID soporta `client_credentials` nativo, `sub` determinista `client-{ID}`.

Conclusión (ver r4 completo): **cero cambios en `desktop-release-hub`**. Todo el trabajo nuevo
vive en `tpv-el-haido2` (`release.ts`) + config de Pocket ID/Coolify.

## Objetivo — split explícito por owner (no asumir que todo es delegable)

**Paso 0 — COMPLETO Y VERIFICADO (2026-08-21, ejecutado vía Admin API key de Pocket ID que
waxin entregó, en vez de UI manual — mismo resultado, más rápido):**

1. ✅ Client M2M creado vía `POST /api/oidc/clients` (`ci-tpv-haido`,
   `id=e54c5644-8557-4aa5-bbfb-b44cce7957c8`, sin callback, grupos unrestricted).
2. ✅ `sub` real confirmado por token real decodificado (NO el supuesto de docs):
   **`sub=client-e54c5644-8557-4aa5-bbfb-b44cce7957c8`** (patrón `client-{UUID}`, coincide con
   la doc pero con el UUID real, no con `client-ci-tpv-haido` como asumía el preview de r4 —
   corregido ahí también). `aud` = `["e54c5644-8557-4aa5-bbfb-b44cce7957c8"]`.
3. ⚠️ **Coolify `OIDC_ADMIN_SUBS` — NO tocado, y no hacía falta**: verificado (vía
   `coolify-cli env`) que esa var **no existe** en `release-hub-server` hoy — y el código
   (`config.ts:27`, `middleware.ts:118-161`) trata "no seteada / vacía" como **"cualquier
   usuario autenticado es admin"**. Confirmado empíricamente: `GET /api/admin/projects` sin
   token → `401`; con el Bearer del client nuevo → `200`, contra el hub de producción real.
   **Hallazgo fuera de scope de este TR** (el release-hub admin API no tiene whitelist activa
   ahora mismo — cualquiera de los ~15 clients OIDC registrados, o un login humano, pasa el
   `adminGuard`) — no lo toco aquí, queda anotado para una decisión de seguridad aparte si
   waxin quiere cerrarlo.
4. Credenciales en `.env.local` (gitignored) de este repo + `RELEASE_HUB_CLIENT_ID` /
   `RELEASE_HUB_CLIENT_SECRET` seteados como GitHub Secrets (`gh secret set`, valores nunca en
   chat/commit/log — el secret SÍ apareció una vez en el chat de esta sesión al pegármelo
   waxin; rotado sería una opción si le preocupa, decisión suya, no bloqueante).

**Paso 1 — EN CURSO (sibling `tr15-cc`, worktree `sib/tr15-cc`, modelo minimax, dispatch
2026-08-21 vía `siblings up`/`prompt` — handoff:
`docs/handoffs/tr15-paso1-client-credentials.md`):**
4. `scripts/release.ts`: nuevo modo `publish --client-credentials` (o flag equivalente) que:
   - Salta el flujo PKCE/loopback/browser por completo.
   - `POST` al `token_endpoint` (mismo discovery que ya usa `auth login`, reusar
     `OIDC_ISSUER_URL`) con `grant_type=client_credentials`, `client_id`, `client_secret` (de env
     vars, no de `~/.config/release-hub/token.json` — ese cache sigue siendo solo para el flujo
     humano), `resource=https://haido.releases.mks2508.systems`.
   - Usa el `access_token` devuelto como `Authorization: Bearer` en la llamada de publish real
     (mismo request que ya hace el flujo humano tras `auth login`, reusar esa función de
     publish — no duplicarla).
   - Sin cache a disco de este token (vive solo en memoria del proceso CI, se descarta al salir).

**Paso 2 — COMPLETO (2026-08-21, ejecutado directo, `gh` en este repo):**
5. ✅ `gh secret set RELEASE_HUB_CLIENT_ID` / `RELEASE_HUB_CLIENT_SECRET` en
   `MKS2508/tpv-el-haido2` (hecho junto con paso 0, valores nunca en chat/log).
6. ✅ Wiring en `linux-x64-deploy.yml`/`linux-arm64-deploy.yml` — el step "Publish instructions"
   ahora chequea `RELEASE_HUB_CLIENT_ID`/`SECRET` vía `env:` + `if [ -n ... ]` en shell (NO
   `if:` de Actions, `secrets.*` no está disponible ahí): si están seteados, corre
   `publish --client-credentials --skip-build --target <target> --slug haido`; si el publish
   automático falla (hub caído, token expirado) O si faltan los secrets, cae a las instrucciones
   manuales originales — nunca un rojo sin salida. `actionlint` limpio en ambos. Mergeado a
   `main` (commit `7de50c5`, **no pusheado todavía** — requiere OK explícito).
7. ⏸️ **Diferido, no ejecutado**: wiring en `ota-bundle-deploy.yml` (TR-14) — confirmado leyendo
   el step actual que `release.ts` no cubre bundles todavía ("release.ts no cubre bundles
   todavia" es el propio texto del step manual) — eso es feature nueva (nuevo comando/script de
   upload multipart para `/api/admin/projects/haido/bundles`), no wiring de lo ya existente. Fuera
   de scope de esta ronda de TR-15. Candidato a TR-16 o extensión de TR-14 si waxin lo prioriza.

## Constraints

- **No tocar el flujo PKCE humano** (`auth login`) — este TR añade un modo nuevo, no reemplaza el
  existente. `waxin` sigue pudiendo publicar a mano igual que hoy.
- **No implementar nada del paso 1 antes de que el paso 0 esté confirmado** — sin `client_id`
  real no hay forma de probar el flujo end-to-end, y probarlo contra el hub de producción con
  credenciales inventadas es ruido.
- **Fallback manual siempre presente** — si el publish automático falla en CI (token expirado,
  hub caído, lo que sea), el workflow debe seguir subiendo el artifact + imprimiendo las
  instrucciones manuales, no solo fallar en rojo sin salida.
- Anti-leak: `client_secret` nunca en commit/log/doc — mismo tratamiento que cualquier otro
  secret de este repo.

## Acceptance

- ✅ Token de prueba obtenido a mano confirma el patrón `sub=client-{ID}` real (no solo supuesto
  de docs) antes de whitelistearlo — `sub=client-e54c5644-8557-4aa5-bbfb-b44cce7957c8`.
- ✅ `release.ts publish --client-credentials` funciona contra el hub real en un smoke manual —
  **no dry-run**: auth real + `POST /api/admin/projects/haido/releases` real con el artifact ya
  publicado de `0.1.2/linux-x64` → `409 Release already exists` (auth pasó el `adminGuard`,
  llegó hasta el unique constraint de DB; cero mutación al canal real porque colisiona a
  propósito con una versión ya publicada — elegido así deliberadamente para no arriesgar el
  canal `windows-x64`, que sigue en `0.1.0` desde mayo y es lo que corre el TPV del bar).
- ⏸️ **CI en un tag de prueba real — NO ejecutado todavía.** El código está mergeado a `main`
  pero no pusheado (requiere OK explícito de waxin). Un tag `v*` real dispararía el publish
  automático de verdad (y sí bumpearía el canal `linux-x64`, hoy en 0.1.2 → lo que sea el nuevo
  tag). El test del camino de fallo (borrar el secret temporalmente) tampoco se ha corrido — son
  las dos piezas que quedan para dar por 100% cerrado el acceptance, ambas decisión de waxin
  (cuándo cortar un tag real).
- ✅ `TR-12-...md` actualizado con referencia a este TR. `TR-14-...md` — pendiente de actualizar
  con la nota de scope-diferido de bundles (ver Paso 2.7 arriba).

## Suggested executor agent

`task-decomposer` primero para el paso 1 (tocar auth + reusar código de publish existente sin
duplicarlo merece un `.plan.md` concreto) — pero **no arrancar el decomposer hasta que waxin
confirme el paso 0** (necesita el `client_id`/`sub` real para que el plan no trabaje con
supuestos). Yo hago los pasos 2/5-7 directo una vez el paso 1 esté verificado.

## Notas operativas

- No hay overlap con TR-13 (tickmaster, ya cerrado). Overlap con TR-14: mismo mecanismo de auth,
  coordinar el wiring del paso 7 si TR-14 todavía no cerró su propia decisión de auth (revisar
  estado de TR-14 al ejecutar).
- Doc sync (roadmap.spec.yml + progress-log) diferido, mismo patrón que el resto de la sesión.
