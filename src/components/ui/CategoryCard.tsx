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

interface CategoryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  category: Category | { name: string; description?: string };
  mode: 'sidebar' | 'manage'; // 'sidebar' para CategorySidebar, 'manage' para Products page
  isSelected?: boolean;
  onAction?: (categoryName: string) => void;
  isFavorite?: boolean; // Para categorías especiales como "Fijados"
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  mode = 'manage',
  isSelected = false,
  onAction,
  isFavorite = false,
  className,
  onClick: categoryCardOnClick, // Destructure onClick
  onAnimationStart, // Destructure conflicting prop
  onAnimationEnd, // Destructure conflicting prop
  onAnimationIteration, // Destructure conflicting prop
  onDragStart, // Destructure conflicting prop
  onDragEnd, // Destructure conflicting prop
  onDrag, // Destructure conflicting prop
  ...props
}) => {
  const getCategoryIcon = (categoryName: string) => {
    const iconProps = { className: mode === 'sidebar' ? 'w-4 h-4' : 'w-5 h-5' };

    switch (true) {
      case categoryName.toLowerCase().includes('café'):
        return <Coffee {...iconProps} />;
      case categoryName.toLowerCase().includes('cerveza'):
        return <Beer {...iconProps} />;
      case categoryName.toLowerCase().includes('refresco'):
      case categoryName.toLowerCase().includes('zumo'):
        return <GlassWater {...iconProps} />;
      case categoryName.toLowerCase().includes('vino'):
      case categoryName.toLowerCase().includes('licor'):
        return <Wine {...iconProps} />;
      case categoryName.toLowerCase().includes('tapa'):
      case categoryName.toLowerCase().includes('bocadillo'):
        return <Utensils {...iconProps} />;
      case categoryName.toLowerCase().includes('postre'):
        return <IceCream {...iconProps} />;
      case categoryName.toLowerCase().includes('golosina'):
        return <Candy {...iconProps} />;
      case categoryName.toLowerCase().includes('desayuno'):
        return <Croissant {...iconProps} />;
      case categoryName === 'Fijados':
        return <Star {...iconProps} />;
      default:
        return <Utensils {...iconProps} />;
    }
  };

  // Colores por categoría usando tokens chart
  const getCategoryColors = (categoryName: string) => {
    const categoryLower = categoryName.toLowerCase();
    if (categoryLower.includes('café')) {
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

  if (mode === 'sidebar') {
    return (
      <Button
        onClick={() => {
          onAction?.(category.name);
        }}
        variant="ghost"
        class={cn(
          'category-button w-full justify-start gap-2 px-2 py-1.5 text-left font-medium rounded-md h-8',
          isSelected
            ? isFavorite
              ? 'bg-warning text-warning-foreground shadow-sm border-warning'
              : 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm border-sidebar-primary'
            : isFavorite
              ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20'
              : 'bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'border border-sidebar-border transition-all duration-200 cursor-pointer',
          className
        )}
      >
        {getCategoryIcon(category.name)}
        <span class="text-xs truncate">
          {category.name}
          {isFavorite && ' ⭐'}
        </span>
      </Button>
    );
  }

  // Mode 'manage' - for Products page
  return (
    <motion.div
      class={cn(
        'relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200',
        'border bg-card hover:shadow-md hover:border-primary/30',
        'border-border shadow-sm',
        `bg-gradient-to-br ${getCategoryColors(category.name)}`,
        className
      )}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onAction?.(category.name);
        categoryCardOnClick?.(event);
      }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        duration: 0.15,
        type: 'spring',
        stiffness: 400,
      }}
      {...props}
    >
      {/* Header with icon and title */}
      <div class="p-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 bg-background/80 rounded-lg shadow-sm">
            {getCategoryIcon(category.name)}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-foreground truncate">{category.name}</h3>
          </div>
        </div>

        {/* Description */}
        {category.description && (
          <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        )}
      </div>
      {/* Subtle gradient overlay for better text readability */}
      <div class="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/10 pointer-events-none rounded-xl" />
    </motion.div>
  );
};

export default CategoryCard;
