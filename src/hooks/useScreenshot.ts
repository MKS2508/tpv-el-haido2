import { invoke } from '@tauri-apps/api/core';
import { domToPng } from 'modern-screenshot';
import { createSignal } from 'solid-js';

export interface ScreenshotOptions {
  filename: string;
  copyToClipboard: boolean;
  saveToFile: boolean;
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

    try {
      // Primero capturar como PNG usando modern-screenshot
      const dataUrl = await domToPng(targetElement, {
        quality: 1,
        scale: 2, // Retina quality
        backgroundColor: '#ffffff',
      });

      // Guardar archivo usando Rust
      if (options.saveToFile) {
        const savedPath = await invoke<string>('save_screenshot_from_base64', {
          request: {
            filename: options.filename,
            save_to_downloads: true,
            image_data: dataUrl,
          },
        });
        console.log('[Screenshot] Guardada en:', savedPath);
      }

      // Copiar al clipboard (del frontend)
      if (options.copyToClipboard) {
        // Convertir dataURL a Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        console.log('[Screenshot] Copiada al clipboard');
      }

      setLastCapture(dataUrl);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('[Screenshot] Error:', err);
      return false;
    } finally {
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
