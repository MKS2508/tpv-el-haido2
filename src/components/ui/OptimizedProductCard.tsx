import { Motion } from '@motionone/solid';
import { Check, Plus, Star } from 'lucide-solid';
import { createSignal, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { usePerformanceConfig } from '@/hooks/usePerformanceConfig';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Product from '@/models/Product';
import stockImagesService from '@/services/stock-images.service';

interface OptimizedProductCardProps {
  product: Product;
  mode: 'order' | 'manage';
  onAction?: (product: Product) => void;
  onFavoriteToggle?: (productId: number) => void;
  isPinned?: boolean;
  showCategory?: boolean;
  class?: string;
}

function OptimizedProductCard(props: OptimizedProductCardProps) {
  const mode = () => props.mode ?? 'order';
  const isPinned = () => props.isPinned ?? false;
  const showCategory = () => props.showCategory ?? true;
  const [isAdding, setIsAdding] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);

  const perf = usePerformanceConfig();
  const responsive = useResponsive();
  const isTouch = () => responsive.isTouch();

  // Obtener imagen: personalizada > stock > fallback
  const getProductImage = () => {
    if (props.product.uploadedImage) {
      return props.product.uploadedImage;
    }

    if (perf.enableImageOptimization) {
      const stockImage = stockImagesService.getConsistentStockImage(
        props.product.id,
        props.product.name,
        props.product.category
      );
      if (stockImage) {
        return stockImage;
      }
    }

    return `data:image/svg+xml;base64,${btoa(`
            <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="80" fill="hsl(var(--muted))"/>
                <text x="40" y="45" text-anchor="middle" font-size="24" fill="hsl(var(--muted-foreground))">
                    ${props.product.icon || '🍽️'}
                </text>
            </svg>
        `)}`;
  };

  const productImage = () => getProductImage();
  const isRealImage = () => {
    const img = productImage();
    return img && !img.startsWith('data:');
  };

  const imageStyle = () => ({
    'background-image': `url(${productImage()})`,
    'background-size': 'cover',
    'background-position': 'center',
  });

  const handleClick = async () => {
    if (mode() === 'manage') {
      props.onAction?.(props.product);
      return;
    }

    // Mode 'order' - add to order logic optimizado
    if (isAdding()) return;

    setIsAdding(true);
    props.onAction?.(props.product);

    // Show success feedback - sin setTimeout anidados
    const successTimer = setTimeout(() => {
      setShowSuccess(true);
      const resetTimer = setTimeout(() => {
        setShowSuccess(false);
        setIsAdding(false);
      }, 300);

      return () => clearTimeout(resetTimer);
    }, 150);

    return () => clearTimeout(successTimer);
  };

  const handleFavoriteClick = (e: Event) => {
    e.stopPropagation();
    props.onFavoriteToggle?.(props.product.id);
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
      'product-card relative flex flex-col overflow-hidden rounded-xl cursor-pointer touch-manipulation h-full';

    if (mode() === 'order') {
      return cn(
        baseStyles,
        'border-2',
        isTouch() && 'touch-optimized',
        'bg-gradient-to-b from-background to-card',
        isAdding() && 'adding',
        showSuccess() && 'success',
        props.class
      );
    }

    // Mode 'manage'
    return cn(baseStyles, 'border bg-card', 'border-border shadow-sm manage-mode', props.class);
  };

  // Animation props based on performance
  const cardAnimation = () => {
    if (!perf.enableAnimations || isTouch()) return {};
    return {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
      transition: { duration: perf.transitionDuration },
    };
  };

  return (
    <Motion.button
      type="button"
      class={getCardStyles()}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      {...cardAnimation()}
    >
      {/* Image Section */}
      <div
        class={cn(
          'relative overflow-hidden',
          mode() === 'order' ? 'h-24 sm:h-28 w-full' : 'h-20 w-full',
          !isRealImage()
            ? `bg-gradient-to-br ${getCategoryColors(props.product.category)}`
            : 'bg-muted/10'
        )}
        style={isRealImage() ? imageStyle() : {}}
      >
        {/* Overlay para mejor legibilidad en imágenes reales */}
        {isRealImage() && (
          <div class="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Emoji/Icon si es imagen SVG fallback */}
        <Show when={!isRealImage()}>
          <div
            class={cn(
              'product-icon flex items-center justify-center h-full',
              mode() === 'order' ? 'text-4xl sm:text-5xl' : 'text-3xl',
              isAdding() && 'adding'
            )}
          >
            {props.product.icon && typeof props.product.icon === 'function' ? (
              <Dynamic component={props.product.icon} />
            ) : (
              <span>{props.product.icon || '🍽️'}</span>
            )}
          </div>
        </Show>

        {/* Category badge */}
        <Show when={showCategory() && props.product.category}>
          <div class="absolute top-2 left-2 px-2 py-1 bg-primary/90 backdrop-blur-md text-xs font-bold text-primary-foreground rounded-md shadow-lg">
            {props.product.category}
          </div>
        </Show>

        {/* Action button - top right */}
        <div class="absolute top-2 right-2">
          {mode() === 'order' ? (
            <Motion.div
              class={cn(
                'action-btn rounded-full p-2 shadow-2xl',
                showSuccess()
                  ? 'bg-success text-success-foreground success'
                  : isAdding()
                    ? 'bg-primary text-primary-foreground adding'
                    : 'bg-accent text-accent-foreground'
              )}
              animate={
                perf.enableAnimations
                  ? showSuccess()
                    ? { rotate: 180, scale: 1.1 }
                    : isAdding()
                      ? { scale: 1.15 }
                      : {}
                  : {}
              }
              transition={{ duration: perf.transitionDuration }}
            >
              <Show when={showSuccess()} fallback={<Plus class="w-4 h-4" strokeWidth={2.5} />}>
                <Check class="w-4 h-4" strokeWidth={3} />
              </Show>
            </Motion.div>
          ) : (
            // Mode 'manage' - show favorite star
            <Show when={props.onFavoriteToggle}>
              <button
                type="button"
                class="p-1 h-auto bg-background/80 hover:bg-background/90 backdrop-blur-sm rounded-md transition-all duration-150"
                onClick={handleFavoriteClick}
              >
                <Star
                  class={cn(
                    'h-4 w-4',
                    isPinned() ? 'text-warning fill-warning' : 'text-muted-foreground'
                  )}
                />
              </button>
            </Show>
          )}
        </div>
      </div>

      {/* Product Info Section */}
      <div
        class={cn(
          'flex-1 flex flex-col justify-between bg-gradient-to-b from-card/50 to-card border-t border-border/20',
          mode() === 'order' ? 'p-3' : 'p-2'
        )}
      >
        {/* Product Name */}
        <div class={cn(mode() === 'order' ? 'mb-2' : 'mb-1')}>
          <Motion.h3
            class={cn(
              'font-extrabold line-clamp-2 leading-tight',
              mode() === 'order' ? 'text-sm mb-0.5' : 'text-xs',
              isAdding() ? 'text-primary' : 'text-foreground'
            )}
            animate={perf.enableAnimations && isAdding() ? { color: 'hsl(var(--success))' } : {}}
            transition={{ duration: perf.transitionDuration }}
          >
            {props.product.name}
          </Motion.h3>
          <Show when={props.product.brand}>
            <p
              class={cn(
                'text-muted-foreground font-medium opacity-90',
                mode() === 'order' ? 'text-xs' : 'text-[10px]'
              )}
            >
              {props.product.brand}
            </p>
          </Show>
        </div>

        {/* Price Section */}
        <div class="flex items-end justify-between">
          <Motion.div
            class={cn('product-price flex flex-col', isAdding() && 'adding')}
            animate={perf.enableAnimations && isAdding() ? { scale: 1.08 } : {}}
            transition={{ duration: perf.transitionDuration }}
          >
            <span
              class={cn(
                'font-black tracking-tight',
                mode() === 'order' ? 'text-2xl' : 'text-lg',
                isAdding() ? 'text-success drop-shadow-md' : 'text-primary'
              )}
            >
              {props.product.price.toFixed(2)}€
            </span>
            <Show when={mode() === 'order'}>
              <span class="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-80">
                unidad
              </span>
            </Show>
          </Motion.div>

          {/* Stock indicator para mode order */}
          <Show
            when={
              mode() === 'order' && props.product.stock !== undefined && props.product.stock < 10
            }
          >
            <div class="px-2 py-1 bg-warning/20 border-2 border-warning/50 rounded-lg">
              <span class="text-xs font-bold text-warning">Quedan {props.product.stock}</span>
            </div>
          </Show>

          {/* Category info para mode manage */}
          <Show when={mode() === 'manage' && props.product.category}>
            <div class="px-1.5 py-0.5 bg-secondary/80 rounded text-[10px] font-medium text-secondary-foreground">
              {props.product.category}
            </div>
          </Show>
        </div>
      </div>
    </Motion.button>
  );
}

export default OptimizedProductCard;
