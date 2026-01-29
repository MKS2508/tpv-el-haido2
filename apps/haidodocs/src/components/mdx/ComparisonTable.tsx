import { Check, X } from 'lucide-react';

type CellValue = string | number | boolean;

interface ComparisonTableProps {
  headers: string[];
  rows: CellValue[][];
}

export function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  const renderCell = (value: CellValue) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-red-500 mx-auto" />
      );
    }
    return value;
  };

  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-[var(--bg-hover)]">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 border border-[var(--border-subtle)] ${
                    cellIndex === 0
                      ? 'text-[var(--text-primary)] font-medium'
                      : 'text-center text-[var(--text-muted)]'
                  }`}
                >
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
