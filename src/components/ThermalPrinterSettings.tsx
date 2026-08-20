import { Printer, Wifi } from 'lucide-solid';
import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TickmasterPrinterConfig } from '@/models/ThermalPrinter.ts';

interface ThermalPrinterSettingsProps {
  options: TickmasterPrinterConfig | null;
  onSave: (config: TickmasterPrinterConfig) => Promise<void>;
  onPrintTestTicket: () => Promise<{ ok: boolean; message: string }>;
  onTestConnection: () => Promise<{ ok: boolean; message: string }>;
}

export default function ThermalPrinterSettings(props: ThermalPrinterSettingsProps) {
  const [baseUrl, setBaseUrl] = createSignal(props.options?.baseUrl ?? '');
  const [token, setToken] = createSignal(props.options?.token ?? '');
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [testTicketDialogOpen, setTestTicketDialogOpen] = createSignal(false);
  const [connectionResult, setConnectionResult] = createSignal<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [testTicketResult, setTestTicketResult] = createSignal<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleSave = async () => {
    await props.onSave({ baseUrl: baseUrl(), token: token() });
  };

  const handleTestTicket = async () => {
    setTestTicketDialogOpen(true);
    setTestTicketResult(null);
    const result = await props.onPrintTestTicket();
    setTestTicketResult(result);
  };

  const handleTestConnection = async () => {
    setIsDialogOpen(true);
    setConnectionResult(null);
    const result = await props.onTestConnection();
    setConnectionResult(result);
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
            placeholder="http://rpi-bar.vpn.mks2508.local:9100"
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
      <div class="pt-2">
        <Button onClick={() => void handleSave()} class="w-full" variant="secondary">
          Guardar
        </Button>
      </div>
      <div class="grid grid-cols-2 gap-4 pt-4">
        <Button onClick={() => void handleTestTicket()} class="w-full">
          <Printer class="mr-2 h-4 w-4" /> Imprimir Ticket de Prueba
        </Button>
        <Button onClick={() => void handleTestConnection()} class="w-full">
          <Wifi class="mr-2 h-4 w-4" /> Probar Conexión
        </Button>
      </div>
      <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estado de la Conexión</DialogTitle>
          </DialogHeader>
          <div class="py-4">
            {connectionResult() === null ? (
              <p>Probando conexión...</p>
            ) : connectionResult()?.ok ? (
              <p class="text-primary">{connectionResult()?.message}</p>
            ) : (
              <p class="text-destructive">{connectionResult()?.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
