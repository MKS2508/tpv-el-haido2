import { Grid3X3 } from 'lucide-react';
import type React from 'react';
import CategoryCard from '@/components/ui/CategoryCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type Category from '@/models/Category';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryName: string) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  return (
    <div className="h-full w-full flex flex-col bg-sidebar border-sidebar-border overflow-hidden">
      {/* Header */}
      <div className="h-12 px-3 border-b border-sidebar-border bg-sidebar-accent/20 flex items-center gap-2 flex-shrink-0">
        <Grid3X3 className="w-4 h-4 text-sidebar-foreground/70" />
        <h3 className="text-sm font-medium text-sidebar-foreground">Categorías</h3>
      </div>

      {/* Lista de categorías con scroll independiente */}
      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="p-1.5 space-y-0.5">
          {/* Categoría Fijados primero */}
          <CategoryCard
            category={{ name: 'Fijados', description: 'Productos fijados' }}
            mode="sidebar"
            isSelected={selectedCategory === 'Fijados'}
            onAction={onCategorySelect}
            isFavorite={true}
          />

          {/* Resto de categorías */}
          {categories.map((category) => (
            <CategoryCard
              key={`category-${category.id}`}
              category={category}
              mode="sidebar"
              isSelected={selectedCategory === category.name}
              onAction={onCategorySelect}
              isFavorite={false}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CategorySidebar;
