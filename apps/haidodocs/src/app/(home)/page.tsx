'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TypewriterCode } from '@/components/ui/TypewriterCode';

const terminalLines = [
  { prompt: '$', text: 'npx @mks2508/telegram-bot-manager bootstrap' },
  { arrow: true, text: 'Creating bot via BotFather...' },
  { arrow: true, text: 'Bot created: @my_bot' },
  { arrow: true, text: 'Forum created: -1001234567890' },
  { arrow: true, text: 'Topics configured: General, Control, Logs' },
  { arrow: true, text: 'Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
];

const features = [
  {
    title: 'BotFather Automation',
    description: 'Create bots, configure commands, set descriptions, retrieve tokens programmatically',
  },
  {
    title: 'CLI & Library',
    description: 'Use via npx for quick automation or import as TypeScript library',
  },
  {
    title: 'Multi-Bot Support',
    description: 'Manage multiple bots with environment-based configuration (local, staging, production)',
  },
  {
    title: 'Forum & Topics',
    description: 'Create forum groups with custom topics, colors, and admin permissions',
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-void)] relative">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <span
            className={`inline-flex mb-8 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            <span className="px-3 py-1 text-xs tracking-[0.2em] uppercase text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-full">
              Documentation
            </span>
          </span>

          {/* Title */}
          <h1
            className={`font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[var(--text-primary)] mb-8 leading-[1.1] opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            Telegram Bot
            <br />
            <span className="text-gradient">Manager</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl leading-relaxed opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          >
            TypeScript library and CLI for automating Telegram bot management via @BotFather using
            GramJS MTProto.
          </p>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`terminal-container glow-border animate-glow-pulse opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
          >
            {/* Terminal Header */}
            <div className="terminal-header">
              <div className="terminal-dot" />
              <div className="terminal-dot" />
              <div className="terminal-dot" />
              <span className="ml-3 text-xs text-[var(--text-subtle)] font-mono uppercase tracking-wider">
                Terminal
              </span>
            </div>

            {/* Terminal Body */}
            <div className="terminal-body">
              {mounted ? (
                <TypewriterCode lines={terminalLines} typingSpeed={25} lineDelay={300} />
              ) : (
                <code className="block text-[var(--text-muted)]">Loading...</code>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pb-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className={`text-xs font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-8 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          >
            Features
          </h2>

          <div
            className={`opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}
          >
            {features.map((feature, index) => (
              <div key={index} className="feature-row group">
                <span className="feature-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="feature-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
          >
            <Link href="/docs/introduccion/quick-start/" className="btn-primary">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs/introduccion/" className="btn-ghost">
              <BookOpen className="w-4 h-4" />
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] mt-12">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <nav
            className={`flex flex-wrap gap-x-8 gap-y-4 text-sm opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '900ms', animationFillMode: 'forwards' }}
          >
            <Link
              href="/docs/introduccion/installation/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Installation
            </Link>
            <Link
              href="/docs/referencia-de-biblioteca/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/docs/referencia-de-cli/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              CLI Reference
            </Link>
            <Link
              href="/docs/configuracion/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Configuration
            </Link>
            <Link
              href="/en/docs/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              English
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
