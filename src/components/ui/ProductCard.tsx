import { Motion, Presence } from '@motionone/solid';
import { Check, Plus, Star } from 'lucide-solid';
import type { JSX } from 'solid-js';
import { createSignal, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '@/lib/utils.ts';
import type Product from '@/models/Product.ts';
import stockImagesService from '@/services/stock-images.service';
import useStore from '@/store/store';
import { Button } from './button';

interface ProductCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  product: Product;
  mode: 'order' | 'manage';
  onAction?: (product: Product) => void;
  onFavoriteToggle?: (productId: number) => void;
  isPinned?: boolean;
  showCategory?: boolean;
}

const ProductCard = (props: ProductCardProps) => {
  const [local, others] = splitProps(props, [
    'product',
    'mode',
    'onAction',
    'onFavoriteToggle',
    'isPinned',
    'showCategory',
    'class',
  ]);

  const [isAdding, setIsAdding] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);
  const state = useStore();

  const getProductImage = () => {
    if (local.product.uploadedImage) {
      return local.product.uploadedImage;
    }

    if (state.state.useStockImages) {
      const stockImage = stockImagesService.getConsistentStockImage(
        local.product.id,
        local.product.name,
        local.product.category
      );
      if (stockImage) {
        return stockImage;
      }
    }

    return `data:image/svg+xml;base64,${btoa(`
            <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="80" fill="hsl(var(--muted))"/>
                <text x="40" y="45" text-anchor="middle" font-size="24" fill="hsl(var(--muted-foreground))">
                    ${local.product.icon || '🍽️'}
                </text>
            </svg>
        `)}`;
  };

  const productImage = () => getProductImage();
  const isRealImage = () => productImage() && !productImage().startsWith('data:');

  const imageStyle = () => ({
    'background-image': `url(${productImage()})`,
    'background-size': 'cover',
    'background-position': 'center',
  });

  const handleClick = async () => {
    if (local.mode === 'manage') {
      local.onAction?.(local.product);
      return;
    }

    if (isAdding()) return;

    setIsAdding(true);
    local.onAction?.(local.product);

    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsAdding(false);
      }, 400);
    }, 200);
  };

  const handleFavoriteClick = (e: Event) => {
    e.stopPropagation();
    local.onFavoriteToggle?.(local.product.id);
  };

  const getCategoryColors = (category: string | undefined) => {
    if (!category) return 'from-muted/50 to-muted/20';

    const categoryLower = category.toLowerCase();
    if (
      categoryLower.includes('bebida') ||
      categoryLower.includes('drink') ||
      categoryLower.includes('refresco')
    ) {
      return 'from-chart-3/40 to-chart-3/15';
    }
    if (categoryLower.includes('café') || categoryLower.includes('cafe')) {
      return 'from-chart-1/40 to-chart-1/15';
    }
    if (categoryLower.includes('postre') || categoryLower.includes('dessert')) {
      return 'from-chart-5/40 to-chart-5/15';
    }
    if (
      categoryLower.includes('entrante') ||
      categoryLower.includes('starter') ||
      categoryLower.includes('tapa')
    ) {
      return 'from-chart-4/40 to-chart-4/15';
    }
    if (categoryLower.includes('cerveza') || categoryLower.includes('beer')) {
      return 'from-chart-4/40 to-chart-4/15';
    }
    return 'from-chart-2/30 to-chart-2/10';
  };

  const getCardStyles = () => {
    const baseStyles =
      'relative flex flex-col overflow-hidden rounded-xl cursor-pointer transition-all duration-200';

    if (local.mode === 'order') {
      return cn(
        baseStyles,
        'border-2 touch-enhanced bg-gradient-to-b from-background to-card',
        isAdding()
          ? 'border-success shadow-2xl shadow-success/40 ring-2 ring-success/30 scale-[1.02]'
          : showSuccess()
            ? 'border-success/60 shadow-xl shadow-success/30'
            : 'border-border shadow-lg hover:border-primary/40 hover:shadow-xl'
      );
    }

    return cn(
      baseStyles,
      'border bg-card hover:shadow-md hover:border-primary/30',
      'border-border shadow-sm'
    );
  };

  return (
    <Motion.div
      class={cn(getCardStyles(), props.class)}
      onClick={handleClick as (e: MouseEvent) => void}
      style={others.style as JSX.CSSProperties}
      animate={{
        scale: isAdding() ? 1.03 : 1,
      }}
      transition={{
        duration: 0.2,
        easing: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div
        class={cn(
          'relative overflow-hidden',
          local.mode === 'order' ? 'h-24 sm:h-28 w-full' : 'h-20 w-full',
          !isRealImage
            ? `bg-gradient-to-br ${getCategoryColors(local.product.category)}`
            : 'bg-muted/10'
        )}
        style={isRealImage() ? imageStyle() : {}}
      >
        {isRealImage() && (
          <div class="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        )}

        {!isRealImage && (
          <Motion.div
            class={cn(
              'flex items-center justify-center h-full',
              local.mode === 'order' ? 'text-4xl sm:text-5xl' : 'text-3xl'
            )}
            animate={{
              scale: isAdding() ? 1.08 : 1,
            }}
            transition={{ duration: 0.15, easing: 'ease-out' }}
          >
            {local.product.icon ? <Dynamic component={local.product.icon} /> : '🍽️'}
          </Motion.div>
        )}

        {local.showCategory && local.product.category && (
          <div class="absolute top-2 left-2 px-2 py-1 bg-primary/90 backdrop-blur-md text-xs font-bold text-primary-foreground rounded-md shadow-lg">
            {local.product.category}
          </div>
        )}

        <div class="absolute top-2 right-2">
          {local.mode === 'order' ? (
            <Presence>
              {!showSuccess() ? (
                <Motion.div
                  class={cn(
                    'rounded-full p-2 shadow-2xl',
                    isAdding()
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground'
                  )}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: isAdding() ? 1.15 : 1,
                    opacity: 1,
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2, easing: [0.25, 0.1, 0.25, 1] }}
                >
                  <Plus class="w-4 h-4" strokeWidth={2.5} />
                </Motion.div>
              ) : (
                <Motion.div
                  class="bg-success text-success-foreground rounded-full p-2 shadow-2xl"
                  initial={{ scale: 0, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, easing: [0.25, 0.1, 0.25, 1] }}
                >
                  <Check class="w-4 h-4" strokeWidth={3} />
                </Motion.div>
              )}
            </Presence>
          ) : (
            local.onFavoriteToggle && (
              <Button
                variant="ghost"
                size="sm"
                class="p-1 h-auto bg-background/80 hover:bg-background/90 backdrop-blur-sm"
                onClick={handleFavoriteClick}
              >
                <Star
                  class={cn(
                    'h-4 w-4',
                    local.isPinned ? 'text-warning fill-warning' : 'text-muted-foreground'
                  )}
                />
              </Button>
            )
          )}
        </div>
      </div>
      {/* Product Info Section */}
      <div
        class={cn(
          'flex-1 flex flex-col justify-between bg-gradient-to-b from-card/50 to-card border-t border-border/20',
          local.mode === 'order' ? 'p-3' : 'p-2'
        )}
      >
        {/* Product Name */}
        <div class={cn(local.mode === 'order' ? 'mb-2' : 'mb-1')}>
          <h3
            class={cn(
              'font-extrabold line-clamp-2 leading-tight',
              local.mode === 'order' ? 'text-sm mb-0.5' : 'text-xs',
              isAdding() ? 'text-primary' : 'text-foreground'
            )}
          >
            {local.product.name}
          </h3>
          {local.product.brand && (
            <p
              class={cn(
                'text-muted-foreground font-medium opacity-90',
                local.mode === 'order' ? 'text-xs' : 'text-[10px]'
              )}
            >
              {local.product.brand}
            </p>
          )}
        </div>

        {/* Price Section */}
        <div class="flex items-end justify-between">
          <Motion.div
            class="flex flex-col"
            animate={{
              scale: isAdding() ? 1.08 : 1,
            }}
            transition={{ duration: 0.15 }}
          >
            <span
              class={cn(
                'font-black tracking-tight',
                local.mode === 'order' ? 'text-2xl' : 'text-lg',
                isAdding() ? 'text-success drop-shadow-md' : 'text-primary'
              )}
            >
              {local.product.price.toFixed(2)}€
            </span>
            {local.mode === 'order' && (
              <span class="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-80">
                unidad
              </span>
            )}
          </Motion.div>

          {/* Stock indicator para mode order */}
          {local.mode === 'order' &&
            local.product.stock !== undefined &&
            local.product.stock < 10 && (
              <div class="px-2 py-1 bg-warning/20 border-2 border-warning/50 rounded-lg">
                <span class="text-xs font-bold text-warning">Quedan {local.product.stock}</span>
              </div>
            )}

          {/* Category info para mode manage */}
          {local.mode === 'manage' && local.product.category && (
            <div class="px-1.5 py-0.5 bg-secondary/80 rounded text-[10px] font-medium text-secondary-foreground">
              {local.product.category}
            </div>
          )}
        </div>
      </div>
      {/* Loading overlay solo para mode order */}
      {local.mode === 'order' && (
        <Presence>
          {isAdding() && !showSuccess() && (
            <Motion.div
              class="absolute inset-0 bg-primary/10 backdrop-blur-[2px] rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </Presence>
      )}
    </Motion.div>
  );
};

export default ProductCard;
