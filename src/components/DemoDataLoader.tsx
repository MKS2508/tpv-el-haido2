/**
 * DemoDataLoader Component
 *
 * Componente para cargar/limpiar datos de demostración.
 * Útil para capturas de pantalla del Kit Digital.
 */

import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Receipt,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-solid';
import { createSignal, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getDemoStats } from '@/data/demo-seed';
import { clearDemoData, loadDemoData } from '@/services/demo-seed.service';

export function DemoDataLoader() {
  const [isLoading, setIsLoading] = createSignal(false);
  const [isClearing, setIsClearing] = createSignal(false);
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);
  const [dialogAction, setDialogAction] = createSignal<'load' | 'clear'>('load');
  const [result, setResult] = createSignal<{ success: boolean; message: string } | null>(null);

  const stats = getDemoStats();

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await loadDemoData();
      setResult(res);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleClearDemo = async () => {
    setIsClearing(true);
    setResult(null);
    try {
      const res = await clearDemoData();
      setResult(res);
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
    }
  };

  const openConfirmDialog = (action: 'load' | 'clear') => {
    setDialogAction(action);
    setShowConfirmDialog(true);
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Database class="h-5 w-5 text-primary" />
        </div>
        <div class="space-y-1">
          <h3 class="font-medium text-foreground">Datos de Demostración</h3>
          <p class="text-sm text-muted-foreground">
            Carga datos de ejemplo para pruebas y capturas de pantalla (Kit Digital)
          </p>
        </div>
      </div>

      {/* Stats preview */}
      <div class="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-muted-foreground">
            <Users class="h-4 w-4" />
            <span class="text-xs">Clientes</span>
          </div>
          <p class="text-lg font-semibold text-foreground">{stats.customers}</p>
        </div>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-muted-foreground">
            <Receipt class="h-4 w-4" />
            <span class="text-xs">Pedidos</span>
          </div>
          <p class="text-lg font-semibold text-foreground">{stats.totalOrders}</p>
        </div>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-muted-foreground">
            <TrendingUp class="h-4 w-4" />
            <span class="text-xs">Facturados</span>
          </div>
          <p class="text-lg font-semibold text-foreground">{stats.invoiced.total}</p>
        </div>
      </div>

      {/* Result message */}
      <Show when={result()}>
        <div
          class={`flex items-center gap-2 rounded-lg p-3 text-sm ${
            result()!.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}
        >
          <Show when={result()!.success} fallback={<AlertCircle class="h-4 w-4" />}>
            <CheckCircle2 class="h-4 w-4" />
          </Show>
          <span>{result()!.message}</span>
        </div>
      </Show>

      {/* Actions */}
      <div class="flex flex-wrap gap-2">
        <Button
          onClick={() => openConfirmDialog('load')}
          disabled={isLoading() || isClearing()}
          class="flex-1"
        >
          <Show when={!isLoading()} fallback={<Loader2 class="mr-2 h-4 w-4 animate-spin" />}>
            <Download class="mr-2 h-4 w-4" />
          </Show>
          Cargar Datos Demo
        </Button>

        <Button
          variant="outline"
          onClick={() => openConfirmDialog('clear')}
          disabled={isLoading() || isClearing()}
        >
          <Show when={!isClearing()} fallback={<Loader2 class="mr-2 h-4 w-4 animate-spin" />}>
            <Trash2 class="mr-2 h-4 w-4" />
          </Show>
          Limpiar
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog()} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction() === 'load' ? 'Cargar datos de demostración' : 'Limpiar datos'}
            </DialogTitle>
            <DialogDescription>
              <Show
                when={dialogAction() === 'load'}
                fallback="¿Estás seguro de que quieres eliminar todos los datos de demostración? Esta acción no se puede deshacer."
              >
                Se cargarán los siguientes datos de ejemplo:
                <ul class="mt-2 space-y-1 text-sm">
                  <li>
                    • <strong>{stats.customers}</strong> clientes con datos fiscales
                  </li>
                  <li>
                    • <strong>{stats.totalOrders}</strong> pedidos históricos
                  </li>
                  <li>
                    • <strong>{stats.invoiced.accepted}</strong> facturas aceptadas por AEAT
                  </li>
                  <li>
                    • <strong>{stats.invoiced.pending}</strong> facturas pendientes
                  </li>
                  <li>
                    • <strong>{stats.invoiced.rejected}</strong> facturas rechazadas
                  </li>
                  <li>
                    • <strong>{stats.notInvoiced}</strong> pedidos sin facturar
                  </li>
                </ul>
              </Show>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant={dialogAction() === 'clear' ? 'destructive' : 'default'}
              onClick={dialogAction() === 'load' ? handleLoadDemo : handleClearDemo}
            >
              {dialogAction() === 'load' ? 'Cargar Datos' : 'Eliminar Datos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DemoDataLoader;
