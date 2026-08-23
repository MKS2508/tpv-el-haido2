// src/components/ui/animated-number.tsx

import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { cn } from '@/lib/design-tokens';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
  duration?: number;
  class?: string;
}

/**
 * Displays a number that animates (count-up) when value changes.
 * Uses requestAnimationFrame + exponential-out easing to feel springy without
 * pulling in the motionone runtime (which would be a transitive dep).
 *
 * Usage:
 *   <AnimatedNumber value={order.total} suffix="€" />
 *
 * Rules applied:
 *   - tabular-nums prevents layout shift
 *   - prefers-reduced-motion falls back to no animation
 *   - rAF is cancelled on unmount or new value before completion
 */
export function AnimatedNumber(props: AnimatedNumberProps) {
  const [display, setDisplay] = createSignal(props.value);
  let prevValue = props.value;
  let rafId: number | null = null;

  const format = (n: number): string => {
    const formatted = new Intl.NumberFormat(props.locale ?? 'es-ES', {
      minimumFractionDigits: props.decimals ?? 2,
      maximumFractionDigits: props.decimals ?? 2,
    }).format(n);
    return `${props.prefix ?? ''}${formatted}${props.suffix ?? ''}`;
  };

  const cancelIfRunning = () => {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const animateTo = (next: number) => {
    cancelIfRunning();

    // Respect prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(next);
      prevValue = next;
      return;
    }

    if (typeof window === 'undefined') {
      setDisplay(next);
      prevValue = next;
      return;
    }

    const duration = props.duration ?? 600;
    const start = prevValue;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // exponential-out (motionone "ease-out-expo" feel without pulling the dep)
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      const current = start + (next - start) * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setDisplay(next);
        prevValue = next;
        rafId = null;
      }
    };

    rafId = window.requestAnimationFrame(step);
  };

  onMount(() => {
    prevValue = props.value;
    setDisplay(props.value);
  });

  onCleanup(() => {
    cancelIfRunning();
  });

  // React to prop changes
  createEffect(() => {
    if (props.value !== prevValue) {
      animateTo(props.value);
    }
  });

  return (
    <span
      class={cn('inline-flex items-baseline', 'font-mono tabular-nums tracking-tight', props.class)}
    >
      {format(display())}
    </span>
  );
}
