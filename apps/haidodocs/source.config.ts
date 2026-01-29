import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import rehypeMermaid from 'rehype-mermaid';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const docsEn = defineDocs({
  dir: 'content/en/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [
      [rehypeMermaid, { strategy: 'inline-svg' }],
    ],
  },
});
