import { Check, Download, Moon, Palette, Sun, Upload } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { useAppTheme } from '@/lib/theme-context';
import { PRESET_THEMES } from '@/lib/themes/preset-themes';
import type { ThemeConfig } from '@/lib/themes/theme-config';

interface ThemeSelectorProps {
  class?: string;
}

const ThemeSelector = (props: ThemeSelectorProps) => {
  const appTheme = useAppTheme();
  const [isImportDialogOpen, setIsImportDialogOpen] = createSignal(false);
  const [importUrl, setImportUrl] = createSignal('');
  const [isImporting, setIsImporting] = createSignal(false);
  const [previewTheme, setPreviewTheme] = createSignal<string | null>(null);
  const [touchModeEnabled, setTouchModeEnabled] = createSignal(
    document.documentElement.classList.contains('touch-mode')
  );

  const isDarkMode = () => appTheme.effectiveMode() === 'dark';
  const currentTheme = () => appTheme.currentTheme();

  const handleThemeSelect = async (themeId: string) => {
    await appTheme.setTheme(themeId);
    setPreviewTheme(null);
  };

  const handleDarkModeToggle = () => {
    appTheme.toggleMode();
  };

  const handleTouchModeToggle = (enabled: boolean) => {
    setTouchModeEnabled(enabled);
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('touch-mode');
    } else {
      root.classList.remove('touch-mode');
    }
  };

  const handlePreviewTheme = async (themeId: string) => {
    setPreviewTheme(themeId);
    await appTheme.setTheme(themeId);
  };

  const handleCancelPreview = async () => {
    const previousTheme = currentTheme();
    setPreviewTheme(null);
    if (previousTheme) {
      await appTheme.setTheme(previousTheme);
    }
  };

  const handleConfirmPreview = () => {
    setPreviewTheme(null);
  };

  const handleImportFromTweakCN = async () => {
    if (!importUrl()) {
      toast({
        title: 'Error',
        description: 'Por favor, ingresa una URL válida de TweakCN',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      let jsonUrl = importUrl();
      if (importUrl().includes('tweakcn.com/') && !importUrl().endsWith('.json')) {
        jsonUrl = `${importUrl().replace('/themes/', '/r/themes/')}.json`;
      }

      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch theme data');
      }

      const themeData = await response.json();

      const themeManager = appTheme.themeManager();
      if (themeManager) {
        await themeManager.installTheme(
          {
            name: themeData.name || `custom-${Date.now()}`,
            cssVars: themeData.cssVars || themeData.colors || {},
          },
          importUrl()
        );
        await appTheme.setTheme(themeData.name || `custom-${Date.now()}`);
      }

      toast({
        title: 'Tema importado',
        description: `Tema "${themeData.name || 'Personalizado'}" importado exitosamente`,
      });

      setIsImportDialogOpen(false);
      setImportUrl('');
    } catch (error) {
      console.error('Error importing theme:', error);
      toast({
        title: 'Error al importar tema',
        description: 'No se pudo importar el tema. Verifica la URL e inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getCategoryIcon = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'restaurant':
        return '🍽️';
      case 'cafe':
        return '☕';
      case 'bar':
        return '🍸';
      case 'accessibility':
        return '♿';
      default:
        return '🎨';
    }
  };

  const getCategoryColor = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'restaurant':
        return 'bg-accent/20 text-accent-foreground border-accent/20';
      case 'cafe':
        return 'bg-secondary/20 text-secondary-foreground border-secondary/20';
      case 'bar':
        return 'bg-primary/20 text-primary-foreground border-primary/20';
      case 'accessibility':
        return 'bg-muted/20 text-muted-foreground border-muted/20';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div class={props.class}>
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Palette class="h-5 w-5" />
            Selector de Temas
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          {/* Theme Controls */}
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <Label for="darkMode" class="flex items-center gap-2">
                {isDarkMode() ? <Moon class="h-4 w-4" /> : <Sun class="h-4 w-4" />}
                Modo Oscuro
              </Label>
              <p class="text-xs text-muted-foreground">
                Activa el tema oscuro para ambientes con poca luz
              </p>
            </div>
            <Switch id="darkMode" checked={isDarkMode()} onChange={handleDarkModeToggle} />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <Label for="touchMode">Modo Táctil Optimizado</Label>
              <p class="text-xs text-muted-foreground">
                Aumenta el tamaño de botones y mejora la respuesta táctil
              </p>
            </div>
            <Switch id="touchMode" checked={touchModeEnabled()} onChange={handleTouchModeToggle} />
          </div>

          {/* Import Theme */}
          <div class="space-y-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              class="w-full touch-target touch-feedback"
            >
              <Upload class="mr-2 h-4 w-4" />
              Importar desde TweakCN
            </Button>
          </div>

          {/* Theme Preview Controls */}
          <Show when={previewTheme()}>
            <div class="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p class="text-sm font-medium mb-2">Vista previa activa</p>
              <div class="flex gap-2">
                <Button size="sm" onClick={handleConfirmPreview} class="touch-target">
                  <Check class="mr-1 h-3 w-3" />
                  Aplicar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelPreview}
                  class="touch-target"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Show>

          {/* Theme Grid */}
          <div class="space-y-4">
            <h4 class="font-medium">Temas Disponibles</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <For each={PRESET_THEMES}>
                {(theme) => (
                  <Card
                    class={`cursor-pointer transition-all touch-enhanced ${
                      currentTheme() === theme.id
                        ? 'ring-2 ring-primary shadow-md'
                        : 'hover:shadow-md'
                    } ${previewTheme() === theme.id ? 'ring-2 ring-accent' : ''}`}
                    onClick={() =>
                      previewTheme() ? handleConfirmPreview() : handlePreviewTheme(theme.id)
                    }
                  >
                    <CardHeader class="pb-2">
                      <div class="flex items-center justify-between">
                        <CardTitle class="text-sm flex items-center gap-2">
                          <span class="text-base">{getCategoryIcon(theme.category)}</span>
                          {theme.name}
                        </CardTitle>
                        <Show when={currentTheme() === theme.id}>
                          <Check class="h-4 w-4 text-primary" />
                        </Show>
                      </div>
                    </CardHeader>
                    <CardContent class="space-y-3">
                      <p class="text-xs text-muted-foreground">{theme.description}</p>

                      <Badge variant="secondary" class={getCategoryColor(theme.category)}>
                        {theme.category}
                      </Badge>

                      {/* Color Preview */}
                      <Show when={theme.preview}>
                        <div class="flex gap-1">
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview!.primaryColor }}
                            title="Color primario"
                          />
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview!.secondaryColor }}
                            title="Color secundario"
                          />
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview!.backgroundColor }}
                            title="Color de fondo"
                          />
                        </div>
                      </Show>
                    </CardContent>
                  </Card>
                )}
              </For>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen()} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Tema desde TweakCN</DialogTitle>
            <DialogDescription>
              Ingresa la URL del tema de TweakCN que deseas importar. Ejemplo:
              https://tweakcn.com/themes/theme-name
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4">
            <Input
              placeholder="https://tweakcn.com/themes/..."
              value={importUrl()}
              onInput={(e) => setImportUrl(e.currentTarget.value)}
              class="touch-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              class="touch-target"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportFromTweakCN}
              disabled={isImporting() || !importUrl()}
              class="touch-target"
            >
              <Show
                when={isImporting()}
                fallback={
                  <>
                    <Download class="mr-2 h-4 w-4" />
                    Importar Tema
                  </>
                }
              >
                <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Importando...
              </Show>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThemeSelector;
