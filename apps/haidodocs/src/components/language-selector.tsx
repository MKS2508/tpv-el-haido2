'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

const languages = [
  { code: 'es', name: 'Espanol', path: '/docs' },
  { code: 'en', name: 'English', path: '/en/docs' },
];

export function LanguageSelector() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = pathname.startsWith('/en') ? 'en' : 'es';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all"
      >
        <Globe className="w-4 h-4 text-[var(--accent-green)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {languages.find((l) => l.code === currentLang)?.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full right-0 mt-2 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg backdrop-blur-sm z-50 min-w-[140px] animate-fade-in origin-top-right"
            style={{
              animation: 'fade-in 0.15s ease-out, scale-in 0.15s ease-out',
            }}
          >
            {languages.map((lang) => (
              <Link
                key={lang.code}
                href={lang.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                  currentLang === lang.code
                    ? 'text-[var(--accent-green)] font-medium'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentLang === lang.code ? 'bg-[var(--accent-green)]' : 'bg-transparent'
                  }`}
                />
                {lang.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
