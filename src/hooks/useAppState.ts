import { isErr, tryCatchAsync } from '@mks2508/no-throw';
import { invoke } from '@tauri-apps/api/core';

/**
 * Get a value from the app_state SQLite table.
 * Returns None if the key does not exist.
 */
export async function getAppState(key: string): Promise<string | null> {
  const result = await tryCatchAsync(
    async () => invoke<string | null>('get_app_state', { key }),
    'AppStateError'
  );

  if (isErr(result)) {
    console.error('[useAppState] getAppState failed:', result.error);
    return null;
  }

  return result.value;
}

/**
 * Set a value in the app_state SQLite table.
 * Uses INSERT OR REPLACE, so the operation is idempotent.
 */
export async function setAppState(key: string, value: string): Promise<void> {
  const result = await tryCatchAsync(
    async () => invoke<void>('set_app_state', { key, value }),
    'AppStateError'
  );

  if (isErr(result)) {
    console.error('[useAppState] setAppState failed:', result.error);
  }
}
