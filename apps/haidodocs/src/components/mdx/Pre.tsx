'use client';

import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3ecf8e',
    primaryTextColor: '#ededed',
    primaryBorderColor: '#2a9d6a',
    lineColor: '#888888',
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
  },
});

function MermaidRenderer({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error rendering diagram');
        console.error('Mermaid error:', err);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm my-4">
        Error rendering diagram: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 p-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface PreProps {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function Pre({ children, ...props }: PreProps) {
  // Check if this is a mermaid code block
  if (children && typeof children === 'object' && 'props' in children) {
    const codeElement = children as ReactElement<{ className?: string; children?: string }>;
    const className = codeElement.props?.className || '';

    if (className.includes('language-mermaid') || className.includes('mermaid')) {
      const chart = codeElement.props?.children || '';
      if (typeof chart === 'string') {
        return <MermaidRenderer chart={chart.trim()} />;
      }
    }
  }

  // Default pre rendering
  return <pre {...props}>{children}</pre>;
}
