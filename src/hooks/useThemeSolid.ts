import { createSignal, createEffect } from 'solid-js';
import { getThemeById } from '@/lib/themes/preset-themes';
import {
  applyTheme,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeSettings,
} from '@/lib/themes/theme-config';

export function useTheme() {
  const [settings, setSettings] = createSignal<ThemeSettings>(loadThemeSettings());

  createEffect(() => {
    const currentSettings = settings();
    const theme = getThemeById(currentSettings.currentTheme);
    if (theme) {
      applyTheme(theme, currentSettings.darkMode);

      if (currentSettings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const root = document.documentElement;
      if (currentSettings.touchMode) {
        root.classList.add('touch-mode');
      } else {
        root.classList.remove('touch-mode');
      }
    }

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

  const setFontSize = (size: string) => {
    setSettings((prev) => ({
      ...prev,
      fontSize: size,
    }));
  };

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  return {
    settings,
    setTheme,
    toggleDarkMode,
    toggleTouchMode,
    setFontSize,
    updateSettings,
  };
}
