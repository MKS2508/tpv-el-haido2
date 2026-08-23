import { Motion } from '@motionone/solid';
import { onMount } from 'solid-js';

interface AppSplashScreenProps {
  onComplete: () => void;
}

export default function AppSplashScreen(props: AppSplashScreenProps) {
  onMount(() => {
    const t = setTimeout(() => props.onComplete(), 1500);
    return () => clearTimeout(t);
  });

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, easing: [0.16, 1, 0.3, 1] }}
        class="flex flex-col items-center space-y-6"
      >
        <img src="/logo.svg" alt="TPV El Haido" class="w-24 h-24" />
        <div class="text-center space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-foreground">TPV El Haido</h1>
          <p class="text-sm text-muted-foreground tracking-wide">Point of Sale</p>
        </div>
      </Motion.div>
    </div>
  );
}
