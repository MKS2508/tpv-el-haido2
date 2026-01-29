'use client';

import { useTheme } from 'next-themes';
import { useEffect, useId, useState } from 'react';

// Cache the mermaid import promise
let mermaidPromise: Promise<typeof import('mermaid')> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid');
  }
  return mermaidPromise;
}

interface MermaidProps {
  chart: string;
}

function MermaidContent({ chart }: MermaidProps) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const render = async () => {
      const mermaid = await loadMermaid();

      mermaid.default.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        themeVariables:
          resolvedTheme === 'dark'
            ? {
                primaryColor: '#3ecf8e',
                primaryTextColor: '#ededed',
                primaryBorderColor: '#2a9d6a',
                lineColor: '#666666',
                secondaryColor: '#1a1a1a',
                tertiaryColor: '#121212',
                background: '#0a0a0a',
                mainBkg: '#121212',
                secondBkg: '#1a1a1a',
                border1: '#333333',
                border2: '#222222',
                arrowheadColor: '#888888',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '14px',
                textColor: '#ededed',
                nodeTextColor: '#ededed',
              }
            : {},
      });

      try {
        const safeId = id.replace(/:/g, '-');
        const result = await mermaid.default.render(`mermaid-${safeId}`, chart);
        setSvg(result.svg);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvg(`<pre style="color: #ef4444;">Error rendering diagram</pre>`);
      }
    };

    render();
  }, [chart, id, resolvedTheme]);

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Mermaid({ chart }: MermaidProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="my-6 flex h-32 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <span className="text-sm text-[var(--text-muted)]">Loading diagram...</span>
      </div>
    );
  }

  return <MermaidContent chart={chart} />;
}
