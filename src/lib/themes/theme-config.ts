export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  sidebar: string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  category: 'restaurant' | 'cafe' | 'bar' | 'accessibility' | 'custom';
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  touchOptimizations?: {
    buttonMinSize: string;
    touchSpacing: string;
    rippleEffects: boolean;
    hoverFeedback: boolean;
  };
  typography?: {
    baseFontSize: string;
    fontFamily: string;
  };
  spacing?: {
    containerPadding: string;
    componentGap: string;
  };
  preview?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
  };
}

export interface ThemeSettings {
  currentTheme: string;
  darkMode: boolean;
  touchMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  autoSwitchTheme: boolean;
  customizations: Partial<ThemeConfig>;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  currentTheme: 'amethyst-haze',
  darkMode: false,
  touchMode: true,
  fontSize: 'medium',
  autoSwitchTheme: false,
  customizations: {},
};

export const THEME_STORAGE_KEY = 'tpv-theme-settings';

// Utility functions
export function applyTheme(theme: ThemeConfig, isDark: boolean = false) {
  const colors = isDark ? theme.colors.dark : theme.colors.light;
  const root = document.documentElement;

  // Apply CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Apply touch optimizations if available
  if (theme.touchOptimizations) {
    root.style.setProperty(
      '--touch-target-size',
      theme.touchOptimizations.buttonMinSize || '2.75rem'
    );
    root.style.setProperty('--touch-spacing', theme.touchOptimizations.touchSpacing || '0.5rem');

    // Toggle CSS classes for enhanced touch features
    if (theme.touchOptimizations.rippleEffects) {
      root.classList.add('touch-ripple-enabled');
    } else {
      root.classList.remove('touch-ripple-enabled');
    }
  }

  // Apply typography
  if (theme.typography) {
    root.style.setProperty('--base-font-size', theme.typography.baseFontSize || '16px');
    if (theme.typography.fontFamily) {
      root.style.setProperty('--font-family', theme.typography.fontFamily);
    }
  }

  // Apply spacing
  if (theme.spacing) {
    root.style.setProperty('--container-padding', theme.spacing.containerPadding || '1rem');
    root.style.setProperty('--component-gap', theme.spacing.componentGap || '0.75rem');
  }
}

export function loadThemeSettings(): ThemeSettings {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load theme settings:', error);
  }
  return DEFAULT_THEME_SETTINGS;
}

export function saveThemeSettings(settings: ThemeSettings) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save theme settings:', error);
  }
}

export function createThemeFromTweakCN(tweakCNData: {
  name?: string;
  description?: string;
  cssVars?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  colors?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}): ThemeConfig {
  // Convert TweakCN theme data to our ThemeConfig format
  return {
    id: `custom-${Date.now()}`,
    name: tweakCNData.name || 'Custom Theme',
    description: tweakCNData.description || 'Imported from TweakCN',
    category: 'custom',
    colors: {
      light: (tweakCNData.cssVars?.light || tweakCNData.colors?.light || {}) as unknown as ThemeColors,
      dark: (tweakCNData.cssVars?.dark || tweakCNData.colors?.dark || {}) as unknown as ThemeColors,
    },
    preview: {
      primaryColor:
        tweakCNData.cssVars?.light?.primary || tweakCNData.colors?.light?.primary || '#000000',
      secondaryColor:
        tweakCNData.cssVars?.light?.secondary || tweakCNData.colors?.light?.secondary || '#666666',
      backgroundColor:
        tweakCNData.cssVars?.light?.background ||
        tweakCNData.colors?.light?.background ||
        '#ffffff',
    },
  };
}

export function generatePreviewCSS(theme: ThemeConfig, isDark: boolean = false): string {
  const colors = isDark ? theme.colors.dark : theme.colors.light;

  return Object.entries(colors)
    .map(([key, value]) => `--${key}: ${value};`)
    .join(' ');
}
