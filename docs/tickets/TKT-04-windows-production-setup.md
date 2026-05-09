# TKT-04 - Windows Production Machine Setup

**Milestone**: 0.4.0.D
**Priority**: 🔥 CRITICAL
**Status**: proposed
**Created**: 2026-05-09
**Assigned**: -
**Estimated**: 2-3h

## Context

El TPV se instalará en una máquina Windows en el bar del hermano de waxin. **Acceso físico limitado** después del despliegue inicial.

**Requisitos**:
- TPV app corriendo y accesible
- Auto-updater funcionando (para updates remotos)
- SSH/Remote access para mantenimiento
- Impresora conectada y funcionando (TKT-02)
- Primer release publicado en GitHub

**Fecha límite**: App debe estar funcionando el día 2026-05-10 (mañana por la mañana)

## Scope

### IN scope
- ✅ Preparar Windows machine: instalar dependencias (Bun, Tauri CLI?)
- ✅ Compilar TPV para Windows (o descargar release pre-built)
- ✅ Instalar app en Windows
- ✅ Configurar auto-update
- ✅ Test: update check funciona
- ✅ Configurar acceso remoto (SSH o alternativa Windows)
- ✅ Publicar release en GitHub (v0.1.0 o v0.2.0)
- ✅ Verificar: app abre, no crashea, puede crear orden

### OUT of scope
- ❌ Configurar custom domains o IPs fijas
- ❌ Setup de VPN (si se necesita,另行 discutir)
- ❌ Monitoreo avanzado (logs, metrics)

## Dependencies

- **TKT-01** (Updater audit) - CRITICAL: necesitas updater funcionando
- **TKT-02** (Printer) - printer debe estar conectada
- **TKT-03** (Coolify) - opcional, pero nice to have

## Acceptance Criteria

- [ ] **Windows prepped**: Dependencies instaladas
- [ ] **Build/Download**: TPV binary para Windows listo
- [ ] **App instalada**: TPV corre en Windows
- [ ] **Updater configurado**: Check update funciona
- [ ] **Release publicado**: v0.2.0 en GitHub releases
- [ ] **Access remoto**: SSH o alternativa configurada
- [ ] **Test smoke**: App abre, crea orden, no crashea
- [ ] **Documentado**: Setup guide en `/docs/deployment/production-windows.md`

## Technical Notes

**Windows dependencies probables**:
- Visual Studio Build Tools (si compilando in-site)
- Bun runtime (para scripts?)
- WebView2 runtime (Tauri dependency)

**Build options**:
1. **Compilar en Mac y copiar** (cross-compile)
2. **Compilar en Windows** (native build, más lento setup)
3. **Descargar release pre-built** de GitHub (si existe)

**Comandos útiles**:
```bash
# Build para Windows (desde Mac)
bun run tauri build --target x86_64-pc-windows-msvc

# Alternative: usar GitHub Actions para build
# (verificar si existe .github/workflows/build.yml)

# Publicar release manual
gh release create v0.2.0 \
  src-tauri/target/release/bundle/nsis/TPV El Haido_0.2.0_x64-setup.exe \
  --notes "Production release v0.2.0"

# En Windows: verificar updater
# Abrir DevTools en la app y llamar checkUpdate()
```

**Access remoto options**:
1. **SSH server** para Windows (OpenSSH Server built-in en Win 10+)
2. **RDP** (Remote Desktop Protocol)
3. **AnyDesk / TeamViewer** (último recurso)

**Riesgos conocidos**:
- Cross-compile puede fallar → mejor compilar native en Windows
- Updater puede no funcionar en primer run → necesita restart
- WebView2 puede no estar instalado → Tauri no arranca
- Firewall puede bloquear updates

**Checklist para Windows machine**:
- [ ] Windows 10/11 64-bit
- [ ] 4GB+ RAM
- [ ] 500MB+ disk space
- [ ] Internet connection (para updates)
- [ ] Admin access (para instalar apps)

## Sub-tasks

### Setup inicial
- [ ] 1. Verificar specs de Windows machine
- [ ] 2. Instalar WebView2 runtime
- [ ] 3. Instalar Bun (opcional, si se necesita)
- [ ] 4. Instalar OpenSSH Server (para access remoto)

### Build / Download
- [ ] 5. Build TPV para Windows (o descargar release)
- [ ] 6. Verificar binary no está corrupto
- [ ] 7. Copiar a Windows machine (USB o network)

### Instalación
- [ ] 8. Ejecutar installer
- [ ] 9. Verificar app crea icono en desktop
- [ ] 10. Test: app abre sin crashear

### Updater
- [ ] 11. Configurar updater endpoint
- [ ] 12. Test manual: check update
- [ ] 13. Verificar puede descargar updates

### Access remoto
- [ ] 14. Configurar OpenSSH Server
- [ ] 15. Test SSH desde Mac
- [ ] 16. Documentar IP / credentials

### Release
- [ ] 17. Publicar v0.2.0 en GitHub
- [ ] 18. Upload: .exe installer + latest.json
- [ ] 19. Verify updater puede descargar release

### Smoke test
- [ ] 20. Crear orden de prueba
- [ ] 21. Verificar imprime ticket (TKT-02 debe estar done)
- [ ] 22. Restart app y verificar settings persisten

## Blocked by

- TKT-01 (Updater audit) - CRITICAL
- TKT-02 (Printer) - blocker para smoke test

## Blocks

- Nada - este es el último ticket de la fase 0.4.0

## Findings

*(Post-execución: llenar con discoveries reales)*

- [ ] ¿Cross-compile funciona o compila native en Windows?
- [ ] ¿Updater funciona en primer run?
- [ ] ¿Hay algún error en logs de Tauri?
- [ ] ¿App crashea o es estable?
- [ ] ¿Access remoto funciona?

## References

- Tauri Windows build docs: https://v2.tauri.app/start/build/windows/
- GitHub releases: https://github.com/MKS2508/tpv-el-haido2/releases
- OpenSSH Server Windows: https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse
