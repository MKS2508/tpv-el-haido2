'use client';
import { onMount, onCleanup, Show, For, createMemo } from 'solid-js';
import { Presence, Motion } from '@motionone/solid';
import { MinusIcon, PlusIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useResponsive } from '@/hooks/useResponsive';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';

type OrderTableProps = {
  order: Order;
  handleRemoveFromOrder: (orderId: number, productId: number) => void;
  handleAddToOrder: (orderId: number, product: OrderItem) => void;
  disableAnimations?: boolean;
};

function OrderTable(props: OrderTableProps) {
  let tableRef: HTMLDivElement | undefined;
  const { isMobile, isTouch } = useResponsive();

  onMount(() => {
    const handleWheel = (e: WheelEvent) => {
      if (tableRef) {
        e.preventDefault();
        tableRef.scrollTop += e.deltaY;
      }
    };

    if (tableRef) {
      tableRef.addEventListener('wheel', handleWheel, { passive: false });
    }

    onCleanup(() => {
      if (tableRef) {
        tableRef.removeEventListener('wheel', handleWheel);
      }
    });
  });

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Desktop table view button sizes
  const buttonSize = createMemo(() => (isTouch() ? 'h-11 w-11' : 'h-8 w-8'));
  const iconSize = createMemo(() => (isTouch() ? 'h-5 w-5' : 'h-4 w-4'));

  return (
    <Show
      when={!isMobile()}
      fallback={
        // Mobile card view for better touch experience
        <div class="w-full space-y-2 p-2">
          <Presence exitBeforeEnter>
            <For each={props.order.items}>
              {(item, index) => (
                <Motion.div
                  initial={{
                    opacity: 0,
                    x: 50,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: -50,
                    scale: 0.95,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index() * 0.05,
                    easing: [0.4, 0, 0.2, 1],
                  }}
                  class="bg-card border rounded-lg p-3 shadow-sm"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm text-card-foreground truncate">{item.name}</p>
                      <p class="text-xs text-muted-foreground mt-1">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <div class="flex items-center gap-3 ml-3">
                      <div class="text-center">
                        <span class="text-base font-semibold">{item.quantity}</span>
                        <p class="text-xs text-muted-foreground">cant.</p>
                      </div>
                      <div class="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-11 w-11 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          onClick={() => props.handleRemoveFromOrder(props.order.id, item.id)}
                        >
                          <MinusIcon class="h-5 w-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-11 w-11 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => props.handleAddToOrder(props.order.id, item)}
                        >
                          <PlusIcon class="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Motion.div>
              )}
            </For>
          </Presence>
        </div>
      }
    >
      {/* Desktop table view with larger buttons for touch */}
      <div class="w-full overflow-hidden">
        <Table class="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead class="text-muted-foreground text-left sticky top-0 bg-card z-10 w-[45%] px-2">
                Producto
              </TableHead>
              <TableHead class="text-muted-foreground text-center sticky top-0 bg-card z-10 w-[15%] px-1">
                Cant.
              </TableHead>
              <TableHead class="text-muted-foreground text-right sticky top-0 bg-card z-10 w-[20%] px-1">
                Precio
              </TableHead>
              <TableHead class="text-muted-foreground text-center sticky top-0 bg-card z-10 w-[20%] px-1">
                Acc.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Show
              when={!props.disableAnimations}
              fallback={
                // Static version without animations
                <For each={props.order.items}>
                  {(item) => (
                    <tr class="border-b">
                      <TableCell class="text-card-foreground text-left w-[45%] px-2">
                        <span class="font-medium text-sm leading-tight block truncate">
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell class="text-foreground text-center text-base w-[15%] px-1">
                        <div class="flex items-center justify-center h-8 w-full">
                          <span class="font-medium text-center">{item.quantity}</span>
                        </div>
                      </TableCell>
                      <TableCell class="text-success font-semibold text-right text-base w-[25%] px-2">
                        <div class="font-bold text-success">
                          {(item.price * item.quantity).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell class="w-[15%] px-1">
                        <div class="flex flex-col items-center justify-center space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 w-7 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 touch-manipulation"
                            onClick={() => props.handleAddToOrder(props.order.id, item)}
                          >
                            <PlusIcon class="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 w-7 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
                            onClick={() => props.handleRemoveFromOrder(props.order.id, item.id)}
                          >
                            <MinusIcon class="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </tr>
                  )}
                </For>
              }
            >
              {/* Animated version */}
              <Presence exitBeforeEnter>
                <For each={props.order.items}>
                  {(item, index) => (
                    <Motion.tr
                      class="border-b"
                      initial={{
                        opacity: 0,
                        x: 50,
                        scale: 0.95,
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        backgroundColor: 'transparent',
                      }}
                      exit={{
                        opacity: 0,
                        x: -50,
                        scale: 0.95,
                        backgroundColor: 'hsl(var(--destructive) / 0.1)',
                      }}
                      transition={{
                        duration: 0.4,
                        delay: index() * 0.05,
                        easing: [0.4, 0, 0.2, 1],
                      }}
                      hover={{ backgroundColor: 'hsl(var(--accent) / 0.05)' }}
                    >
                      <TableCell class="text-card-foreground text-left w-[45%] px-2">
                        <Motion.span
                          class="font-medium text-sm leading-tight block truncate"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 + index() * 0.05 }}
                        >
                          {item.name}
                        </Motion.span>
                      </TableCell>
                      <TableCell class="text-foreground text-center text-base w-[15%] px-1">
                        <Motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.2 + index() * 0.05,
                            easing: 'ease-out',
                          }}
                          style={{ display: 'inline-block', 'font-variant-numeric': 'tabular-nums' }}
                        >
                          <span class="font-medium">{item.quantity}</span>
                        </Motion.div>
                      </TableCell>
                      <TableCell class="text-foreground text-right text-sm w-[20%] px-1">
                        <Motion.div
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.25 + index() * 0.05,
                          }}
                          style={{ display: 'inline-block', 'font-variant-numeric': 'tabular-nums' }}
                        >
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </Motion.div>
                      </TableCell>
                      <TableCell class="w-[20%] px-1">
                        <Motion.div
                          class="flex justify-center gap-1"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.3 + index() * 0.05,
                            easing: 'ease-out',
                          }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            class={`${buttonSize()} p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10 border-destructive/20`}
                            onClick={() => props.handleRemoveFromOrder(props.order.id, item.id)}
                          >
                            <MinusIcon class={iconSize()} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            class={`${buttonSize()} p-0 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20`}
                            onClick={() => props.handleAddToOrder(props.order.id, item)}
                          >
                            <PlusIcon class={iconSize()} />
                          </Button>
                        </Motion.div>
                      </TableCell>
                    </Motion.tr>
                  )}
                </For>
              </Presence>
            </Show>
          </TableBody>
        </Table>
      </div>
    </Show>
  );
}

export default OrderTable;
