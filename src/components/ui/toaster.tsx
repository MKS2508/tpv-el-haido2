import { Toaster as Sonner } from 'solid-sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        class: 'bg-background text-foreground border-border',
        duration: 3000,
      }}
      richColors
      closeButton
    />
  );
}
