'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Download, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const features = [
  {
    title: 'Gestion de Pedidos',
    description:
      'Crea y gestiona pedidos de forma rapida e intuitiva. Asigna mesas, divide cuentas y aplica descuentos.',
  },
  {
    title: 'Catalogo de Productos',
    description:
      'Organiza tus productos por categorias con imagenes, precios y variantes personalizables.',
  },
  {
    title: 'Impresion de Tickets',
    description:
      'Imprime tickets termicos automaticamente con comandos ESC/POS. Configura multiples impresoras.',
  },
  {
    title: 'Autenticacion PIN',
    description:
      'Acceso rapido mediante PIN para cada empleado. Control de permisos y registro de operaciones.',
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-void)] relative overflow-hidden">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Gradient orb decoration */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
        }}
      />

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-6 relative">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div
            className={`mb-6 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-[var(--accent-green)] bg-[var(--accent-glow)] border border-[var(--accent-green-dim)] rounded-full">
              <Zap className="w-3 h-3" />
              Documentacion TPV
            </span>
          </div>

          {/* Title */}
          <h1
            className={`font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-[var(--text-primary)] mb-6 leading-[1.1] opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            TPV <span className="text-gradient">El Haido</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-base sm:text-lg md:text-xl text-[var(--text-muted)] max-w-2xl leading-relaxed mb-8 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          >
            Sistema de punto de venta para restaurantes y bares. Gestion de pedidos, productos,
            impresion termica y autenticacion por PIN.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-3 mb-16 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            <Link href="/docs/introduccion/quick-start/" className="btn-primary">
              Comenzar
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs/descarga/" className="btn-ghost">
              <Download className="w-4 h-4" />
              Descargar
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack Pills */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`flex flex-wrap gap-2 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
          >
            {['Tauri', 'React', 'TypeScript', 'Tailwind', 'SQLite'].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-mono text-[var(--text-subtle)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className={`text-xs font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-8 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
          >
            Caracteristicas
          </h2>

          <div
            className={`grid md:grid-cols-2 gap-4 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg transition-all duration-300 hover:border-[var(--accent-green-dim)] hover:shadow-[0_0_30px_var(--accent-glow)]"
              >
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-[var(--text-subtle)] group-hover:text-[var(--accent-green)] transition-colors">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`p-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  ¿Listo para empezar?
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Consulta la guia de instalacion y configura tu TPV en minutos.
                </p>
              </div>
              <Link
                href="/docs/introduccion/installation/"
                className="inline-flex items-center gap-2 text-[var(--accent-green)] hover:underline text-sm font-medium"
              >
                <BookOpen className="w-4 h-4" />
                Ver documentacion
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <nav
            className={`flex flex-wrap gap-x-6 gap-y-3 text-sm opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
            style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}
          >
            <Link
              href="/docs/introduccion/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Introduccion
            </Link>
            <Link
              href="/docs/guia-usuario/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Guia de Usuario
            </Link>
            <Link
              href="/docs/configuracion/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Configuracion
            </Link>
            <Link
              href="/docs/descarga/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Descargar
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
