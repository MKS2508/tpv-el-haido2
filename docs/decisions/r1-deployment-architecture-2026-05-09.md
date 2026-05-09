# R1 — Deployment Architecture lockeada (0.4.0)

**Fecha**: 2026-05-09 ~22:30
**Phase**: 0.4.0 — Auto-update + Coolify migration + Windows production
**Estado**: 🔒 LOCKEADO
**Lockeado por**: waxin (interview 3 rondas con AskUserQuestion + previews + diagrama mks-diagram)

---

## Contexto

Producción esta noche en bar del hermano de waxin. Acceso limitado a máquina Windows. Necesidad de update mecanismo robusto sin depender de GitHub.

**Prep work previo** (sesión anterior):
- 6 agentes background exploraron código real (frontend, backend, services, apps aux, debt)
- 5 módulos DEV documentados
- 7 tickets TKT-01..TKT-06 formulados
- 2 propuestas iniciales arquitectónicas
- Audit /guidelines completo

**Esta sesión** (verificación + decision lock):
- 3 agentes Explore verificaron docs vs código
- Hallazgo: TKT-01.1 está parcialmente obsoleto (env vars con fallback, no const)
- ROADMAP.md missing → creado desde spec
- Coolify state explorado: 17 apps en lab1, license-server `exited:unhealthy`, haidodocs ya healthy
- Hetzner KVM nested verificado **NO viable** (policy del provider)

---

## Decisiones lockeadas

### D1 — Sacar GitHub de la ecuación completamente

**Decisión**: Auto-updater Tauri y distribución de binarios NO usarán GitHub Releases ni GitHub Actions.

**Implementación**: Endpoint propio `updates.mks2508.systems` servido desde Coolify lab1.

**Rationale**:
- Eliminar SPOF crítico (GitHub down → TPV no actualizable)
- Control total de release process
- Stack unificado (todo en Coolify, todo Bun)
- Coherencia con resto de infraestructura mks2508.systems

**Trade-off aceptado**: Más infra propia que mantener (vs GitHub gratis). Pago: control + resilience.

---

### D2 — Arquitectura unified `tpv-cloud` (Bun + Elysia)

**Decisión**: Crear UN servicio Bun + Elysia que sirva tanto updates como license validation.

**Stack**:
```
tpv-cloud (Coolify, project=haido, subdomain=updates.mks2508.systems)
├── Bun runtime
├── Elysia framework (typesafe routes)
├── Drizzle ORM → PostgreSQL
└── Persistent volume → /srv/binaries
```

**Routes (lockeadas)**:
```
GET  /updates/:target/:arch/:current_version  # Updater poll
GET  /dl/:version/setup.exe                   # Static binary
GET  /dl/:version/setup.exe.sig               # Minisign signature
POST /license/validate                        # License check (online)
POST /license/activate                        # License activation
GET  /health                                  # Healthcheck
```

**Layers según `/guidelines`**:
```
src/
├── routes/        # Elysia handlers (thin)
├── services/      # Business logic (license validation, semver compare)
├── db/            # Drizzle schema + queries
├── types/         # Shared types (request/response)
└── lib/
    ├── error-codes.ts   # Result<T,E> taxonomy
    └── logger.ts         # Pino o better-logger
```

**Rationale**:
- License-server actual está `exited:unhealthy` → reemplazar > revivir
- Una app a mantener (vs dos: license + updates separadas)
- Mismo stack (Bun) que el resto del ecosistema mks2508
- Reusa skill `elysiajs` ya cargada
- Drizzle ORM coincide con stack license-server existente

**Trade-off aceptado**: Migración data SQLite (license-server actual) → Postgres (tpv-cloud) si hubiera datos críticos. Verificar antes de matar el old.

**Estimate**: 3-4h implementación tpv-cloud completo.

---

### D3 — DB nueva `tpv-cloud-db` en project `haido`

**Decisión**: Crear PostgreSQL dedicada en project `haido`, NO reusar `mks-postgres` cross-project.

**Comando exacto** (ejecutor):
```bash
coolify-cli db create postgresql \
  --server awgcco0k48g4kgw8cckkc808 \
  --project vg48wsk4808ocoggoco8444g \
  --environment production \
  --name tpv-cloud-db
```

**Rationale**:
- Project `haido` tiene **0 databases** actualmente → reusar mks-postgres sería cross-project sharing (rompe isolation)
- Coolify pattern recomendado: cada project con sus DBs aisladas
- Ownership claro (DB pertenece a project haido)
- Si `mks-postgres` cae, no afecta `tpv-cloud`
- Coste infra: 1 container más (~50MB RAM, despreciable)

**Schema inicial Drizzle** (lockeado):
```typescript
// licenses
- id (uuid pk)
- key_hash (varchar)
- email (varchar)
- machine_fingerprint (varchar)
- license_type (master|regular)
- activated_at (timestamp)
- expires_at (timestamp nullable)
- is_active (boolean)
- created_at (timestamp)

// releases
- version (varchar pk, semver)
- target (varchar)  // windows, darwin, linux
- arch (varchar)    // x86_64, aarch64
- url (varchar)
- signature (text)  // minisign sig contents
- pub_date (timestamp)
- notes (text)
- created_at (timestamp)

// activations (audit)
- id (uuid pk)
- license_id (uuid fk -> licenses)
- machine_fingerprint (varchar)
- activated_at (timestamp)
- ip_address (varchar)
```

---

### D4 — Build Windows: A (Build directo en el bar, 1 vez)

**Decisión**: Para tonight, build NSIS installer **directamente en la máquina Windows del bar** (única vez). Después todo via OTA.

**Opciones evaluadas**:

| Opción | Veredicto | Razón |
|---|---|---|
| A. Build en bar (1 vez) | ✅ **LOCKEADA** | Cero risk cross-compile, garantizado |
| B. dockur/windows en Coolify | ❌ Descartada | Hetzner Cloud NO expone KVM nested (verificado: `/dev/kvm` ausente, vmx/svm flags vacíos, docs Hetzner confirman policy) |
| C. cargo-xwin Mac M1 | ❌ Descartada | Mixed reports NSIS desde Mac, asymmetric risk si peta a hora 2 |

**Flow lockeado**:
```
1. SSH/AnyDesk a PC Windows del bar
2. Instalar rustup + bun + Tauri prerequisites
3. git clone tpv-el-haido2 + bun install
4. Configurar tauri.conf.json con endpoints actualizados (D5)
5. bun run tauri build (NSIS native, sin cross-compile)
6. Output: src-tauri/target/release/bundle/nsis/TPV-El-Haido_X.Y.Z_x64-setup.exe + .sig
7. Ejecutar setup.exe local (passive mode)
8. Verificar app arranca + apunta a updates.mks2508.systems
9. Subir setup.exe + sig al volume Coolify (vía scp desde Mac/laptop)
10. Validar OTA: bumpear version local, publish, comprobar TPV detecta update
```

**Trade-offs aceptados**:
- ⚠️ Tauri toolchain queda en máquina prod (puede uninstall después si molesta)
- ⚠️ Internet del bar puede ser lento (descarga deps + WebView2)
- ✅ 1 sola vez, después todo OTA

**Effort**: 1-2h.

---

### D5 — `tauri.conf.json` updater endpoint

**Decisión**: Cambiar updater endpoints a:
```json
"updater": {
  "pubkey": "<existing minisign pubkey>",
  "endpoints": [
    "https://updates.mks2508.systems/updates/{{target}}/{{arch}}/{{current_version}}"
  ],
  "windows": { "installMode": "passive" }
}
```

**Schema response** (server-side, dynamic):
```json
// 200 OK (update available)
{
  "version": "0.4.1",
  "notes": "Bug fixes",
  "pub_date": "2026-05-09T23:00:00Z",
  "url": "https://updates.mks2508.systems/dl/0.4.1/TPV-El-Haido_0.4.1_x64-setup.exe",
  "signature": "<contenido literal del .sig file>"
}

// 204 No Content (no update available)
```

**Rationale**:
- Endpoint dinámico server-side semver compare > static `latest.json`
- Permite gradual rollout / canary / kill-switch sin tocar cliente
- Multi-endpoint NO necesario (Coolify tiene SLA suficiente para 1 cliente)
- `installMode: passive` permite OTA silencioso sin admin prompt

---

### D6 — License-server (old) → reemplazar, no revivir

**Decisión**: La app actual `license-server` (`exited:unhealthy`) en Coolify NO se intenta revivir. Se reemplaza por `tpv-cloud`.

**Acción**:
1. Verificar si `license-server` tenía data crítica (probablemente NO, era dev)
2. Una vez `tpv-cloud` deployed y validated → `coolify-cli delete license-server`
3. Subdomain antiguo `haidolicense.mks2508.systems` queda libre (deprecate)

**Rationale**:
- "No logs available" del container actual sugiere nunca arrancó correctamente
- Replace > revive es más rápido y limpio
- Consolida con updates en mismo servicio (D2)

---

### D7 — HaidoDocs (0.4.0.C): NO TOCAR

**Decisión**: HaidoDocs ya está en Coolify (`haidodocs`, `running:healthy`, `https://haido-docs.mks2508.systems`). NO tocar tonight.

**Rationale**: Done. No es blocker. Cualquier cambio post-prod (CDN, etc.).

---

### D8 — Printer (0.5.0): POSTPONE

**Decisión**: Fase 0.5.0 (thermal printer) sale del scope **tonight**. Postpone post-deployment.

**Razones para postpone**:
- Necesita research adicional sobre limitaciones de la impresora
- Posible integración con CUPS via Raspberry Pi (network printer) = setup separado
- Decisión arquitectónica (TCP / USB / RPi-network) depende de hardware testing
- Critical path tonight = update + instalador (sin printer, app instalable y operable manualmente)

**Status nuevo**: `deferred` con plan de re-evaluar post-prod, probablemente en 0.5.0 reformulada.

**TKT-02 status**: blocked por research, queda pending hasta que waxin pueda debuggear la printer.

---

### D9 — Orden de ejecución: paralelo donde se pueda

**Decisión** (round 1):
```
Step 0  TKT-01.1.RE  Refactor MASTER_LICENSE fallback (no const, panic if missing in prod)  30m
Step 1  TKT-CLOUD    Crear tpv-cloud (Bun/Elysia + Drizzle + Coolify deploy)                3-4h
Step 2  TKT-01.RE    Update tauri.conf.json endpoints + minisign verify                     30m
Step 3  TKT-04.RE    SSH/AnyDesk al bar + install toolchain + build NSIS + first install   1-2h
Step 4  TKT-OTA      Smoke test OTA (bump version, publish, verify cliente actualiza)       30m
```

**Paralelización**:
- Step 1 (tpv-cloud build) y Step 0+2 pueden ir en paralelo (agentes distintos)
- Step 3 depende de Step 0+1+2 cerrados (necesita endpoint vivo + binary firmado)

---

## Reminder post-producción

🔔 **Hetzner upgrade research**: Investigar coste y opciones para upgrade a server con nested virt (Hetzner Robot/Dedicated AX/EX series, o cambiar provider). Útil para builds reproducibles cloud (dockur/windows o similar).

**Tracked en**: TKT-09-research-hetzner-upgrade.md (post-prod followup)

---

## Diagrama

`/tmp/tpv-cloud-architecture.html` (D2 rendered, dark theme)

Muestra: Cliente → DNS → Coolify (tpv-cloud + postgres + volume + haidodocs) ↔ Build pipeline (3 opciones, B descartada).

---

## Status post-decision

✅ Decisiones lockeadas: D1-D9
✅ Stack tonight definido: Bun + Elysia + Drizzle + PostgreSQL + Coolify
✅ Build path tonight: A (en el bar)
✅ Scope reducido: 0.5.0 postponed
🔄 Next: Executor handoff + impl

---

## Addendum — Findings post-lock (2026-05-10 ~00:30)

Durante la descomposición del TR-03 (decomposer agent), se descubrieron tres detalles técnicos que NO invalidan las decisiones D1-D9 pero que afectan implementación:

### A1 — Tauri 2 OTA artifact format

**Descubrimiento**: Tauri 2 OTA descarga **`.nsis.zip` + `.nsis.zip.sig`**, NO `.exe + .exe.sig`. El `.exe` es para instalación inicial manual; el `.zip` es el formato de update OTA.

**Implicación**:
- `releases.url` en DB → apunta al `.nsis.zip`
- `releases.signature` → contenido del `.nsis.zip.sig`
- El endpoint `/dl/:version/*` debe servir AMBOS (exe para first install, zip para OTA)
- En `tauri build` con `createUpdaterArtifacts: true`, se generan 4 archivos automáticamente

**Docs actualizadas**: TKT-04, TKT-07, TKT-10, TR-04, TR-05, plan TR-02 (con addendum visible)

### A2 — Tauri 2 syntax: `plugins.updater` (no `bundle.updater`)

**Descubrimiento**: el `installMode.windows` y otros parámetros runtime van en `plugins.updater`, no en `bundle.updater`. La sintaxis `bundle.updater` era Tauri 1.

**Diff correcto (Tauri 2)**:
```json
{
  "bundle": {
    "createUpdaterArtifacts": true   // sigue en bundle (build-time)
  },
  "plugins": {
    "updater": {                      // ← runtime config
      "pubkey": "...",
      "endpoints": ["..."],
      "windows": { "installMode": "passive" }
    }
  }
}
```

**Plan TR-03 ya tiene la sintaxis correcta** (verificado por decomposer). TKT-08 actualizado con nota.

### A3 — Dos pubkeys en repo (verificación pre-build)

Hay 2 archivos `.pub` en el repo:
- ✅ `tauri-keys/tpv-el-haido.key.pub` (fingerprint `22139D4B044E2153`) → **es el que matchea** el `pubkey` embebido en `tauri.conf.json`. Usar este.
- ❌ `tauri-signing.pub` (fingerprint `CF5C37360EC34A45`) → key distinta, NO usar (probable artifact viejo, considerar borrar post-prod).

**Acción para executor**: verificar fingerprint match antes de cada build (no firmar con la key incorrecta).

### A4 — Passphrase del private key (riesgo runtime)

`tauri-keys/tpv-el-haido.key` está rsign-encrypted (passphrase-protected). Si la passphrase se ha perdido, hay que regenerar keypair completo. Como NO hay deploys previos en producción, **regenerar es viable** (~10min, sin breaking change).

**Acción**: verificar passphrase accesible ANTES de TR-04 (si fail → regenerar y actualizar pubkey en `tauri.conf.json` antes de build).
