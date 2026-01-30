import { Receipt } from 'lucide-solid';
import { Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';

interface ConfirmPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: Order | null;
  paymentMethod: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function ConfirmPaymentDialog(props: ConfirmPaymentDialogProps) {
  const itemCount = () => props.order?.items.length ?? 0;
  const total = () => props.order?.total ?? 0;
  const tableNumber = () => props.order?.tableNumber ?? 0;
  const paymentMethodLabel = () => {
    switch (props.paymentMethod) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta':
        return 'Tarjeta';
      default:
        return props.paymentMethod;
    }
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-xl">
            <Receipt class="w-5 h-5" />
            Confirmar cobro
          </DialogTitle>
          <DialogDescription class="text-base pt-2">
            Verifica los detalles antes de completar el pago
          </DialogDescription>
        </DialogHeader>

        <Show when={props.order}>
          {(order) => (
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span class="text-sm text-muted-foreground">Mesa:</span>
                <span class="font-semibold">
                  {tableNumber() === 0 ? 'Barra' : `Mesa ${tableNumber()}`}
                </span>
              </div>

              <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span class="text-sm text-muted-foreground">Items:</span>
                <span class="font-semibold">{itemCount()}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span class="text-sm text-muted-foreground">Método de pago:</span>
                <span class="font-semibold">{paymentMethodLabel()}</span>
              </div>

              <div class="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary">
                <span class="text-sm font-medium">Total a cobrar:</span>
                <span class="text-xl font-bold text-primary">{formatCurrency(total())}</span>
              </div>
            </div>
          )}
        </Show>

        <DialogFooter class="gap-2 sm:gap-2">
          <Button variant="outline" onClick={props.onClose} class="flex-1 h-12 text-base">
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={props.onConfirm}
            class="flex-1 h-12 text-base bg-primary hover:bg-primary/90"
          >
            Confirmar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmPaymentDialog;
