import { useEffect, useMemo, useState } from 'react';

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

export const usePerformanceConfig = (): PerformanceConfig => {
  const [memoryPressure, setMemoryPressure] = useState<'normal' | 'critical'>('normal');

  // Device detection con cleanup adecuado
  const deviceInfo = useMemo(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const deviceMemory = (navigator as any).deviceMemory || 1; // GB, Chrome only

    // Raspberry Pi detection
    const isRaspberryPi =
      /raspberry/i.test(userAgent) ||
      /armv/i.test(userAgent) ||
      (hardwareConcurrency <= 4 && deviceMemory <= 1);

    // Mobile detection
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
      window.innerWidth <= 768;

    // Performance tiers
    const isVeryLowPerformance = isRaspberryPi || hardwareConcurrency <= 1 || deviceMemory < 1;

    const isLowPerformance =
      isVeryLowPerformance || hardwareConcurrency <= 2 || deviceMemory <= 2 || isMobile;

    return {
      isRaspberryPi,
      isMobile,
      isLowPerformance,
      isVeryLowPerformance,
      hardwareConcurrency,
      deviceMemory,
    };
  }, []);

  // Memory pressure detection con cleanup
  useEffect(() => {
    // let memoryObserver: any = null;
    let performanceObserver: PerformanceObserver | null = null;

    // Memory API (Chrome only)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;

        if (memoryUsage > 0.8) {
          setMemoryPressure('critical');
        } else {
          setMemoryPressure('normal');
        }
      };

      // Check memory every 30 seconds
      const memoryInterval = setInterval(checkMemory, 30000);
      checkMemory(); // Initial check

      return () => clearInterval(memoryInterval);
    }

    // Performance Observer para long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        performanceObserver = new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          if (longTasks.length > 0) {
            console.warn('Long tasks detected, reducing performance');
            setMemoryPressure('critical');
          }
        });

        performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (_error) {
        // PerformanceObserver not supported
        console.warn('PerformanceObserver not supported');
      }
    }

    // Cleanup
    return () => {
      if (performanceObserver) {
        performanceObserver.disconnect();
      }
    };
  }, []);

  // Network-based performance adjustments
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'fast'>('fast');

  useEffect(() => {
    // Network Information API con cleanup
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      const updateNetworkInfo = () => {
        const effectiveType = connection.effectiveType;
        setNetworkSpeed(['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast');
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Prefers-reduced-motion detection con cleanup
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);

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
  }, []);

  // Generate performance configuration
  const performanceConfig = useMemo((): PerformanceConfig => {
    const { isRaspberryPi, isMobile, isLowPerformance, isVeryLowPerformance } = deviceInfo;

    const isMemoryConstrained = memoryPressure === 'critical';
    const isNetworkConstrained = networkSpeed === 'slow';

    // Base configuration
    const config: PerformanceConfig = {
      // Device info
      isLowPerformance,
      isVeryLowPerformance,
      isRaspberryPi,
      isMobile,

      // Animation settings
      enableAnimations: !isVeryLowPerformance && !prefersReducedMotion && !isMemoryConstrained,
      enableHoverEffects: !isLowPerformance && !isMobile && !isMemoryConstrained,
      enableTransitions: !isVeryLowPerformance && !isMemoryConstrained,
      reduceMotion: prefersReducedMotion || isVeryLowPerformance || isMemoryConstrained,

      // Timing settings
      animationDuration: isVeryLowPerformance ? 0.1 : isLowPerformance ? 0.2 : 0.3,
      transitionDuration: isVeryLowPerformance ? 0.05 : isLowPerformance ? 0.1 : 0.15,

      // Virtualization settings
      virtualizeThreshold: isVeryLowPerformance ? 5 : isLowPerformance ? 10 : 25,
      overscanCount: isVeryLowPerformance ? 1 : isLowPerformance ? 2 : 5,

      // Feature toggles
      enableLazyLoading: isLowPerformance || isNetworkConstrained,
      enableImageOptimization: isLowPerformance || isNetworkConstrained,

      // Timing optimizations
      debounceDelay: isVeryLowPerformance ? 300 : isLowPerformance ? 200 : 150,
      throttleDelay: isVeryLowPerformance ? 100 : isLowPerformance ? 50 : 16,
    };

    // Log performance config para debugging
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
