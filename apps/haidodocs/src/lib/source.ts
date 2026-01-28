import { docs, docsEn } from 'fumadocs-mdx:collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { siteConfig } from '@/config/site.config';

/**
 * Base URL prefix computed from basePath.
 * Combines the basePath (e.g., '/telegram-bot-manager') with the docs path.
 */
const basePrefix = siteConfig.basePath;

/**
 * Source loader for Spanish documentation (default locale).
 *
 * @see {@link https://fumadocs.vercel.app/docs/headless/source Fumadocs Source}
 */
export const source = loader({
  baseUrl: `${basePrefix}/docs`,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

/**
 * Source loader for English documentation.
 *
 * @see {@link https://fumadocs.vercel.app/docs/headless/source Fumadocs Source}
 */
export const sourceEn = loader({
  baseUrl: `${basePrefix}/en/docs`,
  source: docsEn.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

/**
 * Generates OpenGraph image metadata for a page.
 *
 * @param page - Page instance from source loader
 * @returns Object with segments and URL for OG image
 * @example
 * ```typescript
 * const image = getPageImage(page);
 * // { segments: ['introduction', 'image.png'], url: '/og/docs/introduction/image.png' }
 * ```
 */
export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${basePrefix}/og/docs/${segments.join('/')}`,
  };
}

/**
 * Retrieves the raw markdown content for LLM consumption.
 *
 * @param page - Page instance from source loader
 * @returns Markdown string with title and processed content
 * @deprecated Use {@link getRawMarkdownContent} instead
 */
export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title}

${processed}`;
}

/**
 * Retrieves the raw markdown content for copying/viewing.
 *
 * Formats the page content as raw markdown with the title as a heading.
 * Used by the MarkdownActions component for "Copy as Markdown" functionality.
 *
 * @param page - Page instance from either source loader
 * @returns Complete markdown string with title and content
 * @example
 * ```typescript
 * const markdown = await getRawMarkdownContent(page);
 * // "# My Page\n\nContent here..."
 * ```
 */
export async function getRawMarkdownContent(
  page: InferPageType<typeof source> | InferPageType<typeof sourceEn>
) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title}

${processed}`;
}
