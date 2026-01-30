'use client';

import { type ReactNode, type ComponentProps } from 'react';
import { CodeBlock } from 'fumadocs-ui/components/codeblock';
import { Mermaid } from './Mermaid';

// Extract text content from React children
function getTextContent(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';

  if (Array.isArray(node)) {
    return node.map(getTextContent).join('');
  }

  if (typeof node === 'object' && node !== null && 'props' in node) {
    const nodeWithProps = node as { props: { children?: ReactNode } };
    return getTextContent(nodeWithProps.props.children);
  }

  return '';
}

type PreProps = ComponentProps<'pre'> & {
  'data-language'?: string;
};

export function Pre(props: PreProps) {
  const { children, ...rest } = props;

  // Check for mermaid language
  const lang = rest['data-language'];

  if (lang === 'mermaid') {
    const chart = getTextContent(children);
    return <Mermaid chart={chart.trim()} />;
  }

  // Default: use fumadocs CodeBlock
  return <CodeBlock {...props}>{children}</CodeBlock>;
}
