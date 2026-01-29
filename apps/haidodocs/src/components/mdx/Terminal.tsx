'use client';

import { ReactNode, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface TerminalProps {
  title?: string;
  children: ReactNode;
}

export function Terminal({ title = 'Terminal', children }: TerminalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let text = '';
    if (typeof children === 'string') {
      text = children;
    } else if (children && typeof children === 'object' && 'props' in children) {
      const element = children as React.ReactElement<{ children?: string }>;
      text = typeof element.props.children === 'string' ? element.props.children : '';
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal-container glow-border my-6">
      <div className="terminal-header justify-between">
        <div className="flex items-center gap-2">
          <div className="terminal-dot red" />
          <div className="terminal-dot yellow" />
          <div className="terminal-dot green" />
          <span className="ml-3 text-xs text-[var(--text-subtle)] font-mono uppercase tracking-wider">
            {title}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="terminal-body m-0 whitespace-pre-wrap">
        <code>{children}</code>
      </pre>
    </div>
  );
}
