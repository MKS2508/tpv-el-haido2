import { createMemo, createEffect, createSignal, onCleanup } from 'solid-js';

export type BreakpointSize =
  | 'mobile'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'largeDesktop'
  | 'ultraWide';

interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isUltraWide: boolean;
  breakpoint: BreakpointSize;
  isTouch: boolean;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  largeDesktop: 1536,
  ultraWide: 1920,
} as const;

export function useResponsive(): ResponsiveState {
  const [state, setState] = createSignal<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isTouch =
      typeof window !== 'undefined'
        ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
        : false;

    return {
      width,
      height,
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isLaptop: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop,
      isDesktop: width >= BREAKPOINTS.laptop && width < BREAKPOINTS.desktop,
      isLargeDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop,
      isUltraWide: width >= BREAKPOINTS.ultraWide,
      breakpoint: getBreakpoint(width),
      isTouch,
    };
  });

  // Helper function para actualizar estado - memoizada
  const updateState = useCallback((width: number, height: number) => {
    setState({
      width,
      height,
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isLaptop: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop,
      isDesktop: width >= BREAKPOINTS.laptop && width < BREAKPOINTS.desktop,
      isLargeDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop,
      isUltraWide: width >= BREAKPOINTS.ultraWide,
      breakpoint: getBreakpoint(width),
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    });
  }, []);

  createEffect(() => {
    // Cleanup refs para mejor cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const debouncedHandleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (isMounted) {
          // Evitar updates en componente desmontado
          const width = window.innerWidth;
          const height = window.innerHeight;
          updateState(width, height);
        }
      }, 150); // 150ms debounce delay
    };

    // Throttled handler para mejor performance
    let lastResize = 0;
    const handleResize = () => {
      const now = Date.now();
      if (now - lastResize < 16) return; // ~60fps throttle
      lastResize = now;
      debouncedHandleResize();
    };

    // Add event listener con passive true para mejor performance
    window.addEventListener('resize', handleResize, { passive: true });

    // Set initial state immediately (sin debounce)
    if (isMounted && typeof window !== 'undefined') {
      const initialWidth = window.innerWidth;
      const initialHeight = window.innerHeight;
      updateState(initialWidth, initialHeight);
    }

    onCleanup(() => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });
  }); // Dependencia del callback memoizado

  return state();
}

function getBreakpoint(width: number): BreakpointSize {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.laptop) return 'laptop';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  if (width < BREAKPOINTS.largeDesktop) return 'largeDesktop';
  return 'ultraWide';
}

// Utility hook for checking specific breakpoints
export function useBreakpoint(breakpoint: BreakpointSize): boolean {
  const { breakpoint: currentBreakpoint } = useResponsive();

  const breakpointOrder: BreakpointSize[] = [
    'mobile',
    'tablet',
    'laptop',
    'desktop',
    'largeDesktop',
    'ultraWide',
  ];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(breakpoint);

  return currentIndex >= targetIndex;
}

// Utility hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = createSignal(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  createEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  });

  return matches();
}
