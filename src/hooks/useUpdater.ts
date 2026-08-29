import { createSignal, onCleanup, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

type UpdaterState =
  | 'idle' | 'checking' | 'available'
  | 'downloading' | 'installing' | 'relaunching'
  | 'installed' | 'error';

export interface UseUpdater {
  state: () => UpdaterState;
  updateAvailable: () => boolean;
  remoteVersion: () => string | null;
  currentVersion: () => string | null;
  progress: () => { downloaded: number; total: number };
  error: () => string | null;
  handleCheck: () => Promise<void>;
  handleDownloadInstall: () => Promise<void>;
}

export function useUpdater(): UseUpdater {
  const [state, setState] = createSignal<UpdaterState>('idle');
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const [remoteVersion, setRemoteVersion] = createSignal<string | null>(null);
  const [currentVersion, setCurrentVersion] = createSignal<string | null>(null);
  const [progress, setProgress] = createSignal({ downloaded: 0, total: 0 });
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    const unlistens: UnlistenFn[] = [];
    listen<string>('ota-stage', e => setState(e.payload as UpdaterState))
      .then(fn => unlistens.push(fn));
    listen<{ downloaded: number; total: number | null }>(
      'ota-download-progress',
      e => setProgress({ downloaded: e.payload.downloaded, total: e.payload.total ?? 0 }),
    ).then(fn => unlistens.push(fn));
    onCleanup(() => unlistens.forEach(fn => fn()));
  });

  const handleCheck = async () => {
    setState('checking'); setError(null);
    try {
      const result = await invoke<{
        httpStatus: number;
        currentVersion: string;
        updateAvailable: boolean;
        remote: { version: string } | null;
      }>('check_full_update');
      setCurrentVersion(result.currentVersion);
      setUpdateAvailable(result.updateAvailable);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRemoteVersion(result.remote ? (result.remote as any).version : null);
      setState(result.updateAvailable ? 'available' : 'idle');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDownloadInstall = async () => {
    setState('downloading'); setError(null);
    try {
      await invoke('download_and_install_update');
      setState('installed');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return {
    state, updateAvailable, remoteVersion, currentVersion, progress, error,
    handleCheck, handleDownloadInstall,
  };
}
