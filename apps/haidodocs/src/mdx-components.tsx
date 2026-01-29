import defaultMdxComponents from 'fumadocs-ui/mdx';
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
  Pre,
} from '@/components/mdx';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    // Fumadocs default components first
    ...defaultMdxComponents,

    // Fumadocs components explicitly
    Steps,
    Tabs,
    Tab,
    Callout,

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

    // User components
    ...components,

    // Override pre LAST to handle mermaid
    pre: Pre,
  };
}
