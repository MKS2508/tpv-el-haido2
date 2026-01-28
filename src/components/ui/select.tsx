import { Select as KobalteSelect } from '@kobalte/core/select';
import { Check, ChevronDown } from 'lucide-solid';
import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const Select = KobalteSelect;

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue(props: SelectValueProps) {
  return <KobalteSelect.Value<string>>{(state) => state.selectedOption() || props.placeholder}</KobalteSelect.Value>;
}

interface SelectTriggerProps extends ParentProps<JSX.HTMLAttributes<HTMLButtonElement>> {
  ref?: HTMLButtonElement | ((el: HTMLButtonElement) => void);
}

function SelectTrigger(props: SelectTriggerProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref']);
  return (
    <KobalteSelect.Trigger
      ref={local.ref}
      class={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        local.class
      )}
      {...others}
    >
      {local.children}
      <KobalteSelect.Icon>
        <ChevronDown class="h-4 w-4 opacity-50" />
      </KobalteSelect.Icon>
    </KobalteSelect.Trigger>
  );
}

interface SelectContentProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SelectContent(props: SelectContentProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref']);
  return (
    <KobalteSelect.Portal>
      <KobalteSelect.Content
        ref={local.ref}
        class={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95',
          local.class
        )}
        {...others}
      >
        <KobalteSelect.Listbox class="p-1" />
      </KobalteSelect.Content>
    </KobalteSelect.Portal>
  );
}

interface SelectItemProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  value: string;
  disabled?: boolean;
}

function SelectItem(props: SelectItemProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref', 'value', 'disabled']);
  return (
    <KobalteSelect.Item
      ref={local.ref}
      item={local.value}
      disabled={local.disabled}
      class={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class
      )}
      {...others}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <KobalteSelect.ItemIndicator>
          <Check class="h-4 w-4" />
        </KobalteSelect.ItemIndicator>
      </span>
      <KobalteSelect.ItemLabel>{local.children}</KobalteSelect.ItemLabel>
    </KobalteSelect.Item>
  );
}

interface SelectLabelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SelectLabel(props: SelectLabelProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteSelect.Label
      ref={local.ref}
      class={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', local.class)}
      {...others}
    />
  );
}

interface SelectSeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SelectSeparator(props: SelectSeparatorProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <div ref={local.ref} class={cn('-mx-1 my-1 h-px bg-muted', local.class)} {...others} />;
}

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
