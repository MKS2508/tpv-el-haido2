import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import { LanguageSelector } from '@/components/language-selector';
import { siteConfig } from '@/config/site.config';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: process.env.KEYWORDS?.split(',') || [],
  authors: [{ name: siteConfig.author }],
  openGraph: {
    type: 'website' as const,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: siteConfig.ogImageUrl ? [siteConfig.ogImageUrl] : [],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <RootProvider>
          <nav className="fixed top-4 right-4 z-50">
            <LanguageSelector />
          </nav>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
