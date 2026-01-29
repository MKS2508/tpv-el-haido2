import { Bug, Database } from 'lucide-solid';
import { createSignal, onMount, Show } from 'solid-js';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useStore from '@/store/store';

interface DebugIndicatorProps {
  class?: string;
}

function DebugIndicator(props: DebugIndicatorProps) {
  const store = useStore();
  const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);

  onMount(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const handleToggleDebug = () => {
    store.setDebugMode(!store.state.debugMode);
  };

  return (
    <Show when={store.state.debugMode}>
      <div class={cn('fixed z-50 screenshot-hide', isMobile() ? 'top-2 right-2' : 'top-4 right-4', props.class)}>
        <div class="flex flex-col gap-2 items-end">
          {/* Debug Mode Badge */}
          <Badge
            variant="secondary"
            class={cn(
              'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
              isMobile() ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5',
              'cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors'
            )}
            onClick={handleToggleDebug}
          >
            <Bug class={cn('mr-1', isMobile() ? 'w-3 h-3' : 'w-4 h-4')} />
            DEBUG MODE
          </Badge>

          {/* Backend Connection Status */}
          <Badge
            variant="outline"
            class={cn(
              store.state.isBackendConnected
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
              isMobile() ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
            )}
          >
            <Database class={cn('mr-1', isMobile() ? 'w-3 h-3' : 'w-4 h-4')} />
            {store.state.isBackendConnected ? 'Backend Online' : 'Fallback Data'}
          </Badge>
        </div>
      </div>
    </Show>
  );
}

export default DebugIndicator;
