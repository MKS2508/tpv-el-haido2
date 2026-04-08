import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

type ScrollAreaProps = JSX.HTMLAttributes<HTMLDivElement>;

const ScrollArea = (props: ScrollAreaProps) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('relative overflow-hidden', local.class)} {...others}>
      <div class="h-full w-full overflow-y-auto overflow-x-hidden rounded-[inherit]">
        {local.children}
      </div>
    </div>
  );
};

const ScrollBar = (props: { orientation?: 'vertical' | 'horizontal' } & ScrollAreaProps) => {
  const [local, others] = splitProps(props, ['class', 'orientation']);
  return (
    <div
      class={cn(
        'absolute z-10 touch-none select-none transition-colors',
        local.orientation === 'vertical' &&
          'right-0 top-0 h-full w-2.5 border-l border-l-transparent p-[1px]',
        local.orientation === 'horizontal' &&
          'bottom-0 left-0 h-2.5 w-full border-t border-t-transparent p-[1px]',
        local.class
      )}
      {...others}
    >
      <div class="relative h-full w-full rounded-full bg-border" />
    </div>
  );
};

export { ScrollArea, ScrollBar };
