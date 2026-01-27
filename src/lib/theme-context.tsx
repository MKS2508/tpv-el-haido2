// Re-export everything from @mks2508/theme-manager-react for compatibility
export {
  ThemeProvider,
  useTheme,
  ThemeSelector,
  ModeToggle,
  ThemeManagementModal,
  FontSettingsModal,
} from '@mks2508/theme-manager-react';

// Compatibility alias for existing code
export { useTheme as useAppTheme } from '@mks2508/theme-manager-react';
export { useTheme as useThemeContext } from '@mks2508/theme-manager-react';
