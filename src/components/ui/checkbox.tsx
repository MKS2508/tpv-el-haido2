import { Checkbox as CheckboxPrimitive } from '@kobalte/core/checkbox';
import { Check } from 'lucide-solid';
import type { Component, ComponentProps } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive> & {
  class?: string;
};

const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, others] = splitProps(props, ['class']);

  return (
    <CheckboxPrimitive {...others}>
      <CheckboxPrimitive.Input class="peer" />
      <CheckboxPrimitive.Control
        class={cn(
          'h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground',
          local.class
        )}
      >
        <CheckboxPrimitive.Indicator class="flex items-center justify-center text-current">
          <Check class="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive>
  );
};

export { Checkbox };
export type { CheckboxProps };
