import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import OptimizedProductCard from '@/components/ui/OptimizedProductCard';
import type Product from '@/models/Product.ts';

interface ProductButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
  product: Product;
  handleAddToOrder: (product: Product) => void;
}

function ProductButton(props: ProductButtonProps) {
  const [local, others] = splitProps(props, ['product', 'handleAddToOrder']);

  return (
    <OptimizedProductCard
      product={local.product}
      mode="order"
      onAction={local.handleAddToOrder}
      showCategory={true}
      {...others}
    />
  );
}

export default ProductButton;
