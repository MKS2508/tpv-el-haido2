import { CameraIcon, CheckIcon, Loader2Icon, XIcon } from 'lucide-solid';
import { createMemo, createSignal, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScreenshot } from '@/hooks/useScreenshot';
import { cn } from '@/lib/utils';
import {
  type ScreenshotContext,
  SECTION_LABELS,
  SECTION_NUMBERS,
  SETTINGS_TAB_LABELS,
  VIEW_STATE_LABELS,
  type ViewState,
} from '@/types/screenshot';

interface ScreenshotOverlayProps {
  activeSection: string;
}

function ScreenshotOverlay(props: ScreenshotOverlayProps) {
  const screenshot = useScreenshot();

  const [isExpanded, setIsExpanded] = createSignal(false);
  const [customName, setCustomName] = createSignal('');
  const [copyToClipboard, setCopyToClipboard] = createSignal(true);
  const [saveToFile, setSaveToFile] = createSignal(true);
  const [showSuccess, setShowSuccess] = createSignal(false);
  const [context, setContext] = createSignal<ScreenshotContext | null>(null);

  // Detectar contexto al montar o cambiar sección
  const detectContext = (): ScreenshotContext => {
    const section = props.activeSection;
    const sectionLabel = SECTION_LABELS[section] || section;

    // Detectar sub-tab en settings
    let subSection: string | undefined;
    let subSectionLabel: string | undefined;

    if (section === 'settings') {
      // Buscar el tab activo en settings
      // Koblate usa data-selected, no data-state
      const activeTab = document.querySelector('[data-selected="true"][role="tab"][data-value]');
      if (activeTab) {
        const tabValue = activeTab.getAttribute('data-value');
        if (tabValue && SETTINGS_TAB_LABELS[tabValue]) {
          subSection = tabValue;
          subSectionLabel = SETTINGS_TAB_LABELS[tabValue];
        }
      }
    }

    // Detectar estado de vista
    const viewState = detectViewState(section);

    // Contar elementos visibles
    const entityCount = countVisibleEntities(section, viewState);

    return {
      section,
      sectionLabel,
      subSection,
      subSectionLabel,
      viewState,
      entityCount,
    };
  };

  const detectViewState = (section: string): ViewState => {
    // Para settings, siempre es panel
    if (section === 'settings') {
      return 'panel';
    }

    // Buscar indicadores de vista de detalle (dialog abierto)
    const dialogOpen = document.querySelector('[role="dialog"][data-state="open"]');
    if (dialogOpen) {
      return 'detail';
    }

    // Buscar indicadores de formulario
    const forms = document.querySelectorAll('form:not([data-view="list"])');
    if (forms.length > 0 && !document.querySelector('[data-form="list"]')) {
      return 'form';
    }

    // Buscar indicadores de panel vacío
    const emptyState = document.querySelector('[data-empty="true"], .empty-state');
    if (emptyState) {
      return 'empty';
    }

    // Por defecto, es una lista
    return 'list';
  };

  const countVisibleEntities = (section: string, viewState: ViewState): number | undefined => {
    // No contar en vista de detalle o formulario
    if (viewState === 'detail' || viewState === 'form' || viewState === 'panel') {
      return undefined;
    }

    const selectors: Record<string, string> = {
      products: '[data-product-id]',
      customers: '[data-customer-id]',
      aeatInvoices: '[data-invoice-id]',
      newOrder: '[data-order-item]',
      orderHistory: '[data-order-id]',
    };

    const selector = selectors[section];
    if (selector) {
      const elements = document.querySelectorAll(selector);
      return elements.length > 0 ? elements.length : undefined;
    }

    return undefined;
  };

  const generateFilename = (ctx: ScreenshotContext): string => {
    const { section, subSection, viewState, entityCount } = ctx;

    // Casos especiales con números específicos
    if (section === 'settings' && subSection === 'usuarios') {
      return '02_settings_usuarios';
    }
    if (section === 'settings' && subSection === 'verifactu') {
      return '08_settings_verifactu';
    }
    if (section === 'settings' && subSection === 'about') {
      return '10_settings_about';
    }
    if (section === 'settings' && subSection === 'appearance') {
      return '12_settings_appearance';
    }
    if (section === 'aeatInvoices' && viewState === 'detail') {
      return '09_aeatInvoices_detail';
    }

    // Obtener número de sección
    let sectionNumber = SECTION_NUMBERS[section] || '00';

    // Para settings con sub-section, usar el número específico si existe
    if (section === 'settings' && subSection) {
      const specialKey = `settings_${subSection}` as keyof typeof SECTION_NUMBERS;
      if (SECTION_NUMBERS[specialKey]) {
        sectionNumber = SECTION_NUMBERS[specialKey];
      }
    }

    // Base del nombre
    const parts = [sectionNumber, section];

    // Agregar sub-sección si existe
    if (subSection) {
      parts.push(subSection);
    }

    // Agregar estado de vista si no es el default
    if (viewState !== 'list' && viewState !== 'panel') {
      parts.push(viewState);
    }

    // Agregar conteo si es relevante
    if (entityCount !== undefined && entityCount > 0) {
      parts.push(`${entityCount}items`);
    }

    return parts.join('_');
  };

  const suggestedFilename = createMemo(() => {
    const ctx = context();
    if (!ctx) return '01_screenshot';
    return generateFilename(ctx);
  });

  const finalFilename = createMemo(() => customName() || suggestedFilename());

  // Detectar contexto al montar y cuando se expande
  onMount(() => {
    setContext(detectContext());
  });

  const handleExpand = () => {
    setIsExpanded(true);
    // Re-detectar contexto cuando se abre el panel
    setTimeout(() => {
      setContext(detectContext());
      console.log('[Screenshot] Contexto detectado:', context());
    }, 50);
  };

  const handleCapture = async () => {
    // Ocultar overlay temporalmente
    setIsExpanded(false);

    // Pequeño delay para que se oculte el overlay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const target = (document.querySelector('main') as HTMLElement) || document.body;

    const success = await screenshot.capture(target, {
      filename: finalFilename(),
      copyToClipboard: copyToClipboard(),
      saveToFile: saveToFile(),
      context: context() ?? undefined,
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }

    setCustomName('');
  };

  const viewStateLabel = createMemo(() => {
    const ctx = context();
    if (!ctx) return '';
    return VIEW_STATE_LABELS[ctx.viewState] || ctx.viewState;
  });

  const entityCountText = createMemo(() => {
    const ctx = context();
    if (!ctx || ctx.entityCount === undefined) return '';
    return `${ctx.entityCount} elementos`;
  });

  return (
    <div class="fixed bottom-24 right-4 z-[9999] md:bottom-4 screenshot-hide">
      {/* Botón flotante */}
      <Show when={!isExpanded()}>
        <Button
          onClick={handleExpand}
          class={cn(
            'h-14 w-14 rounded-full shadow-lg',
            showSuccess() && 'bg-green-500 hover:bg-green-600'
          )}
        >
          <Show when={showSuccess()} fallback={<CameraIcon class="h-6 w-6" />}>
            <CheckIcon class="h-6 w-6" />
          </Show>
        </Button>
      </Show>

      {/* Panel expandido */}
      <Show when={isExpanded()}>
        <div class="w-80 rounded-lg border border-border bg-card p-4 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <CameraIcon class="h-4 w-4" />
              Captura de Pantalla
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
              <XIcon class="h-4 w-4" />
            </Button>
          </div>

          <Show when={context()}>
            {(ctx) => (
              <div class="space-y-3">
                {/* Sección actual */}
                <div class="text-sm">
                  <span class="text-muted-foreground">Sección: </span>
                  <span class="font-medium">{ctx().sectionLabel}</span>
                </div>

                {/* Sub-sección si existe */}
                <Show when={ctx().subSection}>
                  <div class="text-sm">
                    <span class="text-muted-foreground">Sub-sección: </span>
                    <span class="font-medium">{ctx().subSectionLabel}</span>
                  </div>
                </Show>

                {/* Estado de vista */}
                <div class="text-sm">
                  <span class="text-muted-foreground">Vista: </span>
                  <span class="font-medium">{viewStateLabel()}</span>
                </div>

                {/* Conteo de elementos si existe */}
                <Show when={ctx().entityCount !== undefined}>
                  <div class="text-sm">
                    <span class="text-muted-foreground">Elementos: </span>
                    <span class="font-medium">{entityCountText()}</span>
                  </div>
                </Show>
              </div>
            )}
          </Show>

          <div class="space-y-3 mt-4">
            {/* Nombre de archivo */}
            <div class="space-y-1">
              <label class="text-sm text-muted-foreground">Nombre archivo:</label>
              <Input
                value={customName()}
                onInput={(e) => setCustomName(e.currentTarget.value)}
                placeholder={suggestedFilename()}
              />
              <p class="text-xs text-muted-foreground">Se guardará como: {finalFilename()}.png</p>
            </div>

            {/* Opciones */}
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={copyToClipboard()}
                  onChange={(e) => setCopyToClipboard(e.currentTarget.checked)}
                  class="h-4 w-4 rounded"
                />
                Copiar al portapapeles
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveToFile()}
                  onChange={(e) => setSaveToFile(e.currentTarget.checked)}
                  class="h-4 w-4 rounded"
                />
                Guardar archivo
              </label>
            </div>

            {/* Error */}
            <Show when={screenshot.error()}>
              <p class="text-sm text-destructive">{screenshot.error()}</p>
            </Show>

            {/* Botón capturar */}
            <Button
              onClick={handleCapture}
              disabled={screenshot.isCapturing() || (!copyToClipboard() && !saveToFile())}
              class="w-full"
            >
              <Show
                when={!screenshot.isCapturing()}
                fallback={
                  <>
                    <Loader2Icon class="h-4 w-4 mr-2 animate-spin" /> Capturando...
                  </>
                }
              >
                <CameraIcon class="h-4 w-4 mr-2" />
                Capturar
              </Show>
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default ScreenshotOverlay;
