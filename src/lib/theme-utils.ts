/**
 * Utility functions for theme management
 */

// Get the current theme from localStorage or return the default
export function getStoredTheme(): string {
  if (typeof window === "undefined") return "default"
  return localStorage.getItem("color-theme") || "default"
}

// Get the current mode (light/dark) from localStorage or system preference
export function getStoredMode(): string {
  if (typeof window === "undefined") return "system"
  return localStorage.getItem("theme-mode") || "system"
}

// Apply theme immediately (useful for preventing theme flash)
export function applyTheme(theme: string, mode?: string): void {
  if (typeof document === "undefined") return

  // Apply color theme
  document.documentElement.setAttribute("data-theme", theme)

  // Apply light/dark mode if provided
  if (mode) {
    if (mode === "dark") {
      document.documentElement.classList.add("dark")
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark")
    }
  }
}

// Save theme to localStorage
export function saveTheme(theme: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("color-theme", theme)
}

// Save mode to localStorage
export function saveMode(mode: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("theme-mode", mode)
}

// Get system preference for dark mode
export function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// Create the anti-flash script for Vite/Tauri
export const createAntiFlashScript = (): string => {
  return `
    (function() {
      try {
        var savedTheme = localStorage.getItem('color-theme') || 'default';
        var savedMode = localStorage.getItem('theme-mode');
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (savedMode === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (savedMode === 'light') {
          document.documentElement.classList.remove('dark');
        } else if (savedMode === 'system' || !savedMode) {
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (e) {
        console.error('Theme initialization error:', e);
      }
    })();
  `
}