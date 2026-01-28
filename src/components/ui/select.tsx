/* eslint-disable solid/reactivity, solid/components-return-once */
import { Select as KobalteSelect } from '@kobalte/core/select';
import { Check, ChevronDown } from 'lucide-solid';
import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onMount,
  type ParentProps,
  Show,
  splitProps,
  useContext,
} from 'solid-js';

import { cn } from '@/lib/utils';

// ==================== Types ====================

interface SelectOption {
  value: string;
  label: JSX.Element;
  disabled?: boolean;
}

// ==================== Context for children pattern ====================

interface SelectContextValue {
  options: Accessor<SelectOption[]>;
  registerOption: (option: SelectOption) => void;
  value: Accessor<string | undefined>;
  onChange: (value: string) => void;
  isOpen: Accessor<boolean>;
  setIsOpen: (open: boolean) => void;
  placeholder: Accessor<string | undefined>;
  disabled: Accessor<boolean | undefined>;
}

const SelectContext = createContext<SelectContextValue>();

// ==================== Select Root ====================

interface SelectRootProps<T = string> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T | null) => void;
  onValueChange?: (value: T) => void;
  options?: T[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  class?: string;
  children?: JSX.Element;
  itemComponent?: (props: { item: { rawValue: T } }) => JSX.Element;
}

/**
 * Select component wrapper that supports both:
 * 1. Kobalte's native options prop pattern (with options + itemComponent)
 * 2. Radix-like SelectItem children pattern (SelectTrigger + SelectContent with SelectItem children)
 */
function Select<T extends string = string>(props: SelectRootProps<T>) {
  const [local, others] = splitProps(props, [
    'value',
    'defaultValue',
    'onChange',
    'onValueChange',
    'options',
    'placeholder',
    'disabled',
    'required',
    'name',
    'class',
    'children',
    'itemComponent',
  ]);

  // If using Kobalte native pattern with options prop, use Kobalte directly
   
  if (local.options !== undefined) {
    return (
      <KobalteSelect<T>
        value={local.value}
        defaultValue={local.defaultValue}
        onChange={(v) => {
          if (local.onChange) local.onChange(v);
          if (local.onValueChange && v !== null) local.onValueChange(v);
        }}
        options={local.options}
        disabled={local.disabled}
        required={local.required}
        name={local.name}
        itemComponent={
          local.itemComponent
            ? (itemProps) =>
                 
                local.itemComponent!({ item: { rawValue: itemProps.item.rawValue as T } })
            : (itemProps) => (
                <KobalteSelect.Item
                  item={itemProps.item}
                  class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <KobalteSelect.ItemIndicator>
                      <Check class="h-4 w-4" />
                    </KobalteSelect.ItemIndicator>
                  </span>
                  <KobalteSelect.ItemLabel>
                    {String(itemProps.item.rawValue)}
                  </KobalteSelect.ItemLabel>
                </KobalteSelect.Item>
              )
        }
        class={local.class}
        {...others}
      >
        {local.children}
      </KobalteSelect>
    );
  }

  // Children pattern: use context to collect options and build Kobalte Select
   
  const [collectedOptions, setCollectedOptions] = createSignal<SelectOption[]>([]);
  const [currentValue, setCurrentValue] = createSignal<string | undefined>(
    local.value ?? local.defaultValue
  );
  const [isOpen, setIsOpen] = createSignal(false);
  const [isInitialized, setIsInitialized] = createSignal(false);

  // Update current value when prop changes
  createEffect(() => {
    if (local.value !== undefined) {
      setCurrentValue(local.value as string);
    }
  });

  const registerOption = (option: SelectOption) => {
    setCollectedOptions((prev) => {
      // Avoid duplicates
      if (prev.some((o) => o.value === option.value)) {
        return prev;
      }
      return [...prev, option];
    });
  };

  const handleChange = (value: string | null) => {
    if (value !== null) {
      setCurrentValue(value);
      if (local.onChange) {
        local.onChange(value as T | null);
      }
      if (local.onValueChange) {
        local.onValueChange(value as T);
      }
    }
  };

  const contextValue: SelectContextValue = {
    options: collectedOptions,
    registerOption,
    value: currentValue,
    onChange: (v) => handleChange(v),
    isOpen,
    setIsOpen,
    placeholder: () => local.placeholder,
    disabled: () => local.disabled,
  };

  // Mark as initialized when we have options
  // This is reactive - as soon as any option is registered, we initialize
  createEffect(() => {
    if (collectedOptions().length > 0 && !isInitialized()) {
      setIsInitialized(true);
    }
  });

  // Get the label for the current value
  const currentLabel = createMemo(() => {
    const val = currentValue();
    if (!val) return undefined;
    const opt = collectedOptions().find((o) => o.value === val);
    return opt?.label;
  });

  return (
    <SelectContext.Provider value={contextValue}>
      {/* Hidden container to mount SelectItem children and collect options */}
      <div class="hidden">{local.children}</div>

      {/* Actual Kobalte Select using collected options */}
      <Show when={isInitialized() && collectedOptions().length > 0}>
        <KobalteSelect<string>
          value={currentValue()}
          onChange={handleChange}
          options={collectedOptions().map((o) => o.value)}
          disabled={local.disabled}
          required={local.required}
          name={local.name}
          class={local.class}
          itemComponent={(itemProps) => {
            const opt = collectedOptions().find((o) => o.value === itemProps.item.rawValue);
            return (
              <KobalteSelect.Item
                item={itemProps.item}
                class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <KobalteSelect.ItemIndicator>
                    <Check class="h-4 w-4" />
                  </KobalteSelect.ItemIndicator>
                </span>
                <KobalteSelect.ItemLabel>
                  {opt?.label || String(itemProps.item.rawValue)}
                </KobalteSelect.ItemLabel>
              </KobalteSelect.Item>
            );
          }}
          {...others}
        >
          <KobalteSelect.Trigger
            class={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'
            )}
          >
            <KobalteSelect.Value<string>>
              {(state) => {
                const selectedVal = state.selectedOption();
                if (!selectedVal) return local.placeholder || 'Select...';
                const opt = collectedOptions().find((o) => o.value === selectedVal);
                return opt?.label || selectedVal;
              }}
            </KobalteSelect.Value>
            <KobalteSelect.Icon>
              <ChevronDown class="h-4 w-4 opacity-50" />
            </KobalteSelect.Icon>
          </KobalteSelect.Trigger>
          <KobalteSelect.Portal>
            <KobalteSelect.Content class="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95">
              <KobalteSelect.Listbox class="p-1" />
            </KobalteSelect.Content>
          </KobalteSelect.Portal>
        </KobalteSelect>
      </Show>

      {/* Fallback while collecting options */}
      <Show when={!isInitialized() || collectedOptions().length === 0}>
        <button
          type="button"
          disabled={local.disabled}
          class={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            local.class
          )}
        >
          <span class="text-muted-foreground">{local.placeholder || 'Select...'}</span>
          <ChevronDown class="h-4 w-4 opacity-50" />
        </button>
      </Show>
    </SelectContext.Provider>
  );
}

// ==================== SelectValue ====================

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue(props: SelectValueProps) {
  const context = useContext(SelectContext);

  // If inside children pattern context, this is just a marker
  // The actual value display is handled by the Select component
   
  if (context) {
    return null;
  }

  // Inside Kobalte pattern - use Kobalte's SelectValue
  return (
    <KobalteSelect.Value<string>>
      {(state) => state.selectedOption() || props.placeholder}
    </KobalteSelect.Value>
  );
}

// ==================== SelectTrigger ====================

interface SelectTriggerProps extends ParentProps<JSX.HTMLAttributes<HTMLButtonElement>> {
  ref?: HTMLButtonElement | ((el: HTMLButtonElement) => void);
  id?: string;
}

function SelectTrigger(props: SelectTriggerProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref', 'id']);
  const context = useContext(SelectContext);

  // If inside children pattern context, this is just a marker for structure
  // The actual trigger is rendered by the Select component
   
  if (context) {
    return null;
  }

  // Inside Kobalte pattern - use Kobalte Trigger
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

// ==================== SelectContent ====================

interface SelectContentProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SelectContent(props: SelectContentProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref']);
  const context = useContext(SelectContext);

  // If inside children pattern context, just render children to allow SelectItem registration
   
  if (context) {
    return <>{local.children}</>;
  }

  // Inside Kobalte pattern - use Kobalte Portal/Content
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

// ==================== SelectItem ====================

interface SelectItemProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  value: string;
  disabled?: boolean;
}

function SelectItem(props: SelectItemProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'ref', 'value', 'disabled']);
  const context = useContext(SelectContext);

  // If inside children pattern context, register this option
   
  if (context) {
    onMount(() => {
      context.registerOption({
        value: local.value,
        label: local.children,
        disabled: local.disabled,
      });
    });
    // Don't render anything - the Select component handles rendering via Kobalte
    return null;
  }

  // Inside Kobalte pattern - this should not be called directly
  // Instead, use itemComponent on the Select
  // But for compatibility, we return a placeholder that works with itemComponent
  return (
    <div
      ref={local.ref}
      class={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        local.class
      )}
      data-value={local.value}
      data-disabled={local.disabled || undefined}
      {...others}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check class="h-4 w-4" />
      </span>
      {local.children}
    </div>
  );
}

// ==================== SelectLabel ====================

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

// ==================== SelectSeparator ====================

interface SelectSeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function SelectSeparator(props: SelectSeparatorProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return <div ref={local.ref} class={cn('-mx-1 my-1 h-px bg-muted', local.class)} {...others} />;
}

// ==================== Exports ====================

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
