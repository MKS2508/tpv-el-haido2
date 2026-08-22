/**
 * StepContainer — wrapper compartido por los 7 steps del wizard.
 *
 * TR-19.A: creado vacío (solo Card + max-width). TR-19.C expandirá con
 * navegación (prev/next buttons), progress indicator, y transiciones.
 *
 * Reusa `<Card>` del TPV (zero design system paralelo).
 */

import type { JSX } from 'solid-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InstallStep } from '../contracts';

interface StepContainerProps {
  step: InstallStep;
  /** Título del step (ya localizado por el caller) */
  title: string;
  /** Contenido del step */
  children: JSX.Element;
  /** Footer opcional (típicamente botones prev/next) */
  footer?: JSX.Element;
  class?: string;
}

export function StepContainer(props: StepContainerProps) {
  return (
    <div
      class={cn(
        'min-h-screen flex items-center justify-center bg-background text-foreground p-6',
        props.class
      )}
      data-step={props.step}
    >
      <Card class="w-full max-w-[640px]">
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">{props.children}</CardContent>
        {props.footer}
      </Card>
    </div>
  );
}

export default StepContainer;
