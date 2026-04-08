import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-solid';
import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const Sheet = KobalteDialog;

const SheetTrigger = KobalteDialog.Trigger;

const SheetClose = KobalteDialog.CloseButton;

const SheetPortal = KobalteDialog.Portal;

interface SheetOverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SheetOverlay(props: SheetOverlayProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteDialog.Overlay
      ref={local.ref}
      class={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0',
        local.class
      )}
      {...others}
    />
  );
}

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:duration-300 data-[expanded]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[closed]:slide-out-to-top data-[expanded]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[closed]:slide-out-to-bottom data-[expanded]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[closed]:slide-out-to-left data-[expanded]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l data-[closed]:slide-out-to-right data-[expanded]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>>,
    VariantProps<typeof sheetVariants> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SheetContent(props: SheetContentProps) {
  const [local, others] = splitProps(props, ['side', 'class', 'children', 'ref']);
  return (
    <SheetPortal>
      <SheetOverlay />
      <KobalteDialog.Content
        ref={local.ref}
        class={cn(sheetVariants({ side: local.side }), local.class)}
        {...others}
      >
        {local.children}
        <KobalteDialog.CloseButton class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[expanded]:bg-secondary">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </KobalteDialog.CloseButton>
      </KobalteDialog.Content>
    </SheetPortal>
  );
}

interface SheetHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function SheetHeader(props: SheetHeaderProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div class={cn('flex flex-col space-y-2 text-center sm:text-left', local.class)} {...others} />
  );
}

interface SheetFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function SheetFooter(props: SheetFooterProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div
      class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', local.class)}
      {...others}
    />
  );
}

interface SheetTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  ref?: HTMLHeadingElement | ((el: HTMLHeadingElement) => void);
}

function SheetTitle(props: SheetTitleProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteDialog.Title
      ref={local.ref}
      class={cn('text-lg font-semibold text-foreground', local.class)}
      {...others}
    />
  );
}

interface SheetDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
  ref?: HTMLParagraphElement | ((el: HTMLParagraphElement) => void);
}

function SheetDescription(props: SheetDescriptionProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteDialog.Description
      ref={local.ref}
      class={cn('text-sm text-muted-foreground', local.class)}
      {...others}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
