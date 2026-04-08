import { type JSX, type ParentProps, splitProps } from 'solid-js';
import { cn } from '@/lib/utils';

type TableProps = ParentProps<JSX.HTMLAttributes<HTMLTableElement>>;

function Table(props: TableProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class="relative w-full overflow-auto">
      <table class={cn('w-full caption-bottom text-sm', local.class)} {...others}>
        {local.children}
      </table>
    </div>
  );
}

type TableHeaderProps = ParentProps<JSX.HTMLAttributes<HTMLTableSectionElement>>;

function TableHeader(props: TableHeaderProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <thead class={cn('[&_tr]:border-b', local.class)} {...others}>
      {local.children}
    </thead>
  );
}

type TableBodyProps = ParentProps<JSX.HTMLAttributes<HTMLTableSectionElement>>;

function TableBody(props: TableBodyProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <tbody class={cn('[&_tr:last-child]:border-0', local.class)} {...others}>
      {local.children}
    </tbody>
  );
}

type TableFooterProps = ParentProps<JSX.HTMLAttributes<HTMLTableSectionElement>>;

function TableFooter(props: TableFooterProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <tfoot
      class={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', local.class)}
      {...others}
    >
      {local.children}
    </tfoot>
  );
}

type TableRowProps = ParentProps<JSX.HTMLAttributes<HTMLTableRowElement>>;

function TableRow(props: TableRowProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <tr
      class={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        local.class
      )}
      {...others}
    >
      {local.children}
    </tr>
  );
}

type TableHeadProps = ParentProps<JSX.ThHTMLAttributes<HTMLTableCellElement>>;

function TableHead(props: TableHeadProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <th
      class={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        local.class
      )}
      {...others}
    >
      {local.children}
    </th>
  );
}

type TableCellProps = ParentProps<JSX.TdHTMLAttributes<HTMLTableCellElement>>;

function TableCell(props: TableCellProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <td class={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', local.class)} {...others}>
      {local.children}
    </td>
  );
}

type TableCaptionProps = ParentProps<JSX.HTMLAttributes<HTMLTableCaptionElement>>;

function TableCaption(props: TableCaptionProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <caption class={cn('mt-4 text-sm text-muted-foreground', local.class)} {...others}>
      {local.children}
    </caption>
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
