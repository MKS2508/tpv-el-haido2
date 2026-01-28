import { sourceEn } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/en/docs'>) {
  return (
    <DocsLayout tree={sourceEn.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
