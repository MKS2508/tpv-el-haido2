# Preguntas Concretas para /interview

**Enfoque**: Cerrar blockers 0.4.0 + 0.5.0 HOY (21:00)

---

## Pregunta 1: Estrategia de Deployment (0.4.0)

### Opción A: Híbrida Coolify + GitHub Actions + CDN ✅ (Recomendada)

**Arquitectura**:
- Windows Build: GitHub Actions (Windows runner)
- Auto-updater: Multi-source (GitHub primary, VPS fallback)
- Coolify: License server SOLAMENTE
- HaidoDocs: CDN (Cloudflare Pages)

**Ventajas**:
- ✅ SPOF eliminado (multi-source updater)
- ✅ Builds automatizados y reproducibles
- ✅ Performance para España (CDN)
- ✅ Services manageables

**Coste**: 8-12h

### Opción B: Minimal (solo GitHub)

**Arquitectura**:
- Windows Build: GitHub Actions
- Auto-updater: Solo GitHub
- Coolify: NO (postponer)
- HaidoDocs: GitHub Pages

**Ventajas**:
- ✅ Más simple (4-6h)
- ✅ Gratis

**Desventajas**:
- ❌ SPOF crítico (GitHub down = paperweight)
- ❌ No services manageables

**Coste**: 4-6h

### Pregunta

**¿Cuál prefieres para producción esta noche?**

**Preview (Opción A)**:
```
GitHub Actions → Windows build → Releases
     ↓ (fallback)
VPS Mirror → Updates resilientes
Coolify → License server manageado
CDN → Docs rápidos

TIEMPO: 8-12h
```

**Preview (Opción B)**:
```
GitHub Actions → Windows build → Releases
                    ↓
            Updates (single source)

TIEMPO: 4-6h
```

---

## Pregunta 2: Estrategia de Printer (0.5.0)

### Opción A: TCP Network MVP ✅ (Recomendada)

**Arquitectura**:
- **Fase 1**: TCP Network desde Rust (2-4h)
  - Eliminar sidecar approach
  - Implementar comandos ESC/POS básicos
  - Frontend: `invoke('print_order')`
- **Fase 2**: USB Serial (post-MVP, 8-12h)

**Ventajas**:
- ✅ MVP funcional en 4h
- ✅ Arquitectura limpia
- ✅ Progressive enhancement

**Coste MVP**: 2-4h

### Opción B: Intentar salvar sidecar actual

**Arquitectura**:
- Construir binary sidecar desde cero
- Mantener híbrido actual

**Desventajas**:
- ❌ Binary NO existe, hay que escribirlo
- ❌ 16-24h mínimo
- ❌ Stubs + híbrido inconsistente

**Coste**: 16-24h

### Pregunta

**¿Cuál prefieres para producción esta noche?**

**Preview (Opción A)**:
```
Fase 1: TCP desde Rust (2-4h)
  → invoke('print_order')
  → TCP Socket → Printer
  → FUNCIONAL HOY

Fase 2: USB Serial (post-MVP)
```

**Preview (Opción B)**:
```
Escribir sidecar desde cero (16-24h)
  → Esperar a mañana
  → ARRIESGADO: puede fallar
```

---

## Pregunta 3: Orden de Ejecución

**Dependencies detectadas**:
```
TKT-01.1 (credentials) → TKT-01 (updater) → TKT-04 (windows)
                                        ↓
                                     TKT-02 (printer)
```

### Opción A: Secuencial ✅ (Recomendada)

1. TKT-01.1 (30min) - Credentials
2. TKT-01 (2-3h) - Updater audit
3. TKT-04 (2-3h) - Windows setup
4. TKT-02 (2-4h) - Printer TCP MVP

**Total**: 7-13h (hasta 6-7AM)

### Opción B: Paralelo donde sea posible

1. TKT-01.1 (30min)
2. Paralelo: TKT-01 (updater) + TKT-02 prep
3. TKT-04 (depende de TKT-01)
4. TKT-02 (TCP MVP)

**Total**: 6-10h (más rápido si funciona)

### Pregunta

**¿Secuencial o paralelo donde sea posible?**

---

## Pregunta 4: HaidoDocs (0.4.0.C)

### Opción A: Coolify Ahora ✅ (Recomendada si tiempo)

- Deploy en Coolify
- Consistente con license server
- Todo en un solo lugar

### Opción B: CDN Ahora ✅✅ (Recomendada si tiempo limitado)

- Cloudflare Pages / BunnyCDN
- Más rápido, más barato
- Deploy desde GitHub Actions

### Opción C: Postponer ⏳ (Si no hay tiempo)

- Quedarse en GitHub Pages por ahora
- Migrar a CDN más adelante

### Pregunta

**¿HaidoDocs ahora (Coolify o CDN) o postponemos?**

---

## Resumen de Decisiones

| # | Decisión | Opción Recomendada | Prioridad |
|---|----------|-------------------|----------|
| 1 | Deployment | Opción A (Híbrida) | 🔥 HIGH |
| 2 | Printer | Opción A (TCP MVP) | 🔥 HIGH |
| 3 | Orden | Opción B (Paralelo) | ⚠️ MEDIUM |
| 4 | HaidoDocs | Opción B (CDN) | ⏠️ LOW |

---

**Última actualización**: 2026-05-09 20:50
**Diagrams**: Enhanced versions abiertas
**Tickets**: TKT-02 y TKT-04 necesitan reformulación
