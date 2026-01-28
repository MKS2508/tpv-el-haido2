import { Moon, Sun } from 'lucide-solid';
import { createSignal, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useThemeSolid';

export function ModeToggle() {
  const { settings, toggleDarkMode } = useTheme();
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setMounted(true);
  });

  return (
    <Show
      when={mounted()}
      fallback={
        <Button variant="ghost" size="icon" disabled class="h-9 w-9">
          <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span class="sr-only">Toggle theme</span>
        </Button>
      }
    >
      <Button variant="ghost" size="icon" onClick={toggleDarkMode} class="h-9 w-9">
        <Show
          when={settings().darkMode}
          fallback={
            <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          }
        >
          <Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Show>
        <span class="sr-only">Toggle theme</span>
      </Button>
    </Show>
  );
}
