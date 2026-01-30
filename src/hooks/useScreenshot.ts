import { invoke } from '@tauri-apps/api/core';
import { domToPng } from 'modern-screenshot';
import { createSignal } from 'solid-js';
import type { ScreenshotContext } from '@/types/screenshot';

export interface ScreenshotOptions {
  filename: string;
  copyToClipboard: boolean;
  saveToFile: boolean;
  context?: ScreenshotContext;
}

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [lastCapture, setLastCapture] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const capture = async (
    targetElement: HTMLElement,
    options: ScreenshotOptions
  ): Promise<boolean> => {
    setIsCapturing(true);
    setError(null);

    // Log context if provided
    if (options.context) {
      console.log('[Screenshot] Contexto de captura:', {
        section: options.context.section,
        sectionLabel: options.context.sectionLabel,
        subSection: options.context.subSection,
        subSectionLabel: options.context.subSectionLabel,
        viewState: options.context.viewState,
        entityCount: options.context.entityCount,
      });
    }

    let fileSaved = false;
    let clipboardError: string | null = null;

    try {
      // Agregar clase para ocultar elementos de UI durante la captura
      document.body.classList.add('screenshot-capturing');

      // Pequeño delay para que apliquen los estilos
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Primero capturar como PNG usando modern-screenshot
      const dataUrl = await domToPng(targetElement, {
        quality: 1,
        scale: 2, // Retina quality
        backgroundColor: '#ffffff',
      });

      // Guardar archivo usando Rust
      if (options.saveToFile) {
        try {
          const savedPath = await invoke<string>('save_screenshot_from_base64', {
            request: {
              filename: options.filename,
              save_to_downloads: true,
              image_data: dataUrl,
            },
          });
          console.log('[Screenshot] Guardada en:', savedPath);
          fileSaved = true;
        } catch (saveErr) {
          console.error('[Screenshot] Error guardando archivo:', saveErr);
          throw saveErr;
        }
      }

      // Copiar al clipboard (del frontend)
      if (options.copyToClipboard) {
        try {
          // Convertir dataURL a Blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          console.log('[Screenshot] Copiada al clipboard');
        } catch (clipErr) {
          // El clipboard puede fallar en Tauri/desktop contexts, no es crítico
          clipboardError = clipErr instanceof Error ? clipErr.message : 'Error desconocido';
          console.warn('[Screenshot] No se pudo copiar al clipboard (no crítico):', clipboardError);
        }
      }

      setLastCapture(dataUrl);

      // Si se guardó el archivo, es éxito incluso si falló el clipboard
      if (fileSaved || !options.saveToFile) {
        return true;
      }

      return false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('[Screenshot] Error:', err);
      return false;
    } finally {
      // Remover clase después de la captura
      document.body.classList.remove('screenshot-capturing');
      setIsCapturing(false);
    }
  };

  return {
    capture,
    isCapturing,
    lastCapture,
    error,
  };
}
