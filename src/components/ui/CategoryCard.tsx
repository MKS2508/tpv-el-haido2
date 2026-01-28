import { Show, splitProps, type Component, type JSX } from 'solid-js';
import { Motion } from '@motionone/solid';
import {
  Beer,
  Candy,
  Coffee,
  Croissant,
  GlassWater,
  IceCream,
  Star,
  Utensils,
  Wine,
} from 'lucide-solid';
import { cn } from '@/lib/utils.ts';
import type Category from '@/models/Category.ts';
import { Button } from './button';

type CategoryCardProps = {
  category: Category | { name: string; description?: string };
  mode: 'sidebar' | 'manage'; // 'sidebar' para CategorySidebar, 'manage' para Products page
  isSelected?: boolean;
  onAction?: (categoryName: string) => void;
  isFavorite?: boolean; // Para categorias especiales como "Fijados"
  class?: string;
};

const CategoryCard: Component<CategoryCardProps> = (props) => {
  const [local] = splitProps(props, [
    'category',
    'mode',
    'isSelected',
    'onAction',
    'isFavorite',
    'class',
  ]);

  const getCategoryIcon = (categoryName: string): JSX.Element => {
    const iconClass = local.mode === 'sidebar' ? 'w-4 h-4' : 'w-5 h-5';

    switch (true) {
      case categoryName.toLowerCase().includes('cafe'):
        return <Coffee class={iconClass} />;
      case categoryName.toLowerCase().includes('cerveza'):
        return <Beer class={iconClass} />;
      case categoryName.toLowerCase().includes('refresco'):
      case categoryName.toLowerCase().includes('zumo'):
        return <GlassWater class={iconClass} />;
      case categoryName.toLowerCase().includes('vino'):
      case categoryName.toLowerCase().includes('licor'):
        return <Wine class={iconClass} />;
      case categoryName.toLowerCase().includes('tapa'):
      case categoryName.toLowerCase().includes('bocadillo'):
        return <Utensils class={iconClass} />;
      case categoryName.toLowerCase().includes('postre'):
        return <IceCream class={iconClass} />;
      case categoryName.toLowerCase().includes('golosina'):
        return <Candy class={iconClass} />;
      case categoryName.toLowerCase().includes('desayuno'):
        return <Croissant class={iconClass} />;
      case categoryName === 'Fijados':
        return <Star class={iconClass} />;
      default:
        return <Utensils class={iconClass} />;
    }
  };

  // Colores por categoria usando tokens chart
  const getCategoryColors = (categoryName: string): string => {
    const categoryLower = categoryName.toLowerCase();
    if (categoryLower.includes('cafe')) {
      return 'from-chart-1/30 to-chart-1/10'; // Primary theme color
    }
    if (categoryLower.includes('cerveza') || categoryLower.includes('beer')) {
      return 'from-chart-4/30 to-chart-4/10'; // Warning/Orange
    }
    if (categoryLower.includes('refresco') || categoryLower.includes('zumo')) {
      return 'from-chart-3/30 to-chart-3/10'; // Cyan/Blue
    }
    if (categoryLower.includes('vino') || categoryLower.includes('licor')) {
      return 'from-chart-2/30 to-chart-2/10'; // Secondary accent
    }
    if (categoryLower.includes('postre')) {
      return 'from-chart-5/30 to-chart-5/10'; // Green
    }
    if (categoryName === 'Fijados') {
      return 'from-warning/30 to-warning/10'; // Special yellow for favorites
    }
    return 'from-chart-2/20 to-chart-2/5'; // Default secondary
  };

  return (
    <Show
      when={local.mode === 'manage'}
      fallback={
        <Button
          onClick={() => {
            local.onAction?.(local.category.name);
          }}
          variant="ghost"
          class={cn(
            'category-button w-full justify-start gap-2 px-2 py-1.5 text-left font-medium rounded-md h-8',
            local.isSelected
              ? local.isFavorite
                ? 'bg-warning text-warning-foreground shadow-sm border-warning'
                : 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm border-sidebar-primary'
              : local.isFavorite
                ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20'
                : 'bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'border border-sidebar-border transition-all duration-200 cursor-pointer',
            local.class
          )}
        >
          {getCategoryIcon(local.category.name)}
          <span class="text-xs truncate">
            {local.category.name}
            {local.isFavorite && ' \u2B50'}
          </span>
        </Button>
      }
    >
      {/* Mode 'manage' - for Products page */}
      <Motion.div
        class={cn(
          'relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200',
          'border bg-card hover:shadow-md hover:border-primary/30',
          'border-border shadow-sm',
          `bg-gradient-to-br ${getCategoryColors(local.category.name)}`,
          local.class
        )}
        onClick={() => {
          local.onAction?.(local.category.name);
        }}
        press={{ scale: 0.98 }}
        hover={{ scale: 1.02 }}
        transition={{
          duration: 0.15,
          easing: 'ease-out',
        }}
      >
        {/* Header with icon and title */}
        <div class="p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-background/80 rounded-lg shadow-sm">
              {getCategoryIcon(local.category.name)}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-foreground truncate">{local.category.name}</h3>
            </div>
          </div>

          {/* Description */}
          <Show when={local.category.description}>
            <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {local.category.description}
            </p>
          </Show>
        </div>
        {/* Subtle gradient overlay for better text readability */}
        <div class="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/10 pointer-events-none rounded-xl" />
      </Motion.div>
    </Show>
  );
};

export default CategoryCard;
