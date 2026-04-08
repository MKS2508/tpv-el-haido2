import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '../../lib/utils';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <div
      ref={local.ref}
      class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', local.class)}
      {...others}
    />
  );
}

function CardHeader(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <div ref={local.ref} class={cn('flex flex-col space-y-1.5 p-6', local.class)} {...others} />
  );
}

export interface CardTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  ref?: HTMLHeadingElement | ((el: HTMLHeadingElement) => void);
}

function CardTitle(props: CardTitleProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <h3
      ref={local.ref}
      class={cn('text-2xl font-semibold leading-none tracking-tight', local.class)}
      {...others}
    />
  );
}

export interface CardDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
  ref?: HTMLParagraphElement | ((el: HTMLParagraphElement) => void);
}

function CardDescription(props: CardDescriptionProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <p ref={local.ref} class={cn('text-sm text-muted-foreground', local.class)} {...others} />;
}

function CardContent(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <div ref={local.ref} class={cn('p-6 pt-0', local.class)} {...others} />;
}

function CardFooter(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <div ref={local.ref} class={cn('flex items-center p-6 pt-0', local.class)} {...others} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
