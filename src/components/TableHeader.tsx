import type React from 'react';
import { Button } from '@/components/ui/button';
import type Order from '@/models/Order';
import type Table from '@/models/Table';

interface TableHeaderProps {
  tables: Table[];
  selectedOrder: Order | null;
  onTableChange: (tableId: number) => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({ tables, selectedOrder, onTableChange }) => {
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

  return (
    <div className="w-full bg-background border-b border-border p-4">
      <div className="flex flex-wrap gap-3 justify-start">
        <Button
          onClick={() => onTableChange(0)}
          variant="outline"
          className={getButtonStyle(selectedOrder?.tableNumber === 0)}
        >
          <span className="text-center flex items-center justify-center">Barra</span>
          <span
            className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
              tables.find((t) => t.id === 0)?.available !== false ? 'bg-primary' : 'bg-destructive'
            }`}
            aria-label={
              tables.find((t) => t.id === 0)?.available !== false ? 'Disponible' : 'Ocupado'
            }
          />
        </Button>

        {tables
          .filter((table) => table.id !== 0)
          .map((table) => (
            <Button
              key={table.id}
              onClick={() => onTableChange(table.id)}
              variant="outline"
              className={getButtonStyle(selectedOrder?.tableNumber === table.id)}
            >
              <span className="text-center flex items-center justify-center">{table.name}</span>
              <span
                className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                  table.available ? 'bg-primary' : 'bg-destructive'
                }`}
                aria-label={table.available ? 'Disponible' : 'Ocupado'}
              />
            </Button>
          ))}
      </div>
    </div>
  );
};

export default TableHeader;
