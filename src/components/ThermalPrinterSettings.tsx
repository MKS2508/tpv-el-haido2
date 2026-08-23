import { AlertTriangle, CheckCircle2, Printer, RefreshCw, Search, WifiOff } from 'lucide-solid';
import { createSignal, Match, Show, Switch } from 'solid-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  DiscoveredPrinter,
  PrinterHealth,
  PrinterHealthState,
  TickmasterPrinterConfig,
} from '@/models/ThermalPrinter.ts';

/** Resultado de una acción puntual que la UI solo tiene que contar. */
interface ActionResult {
  ok: boolean;
  message: string;
}

interface ThermalPrinterSettingsProps {
  options: TickmasterPrinterConfig | null;
  onSave: (config: TickmasterPrinterConfig) => Promise<void>;
  onDiscover: () => Promise<ActionResult & { printer?: DiscoveredPrinter }>;
  onCheckHealth: (config: TickmasterPrinterConfig) => Promise<PrinterHealth>;
  onPrintTestTicket: (config: TickmasterPrinterConfig) => Promise<ActionResult>;
}

/**
 * Gravedad de cada estado: sin daemon no hay nada que hacer desde aquí, el
 * resto son cosas que el camarero puede arreglar en la barra.
 */
function tone(state: PrinterHealthState): 'ok' | 'warn' | 'bad' {
  if (state === 'ready') return 'ok';
  if (state === 'no-daemon') return 'bad';
  return 'warn';
}

const TONE_CLASS = {
  ok: 'border-primary/30 bg-primary/5',
  warn: 'border-amber-500/30 bg-amber-500/5',
  bad: 'border-destructive/30 bg-destructive/5',
} as const;

const TONE_TEXT = {
  ok: 'text-primary',
  warn: 'text-amber-600 dark:text-amber-500',
  bad: 'text-destructive',
} as const;

export default function ThermalPrinterSettings(props: ThermalPrinterSettingsProps) {
  const [baseUrl, setBaseUrl] = createSignal(props.options?.baseUrl ?? '');
  const [token, setToken] = createSignal(props.options?.token ?? '');

  const [health, setHealth] = createSignal<PrinterHealth | null>(null);
  const [isChecking, setIsChecking] = createSignal(false);
  const [isDiscovering, setIsDiscovering] = createSignal(false);
  const [discovered, setDiscovered] = createSignal<DiscoveredPrinter | null>(null);
  const [discoverError, setDiscoverError] = createSignal<string | null>(null);

  const [testTicketDialogOpen, setTestTicketDialogOpen] = createSignal(false);
  const [testTicketResult, setTestTicketResult] = createSignal<ActionResult | null>(null);

  const currentConfig = (): TickmasterPrinterConfig => ({ baseUrl: baseUrl(), token: token() });

  const handleSave = async () => {
    await props.onSave(currentConfig());
  };

  const handleCheck = async () => {
    setIsChecking(true);
    setHealth(await props.onCheckHealth(currentConfig()));
    setIsChecking(false);
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setDiscoverError(null);
    setDiscovered(null);
    const result = await props.onDiscover();
    setIsDiscovering(false);

    if (!result.ok || result.printer === undefined) {
      setDiscoverError(result.message);
      return;
    }
    setDiscovered(result.printer);
    setBaseUrl(result.printer.baseUrl);
    await handleCheck();
  };

  const handleTestTicket = async () => {
    setTestTicketDialogOpen(true);
    setTestTicketResult(null);
    setTestTicketResult(await props.onPrintTestTicket(currentConfig()));
  };

  return (
    <div class="space-y-4 mt-4 pb-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="baseUrl">URL del daemon</Label>
          <Input
            id="baseUrl"
            value={baseUrl()}
            onInput={(e) => setBaseUrl(e.currentTarget.value)}
            placeholder="Vacío = buscar en la red"
          />
        </div>
        <div class="space-y-2">
          <Label for="token">Token</Label>
          <Input
            id="token"
            type="password"
            value={token()}
            onInput={(e) => setToken(e.currentTarget.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <Button
          onClick={() => void handleDiscover()}
          class="w-full"
          variant="outline"
          disabled={isDiscovering()}
        >
          <Search class={cn('mr-2 h-4 w-4', isDiscovering() && 'animate-pulse')} />
          {isDiscovering() ? 'Buscando…' : 'Buscar en la red'}
        </Button>
        <Button onClick={() => void handleSave()} class="w-full" variant="secondary">
          Guardar
        </Button>
      </div>

      <Show when={discovered()}>
        {(printer) => (
          <p class="text-sm text-muted-foreground">
            Encontrada <span class="font-medium text-foreground">{printer().name}</span> (
            {printer().model}) en <span class="font-mono text-xs">{printer().baseUrl}</span>.
            Recuerda guardar para dejarla fija, o deja la URL vacía y la buscará sola cada vez.
          </p>
        )}
      </Show>
      <Show when={discoverError()}>
        {(message) => <p class="text-sm text-destructive">{message()}</p>}
      </Show>

      <div class="space-y-2 pt-2">
        <Label>Estado</Label>
        <Show
          when={health()}
          fallback={
            <div class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Sin comprobar. «Comprobar estado» distingue si falla la red, el daemon o la impresora.
            </div>
          }
        >
          {(current) => (
            <div class={cn('rounded-lg border p-3 space-y-1', TONE_CLASS[tone(current().state)])}>
              <div class="flex items-center gap-2">
                <Switch>
                  <Match when={tone(current().state) === 'ok'}>
                    <CheckCircle2 class={cn('h-4 w-4 shrink-0', TONE_TEXT.ok)} />
                  </Match>
                  <Match when={tone(current().state) === 'warn'}>
                    <AlertTriangle class={cn('h-4 w-4 shrink-0', TONE_TEXT.warn)} />
                  </Match>
                  <Match when={tone(current().state) === 'bad'}>
                    <WifiOff class={cn('h-4 w-4 shrink-0', TONE_TEXT.bad)} />
                  </Match>
                </Switch>
                <span class={cn('font-medium', TONE_TEXT[tone(current().state)])}>
                  {current().title}
                </span>
                <Show when={current().paperNearEnd && current().canPrint}>
                  <Badge variant="outline">papel bajo</Badge>
                </Show>
              </div>
              <p class="text-sm text-muted-foreground">{current().detail}</p>
              <Show when={current().baseUrl}>
                {(url) => <p class="font-mono text-xs text-muted-foreground">{url()}</p>}
              </Show>
            </div>
          )}
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <Button onClick={() => void handleCheck()} class="w-full" disabled={isChecking()}>
          <RefreshCw class={cn('mr-2 h-4 w-4', isChecking() && 'animate-spin')} />
          {isChecking() ? 'Comprobando…' : 'Comprobar estado'}
        </Button>
        <Button onClick={() => void handleTestTicket()} class="w-full">
          <Printer class="mr-2 h-4 w-4" /> Imprimir ticket de prueba
        </Button>
      </div>

      <Dialog open={testTicketDialogOpen()} onOpenChange={setTestTicketDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estado de la Impresión</DialogTitle>
          </DialogHeader>
          <div class="py-4">
            {testTicketResult() === null ? (
              <p>Intentando imprimir...</p>
            ) : testTicketResult()?.ok ? (
              <p class="text-primary">{testTicketResult()?.message}</p>
            ) : (
              <p class="text-destructive">{testTicketResult()?.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
