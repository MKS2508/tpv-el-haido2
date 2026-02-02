import { createSignal } from 'solid-js';
import { isTauri } from '@/services/platform';

// Stub Update type for PWA
interface UpdateStub {
  version: string;
  body: string | null;
  downloaded: boolean;
  downloadAndInstall: (callback: (event: any) => void) => Promise<void>;
}

// Lazy load Tauri plugins only when needed
let checkFn: (() => Promise<any>) | null = null;
let relaunchFn: (() => Promise<void>) | null = null;

async function loadTauriPlugins() {
  if (isTauri() && !checkFn) {
    try {
      const plugins = await Promise.all([
        import('@tauri-apps/plugin-updater'),
        import('@tauri-apps/plugin-process'),
      ]);
      checkFn = plugins[0].check;
      relaunchFn = plugins[1].relaunch;
    } catch (error) {
      console.error('[useUpdater] Failed to load Tauri plugins:', error);
    }
  }
}

export interface UpdateProgress {
  contentLength: number | null;
  downloaded: number;
}

export interface UpdateState {
  available: boolean;
  checking: boolean;
  downloading: boolean;
  error: string | null;
  progress: UpdateProgress | null;
  version: string | null;
  notes: string | null;
}

export function useUpdater() {
  const [state, setState] = createSignal<UpdateState>({
    available: false,
    checking: false,
    downloading: false,
    error: null,
    progress: null,
    version: null,
    notes: null,
  });

  const [update, setUpdate] = createSignal<UpdateStub | null>(null);

  const checkForUpdates = async () => {
    // Skip if not Tauri
    if (!isTauri()) {
      setState((prev) => ({ ...prev, checking: false, available: false }));
      return false;
    }

    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      await loadTauriPlugins();
      if (!checkFn) {
        throw new Error('Tauri updater plugin not available');
      }

      const result = await checkFn();

      if (result) {
        setUpdate(result as any);
        setState((prev) => ({
          ...prev,
          checking: false,
          available: true,
          version: result.version,
          notes: result.body || null,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          checking: false,
          available: false,
        }));
        return false;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        checking: false,
        error: error instanceof Error ? error.message : 'Error checking for updates',
      }));
      return false;
    }
  };

  const downloadAndInstall = async () => {
    // Skip if not Tauri
    if (!isTauri()) {
      setState((prev) => ({ ...prev, error: 'Updates not available in PWA mode' }));
      return false;
    }

    const currentUpdate = update();
    if (!currentUpdate) {
      setState((prev) => ({ ...prev, error: 'No update available' }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      downloading: true,
      error: null,
      progress: { contentLength: null, downloaded: 0 },
    }));

    try {
      let contentLength: number | null = null;
      let downloaded = 0;

      await (currentUpdate as any).downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? null;
            setState((prev) => ({
              ...prev,
              progress: { contentLength, downloaded: 0 },
            }));
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setState((prev) => ({
              ...prev,
              progress: { contentLength, downloaded },
            }));
            break;
          case 'Finished':
            setState((prev) => ({
              ...prev,
              downloading: false,
              progress: null,
            }));
            break;
        }
      });

      // Relaunch the app after install
      if (relaunchFn) {
        await relaunchFn();
      }
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Error installing update',
      }));
      return false;
    }
  };

  const dismissUpdate = () => {
    setUpdate(null);
    setState((prev) => ({
      ...prev,
      available: false,
      version: null,
      notes: null,
    }));
  };

  // Return signal accessors and actions
  return {
    // Signal accessors - call these as functions to get reactive values
    available: () => state().available,
    checking: () => state().checking,
    downloading: () => state().downloading,
    error: () => state().error,
    progress: () => state().progress,
    version: () => state().version,
    notes: () => state().notes,

    // Actions
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
  };
}
