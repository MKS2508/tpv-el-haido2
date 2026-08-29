---
type: implementation-handoff
lane: d10d-minisign-prod
base: d714d16
executor: task-executor
cwd: /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2
ssot: docs/handoffs/lane-d10d-ota-parcial-f2-2026-08-29.md (predecessor)
---

# Lane D10-D — Minisign production keypair rollout

## TL;DR

El canal OTA parcial de haido quedó migrado a minisign en `d714d16`, pero con
pubkey **placeholder** (`ota-bundle-pubkey.txt:1` =
`RWTTLWHBNgmWxCH0wd1xhoN3WXFhkEaUTbAQu9n4EIsN2L+OJS24nRpF`, keynum
`C4960936C1612DD3`). El workflow `ota-bundle-deploy.yml` falla cerrado si
`OTA_BUNDLE_SIGNING_PRIVATE_KEY` no está seteado, así que en CI real el primer
push va a fallar con `::error::secret OTA_BUNDLE_SIGNING_PRIVATE_KEY no
seteado; exit 1` — pero el workflow local con el placeholder podría firmar
algo y subirlo, así que la prioridad es BLOQUEAR el placeholder y meter la
clave de producción antes de cualquier push que dispare el workflow.

**Esta lane cierra ese gap**: genera el keypair de producción, lo registra
en el hub como `kind=binary` para el proyecto `haido`, lo expone como CI
secret en `tpv-el-haido2`, y reemplaza la pubkey embebida en el binario.

## Milestones

| Milestone | Estado esperado | Evidencia |
|-----------|----------------|-----------|
| **M1** Generar minisign keypair prod localmente | `/tmp/haido-prod.{pub,key}` 600, passphrase vacío | `ls -la /tmp/haido-prod.*`, `wc -l /tmp/haido-prod.pub = 3` |
| **M2** PUT kind=binary pubkey al hub | `release-hub project signing-keys haido --kind binary --pubkey "..."` → 200 | `release-hub project signing-keys haido` muestra `kind=binary` con la nueva pubkey (≠ placeholder) |
| **M3** Set CI secret `OTA_BUNDLE_SIGNING_PRIVATE_KEY` | `gh secret list --repo MKS2508/tpv-el-haido2` muestra el secret | output de `gh secret list` |
| **M4** Reemplazar pubkey en `ota-bundle-pubkey.txt` | line 2 ≠ placeholder, keynum ≠ `C4960936C1612DD3` | `sed -n '2p' src-tauri/ota-bundle-pubkey.txt` |
| **M5** Smoke local: pack + sign + verify con la nueva keypair | `minisign -Vm bundle.zip -P "$(sed -n '2p' ota-bundle-pubkey.txt)" -x bundle.zip.minisig` → Signature verification OK | output del verify |
| **M6** NO PUSH | queda commit local listo para que waxin mande `AXON_PUSH_OK=1` | `git status -sb` con 1 commit ahead |

## Hard rules (waxin locks, no negociación)

- **Sin co-author, sin atribución AI**. Cero "Claude Code", "generated with",
  "Co-Authored-By: Claude". Conventional commits.
- **Secretos NUNCA en repo tracked**. El sec.key va SOLO a `gh secret set`
  (stdin) y `/tmp/`. Borrar `/tmp/haido-prod.key` al terminar M3.
- **Secreto real placeholder = `<REDACTED>` en commit messages y docs**. Si
  tienes que referenciar la keynum/key-id, usa el placeholder genérico.
- **No amend** commits sin OK explícito.
- **No push** sin `AXON_PUSH_OK=1` explícito del orquestador. Esta lane
  PREPARA el commit local pero NO pushea. Waxin decide cuándo.
- **No `git add -A`**. Paths explícitos siempre. Cambios esperados:
  - `src-tauri/ota-bundle-pubkey.txt` (M4)
  - posiblemente comentario en `src-tauri/Cargo.toml` que dice "keynum
    C4960936C1612DD3" → actualizar al nuevo keynum si aplica (M4b).
- **Sin edición del hub (`desktop-release-hub`)** desde este cwd. Toda la
  interacción con el hub es vía `release-hub` CLI contra la API, no commits
  al repo del hub.
- **Comentario apología = bug**. Si el código necesita un comentario largo
  explicando por qué un workaround está bien, el código está mal.

## Pre-flight (ejecutor verifica antes de empezar)

```bash
cd /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2

# 1. waxin YA hizo `release-hub login` en otra terminal — sesión guardada en
#    ~/.config/release-hub/cli.json. Verificar:
test -f ~/.config/release-hub/cli.json && echo "session presente" || {
  echo "waxin tiene que hacer login primero — aborta";
  exit 1;
}

# 2. minisign instalado
which minisign || { echo "minisign no instalado"; exit 1; }

# 3. gh auth activo con scope repo
gh auth status 2>&1 | grep -q "repo" || {
  echo "gh sin scope repo — aborta"; exit 1;
}

# 4. cwd limpio antes de empezar
git status -sb | head -3   # solo main...origin/main esperado, sin M
git log -1 --oneline       # debe ser d714d16 feat(ota): migrate haido...
```

Si CUALQUIERA falla → STOP, escalar al orquestador.

## M1 — Generar minisign keypair prod

```bash
TMPDIR=$(mktemp -d -t haido-prod-XXXX)
cd "$TMPDIR"

# passphrase vacío (-W), keynum aleatorio, 32-byte ed25519 seed (default)
minisign -G -p haido-prod.pub -s haido-prod.key -W

# Capturar el keynum para report (NO committear)
sed -n '2p' haido-prod.pub | cut -d' ' -f2

# Lock down perms
chmod 600 haido-prod.key

# Exportar paths para milestones siguientes
export HAIDO_PROD_PUB="$TMPDIR/haido-prod.pub"
export HAIDO_PROD_KEY="$TMPDIR/haido-prod.key"

# Verificación
test -f "$HAIDO_PROD_PUB" && wc -l "$HAIDO_PROD_PUB"  # debe ser 3
test -f "$HAIDO_PROD_KEY" && wc -c "$HAIDO_PROD_KEY"  # > 0
ls -la "$HAIDO_PROD_PUB" "$HAIDO_PROD_KEY"
```

**Output esperado**: 3-line `.pub` box (untrusted comment + base64 payload
con prefijo `Ed` o `ED` + keynum 8 chars + 32-byte raw ed25519 pub). El
executor del M9 fix en `desktop-release-hub` (commit `405c762`) verifica que
acepta ambos marcadores.

## M2 — PUT kind=binary pubkey al hub

```bash
# El CLI exige sesión OIDC (adminGuard). La sesión YA está en
# ~/.config/release-hub/cli.json (M0).
# Si el CLI devuelve 401/403 → sesión expiró, abortar y escalar.
#
# IMPORTANTE: `release-hub` NO está en $PATH en esta máquina.
# Se invoca vía bun con path absoluto al source del workspace:
RELEASE_HUB="bun /Volumes/KODAK1TB/REPOS y PROYECTOS/nodejs-bun/desktop-release-hub/packages/sdk/src/cli.ts"

# Verificar que el proyecto haido EXISTE primero
$RELEASE_HUB project get haido 2>&1 | head -20
# Si dice "project not found" → abortar, no crear proyecto desde esta lane
# (la creación de proyectos es scope de otra lane).

# PUT pubkey como kind=binary
PUBKEY_BODY="$(cat "$HAIDO_PROD_PUB")"
$RELEASE_HUB project signing-keys haido \
  --kind binary \
  --pubkey "$PUBKEY_BODY"

# Verificación: GET debe mostrar la nueva pubkey
$RELEASE_HUB project signing-keys haido --kind binary | tee /tmp/m2-get.txt
# Sanity: el output contiene la línea base64 de $HAIDO_PROD_PUB
grep -q "$(sed -n '2p' "$HAIDO_PROD_PUB" | awk '{print $1}')" /tmp/m2-get.txt \
  || { echo "hub no refleja el upsert — abortar"; exit 1; }
```

**Output esperado**: 200 OK (CLI silencioso o mensaje "updated"). El hub
almacena en `project_signing_keys` tabla (per docs/error-codes.ts:73). Si
422 SIGNING_KEY_PUBKEY_INVALID → la pubkey no pasa `parseMinisignPubkey`
(ver `lib/minisign.ts`), regenerar con `-W` (M1 puede haber dejado un
formato exótico).

## M3 — Set CI secret

```bash
# El workflow espera el sec.key COMPLETO (3 líneas, base64-encrypted blob,
# comentario trusted+untrusted) como el contenido del secret. Verificado
# leyendo .github/workflows/ota-bundle-deploy.yml:50-58:
#   printf '%s' "$OTA_KEY" > tauri-keys/ota-bundle.key
#   chmod 600 tauri-keys/ota-bundle.key
# Después build-bundle.ts pack corre `minisign -S -s sec.key -m bundle.zip -W`.

# gh secret set con stdin (NUNCA via --body con el contenido del key en argv
# del shell, por si el historial de comandos se loguea).
gh secret set OTA_BUNDLE_SIGNING_PRIVATE_KEY \
  --repo MKS2508/tpv-el-haido2 \
  < "$HAIDO_PROD_KEY"

# Verificación
gh secret list --repo MKS2508/tpv-el-haido2 \
  | grep -E "OTA_BUNDLE_SIGNING" \
  || { echo "secret no aparece — abortar"; exit 1; }

# IMPORTANTE: borrar la copia local del sec.key al terminar (no leak en /tmp
# post-session)
shred -u "$HAIDO_PROD_KEY" 2>/dev/null || rm -f "$HAIDO_PROD_KEY"
```

**Output esperado**: `✓ Secret OTA_BUNDLE_SIGNING_PRIVATE_KEY updated` (gh
silencioso por defecto; `--no-output` flag si quieres callar el success). El
secret queda cifrado at-rest en GitHub Secrets (envelope encryption con la
pubkey del repo).

## M4 — Reemplazar pubkey embebida en el binario

```bash
cd /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2

# Capturar nueva pubkey line 2 (la que va dentro del binario via
# include_str!("../../ota-bundle-pubkey.txt"))
NEW_PUB_LINE2=$(sed -n '2p' "$HAIDO_PROD_PUB")

# Sanity: ≠ placeholder
test "$NEW_PUB_LINE2" = "RWTTLWHBNgmWxCH0wd1xhoN3WXFhkEaUTbAQu9n4EIsN2L+OJS24nRpF" \
  && { echo "ERROR: nueva pubkey == placeholder, regenerar"; exit 1; }

# Reescribir (sólo line 2; mantener line 1 comentario para humanos)
cat > src-tauri/ota-bundle-pubkey.txt << EOF
untrusted comment: minisign public key $NEW_PUB_LINE2
$NEW_PUB_LINE2
EOF

# Verificación
sed -n '2p' src-tauri/ota-bundle-pubkey.txt  # debe imprimir la nueva
md5 -q src-tauri/ota-bundle-pubkey.txt       # NO committear, es fingerprint
                                              # de control (registrar en el
                                              # report, no en el commit msg)

# M4b: si src-tauri/Cargo.toml comenta el keynum placeholder, actualizar.
# Buscar:
grep -n "C4960936C1612DD3" src-tauri/Cargo.toml 2>&1 | head -3
# Si hay hit → editar el comentario al nuevo keynum (extraído de la pubkey).
# Si NO hay hit → skip M4b.

git diff src-tauri/ota-bundle-pubkey.txt  # revisar ANTES de stage
```

**Output esperado**: `ota-bundle-pubkey.txt` con la nueva pubkey, distinta
del placeholder. La pubkey embebida en el binario en el próximo build será
la de producción.

## M5 — Smoke local (sin push, sin publish)

```bash
# Verificar que la pubkey en el binario COMPILE-time matchea con la del hub.
# El binario embebe via include_str!("../../ota-bundle-pubkey.txt").trim_ascii().
# Un `cargo build` o incluso un test que lea el bundle_pubkey() alcanza:

cd src-tauri
cargo test --lib ota::poller::tests::partial_latest_url_pinneado_a_la_convencion_l3 2>&1 | tail -10
# El test no usa la pubkey directamente, pero verifica que el módulo sigue
# compilando con el nuevo contenido del .txt.

# Smoke real: pack + sign + verify con la nueva pubkey (sin publish)
cd ..
TMPDIR=$(mktemp -d -t haido-smoke-XXXX)
cd "$TMPDIR"

# Simular el bundle mínimo (cualquier zip firmado vale para el verify)
mkdir -p frontend
echo "<html>smoke</html>" > frontend/index.html
zip -q ../bundle-test.zip frontend/

# Firmar con la prod key (la que está en el secret de CI)
# Usamos una copia throwaway del sec.key para el smoke — la copia de M3 ya
# está borrada en CI, esta es local-only
TMPKEY=$(mktemp)
gh secret get OTA_BUNDLE_SIGNING_PRIVATE_KEY --repo MKS2508/tpv-el-haido2 > "$TMPKEY"
chmod 600 "$TMPKEY"
# OJO: `gh secret get` puede no existir en todas las versiones; si falla,
# regenerar localmente con `minisign -G -p pub -s key -W` y usar esa para
# el smoke (es el mismo keypair).

minisign -S -s "$TMPKEY" -m bundle-test.zip -W
ls -la bundle-test.zip.minisig

# Verify contra la nueva pubkey line 2 (la del binario)
minisign -Vm bundle-test.zip \
  -P "$(sed -n '2p' /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2/src-tauri/ota-bundle-pubkey.txt)" \
  -x bundle-test.zip.minisig

# Debe imprimir "Signature verification OK"
shred -u "$TMPKEY" 2>/dev/null || rm -f "$TMPKEY"
cd /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2
```

**Output esperado**: `Signature verification OK` (minisign exit 0).
Confirmación end-to-end de que el keypair prod sirve para firmar Y que el
cliente puede verificar contra la pubkey embebida.

## M6 — Commit local (NO push)

```bash
cd /Volumes/KODAK1TB/REPOS y PROYECTOS/tauri/tpv-el-haido2

# Diff antes de stage — DEBE ser solo ota-bundle-pubkey.txt (+ opcional
# comentario en Cargo.toml). NADA MÁS.
git status -sb
git diff --stat
# Si aparece CUALQUIER archivo extra → STOP, no stage, escalar.

# Stage explícito (NO -A)
git add src-tauri/ota-bundle-pubkey.txt
[ -n "$(git diff --name-only src-tauri/Cargo.toml)" ] \
  && git add src-tauri/Cargo.toml

git diff --cached --stat

# Pre-commit safety scan
git diff --cached | grep -iE "co-authored|claude|anthropic|generated with|sk-mks-|sk-[a-zA-Z0-9]{20,}|ghp_|gho_|ghs_|BEGIN PRIVATE|OTA_BUNDLE_SIGNING_PRIVATE_KEY=[^<]" \
  && { echo "FAIL: AI attribution o secret en diff staged"; git reset HEAD .; exit 1; }

# Commit
git commit -m "feat(ota): production kind=binary pubkey for haido partial channel

Reemplaza la pubkey placeholder (keynum C4960936C1612DD3) por la de
produccion. Coordinado con:
- desktop-release-hub project haido kind=binary signing key
  (PUT /api/admin/projects/haido/signing-keys/binary, sessión OIDC)
- GitHub Actions secret OTA_BUNDLE_SIGNING_PRIVATE_KEY en
  MKS2508/tpv-el-haido2 (minisign sec.key, passphrase vacio)

El primer push a main disparará ota-bundle-deploy.yml con el secret
real: pack con build-bundle.ts firma localmente con la prod key, CI
verifica con minisign -V -P <pubkey embebida>, publish al hub contra
/api/admin/projects/haido/components (minisign server-side verify
contra la misma kind=binary key registrada en M2).

Smoke verificado localmente: minisign -V contra bundle-test.zip
firma con la prod key retorna Signature verification OK con la
nueva pubkey embebida.

NO pushea — coordina con el push de mks-agentics en otra ventana
(AXON_PUSH_OK=1) para mantener los dos repos sincronizados."

# NO push. Waxin decide.
git log -1 --oneline
git status -sb  # debe mostrar main...origin/main [ahead 1]
```

**Output esperado**: 1 commit local, sin push. Estado `ahead 1` en
`main...origin/main`.

## Concerns / abiertos

1. **Cross-repo coordination**: el commit de haido + el SSOT update en
   mks-agentics (D10-D pasa a "production-ready" en `agentics.model.yml`)
   son DOS pushes. Coordinar con la sesión principal antes de mandar
   `AXON_PUSH_OK=1` — un push sin el otro deja el estado inconsistente.

2. **Primer publish va a prod**: el workflow de CI publica contra
   `https://haido.releases.mks2508.systems` (default del workflow). NO
   hay staging slot. Waxin debe confirmar que el primer publish real a
   prod es deseado (o setear `TPV_OTA_HUB` env en el cliente + un hub
   paralelo para staging — fuera de scope esta lane).

3. **Sec.key backup**: el sec.key se genera en `/tmp/` (efímero). Si la
   máquina se reinicia entre M1 y M3, se pierde. Workaround: regenerar
   en M3 (consistente con M2 porque el hub usa la pubkey, no la priv).
   Pero la rotación del keypair implica re-PUT al hub. Para esta lane
   asumimos que no se reinicia la máquina.

4. **`gh secret get` availability**: el comando puede no existir en
   versiones antiguas de `gh`. Si falla, regenerar el keypair local para
   el smoke M5 (consistente porque es el mismo keynum).

5. **Cargo.toml comment**: si M4b aplica, el comentario actualizado debe
   decir "keynum <NUEVO_KEYNUM>". Extraer con
   `sed -n '2p' $HAIDO_PROD_PUB | awk '{print $2}'` (el segundo token del
   base64 empieza con "Ed" + keynum 8 chars).

## Report esperado

`/tmp/d10d-minisign-prod-report.md` con estructura axon-artifacts:

```yaml
---
type: report
unit: lane-d10d-minisign-prod
status: completed | needs-iteration
lane: d10d-minisign-prod
base: d714d16
executor: task-executor
---
```

Y secciones:

- **TL;DR** (3-5 líneas, qué se cerró, qué se quedó).
- **Milestones** (tabla con la de arriba + ✅/❌ por M1-M6).
- **New keynum** (los 8 chars del keynum de producción, NO el sec.key).
- **Files changed** (lista, debe ser ota-bundle-pubkey.txt + opcional
  Cargo.toml).
- **Hub state** (output de `release-hub project signing-keys haido` con la
  nueva pubkey).
- **CI secret state** (output de `gh secret list --repo ...` con el secret
  visible — sin contenido).
- **Smoke output** (output literal de `minisign -V` OK line).
- **verificationCommands** (jsonc con los greps/tests que el orquestador
  puede re-correr).
- **architecturalConcerns** (jsonc — vacíos si nada).
- **stopReason** ("M1-M5 cerrados, M6 commit local sin push (esperando
  AXON_PUSH_OK=1)").
- **Suggested commit message** (el bloque de arriba en `git commit -m`,
  verbatim).

## Stop conditions

El ejecutor PARA y escala al orquestador si:

- La sesión OIDC expiró o falla (`release-hub project get haido` → 401/403).
- El proyecto `haido` no existe en el hub (no crearlo desde esta lane).
- La nueva pubkey == placeholder (regenerar M1).
- El verify smoke falla (`minisign -V` exit != 0).
- El diff staged contiene archivos no esperados.
- El pre-commit scan detecta AI attribution o secret.
- `git push` es invocado por error (abort antes de llegar al remote).