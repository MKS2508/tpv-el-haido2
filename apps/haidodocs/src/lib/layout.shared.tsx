import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { siteConfig } from '@/config/site.config';

/**
 * Base layout options for Fumadocs.
 *
 * Provides the navigation title/branding for the documentation site.
 * Uses siteConfig.logo if defined, otherwise falls back to siteConfig.name.
 *
 * @returns {BaseLayoutProps} Fumadocs base layout configuration
 */
export function baseOptions(): BaseLayoutProps {
  const logoContent = siteConfig.logo?.svg
    ? // eslint-disable-next-line react/no-danger-with-children
    <div dangerouslySetInnerHTML={{ __html: siteConfig.logo.svg }} />
    : siteConfig.logo?.text || siteConfig.name;

  return {
    nav: {
      title: logoContent,
    },
  };
}
