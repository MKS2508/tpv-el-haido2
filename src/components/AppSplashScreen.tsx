import { Motion } from '@motionone/solid';
import { createSignal, onMount, Show } from 'solid-js';
import { Loader2 } from 'lucide-solid';

interface AppSplashScreenProps {
  onComplete: () => void;
}

export default function AppSplashScreen(props: AppSplashScreenProps) {
  const [showLogo, setShowLogo] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [fadeOut, setFadeOut] = createSignal(false);

  onMount(() => {
    // Logo animation sequence
    setTimeout(() => setShowLogo(true), 100);
    setTimeout(() => setIsLoading(false), 1200);
    setTimeout(() => setFadeOut(true), 1800);
    setTimeout(() => props.onComplete(), 2300);
  });

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: fadeOut() ? 0 : 1,
          scale: fadeOut() ? 1.1 : 1,
        }}
        transition={{ duration: fadeOut() ? 0.5 : 0.6 }}
        class="relative"
      >
        <div class="flex flex-col items-center space-y-8">
          <Motion.div
            initial={{ rotate: -10, opacity: 0 }}
            animate={{
              rotate: showLogo() ? 0 : -10,
              opacity: showLogo() ? 1 : 0,
            }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <img
              src="/logo.svg"
              alt="TPV El Haido"
              class="w-40 h-40 drop-shadow-2xl"
            />
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: showLogo() ? 1 : 0,
              y: showLogo() ? 0 : 20,
            }}
            transition={{ duration: 0.6, delay: 0.5 }}
            class="text-center space-y-2"
          >
            <h1 class="text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent">
              TPV El Haido
            </h1>
            <p class="text-slate-400 text-sm tracking-widest uppercase">
              Point of Sale System
            </p>
          </Motion.div>

          <Show when={isLoading()}>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              class="pt-4"
            >
              <Loader2 class="h-8 w-8 animate-spin text-amber-500/60" />
            </Motion.div>
          </Show>

          {/* Decorative elements */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: showLogo() ? 0.1 : 0,
              scale: showLogo() ? 1 : 0.5,
            }}
            transition={{ duration: 1, delay: 0.3 }}
            class="absolute -top-20 -left-20 w-40 h-40 bg-amber-500 rounded-full blur-3xl"
          />
          <Motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: showLogo() ? 0.1 : 0,
              scale: showLogo() ? 1 : 0.5,
            }}
            transition={{ duration: 1, delay: 0.4 }}
            class="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-600 rounded-full blur-3xl"
          />
        </div>
      </Motion.div>
    </div>
  );
}
