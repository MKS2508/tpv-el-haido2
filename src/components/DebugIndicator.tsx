import { Bug, Database } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import useStore from '@/store/store';

interface DebugIndicatorProps {
  className?: string;
}

const DebugIndicator: React.FC<DebugIndicatorProps> = ({ className }) => {
  const { debugMode, isBackendConnected, setDebugMode } = useStore();

  const { isMobile } = useResponsive();

  if (!debugMode) {
    return null;
  }

  const handleToggleDebug = () => {
    setDebugMode(!debugMode);
  };

  return (
    <div className={cn('fixed z-50', isMobile ? 'top-2 right-2' : 'top-4 right-4', className)}>
      <div className="flex flex-col gap-2 items-end">
        {/* Debug Mode Badge */}
        <Badge
          variant="secondary"
          className={cn(
            'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
            isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5',
            'cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors'
          )}
          onClick={handleToggleDebug}
        >
          <Bug className={cn('mr-1', isMobile ? 'w-3 h-3' : 'w-4 h-4')} />
          DEBUG MODE
        </Badge>

        {/* Backend Connection Status */}
        <Badge
          variant="outline"
          className={cn(
            isBackendConnected
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
            isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
          )}
        >
          {isBackendConnected ? (
            <>
              <Database className={cn('mr-1', isMobile ? 'w-3 h-3' : 'w-4 h-4')} />
              Backend Online
            </>
          ) : (
            <>
              <Database className={cn('mr-1', isMobile ? 'w-3 h-3' : 'w-4 h-4')} />
              Fallback Data
            </>
          )}
        </Badge>
      </div>
    </div>
  );
};

export default DebugIndicator;
