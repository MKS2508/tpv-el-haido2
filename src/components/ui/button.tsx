import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { posButtonVariants as buttonVariants } from '@/lib/cva-variants';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: HTMLButtonElement | ((el: HTMLButtonElement) => void);
}

function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['class', 'variant', 'size', 'ref']);

  return (
    <button
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size, className: local.class })
      )}
      ref={local.ref}
      {...others}
    />
  );
}

export { Button, buttonVariants };
