'use client';

import { Check, ChevronDown, Loader2, Monitor, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ThemeColor } from '@/lib/theme-context';
import { useAppTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const {
    colorTheme,
    setColorTheme,
    themes,
    mode,
    setMode,
    resolvedTheme,
    isLoaded,
    preloadTheme,
  } = useAppTheme();

  const [useSystemPreference, setUseSystemPreference] = useState(mode === 'system');
  const [previousMode, setPreviousMode] = useState<'light' | 'dark'>(
    (resolvedTheme as 'light' | 'dark') || 'dark'
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [isChanging, setIsChanging] = useState(false);

  // Refs for optimization
  const changeTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isInitialRender = useRef(true);

  // Memoize themes to prevent unnecessary re-renders
  const memoizedThemes = useMemo(() => themes, [themes]);

  // Toggle between light and dark mode with optimized animation
  const toggleMode = useCallback(() => {
    if (isChanging) return;

    setIsChanging(true);

    // Clear any existing timer
    if (changeTimer.current) {
      clearTimeout(changeTimer.current);
    }

    // Apply the change immediately
    if (useSystemPreference) {
      // If using system preference, disable it first
      setUseSystemPreference(false);
      setMode?.(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setMode?.(mode === 'dark' ? 'light' : 'dark');
    }

    // Reset changing state after a short delay
    changeTimer.current = setTimeout(() => {
      setIsChanging(false);
    }, 250);
  }, [isChanging, useSystemPreference, resolvedTheme, mode, setMode]);

  // Handle system preference toggle
  const handleSystemPreferenceToggle = useCallback(() => {
    if (isChanging) return;

    setIsChanging(true);

    // Clear any existing timer
    if (changeTimer.current) {
      clearTimeout(changeTimer.current);
    }

    const newUseSystemPreference = !useSystemPreference;

    // Apply the change immediately
    setUseSystemPreference(newUseSystemPreference);

    if (newUseSystemPreference) {
      // Save current mode before switching to system
      if (mode !== 'system') {
        setPreviousMode(mode as 'light' | 'dark');
      }
      setMode?.('system');
    } else {
      // Restore previous mode
      setMode?.(previousMode);
    }

    // Reset changing state after a short delay
    changeTimer.current = setTimeout(() => {
      setIsChanging(false);
    }, 250);
  }, [isChanging, useSystemPreference, mode, previousMode, setMode]);

  // Handle theme change with optimized animation
  const handleThemeChange = useCallback(
    (theme: ThemeColor) => {
      if (isChanging) return;

      setIsChanging(true);
      setDropdownOpen(false);

      // Clear any existing timer
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }

      // Apply the change immediately
      setColorTheme(theme);

      // Reset changing state after a short delay
      changeTimer.current = setTimeout(() => {
        setIsChanging(false);
      }, 250);
    },
    [isChanging, setColorTheme]
  );

  // Preload theme on hover
  const handleThemeHover = useCallback(
    (theme: ThemeColor) => {
      // Skip if it's the current theme
      if (theme === colorTheme) return;

      // Clear any existing timeout for this theme
      if (hoverTimeouts.current.has(theme)) {
        clearTimeout(hoverTimeouts.current.get(theme)!);
        hoverTimeouts.current.delete(theme);
      }

      // Set a new timeout to preload after a short delay
      const timeout = setTimeout(() => {
        preloadTheme(theme);
        hoverTimeouts.current.delete(theme);
      }, 100); // Short delay to prevent unnecessary preloads

      hoverTimeouts.current.set(theme, timeout);
    },
    [colorTheme, preloadTheme]
  );

  // Update previous mode when mode changes
  useEffect(() => {
    if (mode !== 'system') {
      setPreviousMode(mode as 'light' | 'dark');
    }
  }, [mode]);

  // Save mode preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialRender.current) {
      localStorage.setItem('theme-mode', mode || '');
    }
  }, [mode]);

  // Mark initial render complete
  useEffect(() => {
    isInitialRender.current = false;

    // Cleanup on unmount
    return () => {
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }

      // Clear all hover timeouts
      hoverTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      hoverTimeouts.current.clear();
    };
  }, []);

  // If theme is still loading, show a loading indicator
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled className="h-10 w-10">
          <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
        </Button>
        <Button variant="outline" disabled className="flex items-center gap-2">
          <span>Cargando tema...</span>
        </Button>
      </div>
    );
  }

  // Determine which icon to show
  const themeIcon = useSystemPreference ? (
    <Monitor className="h-[1.2rem] w-[1.2rem]" />
  ) : mode === 'dark' ? (
    <Moon className="h-[1.2rem] w-[1.2rem]" />
  ) : (
    <Sun className="h-[1.2rem] w-[1.2rem]" />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Light/Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="h-10 w-10 relative overflow-hidden transition-all duration-300"
          disabled={isChanging}
          title={
            useSystemPreference
              ? 'Usando preferencia del sistema'
              : mode === 'dark'
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro'
          }
        >
          <div className="absolute inset-0 flex items-center justify-center">{themeIcon}</div>
          <span className="sr-only">Alternar tema</span>
        </Button>

        {/* System Preference Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSystemPreferenceToggle}
          className={cn(
            'transition-all duration-300',
            useSystemPreference && 'bg-accent text-accent-foreground'
          )}
          disabled={isChanging}
          title="Alternar preferencia del sistema"
        >
          Sistema
        </Button>

        {/* Color Theme Dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 relative overflow-hidden transition-all duration-300"
              disabled={isChanging}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1 transition-all duration-300"
                  style={{
                    background: `hsl(var(--primary))`,
                    boxShadow: '0 0 0 1px hsl(var(--border))',
                  }}
                />
                <span>
                  {memoizedThemes.find((t) => t.value === colorTheme)?.label || 'Default'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>Temas de Color</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Theme options */}
            <div className="max-h-[300px] overflow-auto py-1">
              {memoizedThemes.map((theme) => (
                <DropdownMenuItem
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value as ThemeColor)}
                  onMouseEnter={() => handleThemeHover(theme.value as ThemeColor)}
                  className={cn(
                    'flex items-center justify-between transition-all duration-200',
                    colorTheme === theme.value && 'font-medium bg-accent'
                  )}
                  disabled={isChanging}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full transition-all duration-200"
                        style={{
                          background:
                            theme.value === colorTheme
                              ? `hsl(var(--primary))`
                              : `hsl(var(--muted))`,
                          boxShadow: '0 0 0 1px hsl(var(--border))',
                        }}
                      />
                      <span>{theme.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-5">{theme.description}</span>
                  </div>
                  {colorTheme === theme.value && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
