// src/hooks/use-theme-density.ts

import { createMemo } from 'solid-js';
import { useAppTheme } from '@/lib/theme-context';

export type Density = 'compact' | 'comfortable';

export function useThemeDensity(): () => Density {
  const { currentTheme } = useAppTheme();

  return createMemo<Density>(() => {
    const t = currentTheme();
    if (t === 'synthwave84') return 'compact';
    return 'comfortable';
  });
}
