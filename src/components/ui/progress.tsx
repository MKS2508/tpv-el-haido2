import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  /** 0-100. Default: 0 */
  value?: number;
  /** Max value (e.g., 100). Default: 100 */
  max?: number;
  /** Render as solid bar vs indeterminate. Default: solid */
  indeterminate?: boolean;
}

/**
 * Progress bar — reusa el visual language del TPV (rounded-md, bg-primary,
 * bg-primary/20 track). Sigue el patrón shadcn/ui progress (Radix-style API
 * minimalista sin Radix dependency).
 *
 * TR-19.C: creado para DownloadStep + InstallStep. Otros call sites futuros
 * (loading states, OTA download UI) también pueden reusarlo.
 */
function Progress(props: ProgressProps) {
  const [local, others] = splitProps(props, ['class', 'value', 'max', 'indeterminate', 'ref']);

  const pct = () => {
    const max = local.max ?? 100;
    const value = local.value ?? 0;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  };

  return (
    <div
      ref={local.ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={local.max ?? 100}
      aria-valuenow={local.indeterminate ? undefined : pct()}
      class={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', local.class)}
      {...others}
    >
      {local.indeterminate ? (
        <div class="absolute inset-y-0 left-0 w-1/3 animate-[progress-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
      ) : (
        <div
          class="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct()}%` }}
        />
      )}
    </div>
  );
}

export { Progress };
