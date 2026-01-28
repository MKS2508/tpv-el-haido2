'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="max-w-4xl mx-auto px-6 py-24">
        {/* Header */}
        <div className={`mb-20 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 dark:text-white mb-6">
            Telegram Bot Manager
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            TypeScript library and CLI for automating Telegram bot management via @BotFather using GramJS MTProto.
          </p>
        </div>

        {/* Code Example */}
        <div className={`mb-20 transition-opacity duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-700" />
            <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-700" />
            <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-700" />
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-500 font-mono uppercase tracking-wide">Terminal</span>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6 overflow-x-auto">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
              <span className="text-gray-500 dark:text-gray-500">$</span> npx @mks2508/telegram-bot-manager bootstrap
              <br />
              <span className="text-green-600">→</span> Creating bot via BotFather...
              <br />
              <span className="text-green-600">→</span> Bot created: @my_bot
              <br />
              <span className="text-green-600">→</span> Forum created: -1001234567890
              <br />
              <span className="text-green-600">→</span> Topics configured: General, Control, Logs
              <br />
              <span className="text-green-600">→</span> Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
            </code>
          </pre>
        </div>

        {/* Features - Simple List */}
        <div className={`mb-20 transition-opacity duration-700 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-8">
            Features
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <span className="text-blue-600 dark:text-blue-500 font-mono text-sm mt-0.5">01</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">BotFather Automation</h3>
                <p className="text-gray-600 dark:text-gray-400">Create bots, configure commands, set descriptions, retrieve tokens programmatically</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-blue-600 dark:text-blue-500 font-mono text-sm mt-0.5">02</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">CLI & Library</h3>
                <p className="text-gray-600 dark:text-gray-400">Use via npx for quick automation or import as TypeScript library</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-blue-600 dark:text-blue-500 font-mono text-sm mt-0.5">03</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Multi-Bot Support</h3>
                <p className="text-gray-600 dark:text-gray-400">Manage multiple bots with environment-based configuration (local, staging, production)</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-blue-600 dark:text-blue-500 font-mono text-sm mt-0.5">04</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Forum & Topics</h3>
                <p className="text-gray-600 dark:text-gray-400">Create forum groups with custom topics, colors, and admin permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-opacity duration-700 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Link
              href="/docs/introduccion/quick-start/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-gray-500 dark:text-gray-500">or</span>
            <Link
              href="/docs/introduccion/"
              className="text-blue-600 dark:text-blue-500 hover:underline font-medium"
            >
              Read the docs
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className={`mt-32 pt-16 border-t border-gray-200 dark:border-gray-800 transition-opacity duration-700 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <Link href="/docs/introduccion/installation/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Installation
            </Link>
            <Link href="/docs/referencia-de-biblioteca/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              API Reference
            </Link>
            <Link href="/docs/referencia-de-cli/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              CLI Reference
            </Link>
            <Link href="/docs/configuracion/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Configuration
            </Link>
            <Link href="/en/docs/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              English
            </Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
