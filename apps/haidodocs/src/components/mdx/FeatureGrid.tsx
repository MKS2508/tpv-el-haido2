'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Box,
  Zap,
  Shield,
  Terminal,
  Settings,
  Code,
  Database,
  Globe,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  box: Box,
  zap: Zap,
  shield: Shield,
  terminal: Terminal,
  settings: Settings,
  code: Code,
  database: Database,
  globe: Globe,
};

interface FeatureProps {
  icon?: string;
  title: string;
  href?: string;
  children: ReactNode;
}

export function Feature({ icon = 'box', title, href, children }: FeatureProps) {
  const IconComponent = iconMap[icon] || Box;

  const content = (
    <div className="group relative p-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-all duration-200 hover:border-[var(--accent-cyan-dim)] hover:shadow-[0_0_20px_var(--accent-glow)]">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--accent-cyan)] group-hover:bg-[var(--accent-glow)]">
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

interface FeatureGridProps {
  children: ReactNode;
  columns?: 2 | 3;
}

export function FeatureGrid({ children, columns = 2 }: FeatureGridProps) {
  return (
    <div
      className={`grid gap-4 my-6 ${
        columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
      }`}
    >
      {children}
    </div>
  );
}
