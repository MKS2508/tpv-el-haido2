import { onCleanup } from 'solid-js';
import { isTauri } from '@/services/platform';

export function useAboutDialog(onOpen: () => void) {
  // No-op in PWA mode
  if (!isTauri()) {
    return;
  }

  // Lazy load Tauri APIs to prevent transformCallback errors in PWA
  let unlisten: (() => void) | null = null;

  import('@tauri-apps/api/event').then(({ listen }) => {
    const unlistenPromise = listen('open-about-dialog', () => {
      onOpen();
    });

    unlistenPromise.then((fn) => {
      unlisten = fn;
    });
  });

  onCleanup(() => {
    unlisten?.();
  });
}
