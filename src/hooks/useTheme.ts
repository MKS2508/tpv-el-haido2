import { useEffect, useState } from 'react'
import { ThemeSettings, applyTheme, loadThemeSettings, saveThemeSettings } from '@/lib/themes/theme-config'
import { getThemeById } from '@/lib/themes/preset-themes'

export function useTheme() {
  const [settings, setSettings] = useState<ThemeSettings>(loadThemeSettings())

  // Apply theme when settings change
  useEffect(() => {
    const theme = getThemeById(settings.currentTheme)
    if (theme) {
      applyTheme(theme, settings.darkMode)
      
      // Update documentElement class for dark mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      // Update touch mode
      const root = document.documentElement
      if (settings.touchMode) {
        root.classList.add('touch-mode')
      } else {
        root.classList.remove('touch-mode')
      }
    }
    
    // Save settings
    saveThemeSettings(settings)
  }, [settings])

  const setTheme = (themeId: string) => {
    setSettings(prev => ({
      ...prev,
      currentTheme: themeId
    }))
  }

  const toggleDarkMode = () => {
    setSettings(prev => ({
      ...prev,
      darkMode: !prev.darkMode
    }))
  }

  const toggleTouchMode = () => {
    setSettings(prev => ({
      ...prev,
      touchMode: !prev.touchMode
    }))
  }

  const setFontSize = (fontSize: ThemeSettings['fontSize']) => {
    setSettings(prev => ({
      ...prev,
      fontSize
    }))
  }

  return {
    settings,
    setSettings,
    setTheme,
    toggleDarkMode,
    toggleTouchMode,
    setFontSize
  }
}