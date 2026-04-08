import { toast as sonnerToast } from 'solid-sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'destructive';
}

export function toast(options: ToastOptions) {
  const { title, description, duration, variant } = options;

  if (variant === 'destructive') {
    return sonnerToast.error(title, {
      description,
      duration,
    });
  }

  return sonnerToast(title, {
    description,
    duration,
  });
}

export function useToast() {
  return { toast };
}
