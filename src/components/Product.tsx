import type React from 'react';
import OptimizedProductCard from '@/components/ui/OptimizedProductCard.tsx';
import { useResponsive } from '@/hooks/useResponsive';
import type { OrderItem } from '@/models/Order.ts';
import type Product from '@/models/Product.ts';

type ProductGridProps = {
  products: Product[];
  handleAddToOrder: (product: Product | OrderItem) => void;
  selectedOrderId?: number | null;
};

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  handleAddToOrder,
  selectedOrderId,
}) => {
  const { isMobile } = useResponsive();

  // Si no hay selectedOrderId, mostrar mensaje pero mantener estructura de scroll
  if (!selectedOrderId) {
    return (
      <div className="h-full w-full overflow-hidden bg-background">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="min-h-full flex items-center justify-center p-3">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-xl font-medium mb-2">Selecciona una mesa</p>
              <p className="text-sm">Elige una mesa para comenzar a agregar productos</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay productos
  if (products.length === 0) {
    return (
      <div className="h-full w-full overflow-hidden bg-background">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="min-h-full flex items-center justify-center p-3">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-lg font-medium">No hay productos disponibles</p>
              <p className="text-sm">Esta categoría no tiene productos</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="h-full overflow-y-auto overflow-x-hidden p-3">
        <div
          className={`
                    grid gap-3 w-full
                    ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}
                `}
        >
          {products.map((product) => (
            <OptimizedProductCard
              key={product.id}
              product={product}
              mode="order"
              onAction={handleAddToOrder}
              showCategory={true}
              className="w-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;
