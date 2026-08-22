---
type: task-request
id: TR-19
title: wizard-linux-build — GUI installer wizard para Linux del TPV
status: open
priority: medium
zone: client
ts: 2026-08-22
source: r6-wizard-linux-research-lane-multi-candidato-2026-08-22
targetMilestone: track/wizard-linux-build
blockedBy: []
effort: large
research: docs/research/wizard-linux-candidates-2026-08-22.md (5 candidatos evaluados)
acceptance:
  - GUI installer wizard funcional para Linux (CachyOS, Ubuntu/Debian, Fedora)
  - Wizard multi-step: language → install path → components → shortcuts → review → install
  - Feedback visual con progress bar + log inline + rollback si falla
  - Integración con desktop-release-hub (`https://haido.releases.mks2508.systems`) para descargar AppImage firmado
  - Genera `.desktop` + icono en `~/.local/share/applications/` y `~/.local/bin/tpv-el-haido`
  - Build produce binario standalone (AppImage o .deb + .rpm)
  - README con instrucciones de build + uso
  - typecheck + lint EXIT 0
outOfScope:
  - Wizard de first-launch post-instalación (separado, Tauri-native, sub-ticket futuro)
  - Soporte macOS/Windows (este TR es SOLO Linux)
  - Auto-update logic (ya hay plugin Tauri updater)
---

# TR-19 — wizard-linux-build

## Contexto

El instalador actual (`scripts/install-linux.sh`, commit `85c6fd5`) es un script bash no-GUI:
- Copia el AppImage a `~/.local/bin/`
- Registra un `.desktop` en `~/.local/share/applications/`
- Extrae e instala el icono desde el propio AppImage
- No tiene wizard, no pide confirmación, no muestra progreso visual, no ofrece rollback

**Target user**: hermano de waxin, NO técnico. Recibe AppImage + instalador → espera experiencia wizard paso a paso.

**Research completo**: `docs/research/wizard-linux-candidates-2026-08-22.md` (632 líneas, 5 candidatos: whiptail/dialog, Electron-based, Tauri-native first-launch, .deb/.rpm nativos, web-based install wizard).

**Winner**: **Electron-based installer** (4.4/5) — mejor balance UX/UI/robustez/profesionalidad para target user no-técnico.
- **Complemento recomendado**: Tauri-native first-launch wizard (4.2/5) post-instalación (sub-ticket futuro, fuera de scope aquí).

## Plan (compact)

### Fase 1 — Stack decision + scaffolding (4-6h)

**Decisión técnica** (TRUNCADA aquí para evitar bloqueparo de decisiones lockeadas):
- **Framework**: Electron + React (o Svelte)
- **Build output**: AppImage auto-contenido (electron-builder) — Linux first-class
- **Package**: `apps/installer-linux/`

Razón: Electron tiene mejor DX para wizards multi-paso + ecosistema maduro de componentes UI (React + shadcn/ui) + builds Linux sólidos.

**Estructura inicial**:
```
apps/installer-linux/
├── package.json
├── tsconfig.json
├── electron-builder.yml
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts         # entrypoint
│   │   ├── installer.ts     # core install logic (download + extract + register)
│   │   └── downloader.ts    # desktop-release-hub client (signed artifacts)
│   ├── renderer/            # React UI
│   │   ├── App.tsx
│   │   ├── steps/           # LanguageStep, PathStep, ComponentsStep, etc.
│   │   └── components/      # shadcn/ui
│   └── shared/
│       └── types.ts
└── assets/
    └── icon.png
```

### Fase 2 — Core installer logic (8-12h)

**`main/installer.ts`**:
```typescript
interface InstallOptions {
  installPath: string;          // ~/.local/bin (default) | /opt/tpv-el-haido (root)
  createShortcut: boolean;      // .desktop file
  downloadUrl: string;          // https://haido.releases.mks2508.systems/...
  checksumSha256: string;       // verify after download
}

async function install(opts: InstallOptions, onProgress: (p: number) => void): Promise<void> {
  // 1. Download with progress (stream + checksum verify)
  // 2. Verify signature (minisign o similar)
  // 3. Copy to install path
  // 4. Extract icon from AppImage (--appimage-extract)
  // 5. Generate .desktop file
  // 6. Update desktop database (update-desktop-database)
  // 7. Optional: xdg-mime default associations
  // 8. Cleanup tmp files
}
```

**`main/downloader.ts`** — descarga signed artifact desde `desktop-release-hub`:
- Endpoint: `GET /api/releases/haido/latest/linux-x64` (o target específico)
- Headers: `Authorization: Bearer <token>` (PKCE cached o guest)
- Stream con progress events al renderer via IPC
- Verify SHA256 contra `latest.json` o response header

### Fase 3 — Wizard UI (8-12h)

**Steps (multi-step form con state machine)**:
1. **Welcome** — splash + intro + language selector (es/en)
2. **Download** — choose version (latest/stable/beta) + show size
3. **Install path** — radio: `~/.local/bin` (no root) | `/opt/tpv-el-haido` (root, sudo prompt)
4. **Components** — checkbox: create `.desktop` shortcut, install icon, set as default for receipts
5. **Review** — summary of choices
6. **Install** — progress bar + log inline + cancel button
7. **Done** — success screen + "Launch TPV" button

**UX principles** (research findings):
- Dark mode + light mode toggle
- a11y (keyboard nav, ARIA labels)
- Error recovery: si install falla, mostrar log + opción "rollback" o "retry"
- Localization: es + en (usar i18next)

### Fase 4 — Build + distribution (2-4h)

`electron-builder.yml`:
```yaml
appId: com.elhaido.installer-linux
productName: TPV El Haido Installer
linux:
  target:
    - AppImage
    - deb
  category: Office
  icon: assets/icon.png
  artifactName: ${productName}-${version}.${ext}
publish:
  - provider: generic
    url: https://haido.releases.mks2508.systems/installer
```

### Fase 5 — Test + docs (2-4h)

- **Test matrix**: CachyOS, Ubuntu 22.04, Fedora 39
- **Smoke test**: install → launch → uninstall (clean rollback)
- **README**: build steps + how to use + screenshots

## Reporte esperado

Persiste a `/tmp/tr19-wizard-linux-build-<ts>.md` con:
- TL;DR (✓/✗ cada acceptance criterion)
- Stack final + razón si hubo cambio de framework
- Diff resumen por archivo (estructura nueva)
- Output de `bun run build` / `electron-builder --linux AppImage` 
- Screenshots de cada step (ASCII mockup OK)
- Stop reason
- Anomalías

## Notas para el executor

- **NO tocar** `scripts/install-linux.sh` (sigue siendo fallback no-GUI). El nuevo installer vive en `apps/installer-linux/`.
- **NO romper** el flujo actual de CI/CD — el wizard es ADITIVO.
- **Usar worktree sibling** si la lane dura >4h — el `sibling-dispatch` skill tiene el runbook.
- **NO commitear** — waxin hace el commit después de verificar.
- **NO push** a remote.
- Persiste reporte a `/tmp/tr19-wizard-linux-build-<ts>.md` ANTES de retornar.
- Effort: large (~25-40h). Sugerido: descomponer en sub-tracks si >8h continuos.

## Sub-decomposition sugerida (si effort > 8h continuos)

1. **TR-19.A** (4-6h): scaffolding + stack decision + Electron bootstrap
2. **TR-19.B** (8-12h): core installer logic + downloader
3. **TR-19.C** (8-12h): wizard UI multi-step
4. **TR-19.D** (2-4h): build + distribution + test matrix
5. **TR-19.E** (2-4h): docs + README + screenshots