# Release Process — TPV El Haido

> Proceso real (post release-hub, r2). Reemplaza el flujo viejo SSH+scp+psql contra
> `tpv-cloud` — ese servidor ya no es el destino de las releases, ver
> `docs/decisions/r2-release-hub-architecture-2026-05-10.md`.
>
> Hub: `desktop-release-hub` (multi-tenant, repo separado `mks2508/desktop-release-hub`).
> Tenant de este proyecto: `haido`. Endpoints públicos en `haido.releases.mks2508.systems`,
> endpoints admin en `admin.releases.mks2508.systems`.

## Prerequisitos

- `bun` instalado (>= 1.2)
- `cargo` + Tauri CLI instalados
- `minisign`/clave de firma configurada (ver `scripts/build-release.ts --help` para las 3
  formas de resolverla: env var, archivo `~/.tauri/<name>.key`, o Bitwarden)
- Cuenta Pocket ID con acceso admin al hub (`OIDC_ADMIN_SUBS` en el server)
- Para targets `linux-x64`/`linux-arm64`: build **nativo**, no hay cross-compile — correr en
  un host Linux real (physical, VM, o CI runner del arch correspondiente)

## Paso 0 — Login (una vez por máquina, cachea token en `~/.config/release-hub/token.json`)

```bash
bun run scripts/release.ts auth login   # abre navegador, flujo PKCE contra Pocket ID
bun run scripts/release.ts auth status  # verifica sesión (auto-refresh si expiró)
```

El token se auto-refresca en `publish` si expiró (usa `refresh_token`). Solo hace falta
re-loguear si el refresh token también expiró o si se corre `auth logout`.

## Paso 1 — Bump version

Editar `src-tauri/tauri.conf.json` (campo `"version"`) y `src-tauri/Cargo.toml`
(`[package].version`). `scripts/release.ts` lee la versión directamente de
`tauri.conf.json` — es la fuente de verdad para el publish.

```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to 0.X.Y"
git push
```

## Paso 2 — Build + publish

Un solo comando hace build (firmado) + upload al hub:

```bash
# Un target
bun run scripts/release.ts publish --target macos-arm64 --slug haido

# Todos los targets buildables desde la máquina actual
bun run scripts/release.ts publish --target all --slug haido

# Si el build ya se corrió antes (p.ej. build manual en un host remoto) y solo
# falta subir el artefacto ya presente en releases/<version>/<target>/:
bun run scripts/release.ts publish --target linux-x64 --slug haido --skip-build

# Dry-run — valida artefacto+sig+auth sin subir nada
bun run scripts/release.ts publish --target linux-x64 --slug haido --skip-build --dry-run
```

Targets soportados: `macos-arm64` · `macos-x64` · `windows-x64` · `linux-x64` ·
`linux-arm64` · `all`.

**`linux-x64`/`linux-arm64` solo pueden buildearse desde un host Linux del arch
correspondiente** (`validateTargetForCurrentPlatform` en `build-release.ts` corta el build
con un mensaje claro si se intenta cross-compilar). Workflow real usado en TR-07: SSH a la
máquina Linux, `git pull`, `bun run scripts/release.ts publish --target linux-x64 --slug
haido` ahí directamente (o build local + `--skip-build` desde el Mac si el artefacto ya se
copió).

Desde `0.65cb616` los 3 bloqueadores encontrados haciendo el primer build Linux nativo
(`PATH` sin `bun`/`cargo` en sesión SSH no interactiva, `strip` de `linuxdeploy` roto contra
secciones `.relr.dyn` del toolchain actual, `patchelf` de `linuxdeploy` corrompiendo el
sidecar AEAT compilado con `bun --compile`) se aplican **automáticamente** — no hace falta
ningún setup manual en la máquina de build. Ver `resolveLinuxBuildEnv()` en
`scripts/build-release.ts` y `scripts/linux/patchelf-aeat-shim.sh`.

Qué hace `publish` internamente:
1. Verifica auth (refresca token si hace falta).
2. Lee versión de `tauri.conf.json`.
3. Si no hay `--skip-build`, invoca `bun run scripts/build-release.ts --target <target>`
   (build + firma + coloca artefacto en `releases/<version>/<target>/`).
4. Busca artefacto + `.sig` en `releases/<version>/<target>/`.
5. Sube ambos via `multipart/form-data` a
   `POST {hub}/api/admin/projects/{slug}/releases` con `Authorization: Bearer <token>`.

## Paso 3 — Verificar

```bash
VERSION_ACTUAL="0.0.9"   # version que "tiene" el cliente que pregunta
TARGET="linux"           # windows | darwin | linux (taxonomía del server, no el label del CLI)
ARCH="x86_64"            # x86_64 | aarch64

curl -s "https://haido.releases.mks2508.systems/api/updates/${TARGET}/${ARCH}/${VERSION_ACTUAL}" | python3 -m json.tool
# 200 + JSON {version, notes, pub_date, url, signature} si hay una release más nueva
# 204 si el cliente ya está al día
# 404 si el slug/tenant no resuelve

# El campo "url" es relativo (p.ej. "/api/dl/0.1.0/linux/x86_64/archivo.AppImage") — el
# servidor lo resuelve así a propósito porque el tenant se infiere del subdominio, no del
# path. Se resuelve contra el mismo origin (haido.releases.mks2508.systems).
curl -sI "https://haido.releases.mks2508.systems/api/dl/${VERSION}/${TARGET}/${ARCH}/<archivo>" | grep -i "HTTP\|content-length"
```

## Troubleshooting conocido

| Síntoma | Causa | Fix |
|---|---|---|
| `413` al subir (`Server returned 413`) | `Bun.serve` rechaza bodies >128MB por defecto, antes de que Elysia vea el request | Ya fijado en el server (`maxRequestBodySize: 512MB`, commit `92f2cd1` en `desktop-release-hub`). Si un instalador futuro supera 512MB, subir el límite ahí. |
| `401 Unauthorized` en publish | Token cacheado expiró y el refresh también falló | `bun run scripts/release.ts auth login` de nuevo |
| `409` al publicar | Ya existe una release con esa versión+target+arch en el hub | Bump de versión, o borrarla desde el admin API si fue un publish erróneo |
| Build linux falla con `Target "linux-x64" ... requires running on a Linux host` | Intentaste correr un target linux desde macOS/Windows | Correr el build (o `publish` sin `--skip-build`) directamente en un host Linux del arch correcto |
| `failed to run linuxdeploy` en CI (GitHub Actions) | Sin diagnosticar todavía — mismo síntoma que en supermicro-pcbar pero contexto de runner limpio (Ubuntu) distinto al de Arch con toolchain skew. Puede que necesite el mismo `NO_STRIP`/shim de patchelf, puede que sea otra causa. | Pendiente — ver `docs/task-requests/TR-12-rebuild-ci-pipelines-release-hub.md` |

## Deploy del hub en sí (server, no la app)

El código del server vive en `mks2508/desktop-release-hub` (repo separado). Deploy via
Coolify — reads `apps/server/.coolify.json`:

```bash
cd <checkout-de-desktop-release-hub>/apps/server
coolify-cli deploy <app_uuid>   # app_uuid en .coolify.json → _provisioned.app_uuid
```

Ver skill `coolify-mks-cli-mcp` para el resto de comandos (`logs`, `status`, `env`, etc).
