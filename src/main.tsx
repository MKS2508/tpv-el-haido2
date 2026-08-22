import logger from '@mks2508/better-logger';
import { ThemeCore } from '@mks2508/shadcn-basecoat-theme-manager';
import { render } from 'solid-js/web';
import { ErrorBoundary as AppErrorBoundary } from '@/components/ErrorBoundary';
import { InstallerApp } from '@/installer';
import { initializeLogger } from '@/lib/logger-init';
import { signalAppReady } from '@/lib/ota-ready';
import { startOtaUpdates } from '@/lib/ota-updates';
import { ASSET_PATHS, getSwPath, getSwScope } from '@/lib/paths';
import { ThemeProvider } from '@/lib/theme-context';
import { isTauri } from '@/services/platform/PlatformDetector';
import App from './App';
import './styles/optimized-product-card.css';
import './styles/optimized-order-history.css';
import './styles/optimized-login.css';

// Initialize logger with transports and log levels FIRST
initializeLogger();

async function registerServiceWorker() {
  const swLog = logger.component('ServiceWorker');

  if (isTauri()) {
    swLog.debug('Skipping service worker registration in Tauri');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    swLog.debug('Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(getSwPath(), {
      scope: getSwScope(),
    });

    swLog.info(`Service worker registered: ${registration.scope}`);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            swLog.info('New version available');
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });
  } catch (error) {
    swLog.error('Registration failed', error instanceof Error ? error : undefined);
  }
}

function ensureAeatConfig() {
  const key = 'tpv-aeat-config';
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const cfg = JSON.parse(saved);
      if (cfg?.businessData?.nif && cfg?.businessData?.nombreRazon) return;
      // Patch missing fields
      cfg.businessData = {
        ...cfg.businessData,
        nif: cfg.businessData?.nif || '16639695T',
        nombreRazon: cfg.businessData?.nombreRazon || 'GERMAN ASENSIO BLASCO',
      };
      localStorage.setItem(key, JSON.stringify(cfg));
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          businessData: {
            nif: '16639695T',
            nombreRazon: 'GERMAN ASENSIO BLASCO',
            serieFactura: 'HAI',
            tipoFactura: 'F1',
            descripcionOperacion: 'Venta de servicios de hostelería',
          },
          environment: 'production',
          mode: 'sidecar',
        })
      );
    }
  } catch {
    /* ignore */
  }
}

async function initializeApp() {
  const appLog = logger.component('App');
  ensureAeatConfig();

  try {
    appLog.info('Initializing ThemeCore...');

    await ThemeCore.init({
      debug: import.meta.env.DEV,
      registryPath: ASSET_PATHS.themes,
      fouc: {
        prevent: true,
        method: 'auto',
        revealDelay: 0,
      },
      defaults: {
        theme: 'synthwave84',
        mode: 'auto',
      },
    });

    appLog.success('ThemeCore ready', { registryPath: ASSET_PATHS.themes });

    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.15s ease-out';

    appLog.info('ThemeCore ready, mounting Solid app...');
  } catch (error) {
    appLog.error('ThemeCore initialization failed', error instanceof Error ? error : undefined);
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
  }

  // Safety fallback
  setTimeout(() => {
    if (document.body.style.visibility !== 'visible') {
      appLog.warn('Safety fallback: Revealing body manually');
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
    }
  }, 1000);

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  // Gate installer mode (TR-19.A.2 sidecar pattern, ver r7):
  // el binario Rust detecta `--install` y monta una WebviewWindow con label
  // "installer". Aquí decidimos qué árbol montar según ese label — POS normal
  // o wizard installer. Sin flag => label "main" (default de Tauri), caemos al
  // camino POS existente intacto.
  const isInstaller = await detectInstallerMode();
  appLog.info(`Bootstrapping ${isInstaller ? 'InstallerApp (sidecar)' : 'App (POS)'}`);

  if (isInstaller) {
    // Installer: ThemeProvider compartido para que el wizard herede el theme
    // activo del TPV (12 temas disponibles). Sin AppErrorBoundary de page-level
    // porque el installer tiene su propio StepContainer con feedback por step.
    // Sin signalAppReady/startOtaUpdates porque no hay OTA ni watchdog para un
    // binario one-shot del installer.
    render(
      () => (
        <ThemeProvider>
          <InstallerApp language="es" />
        </ThemeProvider>
      ),
      root
    );
    return;
  }

  render(
    () => (
      <AppErrorBoundary
        level="page"
        fallbackTitle="Error critico en la aplicacion"
        fallbackMessage="Lo sentimos, algo ha salido mal. Por favor, recarga la aplicacion para continuar."
      >
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AppErrorBoundary>
    ),
    root
  );

  registerServiceWorker();

  // Cierra el ciclo del watchdog OTA: sin esto el bundle activo se revierte.
  signalAppReady();

  // Escucha bundles preparados y los aplica cuando la caja esté quieta.
  startOtaUpdates();
}

/**
 * TR-19.A.2 — Detecta si la webview actual es la del installer.
 *
 * Estrategia: leer el label de la WebviewWindow via `@tauri-apps/api/webviewWindow`.
 * El binario Rust (`src-tauri/src/main.rs`) crea la ventana con label "installer"
 * cuando detecta `--install`; sin flag, el POS usa label "main" (default Tauri).
 *
 * Falsy en cualquier camino no-Tauri (browser / PWA) para que el fallback a
 * POS funcione sin cambios cuando el frontend corre fuera del binario sidecar.
 */
async function detectInstallerMode(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const win = getCurrentWebviewWindow();
    return win.label === 'installer';
  } catch {
    return false;
  }
}

initializeApp();
