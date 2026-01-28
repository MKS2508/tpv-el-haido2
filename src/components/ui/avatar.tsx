import { Image as KobalteImage } from '@kobalte/core/image';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

interface AvatarProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  ref?: HTMLSpanElement | ((el: HTMLSpanElement) => void);
  fallbackDelay?: number;
}

function Avatar(props: AvatarProps) {
  const [local, others] = splitProps(props, ['class', 'ref', 'fallbackDelay']);
  return (
    <KobalteImage
      ref={local.ref}
      fallbackDelay={local.fallbackDelay}
      class={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', local.class)}
      {...others}
    />
  );
}

interface AvatarImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  ref?: HTMLImageElement | ((el: HTMLImageElement) => void);
}

function AvatarImage(props: AvatarImageProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteImage.Img
      ref={local.ref}
      class={cn('aspect-square h-full w-full', local.class)}
      {...others}
    />
  );
}

interface AvatarFallbackProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  ref?: HTMLSpanElement | ((el: HTMLSpanElement) => void);
}

function AvatarFallback(props: AvatarFallbackProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteImage.Fallback
      ref={local.ref}
      class={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        local.class
      )}
      {...others}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
