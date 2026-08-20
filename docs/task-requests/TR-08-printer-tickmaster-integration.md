# TR-08 — Integrar impresión térmica real vía SDK `tickmaster` (reemplaza stub 0.5.0)

**Ticket**: TKT-21-printer-tickmaster-integration (nuevo, crear si no existe)
**Phase**: revive 0.5.0 (estaba `deferred` desde r1 2026-05-09 por falta de decisión de hardware —
**esa decisión ya está tomada y resuelta fuera de este repo**, ver Contexto)
**Priority**: high
**Estimated**: 2-3h (sin contar troubleshooting de hardware — el driver USB ya está resuelto en
`tickmaster`, esto es integración de cliente, no debugging de protocolo)

## Contexto — por qué 0.5.0 se reabre y con qué arquitectura

En r1 (2026-05-09) 0.5.0 quedó `deferred`: no sabíamos el modelo de impresora ni la arquitectura
(USB directo / red / RPi+CUPS). Esa investigación se hizo **en otro repo, `tickmaster`**
(`/Users/mks/tickmaster`, NO es parte de este monorepo — es una dependencia externa), entre el
14 y el 20 de agosto. Está resuelta y ya en `main` de ese repo:

- **Impresora**: Epson TM-U210PD, matricial 9 agujas, sin autocutter, conectada por adaptador
  USB-parallel Prolific PL2305 a una **Raspberry Pi** (`RPI-BAR`, ya visible en el tailnet junto a
  `supermicro-pcbar` — máquina distinta, NO tocar la RPi para nada relacionado con TR-07).
- **CUPS descartado** (probado y documentado: el backend `usb://` reporta `completed` sin imprimir
  nada — el adaptador deja el bulk OUT en STALL al enumerar y CUPS se traga el error).
- **Arquitectura elegida**: daemon HTTP en la RPi (`tickmaster-daemon`, Bun + Elysia + `bun:ffi`
  contra `libusb-1.0`, sin Python) que es **agnóstico al dominio** — recibe `blocks` tipados
  (`PrintBlock[]`), no sabe qué es un ticket. El modelo de bar (items, IVA, pago, ticket) vive en
  `@mks2508/tickmaster-core`, isomórfico, lo consumen tanto el daemon como el cliente.
- **Cliente**: `@mks2508/tickmaster-sdk` (`createTickmaster({ baseUrl, token })` →
  `.tickets.print(ticket, options)`), usa `@mks2508/no-throw` (mismo patrón Result que ya usa
  tpv-el-haido2 — encaja directo con `tryCatchAsync`/`isErr` existente).

**Repo tickmaster — estructura relevante**:
```
packages/core/   — ITicket, ITicketLine, ITicketPago, ticketToDocument(), cero deps
packages/sdk/    — createTickmaster(), TicketsResource.print(ticket, opts), DrawerResource, etc.
apps/daemon/     — servicio HTTP en la RPi (ya deployado o por confirmar, ver Phase A)
tui/             — consola de pruebas de terminal, útil como referencia de uso del SDK
```

**Estado de publicación**: `@mks2508/tickmaster-core@0.3.0` y `@mks2508/tickmaster-sdk@0.2.0`
están en el `package.json` del monorepo tickmaster pero **NO publicados a npm** (verificado, 404).
Son workspace-local hoy. **Esto es una decisión de distribución que el plan debe resolver** —
opciones (ordenar por preferencia, seguir precedente de `auth-oidc-elysia` si aplica):
1. Publicar ambos a npm (mismo patrón que `@mks2508/auth-oidc-elysia` en 0.4.1.A) — más limpio,
   versionado real, pero es trabajo en OTRO repo (tickmaster) que este TR no tiene mandato directo
   de tocar salvo que sea trivial (bump + `bun run build` + `npm publish`, sin cambios de código)
2. Dependencia de workspace/file local (`"@mks2508/tickmaster-sdk": "file:/Users/mks/tickmaster/packages/sdk"`)
   — rápido para probar YA, pero frágil (ruta absoluta local, no reproducible en CI/otra máquina)
3. Vendorizar/copiar el código del SDK dentro de tpv-el-haido2 — evitar, duplica mantenimiento

El decomposer debe proponer la opción y justificarla en el plan, no hace falta preguntarle a
waxin salvo que la 1 requiera cambios de código no triviales en tickmaster.

## Qué hay que reemplazar en tpv-el-haido2

- **`src/services/thermal-printer.service.ts`**: llama a un sidecar Tauri
  `binaries/thermal-printer-cli` que **no existe** (`CLAUDE.md` confirma: solo `aeat-bridge` está
  configurado como sidecar). Este archivo es dead code que nunca funcionó end-to-end.
- **`src/models/ThermalPrinter.ts`**: la clase `ThermalPrinter`/`ThermalPrinterService` es un
  **stub completo** — `println()` hace `console.log`, `execute()` no hace nada,
  `isPrinterConnected()` siempre devuelve `false`. Por la regla de la casa (DELETE > deprecated,
  sin consumers reales fuera de este flujo) esto se borra y se reemplaza, no se parchea.
- **Callers a actualizar**: `src/components/Sections/SettingsPanel.tsx` (UI de config/test de
  impresora) y `src/services/platform/TauriPlatformService.ts` (grep exacto de qué llama antes de
  tocar).
- **Mapeo de dominio**: `Order` (`src/models/Order.ts`, tiene `items: OrderItem[]`, `total`,
  `date`, info AEAT) → `ITicket` de `tickmaster-core` (`items: ITicketLine[]` con
  `nombre/cantidad/precioUnitario`, `ivaRate`, `pago: { metodo, entregado, cambio }`,
  `cabecera`/`pie` opcionales). Escribir esa función de mapeo en tpv-el-haido2 (no en tickmaster —
  ahí seria domain leak).

## Output esperado del decomposer

`.plan.md` con fases:

### Phase A — Verificar estado real del daemon en RPI-BAR (no asumir nada del README)
1. SSH a RPI-BAR (confirmar hostname exacto en tailnet — probablemente
   `rpi-bar.vpn.mks2508.local` o similar, verificar con `tailscale status` / lista de peers ya
   vista hoy) y comprobar qué systemd unit está activa: `tickmaster-daemon` (nuevo) o
   `escpos-daemon` (viejo, a reemplazar) — el README de tickmaster documenta el procedimiento de
   swap pero **no confirma que ya se haya ejecutado**
2. `curl http://<rpi-bar>:9100/health` → si responde, el daemon nuevo ya está corriendo; si no,
   hay que desplegarlo (`bun run --cwd apps/daemon build` en tickmaster + scp + systemd swap, todo
   documentado en `apps/daemon/README.md` sección Deploy)
3. Si hay que desplegar: el token (`TICKMASTER_TOKEN`) se genera EN LA PI y no sale de ahí — el
   plan debe prever cómo tpv-el-haido2 lo consume sin hardcodearlo (¿variable de entorno del build
   Tauri? ¿fichero de config local del TPV, tipo `printerSettings.json` que ya existe? — decidir
   consistente con `writeJsonConfig`/`printerSettings.json` que ya existe en el service actual)

### Phase B — Decisión de distribución del paquete (ver arriba) + wiring de dependencias
4. Añadir `@mks2508/tickmaster-sdk` a `package.json` de tpv-el-haido2 según la opción elegida
5. Confirmar que `@mks2508/no-throw` ya está en ambos proyectos con versión compatible (tickmaster
   usa el mismo patrón, evitar duplicar la lib con versiones distintas)

### Phase C — Reemplazo del servicio
6. Borrar `src/models/ThermalPrinter.ts` stub (o reducir a solo los tipos que sigan haciendo
   falta para la UI de settings — decidir en el plan qué sobrevive)
7. Reescribir `src/services/thermal-printer.service.ts`: `createTickmaster({ baseUrl, token })`,
   función `orderToTicket(order: Order): ITicket`, `printOrder(order)` usando
   `tm.tickets.print()`, wrapped en el patrón `Result` existente del proyecto (`tryCatchAsync` +
   `PrinterErrorCode` que ya existe en `src/lib/error-codes.ts` — reusar esos códigos, no inventar
   nuevos salvo que falte alguno)
8. Actualizar `SettingsPanel.tsx` y `TauriPlatformService.ts` a la nueva superficie
9. Cajón portamonedas: mapear el actual `[CASH_DRAWER]`/`openCashDrawerOnly()` a
   `tm.drawer.*` (revisar `DrawerResource` en el SDK)

### Phase D — Smoke real
10. Con el daemon confirmado vivo (Phase A), imprimir un ticket real desde una orden de prueba en
    la app (Tauri dev o build) contra RPI-BAR — ticket físico saliendo de la Epson es el criterio
    de cierre, no un mock
11. Verificar `printer/status` (papel cargado) antes del smoke para no gastar un ticket en vano

## Constraints

- **NO tocar el driver USB ni el daemon** (`apps/daemon/`, `packages/core` de tickmaster) salvo
  que Phase A revele que hace falta redeploy — eso es trabajo ya resuelto, este TR es solo
  integración cliente
- **Token del daemon NUNCA hardcodeado ni committeado** — mismo hard rule anti-leak que el resto
  del proyecto (placeholder `<REDACTED>` si aparece en algún doc)
- **DELETE > @deprecated** en `ThermalPrinter.ts`/`thermal-printer.service.ts` viejos — sin shims
- Mantener el patrón `Result`/`no-throw` existente, no introducir try/catch crudo nuevo
- Si Phase A revela que el daemon nuevo NO está deployado, el plan debe separar claramente "deploy
  del daemon" (toca RPi, mayor blast radius, quizás merece su propio ticket) de "integración
  cliente" (este TR) — no mezclar ambos en un solo executor run si el deploy resulta no-trivial

## Riesgos a documentar en el plan

- Nombre de host real de RPI-BAR en tailnet — no asumir, confirmar
- Token de auth no accesible sin tocar la Pi directamente (por diseño — "no sale de ahí")
- `TICKMASTER_MAX_JOB_BYTES` (64KB) y buffer de 1KB de la impresora — tickets muy largos o con
  logo pueden fallar, no es responsabilidad de este TR arreglarlo pero sí documentarlo si aparece
- Posible daemon viejo `escpos-daemon` todavía activo (conflicto USB si ambos corren — el propio
  systemd unit tiene `Conflicts=`, pero si Phase A lo encuentra en ese estado, NO forzar el swap
  sin que waxin lo sepa, es blast radius sobre hardware en producción real del bar)

## Acceptance

- `thermal-printer.service.ts` usa `@mks2508/tickmaster-sdk`, cero referencias al sidecar
  `thermal-printer-cli` inexistente
- Ticket de una orden real imprime físicamente en la Epson vía RPI-BAR
- Cajón portamonedas sigue funcionando (paridad con el flujo viejo, aunque el viejo era un stub —
  o sea: funciona de verdad por primera vez)
- Sin secrets en código/commits

## Suggested executor agent

`task-executor` — toca código de este repo + posible SSH de solo-lectura/deploy a RPI-BAR en
Phase A. Si Phase A revela que hace falta deploy no-trivial del daemon, considerar split: un
executor para Phase A+deploy (si aplica) y otro para Phase B-D (código), o escalar a waxin antes
de tocar la Pi si el daemon viejo sigue activo.

## Notas operativas

- Corre en paralelo a TR-07 (build Linux del bar) — repos y máquinas distintas
  (`supermicro-pcbar` vs `RPI-BAR`), sin conflicto de archivos.
- Doc sync (roadmap.spec.yml reabriendo 0.5.0 + progress-log) se hace DESPUÉS de verificar ambos
  TRs completos, en un solo pase.
