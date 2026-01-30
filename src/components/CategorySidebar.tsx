import { Grid3X3 } from 'lucide-solid';
import { For } from 'solid-js';
import CategoryCard from '@/components/ui/CategoryCard';
import type Category from '@/models/Category';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryName: string) => void;
}

function CategorySidebar(props: CategorySidebarProps) {
  return (
    <div class="h-full w-full flex flex-col bg-sidebar border-sidebar-border overflow-hidden">
      {/* Header */}
      <div class="h-10 px-3 border-b border-sidebar-border bg-sidebar-accent/20 flex items-center gap-2 flex-shrink-0">
        <Grid3X3 class="w-3.5 h-3.5 text-sidebar-foreground/70" />
        <h3 class="text-xs font-medium text-sidebar-foreground">Categorías</h3>
      </div>

      {/* Lista de categorías con scroll independiente */}
      <div class="flex-1 min-h-0 w-full overflow-y-auto">
        <div class="p-1.5 space-y-0.5">
          {/* Categoría Fijados primero */}
          <CategoryCard
            category={{ name: 'Fijados', description: 'Productos fijados' }}
            mode="sidebar"
            isSelected={props.selectedCategory === 'Fijados'}
            onAction={props.onCategorySelect}
            isFavorite={true}
          />

          {/* Resto de categorías */}
          <For each={props.categories}>
            {(category) => (
              <CategoryCard
                category={category}
                mode="sidebar"
                isSelected={props.selectedCategory === category.name}
                onAction={props.onCategorySelect}
                isFavorite={false}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default CategorySidebar;
