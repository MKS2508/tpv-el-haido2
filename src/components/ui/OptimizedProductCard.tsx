import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Check, Plus, Star } from 'lucide-solid';
import { cn } from '@/lib/utils.ts';
import type Product from '@/models/Product.ts';
import stockImagesService from '@/services/stock-images.service';
import useStore from '@/store/store';
import { Button } from './button';

interface OptimizedProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  product: Product;
  mode: 'order' | 'manage';
  onAction?: (product: Product) => void;
  onFavoriteToggle?: (productId: number) => void;
  isPinned?: boolean;
  showCategory?: boolean;
}

const OptimizedProductCard: React.FC<OptimizedProductCardProps> = ({
  product,
  mode = 'order',
  onAction,
  onFavoriteToggle,
  isPinned = false,
  showCategory = true,
  className,
  ...props
}) => {
  const [isAdding, setIsAdding] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);
  const { useStockImages } = useStore();

  // Obtener imagen: personalizada > stock > fallback
  const getProductImage = () => {
    if (product.uploadedImage) {
      return product.uploadedImage;
    }

    if (useStockImages) {
      const stockImage = stockImagesService.getConsistentStockImage(
        product.id,
        product.name,
        product.category
      );
      if (stockImage) {
        return stockImage;
      }
    }

    return `data:image/svg+xml;base64,${btoa(`
            <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="80" fill="hsl(var(--muted))"/>
                <text x="40" y="45" text-anchor="middle" font-size="24" fill="hsl(var(--muted-foreground))">
                    ${product.icon || '🍽️'}
                </text>
            </svg>
        `)}`;
  };

  const productImage = getProductImage();
  const isRealImage = productImage && !productImage.startsWith('data:');

  const imageStyle = {
    backgroundImage: `url(${productImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const handleClick = async () => {
    if (mode === 'manage') {
      onAction?.(product);
      return;
    }

    // Mode 'order' - add to order logic optimizado
    if (isAdding()) return;

    setIsAdding(true);
    onAction?.(product);

    // Show success feedback - sin setTimeout anidados
    const successTimer = setTimeout(() => {
      setShowSuccess(true);
      const resetTimer = setTimeout(() => {
        setShowSuccess(false);
        setIsAdding(false);
      }, 300); // Reducido de 400 a 300

      return () => clearTimeout(resetTimer);
    }, 150); // Reducido de 200 a 150

    return () => clearTimeout(successTimer);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(product.id);
  };

  // Colores por categoría usando tokens semánticos
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
      'product-card relative flex flex-col overflow-hidden rounded-xl cursor-pointer';

    if (mode === 'order') {
      return cn(
        baseStyles,
        'border-2 touch-enhanced bg-gradient-to-b from-background to-card',
        isAdding() && 'adding',
        showSuccess() && 'success',
        className
      );
    }

    // Mode 'manage'
    return cn(baseStyles, 'border bg-card', 'border-border shadow-sm manage-mode', className);
  };

  // Cleanup effect para timers
  onMount(() => {
    onCleanup(() => {
      // Cleanup any pending timers
    });
  });

  return (
    <div
      class={getCardStyles()}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      {...props}
    >
      {/* Image Section */}
      <div
        class={cn(
          'relative overflow-hidden',
          mode === 'order' ? 'h-24 sm:h-28 w-full' : 'h-20 w-full',
          !isRealImage ? `bg-gradient-to-br ${getCategoryColors(product.category)}` : 'bg-muted/10'
        )}
        style={isRealImage ? imageStyle : {}}
      >
        {/* Overlay para mejor legibilidad en imágenes reales */}
        {isRealImage && (
          <div class="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Emoji/Icon si es imagen SVG fallback */}
        {!isRealImage && (
          <div
            class={cn(
              'product-icon flex items-center justify-center h-full',
              mode === 'order' ? 'text-4xl sm:text-5xl' : 'text-3xl',
              isAdding() && 'adding'
            )}
          >
            {product.icon || '🍽️'}
          </div>
        )}

        {/* Category badge */}
        {showCategory && product.category && (
          <div class="absolute top-2 left-2 px-2 py-1 bg-primary/90 backdrop-blur-md text-xs font-bold text-primary-foreground rounded-md shadow-lg">
            {product.category}
          </div>
        )}

        {/* Action button - top right */}
        <div class="absolute top-2 right-2">
          {mode === 'order' ? (
            <div
              class={cn(
                'action-btn rounded-full p-2 shadow-2xl',
                showSuccess()
                  ? 'bg-success text-success-foreground success'
                  : isAdding()
                    ? 'bg-primary text-primary-foreground adding'
                    : 'bg-accent text-accent-foreground'
              )}
            >
              {showSuccess() ? (
                <Check class="w-4 h-4" strokeWidth={3} />
              ) : (
                <Plus class="w-4 h-4" strokeWidth={2.5} />
              )}
            </div>
          ) : (
            // Mode 'manage' - show favorite star
            (onFavoriteToggle && (<Button
              variant="ghost"
              size="sm"
              class="p-1 h-auto bg-background/80 hover:bg-background/90 backdrop-blur-sm"
              onClick={handleFavoriteClick}
            >
              <Star
                class={cn(
                  'h-4 w-4',
                  isPinned ? 'text-warning fill-warning' : 'text-muted-foreground'
                )}
              />
            </Button>))
          )}
        </div>
      </div>
      {/* Product Info Section */}
      <div
        class={cn(
          'flex-1 flex flex-col justify-between bg-gradient-to-b from-card/50 to-card border-t border-border/20',
          mode === 'order' ? 'p-3' : 'p-2'
        )}
      >
        {/* Product Name */}
        <div class={cn(mode === 'order' ? 'mb-2' : 'mb-1')}>
          <h3
            class={cn(
              'font-extrabold line-clamp-2 leading-tight',
              mode === 'order' ? 'text-sm mb-0.5' : 'text-xs',
              isAdding() ? 'text-primary' : 'text-foreground'
            )}
          >
            {product.name}
          </h3>
          {product.brand && (
            <p
              class={cn(
                'text-muted-foreground font-medium opacity-90',
                mode === 'order' ? 'text-xs' : 'text-[10px]'
              )}
            >
              {product.brand}
            </p>
          )}
        </div>

        {/* Price Section */}
        <div class="flex items-end justify-between">
          <div class={cn('product-price flex flex-col', isAdding() && 'adding')}>
            <span
              class={cn(
                'font-black tracking-tight',
                mode === 'order' ? 'text-2xl' : 'text-lg',
                isAdding() ? 'text-success drop-shadow-md' : 'text-primary'
              )}
            >
              {product.price.toFixed(2)}€
            </span>
            {mode === 'order' && (
              <span class="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-80">
                unidad
              </span>
            )}
          </div>

          {/* Stock indicator para mode order */}
          {mode === 'order' && product.stock !== undefined && product.stock < 10 && (
            <div class="px-2 py-1 bg-warning/20 border-2 border-warning/50 rounded-lg">
              <span class="text-xs font-bold text-warning">Quedan {product.stock}</span>
            </div>
          )}

          {/* Category info para mode manage */}
          {mode === 'manage' && product.category && (
            <div class="px-1.5 py-0.5 bg-secondary/80 rounded text-[10px] font-medium text-secondary-foreground">
              {product.category}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedProductCard;
