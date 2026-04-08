import { Switch as KobalteSwitch } from '@kobalte/core/switch';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
}

function Switch(props: SwitchProps) {
  const [local, others] = splitProps(props, [
    'class',
    'ref',
    'checked',
    'defaultChecked',
    'onChange',
    'disabled',
    'required',
    'name',
    'value',
  ]);

  return (
    <KobalteSwitch
      class={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[unchecked]:bg-input',
        local.class
      )}
      checked={local.checked}
      defaultChecked={local.defaultChecked}
      onChange={local.onChange}
      disabled={local.disabled}
      required={local.required}
      name={local.name}
      value={local.value}
      {...others}
    >
      <KobalteSwitch.Input />
      <KobalteSwitch.Control class="inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors">
        <KobalteSwitch.Thumb
          class={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-5 data-[unchecked]:translate-x-0'
          )}
        />
      </KobalteSwitch.Control>
    </KobalteSwitch>
  );
}

export { Switch };
