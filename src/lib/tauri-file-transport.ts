/**
 * TauriFileTransport — writes log lines to a real file via Rust backend.
 *
 * The browser-side FileTransport falls back to localStorage (useless in Tauri WebView).
 * This uses the Rust `append_log_line` command so logs land in
 * `{app_data_dir}/logs/tpv-haido.log` regardless of CWD.
 *
 * Implements `ITransport` from @mks2508/better-logger:
 *   logger.addTransport({ target: new TauriFileTransport(), level: 'debug' })
 */

import { invoke } from '@tauri-apps/api/core';
import type { LogLevel } from '@mks2508/better-logger';

interface TransportRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: string;
  readonly args?: unknown[];
}

interface SpanRecord {
  // not used — we only handle 'log' kind
}

export class TauriFileTransport {
  /** Required by ITransport */
  readonly name = 'TauriFileTransport';

  /** Required by ITransport */
  readonly accepts = ['log'] as const;

  private level: LogLevel;

  constructor(options: { level?: LogLevel } = {}) {
    this.level = options.level ?? 'debug';
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  async write(
    record: TransportRecord | SpanRecord,
  ): Promise<void> {
    // Only handle log records
    if (!('message' in record)) return;

    const ctx = record.context ? `[${record.context}] ` : '';
    const line = `${record.timestamp} [${record.level.toUpperCase()}] ${ctx}${record.message}`;

    try {
      await invoke('append_log_line', { line });
    } catch {
      // Fail silently — logger errors must not crash the app
    }
  }
}
