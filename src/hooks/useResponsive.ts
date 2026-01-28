import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

export type BreakpointSize =
  | 'mobile'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'largeDesktop'
  | 'ultraWide';

interface ResponsiveGetters {
  width: Accessor<number>;
  height: Accessor<number>;
  isMobile: Accessor<boolean>;
  isTablet: Accessor<boolean>;
  isLaptop: Accessor<boolean>;
  isDesktop: Accessor<boolean>;
  isLargeDesktop: Accessor<boolean>;
  isUltraWide: Accessor<boolean>;
  breakpoint: Accessor<BreakpointSize>;
  isTouch: Accessor<boolean>;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  largeDesktop: 1536,
  ultraWide: 1920,
} as const;

function getBreakpoint(width: number): BreakpointSize {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.laptop) return 'laptop';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  if (width < BREAKPOINTS.largeDesktop) return 'largeDesktop';
  return 'ultraWide';
}

function getInitialWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1024;
}

function getInitialHeight(): number {
  return typeof window !== 'undefined' ? window.innerHeight : 768;
}

function getIsTouch(): boolean {
  return typeof window !== 'undefined'
    ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
    : false;
}

export function useResponsive(): ResponsiveGetters {
  const [width, setWidth] = createSignal(getInitialWidth());
  const [height, setHeight] = createSignal(getInitialHeight());
  const [isTouch, setIsTouch] = createSignal(getIsTouch());

  // Derived/computed values using createMemo
  const isMobile = createMemo(() => width() < BREAKPOINTS.mobile);
  const isTablet = createMemo(() => width() >= BREAKPOINTS.mobile && width() < BREAKPOINTS.tablet);
  const isLaptop = createMemo(() => width() >= BREAKPOINTS.tablet && width() < BREAKPOINTS.laptop);
  const isDesktop = createMemo(
    () => width() >= BREAKPOINTS.laptop && width() < BREAKPOINTS.desktop
  );
  const isLargeDesktop = createMemo(
    () => width() >= BREAKPOINTS.desktop && width() < BREAKPOINTS.largeDesktop
  );
  const isUltraWide = createMemo(() => width() >= BREAKPOINTS.ultraWide);
  const breakpoint = createMemo(() => getBreakpoint(width()));

  createEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastResize = 0;

    const debouncedHandleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
        setHeight(window.innerHeight);
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
      }, 150);
    };

    const handleResize = () => {
      const now = Date.now();
      if (now - lastResize < 16) return; // ~60fps throttle
      lastResize = now;
      debouncedHandleResize();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Set initial state
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
  });

  return {
    width,
    height,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isLargeDesktop,
    isUltraWide,
    breakpoint,
    isTouch,
  };
}

// Utility function for checking specific breakpoints
export function useBreakpoint(breakpoint: BreakpointSize): Accessor<boolean> {
  const responsive = useResponsive();

  const breakpointOrder: BreakpointSize[] = [
    'mobile',
    'tablet',
    'laptop',
    'desktop',
    'largeDesktop',
    'ultraWide',
  ];

  const result = createMemo(() => {
    const currentBreakpoint = responsive.breakpoint();
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  });
  return result;
}

// Utility function for media queries
export function useMediaQuery(query: string): Accessor<boolean> {
  const [matches, setMatches] = createSignal(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  createEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
    }

    onCleanup(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    });
  });

  return matches;
}
