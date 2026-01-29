import { listen } from '@tauri-apps/api/event';
import { onCleanup } from 'solid-js';

export function useAboutDialog(onOpen: () => void) {
  const unlistenPromise = listen('open-about-dialog', () => {
    onOpen();
  });

  onCleanup(() => {
    unlistenPromise.then((unlisten) => unlisten());
  });
}
