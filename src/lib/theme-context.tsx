/**
 * Theme Context - SolidJS integration for @mks2508/shadcn-basecoat-theme-manager
 *
 * The core theme manager is framework-agnostic (vanilla TypeScript).
 * This file provides SolidJS-friendly wrappers.
 */

import { ThemeCore, type ThemeCoreInstance } from '@mks2508/shadcn-basecoat-theme-manager';
import type { JSX } from 'solid-js';
import { type Accessor, createContext, createSignal, onMount, useContext } from 'solid-js';

// ==================== Types ====================

interface ThemeContextValue {
  themeCore: Accessor<ThemeCoreInstance | null>;
  isReady: Accessor<boolean>;
}

// ==================== Context ====================

const ThemeContext = createContext<ThemeContextValue>();

// ==================== Provider ====================

interface ThemeProviderProps {
  children: JSX.Element;
}

export function ThemeProvider(props: ThemeProviderProps) {
  const [themeCore, setThemeCore] = createSignal<ThemeCoreInstance | null>(ThemeCore.getInstance());
  const [isReady, setIsReady] = createSignal(ThemeCore.getInstance() !== null);

  // Wait for ThemeCore (already eagerly initialized in main.tsx)
  onMount(async () => {
    if (isReady()) return;
    const instance = await ThemeCore.waitForReady();
    setThemeCore(() => instance);
    setIsReady(true);
  });

  const contextValue: ThemeContextValue = {
    themeCore,
    isReady,
  };

  return <ThemeContext.Provider value={contextValue}>{props.children}</ThemeContext.Provider>;
}

// ==================== Hooks ====================

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Main hook for theme management
 */
export function useAppTheme() {
  const { themeCore, isReady } = useThemeContext();

  const currentTheme = () => themeCore()?.themeManager.getCurrentTheme() || '';
  const currentMode = () => themeCore()?.themeManager.getCurrentMode() || 'auto';
  const effectiveMode = () => themeCore()?.themeManager.getEffectiveMode() || 'light';
  const availableThemes = () => themeCore()?.themeManager.getAvailableThemes() || [];

  const setTheme = async (theme: string, mode?: 'light' | 'dark' | 'auto') => {
    const instance = themeCore();
    if (instance) {
      await instance.themeManager.setTheme(theme, mode);
    }
  };

  const toggleMode = async () => {
    const instance = themeCore();
    if (instance) {
      await instance.themeManager.toggleMode();
    }
  };

  return {
    // State
    isReady,
    currentTheme,
    currentMode,
    effectiveMode,
    availableThemes,

    // Actions
    setTheme,
    toggleMode,

    // Managers
    themeManager: () => themeCore()?.themeManager,
    fontManager: () => themeCore()?.fontManager,
    themeInstaller: () => themeCore()?.themeInstaller,
  };
}

// Alias for compatibility
export const useTheme = useAppTheme;
