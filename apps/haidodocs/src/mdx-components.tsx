import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Mermaid } from 'fumadocs-ui/components/mermaid';
import { Steps } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import {
  CheckCircle2,
  Terminal as TerminalIcon,
  FileEdit,
  Globe,
  FileCode,
  Box,
  Zap,
  Shield,
  Settings,
  Code,
  Database,
  AlertTriangle,
  Info,
  HelpCircle,
} from 'lucide-react';
import type { MDXComponents } from 'mdx/types';

import {
  FeatureGrid,
  Feature,
  Terminal,
  Kbd,
  Checklist,
  Check,
  FileTree,
  Folder,
  File,
  ComparisonTable,
} from '@/components/mdx';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    // Fumadocs components (must come first to allow overrides)
    ...defaultMdxComponents,

    // Re-export fumadocs components explicitly
    Steps,
    Tabs,
    Tab,
    Callout,

    // Mermaid diagrams
    Mermaid,

    // Custom MDX components
    FeatureGrid,
    Feature,
    Terminal,
    Kbd,
    Checklist,
    Check,
    FileTree,
    Folder,
    File,
    ComparisonTable,

    // Lucide icons
    CheckCircle2,
    TerminalIcon,
    FileEdit,
    Globe,
    FileCode,
    Box,
    Zap,
    Shield,
    Settings,
    Code,
    Database,
    AlertTriangle,
    Info,
    HelpCircle,

    ...components,
  };
}
