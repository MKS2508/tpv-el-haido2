/**
 * Design tokens v0.2.0 — OKLCH semantic system.
 * Themeable via [data-theme="..."][data-mode="..."] on <html>.
 *
 * USAGE:
 *   <div class="bg-background text-foreground">...</div>
 *   <button class="bg-primary text-primary-foreground">...</button>
 *
 * NEVER hardcode hex/oklch in components. NEVER use `transition: all`.
 * NEVER use `will-change: all` — only transform/opacity/filter.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ────────────────────────────────────────────────────────────
// 1. COLOR — OKLCH semantic tokens
// ────────────────────────────────────────────────────────────
// Each value is an OKLCH triple. Concrete values per theme live in
// /public/themes/<name>-{light,dark}.css. The token names below are
// the contract — every component reads by semantic role, never by
// theme name.

// Surfaces (background layer hierarchy)
export const SURFACE_TOKENS = [
  'background', // canvas (page-level)
  'surface', // cards, raised panels
  'surface-elevated', // modals, popovers
  'surface-overlay', // backdrop scrims
  'sidebar', // nav rail
] as const;

// Foreground (text hierarchy)
export const FOREGROUND_TOKENS = [
  'foreground', // primary text (≥4.5:1 vs background)
  'foreground-muted', // secondary text (≥3:1)
  'foreground-subtle', // hints, captions (≥3:1)
] as const;

// Brand
export const BRAND_TOKENS = [
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
] as const;

// State (semantic — not theme-specific)
export const STATE_TOKENS = [
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'destructive',
  'destructive-foreground',
  'info',
  'info-foreground',
] as const;

// Structure
export const STRUCTURE_TOKENS = [
  'border',
  'input',
  'ring',
  'muted',
  'muted-foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
] as const;

// POS-specific (totales, IVA, success del cobro)
export const POS_TOKENS = [
  'pos-total', // cifra grande destacada (total carrito)
  'pos-subtotal', // subtotal
  'pos-iva', // IVA
  'pos-success', // feedback "cobrado correctamente"
  'pos-pending', // orden pendiente de pago
] as const;

// Charts (legacy compat — kept from basecoat)
export const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export type ColorToken =
  | (typeof SURFACE_TOKENS)[number]
  | (typeof FOREGROUND_TOKENS)[number]
  | (typeof BRAND_TOKENS)[number]
  | (typeof STATE_TOKENS)[number]
  | (typeof STRUCTURE_TOKENS)[number]
  | (typeof POS_TOKENS)[number]
  | (typeof CHART_TOKENS)[number];

// Reference: per-theme OKLCH values. Not for direct use in components
// (always read via CSS variable). Documented for design review only.
export const THEME_COLOR_REFERENCE = {
  synthwave84: {
    light: {
      background: 'oklch(1.0000 0 0)',
      foreground: 'oklch(0.3211 0 0)',
      surface: 'oklch(0.9702 0 0)',
      'surface-elevated': 'oklch(0.9800 0 0)',
      'surface-overlay': 'oklch(0.15 0.05 270 / 0.6)',
      primary: 'oklch(0.3527 0.1722 263.94)',
      'primary-foreground': 'oklch(0.9850 0 0)',
      secondary: 'oklch(0.5548 0.1570 299.75)',
      accent: 'oklch(0.5984 0.1849 15.26)',
      muted: 'oklch(0.8853 0 0)',
      'muted-foreground': 'oklch(0.5103 0 0)',
      success: 'oklch(0.6500 0.1800 145.00)',
      warning: 'oklch(0.7344 0.1333 71.67)',
      destructive: 'oklch(0.5594 0.1900 25.86)',
      border: 'oklch(0.8576 0 0)',
      ring: 'oklch(0.3527 0.1722 263.94)',
      'pos-total': 'oklch(0.5984 0.1849 15.26)',
      'pos-success': 'oklch(0.6500 0.1800 145.00)',
      'pos-pending': 'oklch(0.7344 0.1333 71.67)',
    },
    dark: {
      background: 'oklch(0.1500 0.0300 280.00)',
      foreground: 'oklch(0.9702 0 0)',
      surface: 'oklch(0.1900 0.0400 285.00)',
      'surface-elevated': 'oklch(0.2300 0.0500 290.00)',
      'surface-overlay': 'oklch(0.05 0.02 270 / 0.7)',
      primary: 'oklch(0.6800 0.2200 320.00)',
      'primary-foreground': 'oklch(0.1500 0.0300 280.00)',
      secondary: 'oklch(0.5548 0.1570 299.75)',
      accent: 'oklch(0.5984 0.1849 15.26)',
      muted: 'oklch(0.2500 0.0500 290.00)',
      'muted-foreground': 'oklch(0.7000 0.0300 300.00)',
      success: 'oklch(0.7000 0.1800 145.00)',
      warning: 'oklch(0.7800 0.1400 71.00)',
      destructive: 'oklch(0.6500 0.2000 25.00)',
      border: 'oklch(0.3300 0.0700 295.00)',
      ring: 'oklch(0.6800 0.2200 320.00)',
      'pos-total': 'oklch(0.6800 0.2200 320.00)',
      'pos-success': 'oklch(0.7000 0.1800 145.00)',
      'pos-pending': 'oklch(0.7800 0.1400 71.00)',
    },
  },
  graphite: {
    light: {
      background: 'oklch(0.9551 0 0)',
      foreground: 'oklch(0.3211 0 0)',
      surface: 'oklch(0.9702 0 0)',
      'surface-elevated': 'oklch(0.9850 0 0)',
      'surface-overlay': 'oklch(0.20 0 0 / 0.55)',
      primary: 'oklch(0.4891 0 0)',
      'primary-foreground': 'oklch(1.0000 0 0)',
      secondary: 'oklch(0.9067 0 0)',
      accent: 'oklch(0.8078 0 0)',
      muted: 'oklch(0.8853 0 0)',
      'muted-foreground': 'oklch(0.5103 0 0)',
      success: 'oklch(0.6000 0.1500 145.00)',
      warning: 'oklch(0.7500 0.1200 71.00)',
      destructive: 'oklch(0.5594 0.1900 25.86)',
      border: 'oklch(0.8576 0 0)',
      ring: 'oklch(0.4891 0 0)',
      'pos-total': 'oklch(0.3211 0 0)',
      'pos-success': 'oklch(0.6000 0.1500 145.00)',
      'pos-pending': 'oklch(0.7500 0.1200 71.00)',
    },
    dark: {
      background: 'oklch(0.1800 0 0)',
      foreground: 'oklch(0.9700 0 0)',
      surface: 'oklch(0.2200 0 0)',
      'surface-elevated': 'oklch(0.2600 0 0)',
      'surface-overlay': 'oklch(0.05 0 0 / 0.7)',
      primary: 'oklch(0.7500 0 0)',
      'primary-foreground': 'oklch(0.1500 0 0)',
      secondary: 'oklch(0.3000 0 0)',
      accent: 'oklch(0.4000 0 0)',
      muted: 'oklch(0.2700 0 0)',
      'muted-foreground': 'oklch(0.6800 0 0)',
      success: 'oklch(0.7000 0.1400 145.00)',
      warning: 'oklch(0.7800 0.1200 71.00)',
      destructive: 'oklch(0.6500 0.1900 25.00)',
      border: 'oklch(0.3200 0 0)',
      ring: 'oklch(0.7500 0 0)',
      'pos-total': 'oklch(0.9700 0 0)',
      'pos-success': 'oklch(0.7000 0.1400 145.00)',
      'pos-pending': 'oklch(0.7800 0.1200 71.00)',
    },
  },
  darkmatteviolet: {
    light: {
      background: 'oklch(1.0000 0 0)',
      foreground: 'oklch(0.2200 0.0300 305.00)',
      surface: 'oklch(0.9800 0.0050 305.00)',
      'surface-elevated': 'oklch(0.9900 0.0050 305.00)',
      'surface-overlay': 'oklch(0.15 0.05 305 / 0.55)',
      primary: 'oklch(0.5452 0.2088 308.70)',
      'primary-foreground': 'oklch(0.9850 0 0)',
      secondary: 'oklch(0.4000 0.1200 308.00)',
      accent: 'oklch(0.9491 0 0)',
      muted: 'oklch(0.9400 0.0100 305.00)',
      'muted-foreground': 'oklch(0.5000 0.0500 305.00)',
      success: 'oklch(0.6200 0.1600 145.00)',
      warning: 'oklch(0.7500 0.1300 71.00)',
      destructive: 'oklch(0.5800 0.2000 25.00)',
      border: 'oklch(0.8900 0.0200 305.00)',
      ring: 'oklch(0.5452 0.2088 308.70)',
      'pos-total': 'oklch(0.4000 0.1200 308.00)',
      'pos-success': 'oklch(0.6200 0.1600 145.00)',
      'pos-pending': 'oklch(0.7500 0.1300 71.00)',
    },
    dark: {
      background: 'oklch(0.2173 0.0342 302.02)',
      foreground: 'oklch(0.9314 0.0114 304.17)',
      surface: 'oklch(0.2453 0.0414 301.84)',
      'surface-elevated': 'oklch(0.2700 0.0450 301.00)',
      'surface-overlay': 'oklch(0.10 0.03 302 / 0.7)',
      primary: 'oklch(0.5984 0.1849 15.26)',
      'primary-foreground': 'oklch(0.1482 0.0159 302.87)',
      secondary: 'oklch(0.5548 0.1570 299.75)',
      accent: 'oklch(0.3011 0.0708 300.69)',
      muted: 'oklch(0.2932 0.0472 301.96)',
      'muted-foreground': 'oklch(0.6989 0.0404 303.52)',
      success: 'oklch(0.6800 0.1600 145.00)',
      warning: 'oklch(0.7344 0.1333 71.67)',
      destructive: 'oklch(0.6500 0.1900 25.00)',
      border: 'oklch(0.3314 0.0679 301.23)',
      ring: 'oklch(0.5984 0.1849 15.26)',
      'pos-total': 'oklch(0.5984 0.1849 15.26)',
      'pos-success': 'oklch(0.6800 0.1600 145.00)',
      'pos-pending': 'oklch(0.7344 0.1333 71.67)',
    },
  },
  // ──────────────────────────────────────────────────────────
  // NEW: TPV Amber — hospitality warm palette
  // ──────────────────────────────────────────────────────────
  'tpv-amber': {
    light: {
      // Canvas: warm cream (NOT stark white — board call: warm hospitality)
      background: 'oklch(0.9700 0.0120 75.00)',
      foreground: 'oklch(0.2800 0.0300 50.00)',
      surface: 'oklch(0.9850 0.0080 75.00)',
      'surface-elevated': 'oklch(1.0000 0.0050 75.00)',
      'surface-overlay': 'oklch(0.25 0.04 50 / 0.55)',
      primary: 'oklch(0.6800 0.1550 55.00)',
      'primary-foreground': 'oklch(0.1800 0.0200 50.00)',
      secondary: 'oklch(0.7800 0.0800 45.00)',
      'secondary-foreground': 'oklch(0.2800 0.0300 50.00)',
      accent: 'oklch(0.6200 0.1400 35.00)',
      'accent-foreground': 'oklch(0.9850 0.0050 75.00)',
      muted: 'oklch(0.9300 0.0150 70.00)',
      'muted-foreground': 'oklch(0.5000 0.0400 55.00)',
      success: 'oklch(0.6200 0.1300 150.00)',
      warning: 'oklch(0.7800 0.1400 80.00)',
      destructive: 'oklch(0.5500 0.1800 25.00)',
      border: 'oklch(0.8800 0.0200 65.00)',
      input: 'oklch(0.9500 0.0150 70.00)',
      ring: 'oklch(0.6800 0.1550 55.00)',
      card: 'oklch(0.9850 0.0080 75.00)',
      'card-foreground': 'oklch(0.2800 0.0300 50.00)',
      popover: 'oklch(0.9950 0.0050 75.00)',
      'popover-foreground': 'oklch(0.2800 0.0300 50.00)',
      'pos-total': 'oklch(0.5500 0.1600 40.00)',
      'pos-success': 'oklch(0.6200 0.1300 150.00)',
      'pos-pending': 'oklch(0.7800 0.1400 80.00)',
    },
    dark: {
      background: 'oklch(0.1900 0.0200 50.00)',
      foreground: 'oklch(0.9400 0.0150 75.00)',
      surface: 'oklch(0.2300 0.0250 50.00)',
      'surface-elevated': 'oklch(0.2700 0.0300 50.00)',
      'surface-overlay': 'oklch(0.05 0.01 40 / 0.75)',
      primary: 'oklch(0.7800 0.1600 60.00)',
      'primary-foreground': 'oklch(0.1500 0.0200 50.00)',
      secondary: 'oklch(0.3800 0.0500 50.00)',
      'secondary-foreground': 'oklch(0.9400 0.0150 75.00)',
      accent: 'oklch(0.7000 0.1400 30.00)',
      'accent-foreground': 'oklch(0.1500 0.0200 50.00)',
      muted: 'oklch(0.2700 0.0250 50.00)',
      'muted-foreground': 'oklch(0.7000 0.0400 65.00)',
      success: 'oklch(0.7000 0.1400 150.00)',
      warning: 'oklch(0.8000 0.1400 80.00)',
      destructive: 'oklch(0.6800 0.1800 25.00)',
      border: 'oklch(0.3500 0.0400 55.00)',
      input: 'oklch(0.3000 0.0350 55.00)',
      ring: 'oklch(0.7800 0.1600 60.00)',
      card: 'oklch(0.2300 0.0250 50.00)',
      'card-foreground': 'oklch(0.9400 0.0150 75.00)',
      popover: 'oklch(0.2500 0.0250 50.00)',
      'popover-foreground': 'oklch(0.9400 0.0150 75.00)',
      'pos-total': 'oklch(0.8200 0.1700 65.00)',
      'pos-success': 'oklch(0.7000 0.1400 150.00)',
      'pos-pending': 'oklch(0.8000 0.1400 80.00)',
    },
  },
} as const;

// ────────────────────────────────────────────────────────────
// 2. TYPE SCALE
// ────────────────────────────────────────────────────────────
// Base size 16px. Roles map to semantic meaning, not raw px.
// Body line-length capped at 65–75ch. Display letter-spacing
// floor -0.04em (impeccable ban on tighter tracking).

export const TYPE_SCALE = {
  caption: { size: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: 500 },
  'body-sm': { size: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0', fontWeight: 400 },
  body: { size: '1rem', lineHeight: '1.5rem', letterSpacing: '0', fontWeight: 400 },
  'body-lg': { size: '1.125rem', lineHeight: '1.75rem', letterSpacing: '0', fontWeight: 400 },
  h4: { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: 600 },
  h3: { size: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: 600 },
  h2: { size: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.03em', fontWeight: 700 },
  h1: { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.035em', fontWeight: 700 },
  display: { size: '3.75rem', lineHeight: '4rem', letterSpacing: '-0.04em', fontWeight: 800 },
} as const;

// POS-critical: cifras grandes con tabular-nums
export const POS_TYPE = {
  total: { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.025em', fontWeight: 700 },
  subtotal: { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: 500 },
  iva: { size: '1rem', lineHeight: '1.5rem', letterSpacing: '0', fontWeight: 500 },
} as const;

export type TypeRole = keyof typeof TYPE_SCALE;
export type PosTypeRole = keyof typeof POS_TYPE;

// Overline — small caps, wide tracking (use sparingly)
export const OVERLINE = {
  size: '0.75rem',
  lineHeight: '1rem',
  letterSpacing: '0.18em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

// Mono — cifras dinámicas
export const MONO = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums' as const,
  fontFeatureSettings: '"tnum" 1, "cv11" 1',
};

// ────────────────────────────────────────────────────────────
// 3. SPACING — 4pt scale + semantic POS tokens
// ────────────────────────────────────────────────────────────

export const SPACING = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
} as const;

// Semantic POS gaps (use by name, not raw value)
export const POS_GAP = {
  'gap-pos-grid': '0.75rem', // 12px — between product cards in NewOrder
  'gap-pos-list': '0.5rem', // 8px — between items in OrderPanel
  'gap-form': '1rem', // 16px — between form fields
  'gap-section': '2rem', // 32px — between sections
} as const;

export type SpacingKey = keyof typeof SPACING;
export type PosGapKey = keyof typeof POS_GAP;

// ────────────────────────────────────────────────────────────
// 4. MOTION
// ────────────────────────────────────────────────────────────
// Per make-interfaces-feel-better:
// - transition: all BANNED
// - will-change only on transform/opacity/filter
// - scale-on-press 0.96 (never below 0.95)
// - exit < enter (~60-70% of enter duration)

export const DURATION = {
  instant: '0ms',
  fast: '120ms', // hover, micro-interactions
  base: '200ms', // state changes
  slow: '320ms', // modal open/close, splash exit
  spring: '600ms', // count-up, layout shifts
} as const;

export const EASING = {
  linear: 'cubic-bezier(0, 0, 1, 1)',
  'out-quad': 'cubic-bezier(0.2, 0, 0, 1)',
  'in-out-cubic': 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: { stiffness: 200, damping: 25, mass: 1 },
} as const;

export const MOTION_PROPS = {
  hoverLift: {
    transition: { duration: DURATION.fast, easing: EASING['out-quad'] },
    whileHover: { scale: 1.02 },
  },
  pressScale: {
    transition: { duration: DURATION.fast, easing: EASING['out-quad'] },
    whileTap: { scale: 0.96 },
  },
} as const;

// ────────────────────────────────────────────────────────────
// 5. SHADOW / ELEVATION
// ────────────────────────────────────────────────────────────

export const ELEVATION = {
  0: 'none',
  1: '0 1px 2px 0 oklch(0.20 0.02 270 / 0.08), 0 1px 1px 0 oklch(0.20 0.02 270 / 0.04)',
  2: '0 4px 8px -1px oklch(0.20 0.02 270 / 0.10), 0 2px 4px -1px oklch(0.20 0.02 270 / 0.06)',
  3: '0 10px 20px -3px oklch(0.20 0.02 270 / 0.12), 0 4px 8px -2px oklch(0.20 0.02 270 / 0.08)',
  4: '0 20px 40px -5px oklch(0.20 0.02 270 / 0.16), 0 8px 16px -4px oklch(0.20 0.02 270 / 0.10)',
} as const;

export const GLOW = {
  primary: '0 0 0 1px oklch(0.68 0.16 60 / 0.40), 0 4px 12px 0 oklch(0.68 0.16 60 / 0.20)',
  success: '0 0 0 1px oklch(0.65 0.18 145 / 0.40), 0 4px 12px 0 oklch(0.65 0.18 145 / 0.20)',
  destructive: '0 0 0 1px oklch(0.65 0.19 25 / 0.40), 0 4px 12px 0 oklch(0.65 0.19 25 / 0.20)',
} as const;

export type ElevationKey = 0 | 1 | 2 | 3 | 4;

// Glassmorphism layers (sutil, propósito específico — Sidebar / BottomNav / LicenseSplash)
export const GLASS = {
  subtle: 'backdrop-blur-sm bg-surface/60 border border-border/40',
  medium: 'backdrop-blur-md bg-surface-elevated/80 border border-border/50',
  heavy: 'backdrop-blur-lg bg-surface-overlay/40 border border-border/60',
} as const;

// ────────────────────────────────────────────────────────────
// 6. RADIUS — concentric rule (mifb #1)
// ────────────────────────────────────────────────────────────
// innerRadius = max(0, outerRadius - padding)
// Example: card 14 + padding 16 → child radius = max(0, 14-2) = 12

export const RADIUS = {
  none: '0',
  sm: '0.375rem', // 6px — buttons inside cards, badges
  md: '0.625rem', // 10px — cards, inputs
  lg: '0.875rem', // 14px — modals, sheets (POS primary)
  xl: '1.25rem', // 20px — splash cards
  full: '9999px', // avatars, pills
} as const;

// Per-theme radius override (matches registry.json config.radius)
export const THEME_RADIUS: Record<string, keyof typeof RADIUS> = {
  synthwave84: 'md',
  graphite: 'sm',
  darkmatteviolet: 'lg',
  'tpv-amber': 'lg',
};

export type RadiusKey = keyof typeof RADIUS;

// ────────────────────────────────────────────────────────────
// 7. Z-INDEX SCALE
// ────────────────────────────────────────────────────────────

export const Z = {
  base: '0',
  dropdown: '10',
  sticky: '20',
  modalBg: '30',
  modal: '40',
  toast: '50',
  tooltip: '60',
  splash: '100',
} as const;

// ────────────────────────────────────────────────────────────
// 8. HIT AREA — minimum 40×40 (mifb rule #16)
// ────────────────────────────────────────────────────────────

export const HIT_AREA = {
  desktop: '40px',
  touch: '44px',
} as const;
