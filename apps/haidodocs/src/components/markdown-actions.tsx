'use client';

import { Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownActionsProps {
  content: string;
  title: string;
  locale: string;
}

export function MarkdownActions({ content, title, locale }: MarkdownActionsProps) {
  const [copied, setCopied] = useState(false);

  const labels = locale === 'en'
    ? { copy: 'Copy as Markdown', open: 'Open as Markdown', copied: 'Copied!' }
    : { copy: 'Copiar como Markdown', open: 'Abrir como Markdown', copied: '¡Copiado!' };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpen = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md
                   text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground
                   transition-colors"
        aria-label={labels.copy}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? labels.copied : labels.copy}</span>
      </button>

      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md
                   text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground
                   transition-colors"
        aria-label={labels.open}
      >
        <ExternalLink className="w-4 h-4" />
        <span>{labels.open}</span>
      </button>
    </div>
  );
}
