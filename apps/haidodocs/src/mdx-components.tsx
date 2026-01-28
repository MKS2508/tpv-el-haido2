import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { CheckCircle2, Terminal, FileEdit, Globe, FileCode } from 'lucide-react';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    Steps,
    Tabs,
    Tab,
    CheckCircle2,
    Terminal,
    FileEdit,
    Globe,
    FileCode,
    ...defaultMdxComponents,
    ...components,
  };
}
