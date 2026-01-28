import { Popover as KobaltePopover } from '@kobalte/core/popover';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const Popover = KobaltePopover;

const PopoverTrigger = KobaltePopover.Trigger;

const PopoverPortal = KobaltePopover.Portal;

interface PopoverContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

function PopoverContent(props: PopoverContentProps) {
  const [local, others] = splitProps(props, ['class', 'ref', 'align', 'sideOffset']);

  return (
    <PopoverPortal>
      <KobaltePopover.Content
        ref={local.ref}
        align={local.align ?? 'center'}
        gutter={local.sideOffset ?? 4}
        class={cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2',
          local.class
        )}
        {...others}
      />
    </PopoverPortal>
  );
}

const PopoverClose = KobaltePopover.CloseButton;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverPortal };
