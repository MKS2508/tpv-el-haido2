import { Palette, Settings } from 'lucide-solid';
import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModeToggle } from './ModeToggleSolid';
import ThemeSelector from './ThemeSelector';

export function ThemeSwitcher() {
  const [showThemeManagement, setShowThemeManagement] = createSignal(false);
  const [showFontSettings, setShowFontSettings] = createSignal(false);

  return (
    <>
      <div class="flex items-center gap-2">
        <ThemeSelector />
        <ModeToggle />
        <Button variant="outline" size="sm" onClick={() => setShowThemeManagement(true)}>
          <Palette class="h-4 w-4 mr-2" />
          Temas
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFontSettings(true)}>
          <Settings class="h-4 w-4 mr-2" />
          Fuentes
        </Button>
      </div>

      <Dialog open={showThemeManagement()} onOpenChange={setShowThemeManagement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestión de Temas</DialogTitle>
          </DialogHeader>
          <p class="text-sm text-muted-foreground">
            La gestión de temas avanzada está disponible a través del selector de temas.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={showFontSettings()} onOpenChange={setShowFontSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de Fuentes</DialogTitle>
          </DialogHeader>
          <p class="text-sm text-muted-foreground">
            La configuración de fuentes está disponible en el selector de temas.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ThemeSwitcher;
