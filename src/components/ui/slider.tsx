import { Slider as KobalteSlider } from '@kobalte/core/slider';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

export interface SliderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  name?: string;
  disabled?: boolean;
  onChange?: (value: number[]) => void;
  onChangeEnd?: (value: number[]) => void;
}

const Slider = (props: SliderProps) => {
  const [local, others] = splitProps(props, [
    'class',
    'value',
    'defaultValue',
    'min',
    'max',
    'step',
    'name',
    'disabled',
    'onChange',
    'onChangeEnd',
  ]);

  return (
    <KobalteSlider.Root
      class={cn('relative flex w-full touch-none select-none items-center', local.class)}
      value={local.value}
      defaultValue={local.defaultValue}
      min={local.min ?? 0}
      max={local.max ?? 100}
      step={local.step ?? 1}
      name={local.name}
      disabled={local.disabled}
      onChange={local.onChange}
      onChangeEnd={local.onChangeEnd}
      {...others}
    >
      <KobalteSlider.Track class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <KobalteSlider.Fill class="absolute h-full bg-primary" />
      </KobalteSlider.Track>
      <KobalteSlider.Thumb class="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </KobalteSlider.Root>
  );
};

export { Slider };
