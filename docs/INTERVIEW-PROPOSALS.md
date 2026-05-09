# Propuestas para /interview - Preparación

**Fecha**: 2026-05-09 ~20:30
**Estado**: 3/5 agentes completados, preparando propuestas con diagramas

---

## Propuesta 1: Arquitectura de Deployment (TKT-03 + TKT-04)

### Contexto

**Problema actual**:
- License server + HaidoDocs solo corren localmente en dev
- Windows production machine necesita TPV funcionando
- No hay estrategia de deployment clara
- Coolify migration está propuesta pero sin architectural decision

**Issues encontrados** por agentes:
- Build strategy para Windows NO está clara (cross-compile vs native)
- CI/CD para Windows NO existe
- Smoke test propuesto es insuficiente
- Dependencies entre tickets no están bien definidas

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

**Migrar a arquitectura híbrida Coolify + GitHub Actions**:

1. **License Server** → Coolify (prioridad HIGH)
   - SQLite bundled (no necesita DB externa)
   - Health check `/health` implementado
   - Single service, simple de deployar

2. **HaidoDocs** → Opción A: Coolify (simple) Opción B: CDN (mejor performance)
   - Si Coolify: Next.js static export
   - Si CDN: Cloudflare Pages / BunnyCDN
   - **Recomendación**: CDN para España (más rápido, más barato)

3. **Windows TPV Build** → GitHub Actions (NO cross-compile local)
   - Crear workflow `.github/workflows/windows-deploy.yml`
   - Usar Windows runner en GitHub Actions
   - Code signing ya configurado, solo falta el job

4. **Multi-source Updater** → GitHub + Mirror propio
   - Primary: GitHub releases
   - Fallback: Mirror en VPS Helsinki (resilience)
   - TPV intenta GitHub, si falla → mirror

### Por qué esta opción

**Razones arquitectónicas**:

1. **Separación de concerns**: 
   - Coolify para servicios stateful (license server)
   - CDN para assets estáticos (docs, releases)
   - GitHub Actions para builds (mejor que cross-compile local)

2. **Resilience**: 
   - SPOF eliminado: GitHub + mirror
   - Multi-source updater tolera fallos

3. **Performance**: 
   - CDN en España = descargas más rápidas
   - Releases nearer to users

4. **Maintainability**: 
   - GitHub Actions = builds reproducibles
   - Coolify = servicios manageables

**Trade-offs aceptados**:
- **Coste**: CDN ($5/mes) vs GitHub (gratis)
- **Complejidad**: Multi-source updater requiere más código
- **Setup time**: 1-2h extra vs single-source

### Coste vs Beneficio

| Item | Coste (horas) | Beneficio |
|------|---------------|-----------|
| License server Coolify | 2-3h | Services manageables, health checks |
| HaidoDocs CDN | 1-2h | Performance, hosting gratis |
| Windows CI/CD | 2-3h | Builds automatizados, reproducibles |
| Multi-source updater | 3-4h | Resilience, SPOF eliminado |
| **Total** | **8-12h** | **Production-ready** |

**Ratio**: ✅ **VALE LA PENA** - Inversión de 1 día de trabajo por architectural correctness

### Alternativas Descartadas

**Alternativa A**: Cross-compile desde Mac
- **Por qué descartada**: Tauri cross-compile para Windows es experimental, muchos deps nativos no compilan bien
- **Problema**: Perderías horas debuggeando build errors
- **Mejor**: GitHub Actions con Windows runner

**Alternativa B**: Todo en Coolify (TPV inclusive)
- **Por qué descartada**: TPV es desktop app, no web app
- **Problema**: Coolify es para web services, no para distribuir desktop binaries
- **Mejor**: GitHub Actions para builds, Coolify para services

**Alternativa C**: Single-source updater (solo GitHub)
- **Por qué descartada**: SPOF crítico
- **Problema**: Si GitHub cae o se banea la cuenta, el TPV se vuelve paperweight
- **Mejor**: Multi-source con mirror propio

### Diagrama

[Generar con /diagram - pending]

### Aceptación

- [ ] Aprobar propuesta híbrida Coolify + GitHub Actions + CDN
- [ ] Rechazar y proponer alternativa
- [ ] Modificar propuesta (especificar cambios)

---

## Propuesta 2: Estrategia de Printer (TKT-02)

### Contexto

**Problema descubierto**:
- Binary sidecar `thermal-printer-cli` NO existe en repo
- Modelo `ThermalPrinter.ts` es 100% stub (console.log)
- Service es híbrido inconsistente: sidecar + invoke + stub
- Tiempo estimado 4-6h es **irreal** (más bien 16-24h)

**Arquitectura actual (Frankenstein)**:
```
Frontend → ThermalPrinterService → Command.sidecar(binary NO existe)
                                        ↓
                                  invoke('write_json_config')
                                        ↓
                                  ThermalPrinter.ts (stub)
```

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

**Fase 1 - MVP Network TCP (2-4h)**:
- **Eliminar sidecar approach**
- **Implementar impresión TCP directa desde Rust**
- Usar crate `tokio` + `tokio-serial` o `socket2`
- El modelo YA soporta `interface: "tcp://192.168.1.XXX:9100"`
- Comandos ESC/POS básicos en Rust (text, cut, cash drawer)

**Fase 2 - USB Serial (post-MVP, 8-12h)**:
- Si USB es crítico, agregar `serialport` crate en Rust
- Mantener todo en Tauri backend, un solo lenguaje
- Más fácil de debug y mantener

**Fase 3 - Sidecar optimizado (opcional)**:
- Si se necesita sidecar para velocidad/batería
- Construirlo con Rust como parte del bundle
- Compilarlo como `externalBin` en tauri.conf.json

### Por qué esta opción

**Razones arquitectónicas**:

1. **Simplicidad first**:
   - Fase 1: TCP printing es simple y funciona HOY
   - No depende de binary externo
   - Todo en un solo lenguaje (Rust)

2. **Progressive enhancement**:
   - MVP en 2-4h (network)
   - USB después si necesario
   - Sidecar como optimización, no base

3. **Mantainability**:
   - Menos capas = menos bugs
   - Rust backend = un solo source of truth
   - Frontend solo llama `invoke('print_order', { orderId })`

**Trade-offs aceptados**:
- **Limitación**: Network printing requiere router/switch
- **Mitigation**: USB fallback en Fase 2
- **Coste**: Más tiempo upfront en Rust vs sidecar Node

### Coste vs Beneficio

| Fase | Coste (horas) | Beneficio |
|------|---------------|-----------|
| Fase 1: TCP MVP | 2-4h | **Funcional HOY**, sin stubs |
| Fase 2: USB Serial | 8-12h | **Flexibilidad**, printer local |
| Fase 3: Sidecar | Opcional | Optimización |
| **Total MVP** | **2-4h** | **Production-ready** |

**Ratio**: ✅ **VALE LA PENA** - MVP funcional en 4h vs 16-24h del approach actual

### Alternativas Descartadas

**Alternativa A**: Continuar con sidecar approach
- **Por qué descartada**: Binary NO existe, habría que escribirlo desde cero
- **Problema**: 16-24h + stubs + híbrido inconsistente
- **Mejor**: TCP directo en Rust, ya funciona

**Alternativa B**: Tauri Plugin Serial
- **Por qué descartada**: No existe plugin oficial v2
- **Problema**: Habría que construir el plugin
- **Mejor**: Rust serialport crate dentro del backend

**Alternativa C**: Raw printer driver (Windows API)
- **Por qué descartada**: Requiere más complejidad, platform-specific
- **Problema**: Diffícil de mantener cross-platform
- **Mejor**: TCP/serial abstracto en Rust

### Diagrama

[Generar con /diagram - pending]

### Aceptación

- [ ] Aprobar enfoque faseado (TCP → USB → sidecar opcional)
- [ ] Rechazar y mantener sidecar approach
- [ ] Modificar propuesta (especificar cambios)

---

## Propuesta 3: Data Sync Strategy (Post-Production)

### Contexto

**Problema futuro**:
- TPV actualmente es local-only (SQLite embedded)
- HTTP adapter existe pero NO hay backend endpoint implementado
- "Sync" es manual (export/import)
- Para multi-restaurante se necesita sync real

**Arquitectura actual**:
```
TPV (Windows) → SQLite local → manual export → backup local
                ↓
          HTTP adapter (stub, no endpoint)
```

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

**Local-first con CRDTs + sync periódico**:

1. **Fase 1 - Backend centralizado (Coolify + PostgreSQL)**:
   - Migrar HTTP adapter stub a endpoint real
   - PostgreSQL en Coolify (o Docker compose)
   - API REST con CRUD para todas las entidades

2. **Fase 2 - CRDTs para sync sin conflictos**:
   - Usar `automerge` library (CRDTs para JSON)
   - Cada cambio en local genera operation
   - Sync periódico (cada 5min) o manual trigger
   - Server merge operations con conflict resolution

3. **Fase 3 - Offline-first con fallback**:
   - TPV funciona offline si servidor cae
   - Queue operations localmente
   - Sync cuando vuelve online
   - Manual override para conflictos no resueltos

### Por qué esta opción

**Razones arquitectónicas**:

1. **Local-first = UX óptimo**:
   - TPV funciona aunque se caiga internet
   - No hay latencia de servidor
   - Ventas no se pierden por outage

2. **CRDTs = sin conflictos**:
   - Automerge resuelve conflictos automáticamente
   - No hay "last write wins" (pérdida de datos)
   - Mathematically correct conflict resolution

3. **Progressive enhancement**:
   - Fase 1: Backend básico (sync manual)
   - Fase 2: CRDTs (sync automático)
   - Fase 3: Offline-first (resilience)

**Trade-offs aceptados**:
- **Complejidad**: CRDTs son más complejos que sync simple
- **Storage**: CRDTs requieren más metadata (operations log)
- **Coste**: 16-24h para implementar

### Coste vs Beneficio

| Fase | Coste (horas) | Beneficio |
|------|---------------|-----------|
| Fase 1: Backend real | 6-8h | Sync básico funcional |
| Fase 2: CRDTs | 8-12h | Sync automático sin conflictos |
| Fase 3: Offline-first | 4-6h | Resilience total |
| **Total** | **18-26h** | **Enterprise-ready** |

**Ratio**: ⚠️ **POSTERGAR** - Viable para multi-restaurante, no para MVP single-site

### Alternativas Descartadas

**Alternativa A**: Full cloud-native (PostgreSQL es source of truth)
- **Por qué descartada**: Latencia, requiere internet 100% uptime
- **Problema**: Si internet cae, TPV no funciona
- **Mejor**: Local-first con sync

**Alternativa B**: Simple "last write wins" sync
- **Por qué descartada**: Pérdida de datos en conflictos
- **Problema**: Si dos dispositivos editan mismo producto, se pierde uno
- **Mejor**: CRDTs con merge automático

**Alternativa C**: No sync, export/import manual
- **Por qué descartada**: No escala a multi-restaurante
- **Problema**: Demasiado manual, error-prone
- **Mejor**: Sync automático con CRDTs

### Diagrama

[Generar con /diagram - pending]

### Aceptación

- [ ] Aprobar enfoque local-first con CRDTs (post-producción)
- [ ] Rechazar y mantener sync manual
- [ ] Modificar propuesta (especificar cambios)

---

## Propuesta 4: Logging & Monitoring (Post-Production)

### Contexto

**Problema actual**:
- 30+ console.log/error sin logger estructurado
- No hay logging strategy
- No hay monitoring de errores
- No hay métricas de uso

**Technical debt**:
- `@mks2508/better-logger` instalado pero NO usado
- No hay log aggregation
- No hay error tracking (Sentry, etc.)

### Decisión Arquitectónica

**Recomendación** (mejor opción, más costosa):

**Structured logging + Log aggregation + Error tracking + Metrics**:

1. **Fase 1 - Migrar a structured logging** (2-3h):
   - Reemplazar todos `console.log` con `logger.component()`
   - Configurar `@mks2508/better-logger`
   - Log levels: info, warn, error, debug
   - Structured fields: timestamp, component, userId, orderId

2. **Fase 2 - Log aggregation con Loki** (3-4h):
   - Instalar Loki en Coolify
   - Configurar promtail para enviar logs
   - Dashboard en Grafana para query logs
   - Retención 30 días

3. **Fase 3 - Error tracking con Sentry** (2-3h):
   - Instalar Sentry SDK
   - Capturar errores y enviar a Sentry
   - Contexto: user, order, environment
   - Alerts: error rate > threshold

4. **Fase 4 - Metrics con Prometheus** (4-6h):
   - Exponer metrics endpoint
   - Prometeus en Coolify
   - Dashboards: orders/minute, errors/minute, latency
   - Alerts: anomalias en métricas

### Por qué esta opción

**Razones arquitectónicas**:

1. **Observability = debuggability**:
   - Logs estructurados = searchable
   - Error tracking = root cause analysis
   - Metrics = trend analysis

2. **Proactive vs Reactive**:
   - Alerts te avisan ANTES de que users se quejen
   - Métricas te muestran degradation temprano
   - Logs te dan contexto para debugging

3. **Standard stack**:
   - Loki + Grafana + Prometheus = estándar de industria
   - Sentry = estándar para error tracking
   - Integraciones probadas

**Trade-offs aceptados**:
- **Coste**: 16-24h para implementar full stack
- **Complejidad**: Más infraestructura para mantener
- **Hosting**: Requiere más recursos en Coolify

### Coste vs Beneficio

| Fase | Coste (horas) | Beneficio |
|------|---------------|-----------|
| Fase 1: Structured logging | 2-3h | Logs_searchable, _no más console.log_ |
| Fase 2: Log aggregation | 3-4h | Centralized logs, dashboards |
| Fase 3: Error tracking | 2-3h | Error alerts, root cause |
| Fase 4: Metrics | 4-6h | Trends, anomalies, SLOs |
| **Total** | **11-16h** | **Enterprise observability** |

**Ratio**: ⚠️ **POSTERGAR** - Quality of life, no blocker para MVP

### Alternativas Descartadas

**Alternativa A**: Mantener console.log
- **Por qué descartada**: No searchable, no structured, no aggregation
- **Problema**: Imposible de debug en production
- **Mejor**: Structured logging

**Alternativa B**: Solo logging, sin error tracking
- **Por qué descartada**: Error tracking es crítico para root cause
- **Problema**: Sabes QUE falló pero no POR QUÉ
- **Mejor**: Sentry para stack traces + contexto

**Alternativa C**: Cloud logging (Datadog, New Relic)
- **Por qué descartada**: Muy caro para MVP
- **Problema**: Datadog = $15+/host/mes
- **Mejor**: Loki + Prometheus (gratis, self-hosted)

### Diagrama

[Generar con /diagram - pending]

### Aceptación

- [ ] Aprobar full stack observability (post-producción)
- [ ] Rechazar y mantener console.log
- [ ] Modificar propuesta (fases reducidas)

---

## Orden de Presentación en /interview

1. **Propuesta 1** (Deployment) - CRÍTICA para tonight
2. **Propuesta 2** (Printer) - CRÍTICA para tonight
3. **Propuesta 3** (Data Sync) - Importante pero NO blocker
4. **Propuesta 4** (Logging) - Post-production

## Estado de Diagramas

- [ ] Diagrama 1: Deployment architecture (Coolify + GitHub Actions + CDN)
- [ ] Diagrama 2: Printer strategy (TCP → USB → sidecar)
- [ ] Diagrama 3: Data sync (Local-first + CRDTs)
- [ ] Diagrama 4: Logging stack (Loki + Grafana + Sentry + Prometheus)

---

**Última actualización**: 2026-05-09 20:30
**Pendiente**: Esperar 2 agentes restantes + generar diagramas HTML con /diagram
