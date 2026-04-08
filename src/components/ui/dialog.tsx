import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import { X } from 'lucide-solid';
import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const Dialog = KobalteDialog;

const DialogTrigger = KobalteDialog.Trigger;

const DialogPortal = KobalteDialog.Portal;

const DialogClose = KobalteDialog.CloseButton;

interface DialogOverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function DialogOverlay(props: DialogOverlayProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteDialog.Overlay
      ref={local.ref}
      class={cn(
        'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0',
        local.class
      )}
      {...others}
    />
  );
}

interface DialogContentProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function DialogContent(props: DialogContentProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref']);
  return (
    <DialogPortal>
      <DialogOverlay />
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <KobalteDialog.Content
          ref={local.ref}
          class={cn(
            'relative z-50 grid w-full max-w-2xl gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 rounded-lg',
            local.class
          )}
          {...others}
        >
          {local.children}
          <KobalteDialog.CloseButton class="absolute right-4 top-4 rounded-sm ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[expanded]:bg-muted data-[expanded]:text-muted-foreground touch-manipulation">
            <X class="h-6 w-6 text-muted-foreground" />
            <span class="sr-only">Close</span>
          </KobalteDialog.CloseButton>
        </KobalteDialog.Content>
      </div>
    </DialogPortal>
  );
}

interface DialogHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function DialogHeader(props: DialogHeaderProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div
      class={cn('flex flex-col space-y-1.5 text-center sm:text-left', local.class)}
      {...others}
    />
  );
}

interface DialogFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {}

function DialogFooter(props: DialogFooterProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div
      class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', local.class)}
      {...others}
    />
  );
}

interface DialogTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  ref?: HTMLHeadingElement | ((el: HTMLHeadingElement) => void);
}

function DialogTitle(props: DialogTitleProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteDialog.Title
      ref={local.ref}
      class={cn('text-lg font-semibold leading-none tracking-tight', local.class)}
      {...others}
    />
  );
}

interface DialogDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
  ref?: HTMLParagraphElement | ((el: HTMLParagraphElement) => void);
}

function DialogDescription(props: DialogDescriptionProps) {
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
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
