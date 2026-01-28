import { For } from 'solid-js';
import { Button } from '@/components/ui/button';
import type Order from '@/models/Order';
import type Table from '@/models/Table';

interface TableHeaderProps {
  tables: Table[];
  selectedOrder: Order | null;
  onTableChange: (tableId: number) => void;
}

function TableHeader(props: TableHeaderProps) {
  const getButtonStyle = (isSelected: boolean) => `
        min-h-12 h-12 px-4 text-sm font-medium relative min-w-[120px]
        ${
          isSelected
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }
        border-2 ${isSelected ? 'border-primary' : 'border-border hover:border-border/80'}
        transition-all duration-200 active:scale-95
    `;

  const nonBarTables = () => props.tables.filter((table) => table.id !== 0);

  return (
    <div class="w-full bg-background border-b border-border p-4">
      <div class="flex flex-wrap gap-3 justify-start">
        <Button
          onClick={() => props.onTableChange(0)}
          variant="outline"
          class={getButtonStyle(props.selectedOrder?.tableNumber === 0)}
        >
          <span class="text-center flex items-center justify-center">Barra</span>
          <span
            role="img"
            class={`absolute top-1 right-1 w-3 h-3 rounded-full ${
              props.tables.find((t) => t.id === 0)?.available !== false
                ? 'bg-primary'
                : 'bg-destructive'
            }`}
            aria-label={
              props.tables.find((t) => t.id === 0)?.available !== false ? 'Disponible' : 'Ocupado'
            }
          />
        </Button>

        <For each={nonBarTables()}>
          {(table) => (
            <Button
              onClick={() => props.onTableChange(table.id)}
              variant="outline"
              class={getButtonStyle(props.selectedOrder?.tableNumber === table.id)}
            >
              <span class="text-center flex items-center justify-center">{table.name}</span>
              <span
                role="img"
                class={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                  table.available ? 'bg-primary' : 'bg-destructive'
                }`}
                aria-label={table.available ? 'Disponible' : 'Ocupado'}
              />
            </Button>
          )}
        </For>
      </div>
    </div>
  );
}

export default TableHeader;
