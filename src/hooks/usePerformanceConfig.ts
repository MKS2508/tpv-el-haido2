import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

// Performance mode types
export type PerformanceMode = 'auto' | 'high' | 'balanced' | 'low';

// Storage key for performance settings
const PERFORMANCE_MODE_KEY = 'tpv-performance-mode';
const GLASS_EFFECT_KEY = 'tpv-glass-effect-enabled';

// Get stored performance mode
export function getStoredPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(PERFORMANCE_MODE_KEY);
  if (stored && ['auto', 'high', 'balanced', 'low'].includes(stored)) {
    return stored as PerformanceMode;
  }
  return 'auto';
}

// Set performance mode
export function setPerformanceMode(mode: PerformanceMode): void {
  localStorage.setItem(PERFORMANCE_MODE_KEY, mode);
  // Dispatch event for reactive updates
  window.dispatchEvent(new CustomEvent('performance-mode-changed', { detail: mode }));
}

// Get glass effect setting
export function isGlassEffectEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(GLASS_EFFECT_KEY);
  return stored !== 'false'; // Default to true
}

// Set glass effect setting
export function setGlassEffectEnabled(enabled: boolean): void {
  localStorage.setItem(GLASS_EFFECT_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent('glass-effect-changed', { detail: enabled }));
}

// Environment variable to force high performance mode (legacy support)
const FORCE_HIGH_PERFORMANCE = import.meta.env.VITE_FORCE_HIGH_PERFORMANCE === 'true';

// Browser API type extensions
interface NavigatorWithExtensions extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
}

interface PerformanceConfig {
  // Device detection
  isLowPerformance: boolean;
  isVeryLowPerformance: boolean;
  isRaspberryPi: boolean;
  isMobile: boolean;

  // Performance settings
  enableAnimations: boolean;
  enableHoverEffects: boolean;
  enableTransitions: boolean;
  reduceMotion: boolean;

  // Animation configurations
  animationDuration: number;
  transitionDuration: number;

  // Virtualization settings
  virtualizeThreshold: number;
  overscanCount: number;

  // Memory management
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;

  // CPU optimizations
  debounceDelay: number;
  throttleDelay: number;
}

// High performance config (used when VITE_FORCE_HIGH_PERFORMANCE=true)
const HIGH_PERFORMANCE_CONFIG: PerformanceConfig = {
  isLowPerformance: false,
  isVeryLowPerformance: false,
  isRaspberryPi: false,
  isMobile: false,
  enableAnimations: true,
  enableHoverEffects: true,
  enableTransitions: true,
  reduceMotion: false,
  animationDuration: 0.3,
  transitionDuration: 0.15,
  virtualizeThreshold: 25,
  overscanCount: 5,
  enableLazyLoading: false,
  enableImageOptimization: false,
  debounceDelay: 150,
  throttleDelay: 16,
};

// Low performance config
const LOW_PERFORMANCE_CONFIG: PerformanceConfig = {
  isLowPerformance: true,
  isVeryLowPerformance: false,
  isRaspberryPi: false,
  isMobile: false,
  enableAnimations: false,
  enableHoverEffects: false,
  enableTransitions: true,
  reduceMotion: true,
  animationDuration: 0.1,
  transitionDuration: 0.05,
  virtualizeThreshold: 10,
  overscanCount: 2,
  enableLazyLoading: true,
  enableImageOptimization: true,
  debounceDelay: 200,
  throttleDelay: 50,
};

// Balanced performance config
const BALANCED_PERFORMANCE_CONFIG: PerformanceConfig = {
  isLowPerformance: false,
  isVeryLowPerformance: false,
  isRaspberryPi: false,
  isMobile: false,
  enableAnimations: true,
  enableHoverEffects: true,
  enableTransitions: true,
  reduceMotion: false,
  animationDuration: 0.2,
  transitionDuration: 0.1,
  virtualizeThreshold: 15,
  overscanCount: 3,
  enableLazyLoading: false,
  enableImageOptimization: false,
  debounceDelay: 150,
  throttleDelay: 32,
};

export const usePerformanceConfig = (): PerformanceConfig => {
  const [memoryPressure, setMemoryPressure] = createSignal<'normal' | 'critical'>('normal');
  const [performanceMode, setPerformanceModeSignal] = createSignal<PerformanceMode>(
    getStoredPerformanceMode()
  );

  // Listen for performance mode changes
  onMount(() => {
    const handler = (e: CustomEvent<PerformanceMode>) => {
      setPerformanceModeSignal(e.detail);
    };
    window.addEventListener('performance-mode-changed', handler as EventListener);
    onCleanup(() =>
      window.removeEventListener('performance-mode-changed', handler as EventListener)
    );
  });

  // If forced high performance via env var, return early with optimal config
  if (FORCE_HIGH_PERFORMANCE) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Performance Configuration: FORCED HIGH PERFORMANCE MODE (VITE_FORCE_HIGH_PERFORMANCE=true)'
      );
    }
    return HIGH_PERFORMANCE_CONFIG;
  }

  // Check manual mode first (non-auto modes skip detection)
  const mode = performanceMode();
  if (mode === 'high') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Configuration: HIGH MODE (user setting)');
    }
    return HIGH_PERFORMANCE_CONFIG;
  }
  if (mode === 'low') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Configuration: LOW MODE (user setting)');
    }
    return LOW_PERFORMANCE_CONFIG;
  }
  if (mode === 'balanced') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Configuration: BALANCED MODE (user setting)');
    }
    return BALANCED_PERFORMANCE_CONFIG;
  }

  // Auto mode: detect device capabilities

  // Device detection con cleanup adecuado
  const deviceInfo = createMemo(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemoryRaw = (navigator as NavigatorWithExtensions).deviceMemory;
    const hasDeviceMemoryAPI = deviceMemoryRaw !== undefined;
    const deviceMemory = deviceMemoryRaw || 4;

    // Raspberry Pi detection - only detect by user agent
    const isRaspberryPi = /raspberry/i.test(userAgent) || /armv[67]/i.test(userAgent);

    // Mobile detection
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
      window.innerWidth <= 768;

    // Very low: only Raspberry Pi or single-core with <1GB confirmed
    const isVeryLowPerformance =
      isRaspberryPi || (hardwareConcurrency === 1 && hasDeviceMemoryAPI && deviceMemory < 1);

    // Low performance: only truly constrained devices
    // Removed deviceMemory < 2 check as Chrome often misreports this
    const isLowPerformance = isVeryLowPerformance || isRaspberryPi;

    if (process.env.NODE_ENV === 'development') {
      console.log('Device Detection:', {
        hardwareConcurrency,
        deviceMemory: hasDeviceMemoryAPI ? deviceMemory : 'N/A',
        hasDeviceMemoryAPI,
        isRaspberryPi,
        isMobile,
        isLowPerformance,
        isVeryLowPerformance,
      });
    }

    return {
      isRaspberryPi,
      isMobile,
      isLowPerformance,
      isVeryLowPerformance,
      hardwareConcurrency,
      deviceMemory,
    };
  });

  // Memory pressure detection - only check actual heap usage, not long tasks
  onMount(() => {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as PerformanceWithMemory).memory!;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;

      // Only trigger critical at 90% (was 80%)
      if (memoryUsage > 0.9) {
        setMemoryPressure('critical');
      } else {
        setMemoryPressure('normal');
      }
    };

    const memoryInterval = setInterval(checkMemory, 30000);
    checkMemory();

    onCleanup(() => clearInterval(memoryInterval));
  });

  // Network-based performance adjustments
  const [networkSpeed, setNetworkSpeed] = createSignal<'slow' | 'fast'>('fast');

  onMount(() => {
    const connection =
      (navigator as NavigatorWithExtensions).connection ||
      (navigator as NavigatorWithExtensions).mozConnection ||
      (navigator as NavigatorWithExtensions).webkitConnection;

    if (connection) {
      const updateNetworkInfo = () => {
        const effectiveType = connection.effectiveType;
        setNetworkSpeed(['slow-2g', '2g'].includes(effectiveType) ? 'slow' : 'fast');
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  });

  // Prefers-reduced-motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(false);

  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  });

  // Generate performance configuration
  const performanceConfig = createMemo(() => {
    const { isRaspberryPi, isMobile, isLowPerformance, isVeryLowPerformance } = deviceInfo();

    const isNetworkConstrained = networkSpeed() === 'slow';
    // Note: memoryPressure is monitored but not currently used for performance decisions
    // as it gives too many false positives on normal devices

    const config: PerformanceConfig = {
      isLowPerformance,
      isVeryLowPerformance,
      isRaspberryPi,
      isMobile,

      // Note: Memory pressure is ignored for animations as it gives too many false positives
      enableAnimations: !isVeryLowPerformance && !prefersReducedMotion(),
      enableHoverEffects: !isVeryLowPerformance && !isMobile,
      enableTransitions: !isVeryLowPerformance,
      reduceMotion: prefersReducedMotion() || isVeryLowPerformance,

      animationDuration: isVeryLowPerformance ? 0.1 : isLowPerformance ? 0.2 : 0.3,
      transitionDuration: isVeryLowPerformance ? 0.05 : isLowPerformance ? 0.1 : 0.15,

      virtualizeThreshold: isVeryLowPerformance ? 5 : isLowPerformance ? 10 : 25,
      overscanCount: isVeryLowPerformance ? 1 : isLowPerformance ? 2 : 5,

      enableLazyLoading: isLowPerformance || isNetworkConstrained,
      enableImageOptimization: isLowPerformance || isNetworkConstrained,

      debounceDelay: isVeryLowPerformance ? 300 : isLowPerformance ? 200 : 150,
      throttleDelay: isVeryLowPerformance ? 100 : isLowPerformance ? 50 : 16,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Configuration:', {
        device: isRaspberryPi ? 'Raspberry Pi' : isMobile ? 'Mobile' : 'Desktop',
        performance: isVeryLowPerformance ? 'Very Low' : isLowPerformance ? 'Low' : 'Normal',
        memory: memoryPressure(),
        network: networkSpeed(),
        config,
      });
    }

    return config;
  });

  return performanceConfig as unknown as PerformanceConfig;
};

// Hook para aplicar clases CSS basadas en performance
export const usePerformanceClasses = () => {
  const config = usePerformanceConfig();

  const classes = createMemo(() => ({
    'reduced-motion': config.reduceMotion,
    'low-performance': config.isLowPerformance,
    'very-low-performance': config.isVeryLowPerformance,
    'raspberry-pi': config.isRaspberryPi,
    'mobile-device': config.isMobile,
    'animations-disabled': !config.enableAnimations,
    'hover-disabled': !config.enableHoverEffects,
  }));

  return classes;
};

export default usePerformanceConfig;
