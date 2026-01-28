import { createSignal, createMemo, Show } from 'solid-js';
import { CameraIcon, XIcon, CheckIcon, Loader2Icon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useScreenshot } from '@/hooks/useScreenshot';

// Mapeo de secciones a nombres de archivo
const SECTION_CONFIG: Record<string, { number: string; label: string }> = {
  login: { number: '01', label: 'Login' },
  home: { number: '01', label: 'Inicio' },
  settings_usuarios: { number: '02', label: 'Usuarios' },
  products: { number: '03', label: 'Productos' },
  customers: { number: '04', label: 'Clientes' },
  newOrder: { number: '05', label: 'Nueva Comanda' },
  orderHistory: { number: '06', label: 'Historial' },
  aeatInvoices: { number: '07', label: 'Facturas AEAT' },
  settings_verifactu: { number: '08', label: 'VERI*FACTU' },
  aeatInvoices_detail: { number: '09', label: 'Detalle Factura' },
  settings_about: { number: '10', label: 'Acerca de / Actualizaciones' },
  settings: { number: '11', label: 'Ajustes' },
  settings_appearance: { number: '12', label: 'Temas y Apariencia' },
};

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

  const sectionConfig = createMemo(() =>
    SECTION_CONFIG[props.activeSection] || { number: '00', label: props.activeSection }
  );

  const suggestedFilename = createMemo(() =>
    `${sectionConfig().number}_${props.activeSection}`
  );

  const finalFilename = createMemo(() =>
    customName() || suggestedFilename()
  );

  const handleCapture = async () => {
    // Ocultar overlay temporalmente
    setIsExpanded(false);

    // Pequeño delay para que se oculte el overlay
    await new Promise(resolve => setTimeout(resolve, 100));

    const target = document.querySelector('main') as HTMLElement || document.body;

    const success = await screenshot.capture(target, {
      filename: finalFilename(),
      copyToClipboard: copyToClipboard(),
      saveToFile: saveToFile(),
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }

    setCustomName('');
  };

  return (
    <div class="fixed bottom-24 right-4 z-[9999] md:bottom-4">
      {/* Botón flotante */}
      <Show when={!isExpanded()}>
        <Button
          onClick={() => setIsExpanded(true)}
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
        <div class="w-72 rounded-lg border border-border bg-card p-4 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <CameraIcon class="h-4 w-4" />
              Captura de Pantalla
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
              <XIcon class="h-4 w-4" />
            </Button>
          </div>

          <div class="space-y-3">
            {/* Sección actual */}
            <div class="text-sm">
              <span class="text-muted-foreground">Sección: </span>
              <span class="font-medium">{sectionConfig().label}</span>
            </div>

            {/* Nombre de archivo */}
            <div class="space-y-1">
              <label class="text-sm text-muted-foreground">Nombre archivo:</label>
              <Input
                value={customName()}
                onInput={(e) => setCustomName(e.currentTarget.value)}
                placeholder={suggestedFilename()}
              />
              <p class="text-xs text-muted-foreground">
                Se guardará como: {finalFilename()}.png
              </p>
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
                fallback={<><Loader2Icon class="h-4 w-4 mr-2 animate-spin" /> Capturando...</>}
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
