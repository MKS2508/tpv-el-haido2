import { createEffect, createSignal } from 'solid-js';
import { getThemeById } from '@/lib/themes/preset-themes';
import {
  applyTheme,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeSettings,
} from '@/lib/themes/theme-config';

export function useTheme() {
  const [settings, setSettings] = createSignal<ThemeSettings>(loadThemeSettings());

  // Apply theme when settings change
  createEffect(() => {
    const currentSettings = settings();
    const theme = getThemeById(currentSettings.currentTheme);
    if (theme) {
      applyTheme(theme, currentSettings.darkMode);

      // Update documentElement class for dark mode
      if (currentSettings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Update touch mode
      const root = document.documentElement;
      if (currentSettings.touchMode) {
        root.classList.add('touch-mode');
      } else {
        root.classList.remove('touch-mode');
      }
    }

    // Save settings
    saveThemeSettings(currentSettings);
  });

  const setTheme = (themeId: string) => {
    setSettings((prev) => ({
      ...prev,
      currentTheme: themeId,
    }));
  };

  const toggleDarkMode = () => {
    setSettings((prev) => ({
      ...prev,
      darkMode: !prev.darkMode,
    }));
  };

  const toggleTouchMode = () => {
    setSettings((prev) => ({
      ...prev,
      touchMode: !prev.touchMode,
    }));
  };

  const setFontSize = (fontSize: ThemeSettings['fontSize']) => {
    setSettings((prev) => ({
      ...prev,
      fontSize,
    }));
  };

  return {
    settings,
    setSettings,
    setTheme,
    toggleDarkMode,
    toggleTouchMode,
    setFontSize,
  };
}
