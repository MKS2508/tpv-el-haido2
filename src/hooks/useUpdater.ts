/**
 * useUpdater Hook
 *
 * Manages app updates using Tauri's plugin-updater.
 * Uses OperationState for check and download operations.
 *
 * @returns Update check and installation utilities
 */

import { ok, type Result, type ResultError } from '@mks2508/no-throw';
import { createMemo, createSignal } from 'solid-js';
import type { AppErrorCode } from '@/lib/error-codes';
import { createContextLogger } from '@/lib/logger';
import { canApplyNow } from '@/lib/ota-updates';
import { createOperationStateSignal } from '@/lib/state-helpers';
import { isTauri } from '@/services/platform';

const PENDING_UPDATE_STORAGE_KEY = 'tpv-pending-update';

interface IPendingUpdate {
  version: string;
  reason: string;
  deferredAt: number;
}

function loadPendingUpdate(): IPendingUpdate | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_UPDATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IPendingUpdate>;
    if (
      typeof parsed.version === 'string' &&
      typeof parsed.reason === 'string' &&
      typeof parsed.deferredAt === 'number'
    ) {
      return parsed as IPendingUpdate;
    }
    return null;
  } catch {
    return null;
  }
}

function savePendingUpdate(value: IPendingUpdate | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (value === null) {
      localStorage.removeItem(PENDING_UPDATE_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_UPDATE_STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// ==================== Types ====================

/** Progress data for update download */
export interface IUpdateProgress {
  contentLength: number | null;
  downloaded: number;
}

/** Update information from Tauri */
interface IUpdateData {
  version: string;
  body: string | null;
  downloaded: boolean;
  downloadAndInstall: (callback: (event: any) => void) => Promise<void>;
}

/** Check operation result */
interface ICheckResult {
  available: boolean;
  version: string | null;
  notes: string | null;
  update: IUpdateData | null;
}

/** Download operation result */
interface IDownloadResult {
  success: boolean;
  version: string;
}

// ==================== Logger ====================

const log = createContextLogger('Updater');

// ==================== Tauri Plugins ====================

let checkFn: (() => Promise<any>) | null = null;
let relaunchFn: (() => Promise<void>) | null = null;
let pluginsLoadAttempted = false;

async function loadTauriPlugins() {
  if (!isTauri() || pluginsLoadAttempted) return;
  pluginsLoadAttempted = true;
  try {
    const [updaterModule, processModule] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-process'),
    ]);
    checkFn = updaterModule.check ?? null;
    relaunchFn = processModule.relaunch ?? null;
    log.debug('Tauri plugins loaded', { checkFn: typeof checkFn });
  } catch (error) {
    log.error('Failed to load Tauri plugins', error instanceof Error ? error : undefined);
  }
}

// ==================== Hook ====================

/**
 * Hook for checking and installing app updates
 *
 * @example
 * ```ts
 * const updater = useUpdater();
 * await updater.checkForUpdates();
 * if (updater.available()) {
 *   await updater.downloadAndInstall();
 * }
 * ```
 */
export function useUpdater() {
  // Check operation
  const checkOp = createOperationStateSignal<ICheckResult>();
  // Download operation
  const downloadOp = createOperationStateSignal<IDownloadResult>();

  // Pending update that was deferred because canApplyNow() said no.
  // Restored from localStorage so the notice survives a reload, and cleared
  // once the operator dismisses it (or the update is applied).
  const [pendingUpdate, setPendingUpdate] = createSignal<IPendingUpdate | null>(
    loadPendingUpdate()
  );

  // Backwards-compatible derived states
  const available = createMemo(() => {
    const s = checkOp.state();
    return s.status === 'success' ? (s.result?.available ?? false) : false;
  });

  const checking = createMemo(() => checkOp.state().status === 'pending');
  const downloading = createMemo(() => downloadOp.state().status === 'pending');

  const error = createMemo(() => {
    const checkErr = checkOp.state();
    if (checkErr.status === 'failed') return checkErr.error.message;
    const dlErr = downloadOp.state();
    if (dlErr.status === 'failed') return dlErr.error.message;
    return null;
  });

  const progress = createMemo(() => {
    const s = downloadOp.state();
    if (s.status === 'pending' && s.message) {
      const match = s.message.match(/(\d+)\/(\d+)/);
      if (match) {
        return {
          contentLength: parseInt(match[2], 10),
          downloaded: parseInt(match[1], 10),
        };
      }
    }
    return null;
  });

  const version = createMemo(() => {
    const s = checkOp.state();
    return s.status === 'success' ? (s.result?.version ?? null) : null;
  });

  const notes = createMemo(() => {
    const s = checkOp.state();
    return s.status === 'success' ? (s.result?.notes ?? null) : null;
  });

  /**
   * Check for available updates
   *
   * @returns Whether an update is available
   */
  const checkForUpdates = async (): Promise<boolean> => {
    if (!isTauri()) {
      log.debug('Skipping update check (not Tauri environment)');
      return false;
    }

    return new Promise((resolve) => {
      checkOp
        .execute(async (): Promise<Result<ICheckResult, ResultError<AppErrorCode>>> => {
          try {
            await loadTauriPlugins();
            if (!checkFn) {
              throw new Error('Tauri updater plugin not available');
            }

            log.debug('Checking for updates');
            const result = await checkFn();

            if (result) {
              log.success('Update available', { version: result.version });
              return ok({
                available: true,
                version: result.version,
                notes: result.body || null,
                update: result,
              });
            } else {
              log.debug('No updates available');
              return ok({
                available: false,
                version: null,
                notes: null,
                update: null,
              });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            // Permission errors or dev mode — treat as "no updates" instead of surfacing error
            if (msg.includes('not allowed') || msg.includes('Permissions')) {
              log.warn('Updater permission not granted, treating as up-to-date', { reason: msg });
              return ok({ available: false, version: null, notes: null, update: null });
            }
            log.error('Failed to check for updates', err instanceof Error ? err : undefined);
            throw err;
          }
        })
        .then(() => {
          resolve(available());
        });
    });
  };

  /**
   * Download and install the available update
   *
   * @returns Whether installation succeeded
   */
  const downloadAndInstall = async (): Promise<boolean> => {
    if (!isTauri()) {
      log.error('Updates not available in PWA mode');
      return false;
    }

    const checkState = checkOp.state();
    const updateData = checkState.status === 'success' ? checkState.result?.update : null;

    if (!updateData) {
      log.error('No update available to download');
      return false;
    }

    let dlSuccess = false;

    await downloadOp.execute(
      async (): Promise<Result<IDownloadResult, ResultError<AppErrorCode>>> => {
        try {
          log.debug('Starting download', { version: updateData.version });

          await updateData.downloadAndInstall((event: any) => {
            switch (event.event) {
              case 'Started':
                log.debug('Download started', {
                  contentLength: event.data.contentLength,
                });
                break;
              case 'Progress':
                log.debug('Download progress', {
                  chunkLength: event.data.chunkLength,
                });
                break;
              case 'Finished':
                log.success('Download finished');
                break;
            }
          });

          dlSuccess = true;

          // Relaunch the app — but only if the box is in a state that can take
          // a reload. canApplyNow() refuses when a ticket is open on screen or
          // the operator just interacted; in that case we persist the pending
          // update so the notice survives the next mount instead of killing
          // the process mid-order.
          if (relaunchFn) {
            const verdict = await canApplyNow();
            if (verdict.ok) {
              await relaunchFn();
            } else {
              const reason = verdict.reason ?? 'no es seguro reiniciar ahora';
              log.warn('Update deferred — not safe to relaunch yet', {
                version: updateData.version,
                reason,
              });
              const deferred: IPendingUpdate = {
                version: updateData.version,
                reason,
                deferredAt: Date.now(),
              };
              setPendingUpdate(deferred);
              savePendingUpdate(deferred);
            }
          }

          return ok({ success: true, version: updateData.version });
        } catch (err) {
          log.error('Download and install failed', err instanceof Error ? err : undefined);
          throw err;
        }
      }
    );

    return dlSuccess;
  };

  /**
   * Dismiss the available update
   */
  const dismissUpdate = () => {
    log.debug('Dismissing update');
    checkOp.reset();
  };

  /**
   * Clear the deferred-update notice (and its localStorage entry).
   * Use when the operator acknowledges the message.
   */
  const dismissPendingUpdate = () => {
    setPendingUpdate(null);
    savePendingUpdate(null);
  };

  const hasDeferredUpdate = createMemo(() => pendingUpdate() !== null);

  return {
    // Backwards-compatible accessors
    available,
    checking,
    downloading,
    error,
    progress,
    version,
    notes,

    // Deferred-update notice (set when relaunch was gated on canApplyNow)
    pendingUpdate,
    hasDeferredUpdate,

    // Actions
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    dismissPendingUpdate,

    // Full operation states for advanced consumers
    checkOperation: checkOp.state,
    downloadOperation: downloadOp.state,
  };
}
