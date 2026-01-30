import { ThemeCore } from '@mks2508/shadcn-basecoat-theme-manager';
import { render } from 'solid-js/web';
import { ErrorBoundary as AppErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme-context';
import { PRESET_THEMES } from '@/lib/themes/preset-themes';
import type { ThemeConfig } from '@/lib/themes/theme-config';
import { isTauri } from '@/services/platform/PlatformDetector';
import App from './App';
import './styles/optimized-product-card.css';
import './styles/optimized-order-history.css';
import './styles/optimized-login.css';

/**
 * Convert PRESET_THEMES format to ThemeCore cssVars format
 */
function convertThemeToVars(theme: ThemeConfig): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  const convertColors = (colors: ThemeConfig['colors']['light']) => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(colors) as [string, string][]) {
      // ThemeCore expects CSS variable format
      vars[`--${key}`] = value;
    }
    return vars;
  };

  return {
    light: convertColors(theme.colors.light),
    dark: convertColors(theme.colors.dark),
  };
}

/**
 * Install all preset themes into ThemeCore
 */
async function installPresetThemes(themeCore: Awaited<ReturnType<typeof ThemeCore.init>>) {
  const registry = themeCore.getThemeRegistry();
  for (const theme of PRESET_THEMES) {
    try {
      const cssVars = convertThemeToVars(theme);
      await registry.installTheme({ name: theme.id, cssVars }, 'local://preset-themes');
      console.log(`[Theme] Installed preset theme: ${theme.id}`);
    } catch (error) {
      console.warn(`[Theme] Failed to install theme ${theme.id}:`, error);
    }
  }
}

async function registerServiceWorker() {
  if (isTauri()) {
    console.log('[SW] Skipping service worker registration in Tauri');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered:', registration.scope);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available');
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });
  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

async function initializeApp() {
  try {
    console.log('Initializing ThemeCore...');

    const themeCore = await ThemeCore.init({
      debug: import.meta.env.DEV,
      fouc: {
        prevent: true,
        method: 'auto',
        revealDelay: 0,
      },
      defaults: {
        theme: 'amethyst-haze',
        mode: 'auto',
      },
    });

    // Install preset themes
    await installPresetThemes(themeCore);
    console.log(`[Theme] Installed ${PRESET_THEMES.length} preset themes`);

    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.15s ease-out';

    console.log('ThemeCore ready, mounting Solid app...');
  } catch (error) {
    console.error('ThemeCore initialization failed:', error);
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
  }

  // Safety fallback
  setTimeout(() => {
    if (document.body.style.visibility !== 'visible') {
      console.warn('Safety fallback: Revealing body manually');
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
    }
  }, 1000);

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  render(
    () => (
      <AppErrorBoundary
        level="page"
        fallbackTitle="Error critico en la aplicacion"
        fallbackMessage="Lo sentimos, algo ha salido mal. Por favor, recarga la aplicacion para continuar."
      >
        <ThemeProvider
          config={{
            debug: import.meta.env.DEV,
            fouc: {
              prevent: true,
              method: 'auto',
              revealDelay: 0,
            },
            defaults: {
              theme: 'amethyst-haze',
              mode: 'auto',
            },
          }}
        >
          <App />
        </ThemeProvider>
      </AppErrorBoundary>
    ),
    root
  );

  registerServiceWorker();
}

initializeApp();
