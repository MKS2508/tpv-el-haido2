import { Motion } from '@motionone/solid';
import { createSignal, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { isGlassEffectEnabled, usePerformanceConfig } from '@/hooks/usePerformanceConfig';
import { cn } from '@/lib/utils';
import GlassEffect from './GlassEffect';

interface GlassContainerProps {
  children: JSX.Element;
  class?: string;
  /** Fixed dimensions for advanced glass effect (required for GlassEffect mode) */
  width?: number;
  height?: number;
  /** Border radius in pixels */
  radius?: number;
  /** Additional inline styles */
  style?: JSX.CSSProperties;
  /** Force a specific mode regardless of settings */
  forceMode?: 'advanced' | 'simple' | 'none';
  /** Animation settings */
  animate?: boolean;
  animationDelay?: number;
}

/**
 * GlassContainer - Adaptive glass effect component
 *
 * Renders different glass effects based on performance settings:
 * - Advanced (GlassEffect): Full SVG filter-based liquid glass with chromatic aberration
 * - Simple: CSS backdrop-blur with semi-transparent background
 * - None: Solid background without effects
 */
const GlassContainer = (props: GlassContainerProps) => {
  const perfConfig = usePerformanceConfig();
  const [glassEnabled, setGlassEnabled] = createSignal(isGlassEffectEnabled());

  // Listen for glass effect setting changes
  onMount(() => {
    const handler = (e: CustomEvent<boolean>) => {
      setGlassEnabled(e.detail);
    };
    window.addEventListener('glass-effect-changed', handler as EventListener);
    onCleanup(() => window.removeEventListener('glass-effect-changed', handler as EventListener));
  });

  // Determine which mode to use
  const getMode = (): 'advanced' | 'simple' | 'none' => {
    if (props.forceMode) return props.forceMode;

    if (!glassEnabled()) return 'none';

    // Advanced mode: high performance with animations enabled and fixed dimensions provided
    if (
      !perfConfig.isLowPerformance &&
      perfConfig.enableAnimations &&
      props.width &&
      props.height
    ) {
      return 'advanced';
    }

    // Simple mode: backdrop-blur for moderate performance
    if (!perfConfig.isVeryLowPerformance) {
      return 'simple';
    }

    // No effects for very low performance
    return 'none';
  };

  const baseClasses = 'relative overflow-hidden';
  const shouldAnimate = () => props.animate !== false && perfConfig.enableAnimations;

  return (
    <Show
      when={getMode() === 'advanced'}
      fallback={
        <Show
          when={getMode() === 'simple'}
          fallback={
            // None mode: solid background
            <Motion.div
              class={cn(baseClasses, 'bg-card border border-border shadow-lg', props.class)}
              style={{
                'border-radius': props.radius ? `${props.radius}px` : '1.5rem',
                ...props.style,
              }}
              initial={shouldAnimate() ? { opacity: 0, scale: 0.95 } : undefined}
              animate={shouldAnimate() ? { opacity: 1, scale: 1 } : undefined}
              transition={
                shouldAnimate()
                  ? {
                      duration: perfConfig.animationDuration,
                      delay: props.animationDelay ?? 0,
                    }
                  : undefined
              }
            >
              {props.children}
            </Motion.div>
          }
        >
          {/* Simple mode: CSS backdrop-blur */}
          <Motion.div
            class={cn(
              baseClasses,
              'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl',
              'border border-white/20 dark:border-gray-700/30 shadow-2xl',
              props.class
            )}
            style={{
              'border-radius': props.radius ? `${props.radius}px` : '1.5rem',
              ...props.style,
            }}
            initial={shouldAnimate() ? { opacity: 0, scale: 0.95, y: 20 } : undefined}
            animate={shouldAnimate() ? { opacity: 1, scale: 1, y: 0 } : undefined}
            transition={
              shouldAnimate()
                ? {
                    duration: perfConfig.animationDuration,
                    delay: props.animationDelay ?? 0,
                    easing: [0.4, 0, 0.2, 1],
                  }
                : undefined
            }
          >
            {props.children}
          </Motion.div>
        </Show>
      }
    >
      {/* Advanced mode: Full GlassEffect */}
      <GlassEffect
        width={props.width!}
        height={props.height!}
        radius={props.radius ?? 24}
        class={props.class}
        frost={0.15}
        blur={12}
        alpha={0.85}
        lightness={50}
        scale={-120}
        displace={0.3}
      >
        {props.children}
      </GlassEffect>
    </Show>
  );
};

export default GlassContainer;
export { GlassContainer };
