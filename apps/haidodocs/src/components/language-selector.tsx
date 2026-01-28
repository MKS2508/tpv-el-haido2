'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const languages = [
  { code: 'es', name: 'Español', path: '/docs' },
  { code: 'en', name: 'English', path: '/en/docs' },
];

export function LanguageSelector() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Detect current language
  const currentLang = pathname.startsWith('/en') ? 'en' : 'es';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <span className="text-sm font-medium">
          {languages.find(l => l.code === currentLang)?.name}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-lg z-50">
          {languages.map((lang) => (
            <Link
              key={lang.code}
              href={lang.path}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                currentLang === lang.code ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              {lang.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
