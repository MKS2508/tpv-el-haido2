import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/**
 * Base path for deployment (e.g., '/repo-name' for GitHub Pages).
 * Leave empty for root domain deployment.
 */
const basePath = process.env.BASE_PATH || '';

/**
 * Next.js configuration for Fumadocs template.
 *
 * Uses environment variables to support flexible deployment options:
 * - BASE_PATH: For GitHub Pages or subdirectory deployment
 * - TRAILING_SLASH: Enable/disable trailing slash URLs
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/next-config-js Next.js Config}
 * @type {import('next').NextConfig}
 */
const config = {
  reactStrictMode: true,

  // Deployment configuration
  basePath,
  output: 'export',
  images: {
    unoptimized: true,
  },

  // URL configuration
  trailingSlash: process.env.TRAILING_SLASH === 'true' || basePath !== '',
};

export default withMDX(config);
