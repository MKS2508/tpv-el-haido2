import { createMemo, createEffect, createSignal, onCleanup, Show, For } from 'solid-js';
import { Presence, Motion } from '@motionone/solid';
import { ClockIcon, CreditCardIcon, EuroIcon, PrinterIcon, XIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from '@/components/ui/use-toast.ts';
import { useAEAT } from '@/hooks/useAEAT';
import { useEmitInvoice } from '@/hooks/useEmitInvoice';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order.ts';

interface PaymentModalProps {
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (isOpen: boolean) => void;
  cashAmount: string;
  setCashAmount: (amount: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  newOrder: Order;
  handleCompleteOrder: (order: Order) => void;
  showTicketDialog: boolean;
  setShowTicketDialog: (show: boolean) => void;
  handleTicketPrintingComplete: (shouldPrintTicket: boolean) => void;
}

// Currency formatter for EUR
const currencyFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR',
  currencyDisplay: 'symbol',
});

function PaymentModal(props: PaymentModalProps) {
  const { isMobile } = useResponsive();
  const [localCashAmount, setLocalCashAmount] = createSignal(props.cashAmount);
  const [localPaymentMethod, setLocalPaymentMethod] = createSignal(props.paymentMethod);

  // AEAT hooks
  const { isEnabled: isAEATEnabled, isConnected: isAEATConnected, config: aeatConfig } = useAEAT();
  const { emitInvoice } = useEmitInvoice();

  createEffect(() => {
    setLocalCashAmount(props.cashAmount);
    setLocalPaymentMethod(props.paymentMethod);
  });

  const handleLocalCashInput = (value: string) => {
    setLocalCashAmount((prevAmount) => {
      if (value === 'C') return '';
      if (value === '.' && prevAmount.includes('.')) return prevAmount;
      if (value === '.' && prevAmount === '') return '0.';
      return prevAmount + value;
    });
  };

  const calculateLocalChange = createMemo(() => {
    const change = parseFloat(localCashAmount()) - props.newOrder.total;
    return change > 0 ? change.toFixed(2) : '0.00';
  });

  const handleConfirmPayment = () => {
    props.setShowTicketDialog(true);
    console.log('handleConfirmPayment');
    toast({
      title: localPaymentMethod() === 'pagar_luego' ? 'Pago Pendiente' : 'Pago Confirmado!',
      description:
        localPaymentMethod() === 'pagar_luego'
          ? 'La orden se ha registrado como pendiente de pago.'
          : 'El pago ha sido procesado exitosamente.',
      duration: 3000,
    });
  };

  const handleCompleteTransaction = async (shouldPrintTicket: boolean) => {
    const updatedOrder: Order = {
      ...props.newOrder,
      paymentMethod: localPaymentMethod(),
      ticketPath: 'ticket.pdf',
      status: localPaymentMethod() === 'pagar_luego' ? 'unpaid' : 'paid',
      totalPaid: parseFloat(localCashAmount()) || 0,
      change: parseFloat(calculateLocalChange()),
      items: props.newOrder.items,
    };
    props.handleCompleteOrder(updatedOrder);
    props.handleTicketPrintingComplete(shouldPrintTicket);
    props.setCashAmount('');
    props.setPaymentMethod('efectivo');

    if (shouldPrintTicket) {
      toast({
        title: 'Imprimiendo ticket...',
        description: 'El ticket se esta imprimiendo.',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Orden completada',
        description:
          localPaymentMethod() === 'pagar_luego'
            ? 'La orden ha sido registrada como pendiente de pago.'
            : 'La orden ha sido completada sin imprimir ticket.',
        duration: 3000,
      });
    }

    // Auto-envio de factura AEAT si esta habilitado
    if (
      isAEATEnabled &&
      isAEATConnected &&
      aeatConfig.autoSendInvoices &&
      updatedOrder.status === 'paid'
    ) {
      // Pequeno delay para asegurar que el pedido se ha guardado
      setTimeout(async () => {
        console.log('[PaymentModal] Auto-sending invoice to AEAT...');
        const result = await emitInvoice(updatedOrder);
        if (result.success) {
          toast({
            title: 'Factura AEAT emitida',
            description: result.csv
              ? `CSV: ${result.csv}`
              : `Factura ${result.invoiceNumber} enviada correctamente`,
            duration: 5000,
          });
        }
        // Si hay error, el hook ya muestra el toast correspondiente
      }, 500);
    }
  };

  const numpadButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'];

  const handleKeyPress = (event: KeyboardEvent) => {
    if (localPaymentMethod() !== 'efectivo') return;

    const key = event.key;
    if (/^[0-9.]$/.test(key) || key === 'Backspace') {
      event.preventDefault();
      if (key === 'Backspace') {
        setLocalCashAmount((prev) => prev.slice(0, -1));
      } else {
        handleLocalCashInput(key);
      }
    }
  };

  createEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyPress);
    });
  });

  return (
    <>
      <Show when={props.isPaymentModalOpen}>
        <Dialog open={props.isPaymentModalOpen} onOpenChange={props.setIsPaymentModalOpen}>
          <DialogContent
            class={cn(
              'flex flex-col overflow-auto',
              isMobile()
                ? 'w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] rounded-none border-0 p-4'
                : 'w-[95vw] max-w-[900px] h-[90vh] max-h-[90vh] p-6'
            )}
          >
            <DialogHeader class={cn(isMobile() && 'px-4 py-3')}>
              <DialogTitle class={cn(isMobile() ? 'text-xl mb-4' : 'text-2xl mb-4')}>
                Completar Pedido
              </DialogTitle>

              <div
                class={cn(
                  'flex items-center gap-3',
                  isMobile() ? 'flex-col' : 'flex-row'
                )}
              >
                <Button
                  variant={localPaymentMethod() === 'efectivo' ? 'default' : 'outline'}
                  onClick={() => setLocalPaymentMethod('efectivo')}
                  class={cn(
                    'flex-1 touch-manipulation',
                    isMobile() ? 'h-14 w-full text-lg' : 'h-16 text-xl'
                  )}
                >
                  <EuroIcon class={cn('mr-2', isMobile() ? 'h-6 w-6' : 'h-7 w-7')} />
                  Efectivo
                </Button>
                <Button
                  variant={localPaymentMethod() === 'tarjeta' ? 'default' : 'outline'}
                  onClick={() => setLocalPaymentMethod('tarjeta')}
                  class={cn(
                    'flex-1 touch-manipulation',
                    isMobile() ? 'h-14 w-full text-lg' : 'h-16 text-xl'
                  )}
                >
                  <CreditCardIcon class={cn('mr-2', isMobile() ? 'h-6 w-6' : 'h-7 w-7')} />
                  Tarjeta
                </Button>
                <Button
                  variant={localPaymentMethod() === 'pagar_luego' ? 'default' : 'outline'}
                  onClick={() => setLocalPaymentMethod('pagar_luego')}
                  class={cn(
                    'flex-1 touch-manipulation',
                    isMobile() ? 'h-14 w-full text-lg' : 'h-16 text-xl'
                  )}
                >
                  <ClockIcon class={cn('mr-2', isMobile() ? 'h-6 w-6' : 'h-7 w-7')} />
                  Pagar Luego
                </Button>
              </div>
            </DialogHeader>
            <Presence>
              <div class={cn('w-full mx-auto h-full', isMobile() ? 'px-4 py-2' : 'max-w-full')}>
                <Show when={localPaymentMethod() === 'efectivo'}>
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    class={cn('grid gap-6', isMobile() ? 'grid-cols-1' : 'grid-cols-2 gap-8')}
                  >
                    <div class={cn('space-y-4', isMobile() && 'order-2')}>
                      <Label class={cn(isMobile() ? 'text-lg' : 'text-xl')}>
                        Cantidad en Efectivo
                      </Label>
                      <div class={cn('grid grid-cols-3', isMobile() ? 'gap-2' : 'gap-3')}>
                        <Presence>
                          <For each={numpadButtons}>
                            {(key, index) => (
                              <Motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.4,
                                  delay: index() * 0.03,
                                }}
                              >
                                <Button
                                  variant="outline"
                                  onClick={() => handleLocalCashInput(key)}
                                  class={cn(
                                    'w-full bg-input border-2 border-border font-bold hover:bg-input/80 transition-all duration-150 touch-manipulation',
                                    isMobile()
                                      ? 'h-16 text-2xl active:scale-95'
                                      : 'h-24 text-4xl hover:scale-102 active:scale-95'
                                  )}
                                >
                                  {key}
                                </Button>
                              </Motion.div>
                            )}
                          </For>
                        </Presence>
                      </div>
                    </div>

                    <Card class={cn('w-full', isMobile() && 'order-1')}>
                      <CardContent class={cn(isMobile() ? 'p-4' : 'p-6')}>
                        <div class="space-y-6">
                          <div class="flex justify-between items-center">
                            <span
                              class={cn('font-semibold', isMobile() ? 'text-2xl' : 'text-4xl')}
                            >
                              Total:
                            </span>
                            <span
                              class={cn(
                                'font-bold text-primary bg-primary/10 px-3 py-1 rounded-md',
                                isMobile() ? 'text-3xl' : 'text-7xl'
                              )}
                              style={{ 'font-variant-numeric': 'tabular-nums' }}
                            >
                              {currencyFormatter.format(props.newOrder.total)}
                            </span>
                          </div>
                          <div class="flex justify-between items-center">
                            <span
                              class={cn('font-semibold', isMobile() ? 'text-lg' : 'text-2xl')}
                            >
                              Cantidad Ingresada:
                            </span>
                            <span
                              class={cn(
                                'font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border',
                                isMobile() ? 'text-xl' : 'text-2xl'
                              )}
                              style={{ 'font-variant-numeric': 'tabular-nums' }}
                            >
                              {currencyFormatter.format(parseFloat(localCashAmount()) || 0)}
                            </span>
                          </div>
                          <div class="flex justify-between items-center">
                            <span
                              class={cn('font-semibold', isMobile() ? 'text-lg' : 'text-2xl')}
                            >
                              Cambio:
                            </span>
                            <span
                              class={cn(
                                'font-bold text-accent-foreground bg-accent px-3 py-1 rounded-md',
                                isMobile() ? 'text-xl' : 'text-2xl'
                              )}
                              style={{ 'font-variant-numeric': 'tabular-nums' }}
                            >
                              {currencyFormatter.format(parseFloat(calculateLocalChange()))}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Motion.div>
                </Show>
              </div>
              <Show when={localPaymentMethod() !== 'efectivo'}>
                <Card class="w-full max-w-full mx-auto">
                  <CardContent class={cn(isMobile() ? 'p-4' : 'p-6')}>
                    <div class="space-y-6">
                      <div class="flex justify-between items-center">
                        <span class={cn('font-semibold', isMobile() ? 'text-xl' : 'text-2xl')}>
                          Total:
                        </span>
                        <span
                          class={cn(
                            'font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border',
                            isMobile() ? 'text-xl' : 'text-2xl'
                          )}
                        >
                          {props.newOrder.total.toFixed(2)}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class={cn(isMobile() ? 'text-base' : 'text-lg')}>
                          Cantidad Ingresada:
                        </span>
                        <span
                          class={cn(
                            'font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border',
                            isMobile() ? 'text-lg' : 'text-2xl'
                          )}
                        >
                          {localCashAmount()}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class={cn(isMobile() ? 'text-base' : 'text-lg')}>Cambio:</span>
                        <span
                          class={cn(
                            'font-bold text-accent-foreground bg-accent px-3 py-1 rounded-md',
                            isMobile() ? 'text-lg' : 'text-2xl'
                          )}
                        >
                          {calculateLocalChange()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Show>
            </Presence>
            <DialogFooter
              class={cn('gap-3 mt-auto pt-4', isMobile() ? 'flex-col' : 'flex-row')}
            >
              <Button
                variant="outline"
                onClick={() => props.setIsPaymentModalOpen(false)}
                class={cn(
                  'text-foreground hover:bg-primary/10 w-full font-semibold touch-manipulation',
                  isMobile() ? 'h-16 text-xl order-2' : 'h-20 text-2xl'
                )}
              >
                Cancelar
              </Button>
              <Button
                class={cn(
                  'w-full font-semibold touch-manipulation',
                  isMobile() ? 'h-16 text-xl order-1' : 'h-20 text-2xl'
                )}
                onClick={handleConfirmPayment}
              >
                {localPaymentMethod() === 'pagar_luego' ? 'Confirmar Pedido' : 'Confirmar Pago'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Show>
      <Dialog open={props.showTicketDialog} onOpenChange={props.setShowTicketDialog}>
        <DialogContent
          class={cn(
            'flex flex-col justify-center',
            isMobile() ? 'w-[95vw] max-w-[95vw] p-6' : 'w-[80vw] max-w-[700px] p-8'
          )}
        >
          <DialogHeader>
            <DialogTitle class={cn('text-center', isMobile() ? 'text-3xl' : 'text-5xl')}>
              Desea imprimir el ticket?
            </DialogTitle>
          </DialogHeader>
          <div
            class={cn(
              'flex justify-center mt-8',
              isMobile() ? 'flex-col gap-4' : 'gap-6'
            )}
          >
            <Button
              onClick={() => handleCompleteTransaction(true)}
              class={cn(
                'flex-1 touch-manipulation',
                isMobile() ? 'h-20 text-xl' : 'h-28 text-3xl'
              )}
            >
              <PrinterIcon class={cn('mr-3', isMobile() ? 'h-7 w-7' : 'h-10 w-10')} />
              Si, imprimir
            </Button>
            <Button
              onClick={() => handleCompleteTransaction(false)}
              variant="outline"
              class={cn(
                'flex-1 touch-manipulation',
                isMobile() ? 'h-20 text-xl' : 'h-28 text-3xl'
              )}
            >
              <XIcon class={cn('mr-3', isMobile() ? 'h-7 w-7' : 'h-10 w-10')} />
              No, gracias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PaymentModal;
