import { Motion } from '@motionone/solid';
import { createSignal, For, onMount, Show } from 'solid-js';

interface AppSplashScreenProps {
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
}

export default function AppSplashScreen(props: AppSplashScreenProps) {
  const [phase, setPhase] = createSignal<'intro' | 'reveal' | 'hold' | 'exit'>('intro');
  const [particles] = createSignal<Particle[]>(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    }))
  );

  onMount(() => {
    // Orchestrated animation sequence
    const timeline = [
      { action: () => setPhase('reveal'), delay: 100 },
      { action: () => setPhase('hold'), delay: 1400 },
      { action: () => setPhase('exit'), delay: 2200 },
      { action: () => props.onComplete(), delay: 2700 },
    ];

    timeline.forEach(({ action, delay }) => setTimeout(action, delay));
  });

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-stone-950">
      {/* Animated gradient mesh background */}
      <div class="absolute inset-0 opacity-40">
        <div class="absolute inset-0 bg-gradient-to-br from-amber-600/20 via-transparent to-stone-900 animate-pulse" />
        <div class="absolute inset-0 bg-gradient-to-tr from-rose-900/10 via-transparent to-amber-900/20" />
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-900/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Art Deco geometric frame - top */}
      <Motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase() !== 'intro' ? 1 : 0, opacity: phase() !== 'intro' ? 1 : 0 }}
        transition={{ duration: 0.8, easing: [0.16, 1, 0.3, 1] }}
        class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
      />
      <Motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase() !== 'intro' ? 1 : 0, opacity: phase() !== 'intro' ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.1, easing: [0.16, 1, 0.3, 1] }}
        class="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
      />

      {/* Art Deco geometric frame - bottom */}
      <Motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase() !== 'intro' ? 1 : 0, opacity: phase() !== 'intro' ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.15, easing: [0.16, 1, 0.3, 1] }}
        class="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
      />
      <Motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase() !== 'intro' ? 1 : 0, opacity: phase() !== 'intro' ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.25, easing: [0.16, 1, 0.3, 1] }}
        class="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
      />

      {/* Art Deco corner accents */}
      <For
        each={[
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ]}
      >
        {([row, col]) => (
          <Motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: phase() !== 'intro' ? 1 : 0,
              opacity: phase() !== 'intro' ? 0.6 : 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.2 + (row + col) * 0.1,
              easing: [0.34, 1.56, 0.64, 1],
            }}
            class={`absolute w-16 h-16 border-l-2 border-t-2 border-amber-400/40 ${
              row === 0 ? 'top-8' : 'bottom-8'
            } ${col === 0 ? 'left-8' : 'right-8'} ${col === 1 ? 'rotate-180' : ''} ${
              row === 1 ? 'rotate-180' : ''
            }`}
          />
        )}
      </For>

      {/* Champagne bubble particles */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <For each={particles()}>
          {(particle) => (
            <Motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{
                y: '-10%',
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                easing: 'ease-in',
              }}
              class="absolute w-1 h-1 bg-amber-300/30 rounded-full"
              style={{ left: `${particle.x}%` }}
            />
          )}
        </For>
      </div>

      {/* Main content */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: phase() === 'exit' ? 0 : phase() !== 'intro' ? 1 : 0,
          scale: phase() === 'exit' ? 1.05 : phase() !== 'intro' ? 1 : 0.95,
        }}
        transition={{ duration: 0.8, easing: [0.16, 1, 0.3, 1] }}
        class="relative z-10 flex flex-col items-center space-y-6"
      >
        {/* Logo with glow effect */}
        <Motion.div
          initial={{ rotate: -5, opacity: 0 }}
          animate={{
            rotate: phase() !== 'intro' ? 0 : -5,
            opacity: phase() !== 'intro' ? 1 : 0,
          }}
          transition={{ duration: 1, delay: 0.3, easing: [0.34, 1.56, 0.64, 1] }}
          class="relative"
        >
          <div class="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-br from-amber-200/10 to-rose-200/10 rounded-full blur-xl" />
            <img src="/logo.svg" alt="TPV El Haido" class="relative w-32 h-32 drop-shadow-2xl" />
          </div>
        </Motion.div>

        {/* App name with elegant typography */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase() !== 'intro' ? 1 : 0,
            y: phase() !== 'intro' ? 0 : 20,
          }}
          transition={{ duration: 0.8, delay: 0.5, easing: [0.16, 1, 0.3, 1] }}
          class="text-center space-y-3"
        >
          <h1 class="text-5xl font-bold tracking-tight">
            <span class="bg-gradient-to-r from-amber-200 via-amber-100 to-rose-100 bg-clip-text text-transparent">
              TPV
            </span>
            <span class="block text-3xl font-light text-stone-200 mt-1">El Haido</span>
          </h1>
          <div class="flex items-center justify-center space-x-4">
            <div class="w-12 h-px bg-gradient-to-r from-transparent to-amber-400/60" />
            <p class="text-xs tracking-[0.3em] uppercase text-amber-200/70 font-light">
              Point of Sale
            </p>
            <div class="w-12 h-px bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
        </Motion.div>

        {/* Elegant loading indicator */}
        <Show when={phase() === 'hold'}>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class="flex items-center justify-center space-x-2 pt-6"
          >
            <For each={[0, 1, 2]}>
              {(i) => (
                <div
                  class="w-2 h-2 bg-amber-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]"
                  style={{ 'animation-delay': `${i * 0.15}s` }}
                />
              )}
            </For>
          </Motion.div>
        </Show>
      </Motion.div>

      {/* Geometric overlay pattern */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase() !== 'intro' ? 0.03 : 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        class="absolute inset-0 pointer-events-none"
        style={{
          'background-image': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='%23d97706' stroke-width='0.5'/%3E%3C/svg%3E")`,
          'background-size': '60px 60px',
        }}
      />
    </div>
  );
}
