import { DropdownMenu as KobalteDropdownMenu } from '@kobalte/core/dropdown-menu';
import { Check, ChevronRight, DotFilled } from 'lucide-solid';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

type DropdownMenuProps = JSX.HTMLAttributes<HTMLDivElement>;
type DropdownMenuTriggerProps = JSX.HTMLAttributes<HTMLButtonElement>;
type DropdownMenuContentProps = JSX.HTMLAttributes<HTMLDivElement>;
type DropdownMenuItemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  onSelect?: () => void;
};
type DropdownMenuCheckboxItemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};
type DropdownMenuRadioItemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value?: string;
};
type DropdownMenuLabelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
};
type DropdownMenuSeparatorProps = JSX.HTMLAttributes<HTMLDivElement>;

const DropdownMenu = (props: DropdownMenuProps) => {
  return <KobalteDropdownMenu.Root {...props} />;
};

const DropdownMenuTrigger = (props: DropdownMenuTriggerProps) => {
  return <KobalteDropdownMenu.Trigger as="button" class={props.class} {...props} />;
};

const DropdownMenuGroup = KobalteDropdownMenu.Group;

const DropdownMenuPortal = KobalteDropdownMenu.Portal;

const DropdownMenuSub = KobalteDropdownMenu.Sub;

const DropdownMenuRadioGroup = KobalteDropdownMenu.RadioGroup;

const DropdownMenuSubTrigger = (props: DropdownMenuItemProps & { inset?: boolean }) => {
  const [local, others] = splitProps(props, ['class', 'inset', 'children']);
  return (
    <KobalteDropdownMenu.SubTrigger
      class={cn(
        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[open]:bg-accent [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0',
        local.inset && 'pl-8',
        local.class
      )}
      {...others}
    >
      {local.children}
      <ChevronRight class="ml-auto" />
    </KobalteDropdownMenu.SubTrigger>
  );
};

const DropdownMenuSubContent = (props: DropdownMenuContentProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdownMenu.SubContent
      class={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        local.class
      )}
      {...others}
    />
  );
};

const DropdownMenuContent = (props: DropdownMenuContentProps) => {
  const [local, others] = splitProps(props, ['class', 'sideOffset']);
  return (
    <KobalteDropdownMenu.Portal>
      <KobalteDropdownMenu.Content
        sideOffset={local.sideOffset ?? 4}
        class={cn(
          'z-50 max-h-[var(--kb-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          local.class
        )}
        {...others}
      />
    </KobalteDropdownMenu.Portal>
  );
};

const DropdownMenuItem = (props: DropdownMenuItemProps & { inset?: boolean }) => {
  const [local, others] = splitProps(props, ['class', 'inset', 'onSelect', 'children']);
  return (
    <KobalteDropdownMenu.Item
      class={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
        local.inset && 'pl-8',
        local.class
      )}
      onSelect={local.onSelect}
      {...others}
    >
      {local.children}
    </KobalteDropdownMenu.Item>
  );
};

const DropdownMenuCheckboxItem = (props: DropdownMenuCheckboxItemProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'checked', 'onChange']);
  return (
    <KobalteDropdownMenu.CheckboxItem
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class
      )}
      checked={local.checked}
      onChange={local.onChange}
      {...others}
    >
      <KobalteDropdownMenu.ItemIndicator class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check class="h-4 w-4" />
      </KobalteDropdownMenu.ItemIndicator>
      {local.children}
    </KobalteDropdownMenu.CheckboxItem>
  );
};

const DropdownMenuRadioItem = (props: DropdownMenuRadioItemProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'value']);
  return (
    <KobalteDropdownMenu.RadioItem
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class
      )}
      value={local.value}
      {...others}
    >
      <KobalteDropdownMenu.ItemIndicator class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DotFilled class="h-2 w-2 fill-current" />
      </KobalteDropdownMenu.ItemIndicator>
      {local.children}
    </KobalteDropdownMenu.RadioItem>
  );
};

const DropdownMenuLabel = (props: DropdownMenuLabelProps) => {
  const [local, others] = splitProps(props, ['class', 'inset']);
  return (
    <KobalteDropdownMenu.Label
      class={cn('px-2 py-1.5 text-sm font-semibold', local.inset && 'pl-8', local.class)}
      {...others}
    />
  );
};

const DropdownMenuSeparator = (props: DropdownMenuSeparatorProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteDropdownMenu.Separator
      class={cn('-mx-1 my-1 h-px bg-muted', local.class)}
      {...others}
    />
  );
};

const DropdownMenuShortcut = (props: JSX.HTMLAttributes<HTMLSpanElement>) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <span class={cn('ml-auto text-xs tracking-widest opacity-60', local.class)} {...others}>
      {local.children}
    </span>
  );
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
