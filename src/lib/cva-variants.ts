// src/lib/cva-variants.ts — extensión sobre el Button.tsx actual
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './design-tokens';

export const posButtonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium select-none',
    'transition-[transform,background-color,border-color,color,box-shadow]',
    'duration-[var(--motion-fast)] ease-[var(--motion-out-quad)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'active:scale-[0.96]', // mifb #12 — exacto 0.96
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        // POS variants (M1)
        product: cn(
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 hover:shadow-[var(--glow-primary)]',
          'border border-primary/20',
          'min-h-[var(--hit-touch)] min-w-[var(--hit-touch)]',
          'rounded-md',
          'text-sm font-semibold'
        ),
        category: cn(
          'bg-surface text-foreground',
          'border border-border',
          'hover:bg-surface-elevated hover:border-foreground/20',
          'min-h-[var(--hit-desktop)] min-w-[var(--hit-desktop)]',
          'rounded-md',
          'text-sm font-medium'
        ),
        payment: cn(
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90',
          'min-h-[var(--hit-touch)]',
          'rounded-md',
          'text-base font-semibold',
          'shadow-sm hover:shadow-md'
        ),
        table: cn(
          'bg-surface text-foreground',
          'border border-border',
          'hover:bg-surface-elevated hover:border-primary/50',
          'data-[state=occupied]:bg-warning/15 data-[state=occupied]:text-warning',
          'data-[state=occupied]:border-warning/40',
          'min-h-[var(--hit-touch)]',
          'rounded-md',
          'text-sm font-medium'
        ),
        // Legacy (preservados del Button.tsx actual)
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-14 px-6 text-lg',
        icon: 'h-10 w-10',
        touch: 'h-12 min-w-12 px-4 text-base',
      },
      density: {
        compact: 'h-10 px-3 text-sm rounded-sm',
        comfortable: 'h-12 px-5 text-base rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export type PosButtonProps = VariantProps<typeof posButtonVariants>;
