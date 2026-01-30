'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  Zap,
  Monitor,
  Smartphone,
  WifiOff,
  ShoppingCart,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Palette,
  Play,
  Shield,
  Clock,
} from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: 'Gestion de Comandas',
    description:
      'Crea y gestiona pedidos de forma rapida e intuitiva con interfaz tactil optimizada.',
  },
  {
    icon: Users,
    title: 'Multi-usuario con PIN',
    description:
      'Sistema de login con PIN para multiples empleados y control de accesos.',
  },
  {
    icon: Receipt,
    title: 'Facturas AEAT',
    description:
      'Cumplimiento total con VERI*FACTU para facturacion electronica española.',
  },
  {
    icon: BarChart3,
    title: 'Historial y Stats',
    description:
      'Consulta el historial de ventas, estadisticas y metricas de rendimiento.',
  },
  {
    icon: Palette,
    title: 'Temas Personalizables',
    description:
      'Multiples temas visuales para adaptar la interfaz a tu establecimiento.',
  },
  {
    icon: Settings,
    title: 'Totalmente Configurable',
    description:
      'Ajusta productos, categorias, precios y opciones de impresion termica.',
  },
];

const screenshots = [
  { src: '/screenshots/01_home.png', alt: 'Pantalla de inicio', label: 'Dashboard', badge: 'Principal' },
  { src: '/screenshots/05_newOrder.png', alt: 'Nueva comanda', label: 'Comandas', badge: 'Core' },
  { src: '/screenshots/03_products.png', alt: 'Gestion de productos', label: 'Catalogo', badge: 'Admin' },
  { src: '/screenshots/06_orderHistory.png', alt: 'Historial de pedidos', label: 'Historial', badge: 'Reports' },
  { src: '/screenshots/07_aeatInvoices.png', alt: 'Facturas AEAT', label: 'VERI*FACTU', badge: 'AEAT' },
  { src: '/screenshots/12_themes.png', alt: 'Temas disponibles', label: 'Temas', badge: 'UX' },
];

const stats = [
  { value: '< 50ms', label: 'Tiempo de respuesta', icon: Zap },
  { value: '100%', label: 'Offline capable', icon: WifiOff },
  { value: 'AEAT', label: 'Certificado VERI*FACTU', icon: Shield },
  { value: '24/7', label: 'Sin dependencias cloud', icon: Clock },
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

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--accent-glow)_0%,_transparent_50%)] opacity-60 animate-[spin_60s_linear_infinite]" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.1)_0%,_transparent_50%)] opacity-40 animate-[spin_80s_linear_infinite_reverse]" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--accent-green) 1px, transparent 1px), linear-gradient(90deg, var(--accent-green) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div
                className={`opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  PWA + Desktop + Offline
                </span>
              </div>

              {/* Logo and Title */}
              <div
                className={`opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[var(--accent-green)] blur-2xl opacity-30" />
                    <Image
                      src="/logo.svg"
                      alt="TPV El Haido"
                      width={72}
                      height={72}
                      className="relative"
                      priority
                    />
                  </div>
                  <div>
                    <h1
                      className="text-5xl lg:text-6xl font-bold tracking-tight"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      TPV <span className="text-gradient">El Haido</span>
                    </h1>
                  </div>
                </div>

                <p className="text-xl lg:text-2xl text-[var(--text-muted)] leading-relaxed max-w-xl">
                  Sistema de Punto de Venta{' '}
                  <span className="text-[var(--text-primary)]">moderno y eficiente</span>{' '}
                  para restaurantes y bares.
                </p>
              </div>

              {/* Terminal snippet */}
              <div
                className={`opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
              >
                <div className="terminal-container max-w-md glow-border">
                  <div className="terminal-header">
                    <div className="terminal-dot red" />
                    <div className="terminal-dot yellow" />
                    <div className="terminal-dot green" />
                    <span className="ml-3 text-xs text-[var(--text-subtle)] font-mono">bash</span>
                  </div>
                  <div className="terminal-body text-sm">
                    <div className="flex items-center gap-2">
                      <span className="terminal-arrow">→</span>
                      <span className="text-[var(--accent-green)]">tpv-haido</span>
                      <span className="text-[var(--text-muted)]">ready</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="terminal-prompt">$</span>
                      <span>open /tpv</span>
                      <span className="terminal-cursor animate-blink" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div
                className={`flex flex-wrap gap-4 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
              >
                <a
                  href="/tpv/index.html"
                  className="group inline-flex items-center gap-3 bg-[var(--accent-green)] hover:bg-[var(--accent-green-dim)] text-[var(--bg-void)] px-7 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_30px_var(--accent-glow)]"
                >
                  <Play className="w-5 h-5" />
                  Abrir App Web
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>

                <Link href="/docs/descarga" className="btn-ghost text-lg">
                  <Download className="w-5 h-5" />
                  Descargar Desktop
                </Link>
              </div>

              {/* Platform badges */}
              <div
                className={`flex flex-wrap gap-6 pt-4 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
              >
                {[
                  { icon: Monitor, text: 'Windows · macOS · Linux' },
                  { icon: Smartphone, text: 'PWA Instalable' },
                  { icon: WifiOff, text: 'Modo Offline' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-subtle)]">
                    <item.icon className="w-4 h-4" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Hero Screenshot */}
            <div
              className={`relative opacity-0 ${mounted ? 'animate-slide-up' : ''} hidden lg:block`}
              style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            >
              <div className="relative">
                {/* Glow behind */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[var(--accent-green)]/20 via-transparent to-teal-500/10 rounded-2xl blur-3xl" />

                {/* Main screenshot */}
                <div className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl">
                  <div className="terminal-header border-b border-[var(--border-subtle)]">
                    <div className="terminal-dot red" />
                    <div className="terminal-dot yellow" />
                    <div className="terminal-dot green" />
                    <span className="ml-auto text-xs text-[var(--text-subtle)] font-mono">
                      TPV El Haido v2.0
                    </span>
                  </div>
                  <div className="relative aspect-[16/10]">
                    <Image
                      src="/screenshots/05_newOrder.png"
                      alt="TPV El Haido - Nueva Comanda"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>
                </div>

                {/* Floating card */}
                <div className="absolute -bottom-6 -left-6 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-sm shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-green)]/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[var(--accent-green)]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Ultra rapido</div>
                      <div className="text-xs text-[var(--text-muted)]">&lt; 50ms respuesta</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative py-8 border-y border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 opacity-0 ${mounted ? 'animate-fade-in' : ''}`}
                style={{ animationDelay: `${600 + i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-[var(--accent-green)]" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stat.value}</div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Gallery */}
      <section className="py-24 lg:py-32 relative">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-green)] mb-4 block">
              Interfaz
            </span>
            <h2
              className="text-4xl lg:text-5xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Disenado para la <span className="text-gradient">velocidad</span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] leading-relaxed">
              Cada pantalla optimizada para operaciones rapidas. Interfaz tactil pensada para el
              ritmo intenso de la hosteleria.
            </p>
          </div>

          {/* Screenshots grid - Bento style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {screenshots.map((screenshot, index) => (
              <div
                key={index}
                className={`group relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition-all duration-500 hover:border-[var(--accent-green-dim)] hover:shadow-[0_0_40px_var(--accent-glow)] ${
                  index === 0 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
              >
                {/* Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--bg-void)]/80 backdrop-blur-sm border border-[var(--border-subtle)] text-[var(--accent-green)]">
                    {screenshot.badge}
                  </span>
                </div>

                {/* Image */}
                <div className={`relative ${index === 0 ? 'aspect-[16/10]' : 'aspect-video'}`}>
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes={
                      index === 0
                        ? '(max-width: 768px) 100vw, 66vw'
                        : '(max-width: 768px) 100vw, 33vw'
                    }
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{screenshot.label}</span>
                    <ArrowRight className="w-4 h-4 text-[var(--accent-green)]" />
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">{screenshot.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 bg-[var(--bg-primary)] relative">
        {/* Decorative line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[var(--accent-green-dim)] to-transparent" />

        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: Header */}
            <div className="lg:sticky lg:top-32">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-green)] mb-4 block">
                Caracteristicas
              </span>
              <h2
                className="text-4xl lg:text-5xl font-bold mb-6"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Todo lo que <span className="text-gradient">necesitas</span>
              </h2>
              <p className="text-lg text-[var(--text-muted)] leading-relaxed mb-8">
                Un sistema completo de punto de venta pensado especificamente para las necesidades
                de la hosteleria española.
              </p>

              {/* Mini terminal */}
              <div className="terminal-container">
                <div className="terminal-header">
                  <div className="terminal-dot red" />
                  <div className="terminal-dot yellow" />
                  <div className="terminal-dot green" />
                </div>
                <div className="terminal-body text-sm">
                  <div className="text-[var(--text-muted)]"># Instalar como PWA</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="terminal-arrow">→</span>
                    <span>Visita</span>
                    <span className="text-[var(--accent-green)]">/tpv</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="terminal-arrow">→</span>
                    <span>Click en</span>
                    <span className="text-[var(--accent-green)]">&quot;Instalar&quot;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="terminal-arrow">→</span>
                    <span className="text-[var(--text-muted)]">Listo!</span>
                    <span className="text-[var(--accent-green)]">✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Features list */}
            <div className="space-y-0">
              {features.map((feature, index) => (
                <div key={index} className="feature-row group">
                  <div className="feature-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <feature.icon className="w-5 h-5 text-[var(--accent-green)]" />
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                    </div>
                    <p className="text-[var(--text-muted)] leading-relaxed">{feature.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--accent-glow)_0%,_transparent_70%)] opacity-30" />

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-green)] mb-6 block">
              Empieza ahora
            </span>
            <h2
              className="text-4xl lg:text-6xl font-bold mb-8"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Listo para <span className="text-gradient">transformar</span>
              <br />
              tu negocio?
            </h2>
            <p className="text-xl text-[var(--text-muted)] mb-12 max-w-2xl mx-auto leading-relaxed">
              Prueba la version web directamente en tu navegador. Sin instalacion, sin registro. O
              descarga la app de escritorio para maximo rendimiento.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/tpv/index.html"
                className="group inline-flex items-center gap-3 bg-[var(--accent-green)] hover:bg-[var(--accent-green-dim)] text-[var(--bg-void)] px-8 py-5 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_40px_var(--accent-glow)] animate-glow-pulse"
              >
                <Play className="w-5 h-5" />
                Lanzar App Web
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </a>

              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-5 rounded-xl font-medium text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                Ver documentacion
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-12 bg-[var(--bg-primary)]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="TPV El Haido" width={32} height={32} />
              <span className="text-sm text-[var(--text-muted)]">
                TPV El Haido © {new Date().getFullYear()}
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Link
                href="/docs/introduccion/"
                className="text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
              >
                Introduccion
              </Link>
              <Link
                href="/docs/guia-usuario/"
                className="text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
              >
                Guia de Usuario
              </Link>
              <Link
                href="/docs/configuracion/"
                className="text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
              >
                Configuracion
              </Link>
              <Link
                href="/docs/descarga/"
                className="text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
              >
                Descargar
              </Link>
              <a
                href="/tpv/index.html"
                className="inline-flex items-center gap-2 text-[var(--accent-green)] hover:underline"
              >
                <span>Abrir App</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
