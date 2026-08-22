/**
 * Centralized path utility for PWA mode
 *
 * When PWA_BUILD=true, all asset paths must include the /tpv prefix
 * to work correctly when deployed under the /tpv subdirectory.
 *
 * __PWA_BASE__ is replaced at compile time by Vite with either '/tpv' or ''
 */

// Compile-time constant replaced by Vite
declare const __PWA_BASE__: string;

// Use template literals with __PWA_BASE__ for compile-time replacement
// The minifier will optimize the ternary when __PWA_BASE__ is replaced
const BASE = __PWA_BASE__;

// Helper to prepend base path - will be optimized away by minifier
const _withBase = (path: string): string => {
  return BASE ? `${BASE}${path}` : path;
};

// Pre-computed paths using template literals for compile-time optimization
export const ASSET_PATHS = {
  themes: `${__PWA_BASE__}/themes/registry.json`,
  sw: `${__PWA_BASE__}/sw.js`,
  swScope: `${__PWA_BASE__}/`,
  panxo: `${__PWA_BASE__}/panxo.svg`,
  nuka: `${__PWA_BASE__}/nuka.svg`,
  wallpaper: `${__PWA_BASE__}/wallpaper.jpeg`,
  avatar1: `${__PWA_BASE__}/avatar-1.svg`,
  avatar2: `${__PWA_BASE__}/avatar-2.svg`,
  placeholder: `${__PWA_BASE__}/placeholder-avatar.svg`,
  logo: `${__PWA_BASE__}/logo.svg`,
} as const;

/**
 * Returns the correct path for an asset, accounting for PWA subdirectory
 * @param path - The asset path (should start with /)
 * @returns The full path with /tpv prefix if in PWA mode
 */
export function getAssetPath(path: string): string {
  return `${__PWA_BASE__}${path}`;
}

/**
 * Returns the correct path for service worker registration
 * @returns The service worker path with /tpv prefix if in PWA mode
 */
export function getSwPath(): string {
  return ASSET_PATHS.sw;
}

/**
 * Returns the correct scope for service worker registration
 * @returns The scope path with /tpv prefix if in PWA mode
 */
export function getSwScope(): string {
  return ASSET_PATHS.swScope;
}
