import { ok, type ResultError } from '@mks2508/no-throw';
import type { ThemeConfig } from '@mks2508/shadcn-basecoat-theme-manager';
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-solid';
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
import { createContextLogger } from '@/lib/logger';
import { createOperationStateSignal } from '@/lib/state-helpers';
import { useAppTheme } from '@/lib/theme-context';

const log = createContextLogger('ThemeSelector');

interface TweakCNTheme {
  name: string;
  label: string;
  category?: string;
  cssVars?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

interface ThemeSelectorProps {
  class?: string;
}

const ThemeSelector = (props: ThemeSelectorProps) => {
  const appTheme = useAppTheme();
  const [isImportDialogOpen, setIsImportDialogOpen] = createSignal(false);
  const [importUrl, setImportUrl] = createSignal('');
  const [previewTheme, setPreviewTheme] = createSignal<string | null>(null);
  const [touchModeEnabled, setTouchModeEnabled] = createSignal(
    document.documentElement.classList.contains('touch-mode')
  );
  const [tweakCNThemes, setTweakCNThemes] = createSignal<TweakCNTheme[]>([]);
  const [showTweakCNThemes, setShowTweakCNThemes] = createSignal(false);

  const importOp = createOperationStateSignal<void>();
  const loadTweakCNOp = createOperationStateSignal<TweakCNTheme[]>();
  const isImporting = () => importOp.state().status === 'pending';
  const isLoadingTweakCN = () => loadTweakCNOp.state().status === 'pending';

  // Load TweakCN themes on demand
  const loadTweakCNThemes = async () => {
    if (tweakCNThemes().length > 0) {
      setShowTweakCNThemes(!showTweakCNThemes());
      return;
    }

    await loadTweakCNOp.execute(async () => {
      const response = await fetch('https://tweakcn.com/r/registry.json');
      if (!response.ok) throw new Error('Failed to fetch registry');
      const data = await response.json();
      const themes = (data.themes || data.items || []) as TweakCNTheme[];
      setTweakCNThemes(themes);
      setShowTweakCNThemes(true);
      toast({
        title: 'Temas cargados',
        description: `Se encontraron ${themes.length} temas disponibles`,
      });
      return ok(themes);
    });
  };

  const handleInstallTweakCNTheme = async (theme: TweakCNTheme) => {
    await importOp.execute(async () => {
      const themeUrl = `https://tweakcn.com/r/themes/${theme.name}.json`;
      const response = await fetch(themeUrl);
      if (!response.ok) throw new Error('Failed to fetch theme');
      const themeData = await response.json();
      const themeManager = appTheme.themeManager();
      if (themeManager) {
        await themeManager.installTheme(
          { name: themeData.name || theme.name, cssVars: themeData.cssVars || {} },
          themeUrl
        );
        await appTheme.setTheme(themeData.name || theme.name);
        toast({
          title: 'Tema instalado',
          description: `"${theme.label || theme.name}" instalado correctamente`,
        });
      }
      return ok(undefined as undefined);
    });
    const s = importOp.state();
    if (s.status === 'failed') {
      log.error('Error installing theme', s.error as ResultError<string>);
      toast({
        title: 'Error',
        description: `No se pudo instalar "${theme.label || theme.name}"`,
        variant: 'destructive',
      });
    }
  };

  const isDarkMode = () => appTheme.effectiveMode() === 'dark';
  const currentTheme = () => appTheme.currentTheme();

  const handleToggle2State = async () => {
    const theme = appTheme.currentTheme();
    const mode = appTheme.effectiveMode();
    const next = mode === 'dark' ? 'light' : 'dark';
    await appTheme.setTheme(theme, next);
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

    await importOp.execute(async () => {
      let jsonUrl = importUrl();
      if (importUrl().includes('tweakcn.com/') && !importUrl().endsWith('.json')) {
        jsonUrl = `${importUrl().replace('/themes/', '/r/themes/')}.json`;
      }
      const response = await fetch(jsonUrl);
      if (!response.ok) throw new Error('Failed to fetch theme data');
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
      return ok(undefined as undefined);
    });

    const s = importOp.state();
    if (s.status === 'failed') {
      log.error('Error importing theme', s.error as ResultError<string>);
      toast({
        title: 'Error al importar tema',
        description: 'No se pudo importar el tema. Verifica la URL e inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const getCategoryIcon = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'built-in':
        return '🎨';
      case 'installed':
        return '📦';
      case 'custom':
        return '✏️';
      default:
        return '🎨';
    }
  };

  const getCategoryColor = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'built-in':
        return 'bg-primary/20 text-primary-foreground border-primary/20';
      case 'installed':
        return 'bg-secondary/20 text-secondary-foreground border-secondary/20';
      case 'custom':
        return 'bg-accent/20 text-accent-foreground border-accent/20';
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
            <Switch id="darkMode" checked={isDarkMode()} onChange={handleToggle2State} />
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
            <div class="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                class="flex-1 min-h-[var(--spacing-touch-target)] transition-transform duration-150 active:scale-[0.96]"
              >
                <Upload class="mr-2 h-4 w-4" />
                Importar URL
              </Button>
              <Button
                variant="outline"
                onClick={loadTweakCNThemes}
                disabled={isLoadingTweakCN()}
                class="flex-1 min-h-[var(--spacing-touch-target)] transition-transform duration-150 active:scale-[0.96]"
              >
                <Show when={isLoadingTweakCN()} fallback={<ExternalLink class="mr-2 h-4 w-4" />}>
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                </Show>
                {showTweakCNThemes() ? 'Ocultar' : 'Ver'} TweakCN
              </Button>
            </div>
          </div>

          {/* TweakCN Themes Gallery */}
          <Show when={showTweakCNThemes() && tweakCNThemes().length > 0}>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">Galería TweakCN ({tweakCNThemes().length} temas)</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTweakCNThemes([]);
                    loadTweakCNThemes();
                  }}
                  class="h-8 px-2"
                >
                  <RefreshCw class="h-3 w-3" />
                </Button>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                <For each={tweakCNThemes()}>
                  {(theme) => (
                    <Button
                      variant="outline"
                      class="h-auto py-3 px-3 flex flex-col items-start text-left transition-transform duration-150 active:scale-[0.96]"
                      onClick={() => handleInstallTweakCNTheme(theme)}
                      disabled={isImporting()}
                    >
                      <span class="font-medium text-sm truncate w-full">
                        {theme.label || theme.name}
                      </span>
                      <Show when={theme.category}>
                        <Badge variant="secondary" class="mt-1 text-xs">
                          {theme.category}
                        </Badge>
                      </Show>
                    </Button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Theme Preview Controls */}
          <Show when={previewTheme()}>
            <div class="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p class="text-sm font-medium mb-2">Vista previa activa</p>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirmPreview}
                  class="min-h-[var(--spacing-touch-target)]"
                >
                  <Check class="mr-1 h-3 w-3" />
                  Aplicar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelPreview}
                  class="min-h-[var(--spacing-touch-target)]"
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
              <For each={appTheme.availableThemes()}>
                {(theme) => (
                  <Card
                    class={`cursor-pointer transition-[transform,box-shadow] rounded-md hover:shadow-md active:translate-y-px ${
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
                          {theme.label || theme.name}
                        </CardTitle>
                        <Show when={currentTheme() === theme.id}>
                          <Check class="h-4 w-4 text-primary" />
                        </Show>
                      </div>
                    </CardHeader>
                    <CardContent class="space-y-3">
                      <Show when={theme.description}>
                        <p class="text-xs text-muted-foreground">{theme.description}</p>
                      </Show>
                      <Badge variant="secondary" class={getCategoryColor(theme.category)}>
                        {theme.category}
                      </Badge>
                      {/* Color Preview */}
                      <Show when={theme.preview}>
                        <div class="flex gap-1">
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview.primary }}
                            title="Color primario"
                          />
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview.background }}
                            title="Color de fondo"
                          />
                          <div
                            class="w-4 h-4 rounded-full border border-border"
                            style={{ 'background-color': theme.preview.accent }}
                            title="Color de acento"
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
              class="min-h-[var(--spacing-touch-target)] px-4 py-3 text-base rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              class="min-h-[var(--spacing-touch-target)]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportFromTweakCN}
              disabled={isImporting() || !importUrl()}
              class="min-h-[var(--spacing-touch-target)]"
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
