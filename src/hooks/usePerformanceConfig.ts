import { useEffect, useMemo, useState } from 'react';

// Environment variable to force high performance mode
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

export const usePerformanceConfig = (): PerformanceConfig => {
  const [memoryPressure, setMemoryPressure] = useState<'normal' | 'critical'>('normal');

  // If forced high performance, return early with optimal config
  if (FORCE_HIGH_PERFORMANCE) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Configuration: FORCED HIGH PERFORMANCE MODE (VITE_FORCE_HIGH_PERFORMANCE=true)');
    }
    return HIGH_PERFORMANCE_CONFIG;
  }

  // Device detection con cleanup adecuado
  const deviceInfo = useMemo(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemoryRaw = (navigator as NavigatorWithExtensions).deviceMemory;
    const hasDeviceMemoryAPI = deviceMemoryRaw !== undefined;
    const deviceMemory = deviceMemoryRaw || 4;

    // Raspberry Pi detection - only detect by user agent
    const isRaspberryPi =
      /raspberry/i.test(userAgent) ||
      /armv[67]/i.test(userAgent);

    // Mobile detection
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
      window.innerWidth <= 768;

    // Very low: only Raspberry Pi or single-core with <1GB confirmed
    const isVeryLowPerformance =
      isRaspberryPi ||
      (hardwareConcurrency === 1 && hasDeviceMemoryAPI && deviceMemory < 1);

    // Low performance: only truly constrained devices
    // Removed deviceMemory < 2 check as Chrome often misreports this
    const isLowPerformance =
      isVeryLowPerformance ||
      isRaspberryPi;

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
  }, []);

  // Memory pressure detection - only check actual heap usage, not long tasks
  useEffect(() => {
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

    return () => clearInterval(memoryInterval);
  }, []);

  // Network-based performance adjustments
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'fast'>('fast');

  useEffect(() => {
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
  }, []);

  // Prefers-reduced-motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
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
  }, []);

  // Generate performance configuration
  const performanceConfig = useMemo((): PerformanceConfig => {
    const { isRaspberryPi, isMobile, isLowPerformance, isVeryLowPerformance } = deviceInfo;

    const isNetworkConstrained = networkSpeed === 'slow';
    // Note: memoryPressure is monitored but not currently used for performance decisions
    // as it gives too many false positives on normal devices

    const config: PerformanceConfig = {
      isLowPerformance,
      isVeryLowPerformance,
      isRaspberryPi,
      isMobile,

      // Note: Memory pressure is ignored for animations as it gives too many false positives
      enableAnimations: !isVeryLowPerformance && !prefersReducedMotion,
      enableHoverEffects: !isVeryLowPerformance && !isMobile,
      enableTransitions: !isVeryLowPerformance,
      reduceMotion: prefersReducedMotion || isVeryLowPerformance,

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
        memory: memoryPressure,
        network: networkSpeed,
        config,
      });
    }

    return config;
  }, [deviceInfo, memoryPressure, networkSpeed, prefersReducedMotion]);

  return performanceConfig;
};

// Hook para aplicar clases CSS basadas en performance
export const usePerformanceClasses = () => {
  const config = usePerformanceConfig();

  return useMemo(
    () => ({
      'reduced-motion': config.reduceMotion,
      'low-performance': config.isLowPerformance,
      'very-low-performance': config.isVeryLowPerformance,
      'raspberry-pi': config.isRaspberryPi,
      'mobile-device': config.isMobile,
      'animations-disabled': !config.enableAnimations,
      'hover-disabled': !config.enableHoverEffects,
    }),
    [config]
  );
};

export default usePerformanceConfig;
