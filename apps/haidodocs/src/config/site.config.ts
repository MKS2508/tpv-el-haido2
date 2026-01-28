/**
 * Site configuration for Fumadocs template.
 *
 * This configuration object contains all site-specific values that would otherwise
 * be hardcoded throughout the application. It uses environment variables with
 * fallback defaults to support both template usage and production deployments.
 *
 * @module config/site.config
 */

/**
 * Site configuration interface.
 *
 * Defines all configurable aspects of the documentation site including metadata,
 * i18n settings, deployment configuration, and theme customization.
 *
 * @interface ISiteConfig
 */
export interface ISiteConfig {
  /** Site name used in titles, headers, and metadata */
  name: string;
  /** Site description for SEO and metadata */
  description: string;
  /** Author name for metadata and copyright */
  author: string;
  /** Full URL of the site (including protocol) */
  url: string;
  /** Optional custom OpenGraph image URL */
  ogImageUrl?: string;

  // i18n
  /** Default locale for the documentation ('es' | 'en') */
  defaultLocale: 'es' | 'en';
  /** Array of supported locale codes */
  supportedLocales: string[];

  // Deployment
  /** Base path for GitHub Pages or subdirectory deployment (e.g., '/docs') */
  basePath: string;
  /** Whether to append trailing slash to all URLs */
  trailingSlash: boolean;

  // Theme
  /** Optional primary color override (CSS variable format) */
  primaryColor?: string;
  /** Logo configuration with SVG markup or text fallback */
  logo?: {
    /** Raw SVG markup for the logo */
    svg?: string;
    /** Text fallback when SVG is not provided */
    text?: string;
  };
}

/**
 * Site configuration instance.
 *
 * Reads values from environment variables with sensible defaults for local development.
 * In production, these should be set via `.env.local` or deployment platform variables.
 *
 * @example
 * ```bash
 * # .env.local
 * PROJECT_NAME=My Docs
 * DESCRIPTION=Documentation for My Project
 * AUTHOR=Your Name
 * BASE_PATH=/my-project
 * DEFAULT_LOCALE=en
 * SUPPORTED_LOCALES=en,es
 * ```
 *
 * @constant
 * @type {ISiteConfig}
 */
export const siteConfig: ISiteConfig = {
  name: process.env.PROJECT_NAME || 'Mi Documentación',
  description: process.env.DESCRIPTION || 'Documentación con Fumadocs',
  author: process.env.AUTHOR || 'Autor',

  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',

  ogImageUrl: process.env.OG_IMAGE_URL,

  defaultLocale: (process.env.DEFAULT_LOCALE as 'es' | 'en') || 'es',
  supportedLocales: process.env.SUPPORTED_LOCALES?.split(',') || ['es', 'en'],

  basePath: process.env.BASE_PATH || '',
  trailingSlash: process.env.TRAILING_SLASH === 'true',

  primaryColor: process.env.PRIMARY_COLOR,
  logo: process.env.LOGO_SVG
    ? { svg: process.env.LOGO_SVG }
    : process.env.LOGO_TEXT
      ? { text: process.env.LOGO_TEXT }
      : undefined,
};

/**
 * Default site configuration values for documentation purposes.
 *
 * These are the fallback values used when environment variables are not set.
 *
 * @constant
 * @type {ISiteConfig}
 */
export const defaultSiteConfig: ISiteConfig = {
  name: 'Mi Documentación',
  description: 'Documentación con Fumadocs',
  author: 'Autor',
  url: 'http://localhost:3000',
  defaultLocale: 'es',
  supportedLocales: ['es', 'en'],
  basePath: '',
  trailingSlash: false,
};
