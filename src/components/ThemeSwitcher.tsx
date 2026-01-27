'use client';

import { useState, lazy, Suspense } from 'react';
import { Settings, Palette } from 'lucide-react';
import { ThemeSelector, ModeToggle } from '@mks2508/theme-manager-react';
import { Button } from '@/components/ui/button';

const ThemeManagementModal = lazy(() =>
  import('@mks2508/theme-manager-react').then((m) => ({ default: m.ThemeManagementModal }))
);
const FontSettingsModal = lazy(() =>
  import('@mks2508/theme-manager-react').then((m) => ({ default: m.FontSettingsModal }))
);

export function ThemeSwitcher() {
  const [showThemeManagement, setShowThemeManagement] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <ThemeSelector
          onThemeManagement={() => setShowThemeManagement(true)}
          onFontSettings={() => setShowFontSettings(true)}
        />
        <ModeToggle />
        <Button variant="outline" size="sm" onClick={() => setShowThemeManagement(true)}>
          <Palette className="h-4 w-4 mr-2" />
          Temas
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFontSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Fuentes
        </Button>
      </div>

      <Suspense fallback={null}>
        {showThemeManagement && (
          <ThemeManagementModal
            open={showThemeManagement}
            onOpenChange={setShowThemeManagement}
          />
        )}
        {showFontSettings && (
          <FontSettingsModal open={showFontSettings} onOpenChange={setShowFontSettings} />
        )}
      </Suspense>
    </>
  );
}

export default ThemeSwitcher;
