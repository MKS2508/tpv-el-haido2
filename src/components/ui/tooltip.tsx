import { Tooltip as KobalteTooltip } from '@kobalte/core/tooltip';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const TooltipProvider = (props: { children: JSX.Element }) => {
  return <>{props.children}</>;
};

const Tooltip = KobalteTooltip;

const TooltipTrigger = KobalteTooltip.Trigger;

interface TooltipContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function TooltipContent(props: TooltipContentProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteTooltip.Portal>
      <KobalteTooltip.Content
        ref={local.ref}
        class={cn(
          'z-50 overflow-hidden rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
          local.class
        )}
        {...others}
      />
    </KobalteTooltip.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
