import { cva, type VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

export interface LabelProps
  extends JSX.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  ref?: HTMLLabelElement | ((el: HTMLLabelElement) => void);
}

function Label(props: LabelProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <label ref={local.ref} class={cn(labelVariants(), local.class)} {...others} />;
}

export { Label };
