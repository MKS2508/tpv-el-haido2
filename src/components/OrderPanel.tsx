import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Receipt, ShoppingCartIcon } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import OrderTable from '@/components/OrderTable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';

interface OrderPanelProps {
  activeOrders: Order[];
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  tables: ITable[];
  onOrderSelect: (orderId: number | null) => void;
  onOrderClose: (orderId: number) => void;
  onNewOrder: () => void;
  onTableChange: (tableId: number) => void;
  onPaymentStart: () => void;
  onRemoveFromOrder: (orderId: number, productId: number) => void;
  onAddToOrder: (orderId: number, product: OrderItem | Product) => void;
  disableAnimations?: boolean; // New prop to disable animations in mobile modal
}

// Counter component for animated total using NumberFlow
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  return (
    <NumberFlow
      value={value}
      format={{
        minimumFractionDigits: 2,
        style: 'currency',
        currency: 'EUR',
        currencyDisplay: 'symbol',
      }}
      transformTiming={{ duration: 400, easing: 'ease-out' }}
      opacityTiming={{ duration: 200, easing: 'ease-out' }}
      willChange
      style={
        {
          fontVariantNumeric: 'tabular-nums',
          '--number-flow-char-height': '0.85em',
          '--number-flow-mask-height': '0.25em',
        } as React.CSSProperties
      }
    />
  );
};

const OrderPanel: React.FC<OrderPanelProps> = ({
  selectedOrder,
  disableAnimations = false,
  onPaymentStart,
  onRemoveFromOrder,
  onAddToOrder,
}) => {
  const [previousTotal, setPreviousTotal] = useState(0);
  const [showPaymentHighlight, setShowPaymentHighlight] = useState(false);

  // Track total changes for animation triggers
  useEffect(() => {
    if (selectedOrder && selectedOrder.total !== previousTotal) {
      if (previousTotal > 0) {
        // Only show highlight if not initial load
        setShowPaymentHighlight(true);
        setTimeout(() => setShowPaymentHighlight(false), 1000);
      }
      setPreviousTotal(selectedOrder.total);
    }
  }, [selectedOrder?.total, previousTotal, selectedOrder]);

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {selectedOrder ? (
        <>
          {/* Header del pedido - altura fija */}
          <div className="h-12 px-3 border-b border-border bg-muted/30 flex items-center gap-2 flex-shrink-0">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              {selectedOrder.tableNumber === 0 ? 'Barra' : `Mesa ${selectedOrder.tableNumber}`}
            </h3>
          </div>

          {/* Tabla del pedido con scroll - toma espacio disponible */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-2 py-3">
                <OrderTable
                  order={selectedOrder}
                  handleRemoveFromOrder={onRemoveFromOrder}
                  handleAddToOrder={onAddToOrder}
                  disableAnimations={disableAnimations}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Footer con total y botón - STICKY BOTTOM, SIEMPRE VISIBLE */}
          <motion.div
            className="sticky bottom-0 flex-shrink-0 px-3 py-3 border-t border-border bg-card/95 backdrop-blur-sm z-10"
            animate={{
              backgroundColor: showPaymentHighlight
                ? 'hsl(var(--success) / 0.08)'
                : 'hsl(var(--card) / 0.95)',
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-card-foreground">
                Total: <AnimatedCounter value={selectedOrder.total} />
              </span>
            </div>
            <motion.div
              animate={{
                scale: showPaymentHighlight ? 1.02 : 1,
                boxShadow: showPaymentHighlight
                  ? '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={onPaymentStart}
                className="payment-button w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg"
              >
                <motion.div
                  className="flex items-center justify-center"
                  animate={{
                    scale: showPaymentHighlight ? [1, 1.02, 1] : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeOut',
                  }}
                >
                  Completar Pedido
                  <motion.div
                    animate={{
                      scale: showPaymentHighlight ? 1.1 : 1,
                    }}
                    transition={{
                      duration: 0.15,
                      ease: 'easeOut',
                    }}
                  >
                    <ShoppingCartIcon className="ml-2 h-5 w-5" />
                  </motion.div>
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        </>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No hay orden seleccionada</p>
                <p className="text-sm">Selecciona una mesa para comenzar</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPanel;
