import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  ref?: HTMLInputElement | ((el: HTMLInputElement) => void);
}

function Input(props: InputProps) {
  const [local, others] = splitProps(props, ['class', 'type', 'ref']);

  return (
    <input
      type={local.type}
      class={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        local.class
      )}
      ref={local.ref}
      {...others}
    />
  );
}

export { Input };
