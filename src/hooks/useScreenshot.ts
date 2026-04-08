/**
 * useScreenshot Hook
 *
 * Captures screenshots of DOM elements using modern-screenshot.
 * Uses OperationState for async state management.
 *
 * @returns Screenshot capture utilities with OperationState tracking
 */

import { ok, type Result, type ResultError } from '@mks2508/no-throw';
import { domToPng } from 'modern-screenshot';
import { createMemo } from 'solid-js';
import type { AppErrorCode } from '@/lib/error-codes';
import { createContextLogger } from '@/lib/logger';
import { createOperationStateSignal } from '@/lib/state-helpers';
import { isTauri } from '@/services/platform';
import type { ScreenshotContext } from '@/types/screenshot';

// ==================== Types ====================

/** Result of a successful screenshot capture */
export interface ICaptureResult {
  /** Base64 data URL of the captured image */
  dataUrl: string;
  /** Whether the file was saved to disk */
  fileSaved: boolean;
  /** Whether the image was copied to clipboard */
  copiedToClipboard: boolean;
}

/** Options for capturing a screenshot */
export interface IScreenshotOptions {
  /** Filename (without extension) */
  filename: string;
  /** Whether to copy to clipboard */
  copyToClipboard: boolean;
  /** Whether to save to disk (Tauri only) */
  saveToFile: boolean;
  /** Optional screenshot context metadata */
  context?: ScreenshotContext;
}

// ==================== Logger ====================

const log = createContextLogger('Screenshot');

// ==================== Hook ====================

/**
 * Hook for capturing screenshots of DOM elements
 *
 * @example
 * ```ts
 * const screenshot = useScreenshot();
 * const success = await screenshot.capture(element, { filename: 'capture', copyToClipboard: true, saveToFile: true });
 * ```
 */
export function useScreenshot() {
  const operation = createOperationStateSignal<ICaptureResult>();

  // Backwards-compatible accessors derived from OperationState
  const isCapturing = createMemo(() => operation.state().status === 'pending');
  const lastCapture = createMemo(() => {
    const s = operation.state();
    return s.status === 'success' ? (s.result?.dataUrl ?? null) : null;
  });
  const error = createMemo(() => {
    const s = operation.state();
    return s.status === 'failed' ? (s.error as ResultError<string>).message : null;
  });

  /**
   * Captures a screenshot of the target element
   *
   * @param targetElement - The DOM element to capture
   * @param options - Screenshot options
   * @returns Whether the capture was successful
   */
  const capture = async (
    targetElement: HTMLElement,
    options: IScreenshotOptions
  ): Promise<boolean> => {
    // Platform guard for file saving
    if (!isTauri() && options.saveToFile) {
      log.error('Screenshot save only available in desktop app');
      return false;
    }

    if (options.context) {
      log.debug('Capture context', {
        section: options.context.section,
        sectionLabel: options.context.sectionLabel,
        subSection: options.context.subSection,
        subSectionLabel: options.context.subSectionLabel,
        viewState: options.context.viewState,
        entityCount: options.context.entityCount,
      });
    }

    let captureSuccess = false;

    await operation.execute(
      async (): Promise<Result<ICaptureResult, ResultError<AppErrorCode>>> => {
        let fileSaved = false;
        let copiedToClipboard = false;

        // Add class to hide UI elements during capture
        document.body.classList.add('screenshot-capturing');

        // Small delay for styles to apply
        await new Promise((resolve) => setTimeout(resolve, 100));

        let dataUrl: string;
        try {
          dataUrl = await domToPng(targetElement, {
            quality: 1,
            scale: 2,
            backgroundColor: '#ffffff',
          });
        } catch (err) {
          document.body.classList.remove('screenshot-capturing');
          log.error('Failed to capture screenshot', err instanceof Error ? err : undefined);
          throw err;
        }

        // Remove class after capture
        document.body.classList.remove('screenshot-capturing');

        // Save file using Rust (Tauri only)
        if (options.saveToFile && isTauri()) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const savedPath = await invoke<string>('save_screenshot_from_base64', {
              request: {
                filename: options.filename,
                save_to_downloads: true,
                image_data: dataUrl,
              },
            });
            log.success('File saved', { path: savedPath });
            fileSaved = true;
          } catch (saveErr) {
            log.error('Failed to save file', saveErr instanceof Error ? saveErr : undefined);
            throw saveErr;
          }
        }

        // Copy to clipboard
        if (options.copyToClipboard) {
          try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            log.debug('Copied to clipboard');
            copiedToClipboard = true;
          } catch (clipErr) {
            // Clipboard can fail in Tauri/desktop contexts, not critical
            const clipMessage = clipErr instanceof Error ? clipErr.message : 'Unknown error';
            log.warn(`Clipboard copy failed (non-critical): ${clipMessage}`);
          }
        }

        captureSuccess = fileSaved || !options.saveToFile;
        return ok({ dataUrl, fileSaved, copiedToClipboard });
      }
    );

    return captureSuccess;
  };

  return {
    /** Capture a screenshot of a DOM element */
    capture,
    /** Whether a capture is in progress (backwards compat) */
    isCapturing,
    /** Last captured data URL (backwards compat) */
    lastCapture,
    /** Last error message (backwards compat) */
    error,
    /** Full OperationState for advanced consumers */
    operationState: operation.state,
    /** Reset operation state to idle */
    reset: operation.reset,
  };
}
