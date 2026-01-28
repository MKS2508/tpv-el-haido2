import { getPageImage, sourceEn, getRawMarkdownContent } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { MarkdownActions } from '@/components/markdown-actions';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export default async function Page(props: PageProps<'/en/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = sourceEn.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownContent = await getRawMarkdownContent(page);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        header: (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-fd-muted-foreground uppercase">
              Actions
            </h3>
            <MarkdownActions content={markdownContent} title={page.data.title} locale="en" />
          </div>
        ),
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(sourceEn, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return sourceEn.generateParams();
}

export async function generateMetadata(props: PageProps<'/en/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = sourceEn.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
