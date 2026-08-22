# `src/installer/` — Wizard installer mode (Tauri sidecar)

> **Status**: TR-19.A scaffolding (Welcome step + IPC contracts LOCKED).
> Handlers reales + 6 steps restantes → TR-19.B / TR-19.C.

## Qué es

El **instalador de TPV El Haido para Linux NO es un binario separado**. Es el
**mismo TPV ejecutándose con el flag `--install`**. El entrypoint detecta el
flag y monta `<InstallerApp />` en vez del POS normal.

Ver:
- [docs/decisions/r7-tpv-sidecar-installer-2026-08-22.md](../decisions/r7-tpv-sidecar-installer-2026-08-22.md) — decisión locked
- [docs/task-requests/TR-19-A-wizard-scaffolding.md](../task-requests/TR-19-A-wizard-scaffolding.md) — task-request de este TR
- [docs/research/wizard-linux-candidates-2026-08-22.md](../research/wizard-linux-candidates-2026-08-22.md) — research con winner sidecar

## Arquitectura

```
src/installer/
├── README.md              ← este fichero
├── contracts.ts           ← LOCKED — InstallerAPI, InstallOptions, InstallProgress, InstallResult
├── index.ts               ← export del componente raíz + re-exports
├── InstallerApp.tsx       ← entrypoint UI (theme system + StepContainer + WelcomeStep)
├── ipc/
│   └── handlers.ts        ← stubs tipados (TR-19.B enchufa los reales)
├── services/
│   ├── release-hub.ts     ← stub — fetch latest artifact desde release-hub
│   └── install.ts         ← stub — file ops + .desktop + icon + PATH
├── steps/
│   └── WelcomeStep.tsx    ← único step funcional en TR-19.A
├── components/
│   └── StepContainer.tsx  ← wrapper compartido (los 7 steps lo usan)
└── i18n/
    ├── es.ts              ← strings español
    └── en.ts              ← strings inglés
```

## Componentes UI: cero design system paralelo

Todo el wizard **reusa los componentes del TPV**:
- `@/components/ui/card` — `<Card>`, `<CardContent>`, `<CardHeader>`, `<CardTitle>`
- `@/components/ui/button` — `<Button>` con variants
- `@/lib/theme-context` — `useAppTheme()` (12 temas + light/dark/auto)
- `@/lib/utils` — `cn()` helper

No hay shadcn/ui paralelo, ni tailwind config paralela, ni tema paralelo.
El installer hereda el look & feel del POS automáticamente.

## IPC contracts (LOCKED)

`contracts.ts` es el **punto único de verdad** consumido por:

| TR | Consume | Para qué |
|----|---------|----------|
| TR-19.A | este TR | declarar shapes, stubs |
| TR-19.A.2 | entrypoint detection en `main.rs` | gate por flag `--install` |
| TR-19.A.3 | `tauri.conf.json` capabilities | wire-up real de IPC |
| TR-19.B | handlers reales en Rust | implementar `installer:download`, `installer:install`, `installer:rollback` |
| TR-19.C | 6 steps restantes del wizard | consumir `InstallerAPI` y `InstallProgress` subscription |

**NO improvisar shapes**. Si algo falta, agregar campo nuevo (no redefinir).

## Cómo probar manualmente (TR-19.A smoke test)

Hasta que TR-19.A.2 implemente el gate `--install`, el smoke test es:

```bash
# 1. Importar <InstallerApp /> en una página de prueba del TPV (dev only)
#    Por ahora el componente está compilado DENTRO del bundle pero no se monta
#    (no hay nada que lo gatee todavía).
#
# 2. Verificar que el código compila y se typecheckea
bun run typecheck      # EXIT 0 ✅
bun run lint           # 0 nuevos errores
bun run build          # EXIT 0 (Vite build, incluye src/installer/)
bun run tauri build    # EXIT 0 (smoke test del bundle TPV completo)
```

Smoke test post-TR-19.A.2 (cuando el gate esté live):
```bash
# Modo normal (POS)
./tpv-el-haido.AppImage
# → abre POS normal ✅

# Modo installer
./tpv-el-haido.AppImage --install
# → monta <InstallerApp />, Welcome step visible ✅
```

## Out of scope (este TR)

- ❌ `src-tauri/src/lib.rs` (alto blast radius, separado en TR-19.A.2)
- ❌ `scripts/install-linux.sh` (queda como wrapper, TR-19.D)
- ❌ Integración real con desktop-release-hub (TR-19.B)
- ❌ Handlers Rust reales (TR-19.B)
- ❌ 6 steps restantes del wizard (TR-19.C)
- ❌ Code signing del installer (NA — mismo binario TPV)

## Reglas para contribuciones

- **NO tocar `src-tauri/src/lib.rs`** sin abrir TR-19.A.2
- **NO cambiar `contracts.ts`** sin abrir TR nuevo y avisar a B+C
- **REUSAR componentes UI del TPV** — nunca crear un componente paralelo
- **NO commitear** — waxin hace el commit después de verificar
