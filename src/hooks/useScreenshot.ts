import { createSignal } from 'solid-js';
import { domToPng } from 'modern-screenshot';

export interface ScreenshotOptions {
  filename: string;
  copyToClipboard: boolean;
  saveToFile: boolean;
}

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [lastCapture, setLastCapture] = createSignal<Blob | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const capture = async (
    targetElement: HTMLElement,
    options: ScreenshotOptions
  ): Promise<boolean> => {
    setIsCapturing(true);
    setError(null);

    try {
      // Capturar como PNG
      const dataUrl = await domToPng(targetElement, {
        quality: 1,
        scale: 2, // Retina quality
        backgroundColor: '#ffffff',
      });

      // Convertir dataURL a Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      setLastCapture(blob);

      // Copiar al clipboard
      if (options.copyToClipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      }

      // Guardar archivo
      if (options.saveToFile) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${options.filename}.png`;
        link.click();
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
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
