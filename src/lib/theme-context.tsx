'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import themesConfig from './themes.json';

// Define available themes based on the JSON configuration
export type ThemeColor = (typeof themesConfig.themes)[number]['value'];

// Theme metadata for UI display
export const themeData = themesConfig.themes as ThemeDefinition[];

// Theme definition interface
interface ThemeDefinition {
  value: string;
  label: string;
  description: string;
}

// Context type definition
interface ThemeContextType {
  colorTheme: ThemeColor;
  setColorTheme: (theme: ThemeColor) => void;
  themes: ThemeDefinition[];
  isLoaded: boolean;
  preloadTheme: (theme: ThemeColor) => void;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Inner theme provider component (for color themes)
function InnerThemeProvider({ children }: { children: React.ReactNode }) {
  // Track if the theme has been loaded from storage
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize with default theme first, will update after checking localStorage
  const [colorTheme, setColorThemeState] = useState<ThemeColor>('default');

  // Available themes from config
  const [availableThemes] = useState<ThemeDefinition[]>(themesConfig.themes);

  // Refs for optimization
  const isInitialLoad = useRef(true);
  const preloadedThemes = useRef<Set<string>>(new Set());

  // Check if theme is available
  const isThemeAvailable = useCallback(
    (theme: ThemeColor): boolean => {
      return availableThemes.some((t) => t.value === theme);
    },
    [availableThemes]
  );

  // Load theme from localStorage on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('color-theme');

      if (savedTheme && isThemeAvailable(savedTheme as ThemeColor)) {
        setColorThemeState(savedTheme as ThemeColor);
      } else {
        setColorThemeState('default');
      }

      // Mark theme as loaded from storage
      setIsLoaded(true);
      isInitialLoad.current = false;
    }
  }, [isThemeAvailable]);

  // Preload a theme (placeholder for future enhancement)
  const preloadTheme = useCallback((theme: ThemeColor) => {
    // Skip if already preloaded
    if (preloadedThemes.current.has(theme)) return;

    // Mark as preloaded
    preloadedThemes.current.add(theme);

    // Future: Add CSS preloading logic here
    console.log(`Preloading theme: ${theme}`);
  }, []);

  // Set the color theme and persist it
  const setColorTheme = useCallback(
    (theme: ThemeColor) => {
      if (!isThemeAvailable(theme)) {
        console.warn(`Theme "${theme}" is not available`);
        return;
      }

      try {
        // Update the theme state
        setColorThemeState(theme);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('color-theme', theme);
        }

        console.log(`🎨 Theme changed to: ${theme}`);
      } catch (error) {
        console.error(`Error setting theme: ${error}`);
      }
    },
    [isThemeAvailable]
  );

  // Apply the theme to the document whenever it changes
  useEffect(() => {
    if (typeof document !== 'undefined' && !isInitialLoad.current) {
      // Add optimized transition class temporarily
      const root = document.documentElement;
      root.classList.add('theme-transitioning');

      // Set the new theme data attribute
      root.setAttribute('data-theme', colorTheme);

      // Remove transition class after animation completes
      const timer = setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [colorTheme]);

  // Add event listener for storage events (when localStorage changes in another tab)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'color-theme' && event.newValue) {
        // Validate the theme before applying
        if (isThemeAvailable(event.newValue as ThemeColor)) {
          setColorTheme(event.newValue as ThemeColor);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isThemeAvailable, setColorTheme]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      colorTheme,
      setColorTheme,
      themes: availableThemes,
      isLoaded,
      preloadTheme,
    }),
    [colorTheme, setColorTheme, availableThemes, isLoaded, preloadTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Main theme provider component that includes next-themes
export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      enableColorScheme={false}
      storageKey="theme-mode"
    >
      <InnerThemeProvider>{children}</InnerThemeProvider>
    </NextThemesProvider>
  );
}

// Custom hook to use the theme context
export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }

  return context;
}

// Combined hook for both color theme and light/dark mode
export function useAppTheme() {
  const { colorTheme, setColorTheme, themes, isLoaded, preloadTheme } = useThemeContext();

  const { theme: mode, setTheme: setMode, resolvedTheme } = useNextTheme();

  return {
    colorTheme,
    setColorTheme,
    themes,
    mode,
    setMode,
    resolvedTheme,
    isLoaded,
    preloadTheme,
  };
}
