import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-solid';
import {
  type Component,
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { Calendar } from '@/components/ui/calendar.tsx';
import { DateInput } from '@/components/ui/date-input.tsx';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Switch } from './switch';

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end';
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split('-').map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput;
  }
};

interface DateRange {
  from: Date;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets
const PRESETS: Preset[] = [
  { name: 'today', label: 'Today' },
  { name: 'yesterday', label: 'Yesterday' },
  { name: 'last7', label: 'Last 7 days' },
  { name: 'last14', label: 'Last 14 days' },
  { name: 'last30', label: 'Last 30 days' },
  { name: 'thisWeek', label: 'This Week' },
  { name: 'lastWeek', label: 'Last Week' },
  { name: 'thisMonth', label: 'This Month' },
  { name: 'lastMonth', label: 'Last Month' },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: Component<DateRangePickerProps> & {
  filePath: string;
} = (props) => {
  const initialDateFrom = () => props.initialDateFrom ?? new Date(new Date().setHours(0, 0, 0, 0));
  const locale = () => props.locale ?? 'en-US';
  const align = () => props.align ?? 'end';
  const showCompare = () => props.showCompare ?? true;

  const [isOpen, setIsOpen] = createSignal(false);

  const [range, setRange] = createSignal<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom()),
    to: props.initialDateTo
      ? getDateAdjustedForTimezone(props.initialDateTo)
      : getDateAdjustedForTimezone(initialDateFrom()),
  });

  const [rangeCompare, setRangeCompare] = createSignal<DateRange | undefined>(
    props.initialCompareFrom
      ? {
          from: new Date(new Date(props.initialCompareFrom).setHours(0, 0, 0, 0)),
          to: props.initialCompareTo
            ? new Date(new Date(props.initialCompareTo).setHours(0, 0, 0, 0))
            : new Date(new Date(props.initialCompareFrom).setHours(0, 0, 0, 0)),
        }
      : undefined
  );

  // Store the values of range and rangeCompare when the date picker is opened
  let openedRangeRef: DateRange | undefined;
  let openedRangeCompareRef: DateRange | undefined;

  const [selectedPreset, setSelectedPreset] = createSignal<string | undefined>(undefined);

  const [isSmallScreen, setIsSmallScreen] = createSignal(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  );

  onMount(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener('resize', handleResize);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    const from = new Date();
    const to = new Date();
    const first = from.getDate() - from.getDay();

    switch (preset.name) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last14':
        from.setDate(from.getDate() - 13);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        from.setDate(first);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        from.setDate(from.getDate() - 7 - from.getDay());
        to.setDate(to.getDate() - to.getDay() - 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        from.setMonth(from.getMonth() - 1);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
        break;
    }

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const newRange = getPresetRange(preset);
    setRange(newRange);
    if (rangeCompare()) {
      const newRangeCompare = {
        from: new Date(
          newRange.from.getFullYear() - 1,
          newRange.from.getMonth(),
          newRange.from.getDate()
        ),
        to: newRange.to
          ? new Date(newRange.to.getFullYear() - 1, newRange.to.getMonth(), newRange.to.getDate())
          : undefined,
      };
      setRangeCompare(newRangeCompare);
    }
  };

  const checkPreset = (): void => {
    const currentRange = range();
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new Date(currentRange.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(presetRange.from.setHours(0, 0, 0, 0));

      const normalizedRangeTo = new Date(currentRange.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(presetRange.to?.setHours(0, 0, 0, 0) ?? 0);

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    const initFrom = initialDateFrom();
    setRange({
      from: typeof initFrom === 'string' ? getDateAdjustedForTimezone(initFrom) : initFrom,
      to: props.initialDateTo
        ? typeof props.initialDateTo === 'string'
          ? getDateAdjustedForTimezone(props.initialDateTo)
          : props.initialDateTo
        : typeof initFrom === 'string'
          ? getDateAdjustedForTimezone(initFrom)
          : initFrom,
    });
    setRangeCompare(
      props.initialCompareFrom
        ? {
            from:
              typeof props.initialCompareFrom === 'string'
                ? getDateAdjustedForTimezone(props.initialCompareFrom)
                : props.initialCompareFrom,
            to: props.initialCompareTo
              ? typeof props.initialCompareTo === 'string'
                ? getDateAdjustedForTimezone(props.initialCompareTo)
                : props.initialCompareTo
              : typeof props.initialCompareFrom === 'string'
                ? getDateAdjustedForTimezone(props.initialCompareFrom)
                : props.initialCompareFrom,
          }
        : undefined
    );
  };

  // Effect to check preset when range changes
  createEffect(on(() => [range().from, range().to], checkPreset));

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() && (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  // Effect to store opened range values
  createEffect(
    on(isOpen, (open) => {
      if (open) {
        openedRangeRef = range();
        openedRangeCompareRef = rangeCompare();
      }
    })
  );

  const PresetButton: Component<{
    preset: string;
    label: string;
    isSelected: boolean;
  }> = (buttonProps) => (
    <Button
      class={cn(buttonProps.isSelected && 'pointer-events-none')}
      variant="ghost"
      onClick={() => {
        setPreset(buttonProps.preset);
      }}
    >
      <span class={cn('pr-2 opacity-0', buttonProps.isSelected && 'opacity-70')}>
        <CheckIcon width={18} height={18} />
      </span>
      {buttonProps.label}
    </Button>
  );

  return (
    <Popover
      modal={true}
      open={isOpen()}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues();
        }
        setIsOpen(open);
      }}
    >
      <PopoverTrigger as="div">
        {(triggerProps: Record<string, unknown>) => (
          <Button size="lg" variant="outline" {...triggerProps}>
            <div class="text-right">
              <div class="py-1">
                <div>{`${formatDate(range().from, locale())}${
                  range().to != null ? ` - ${formatDate(range().to!, locale())}` : ''
                }`}</div>
              </div>
              <Show when={rangeCompare() != null}>
                <div class="opacity-60 text-xs -mt-1">
                  vs. {formatDate(rangeCompare()!.from, locale())}
                  {rangeCompare()!.to != null
                    ? ` - ${formatDate(rangeCompare()!.to!, locale())}`
                    : ''}
                </div>
              </Show>
            </div>
            <div class="pl-1 opacity-60 -mr-2 scale-125">
              <Show when={isOpen()} fallback={<ChevronDownIcon width={24} />}>
                <ChevronUpIcon width={24} />
              </Show>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align()} class="w-auto">
        <div class="flex py-2">
          <div class="flex">
            <div class="flex flex-col">
              <div class="flex flex-col lg:flex-row gap-2 px-3 justify-end items-center lg:items-start pb-4 lg:pb-0">
                <Show when={showCompare()}>
                  <div class="flex items-center space-x-2 pr-4 py-1">
                    <Switch
                      defaultChecked={Boolean(rangeCompare())}
                      onChange={(checked: boolean) => {
                        if (checked) {
                          const currentRange = range();
                          if (!currentRange.to) {
                            setRange({
                              from: currentRange.from,
                              to: currentRange.from,
                            });
                          }
                          setRangeCompare({
                            from: new Date(
                              currentRange.from.getFullYear(),
                              currentRange.from.getMonth(),
                              currentRange.from.getDate() - 365
                            ),
                            to: currentRange.to
                              ? new Date(
                                  currentRange.to.getFullYear() - 1,
                                  currentRange.to.getMonth(),
                                  currentRange.to.getDate()
                                )
                              : new Date(
                                  currentRange.from.getFullYear() - 1,
                                  currentRange.from.getMonth(),
                                  currentRange.from.getDate()
                                ),
                          });
                        } else {
                          setRangeCompare(undefined);
                        }
                      }}
                      id="compare-mode"
                    />
                    <Label for="compare-mode">Compare</Label>
                  </div>
                </Show>
                <div class="flex flex-col gap-2">
                  <div class="flex gap-2">
                    <DateInput
                      value={range().from}
                      onChange={(date) => {
                        const currentRange = range();
                        const toDate =
                          currentRange.to == null || date > currentRange.to
                            ? date
                            : currentRange.to;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: date,
                          to: toDate,
                        }));
                      }}
                    />
                    <div class="py-1">-</div>
                    <DateInput
                      value={range().to}
                      onChange={(date) => {
                        const currentRange = range();
                        const fromDate = date < currentRange.from ? date : currentRange.from;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: fromDate,
                          to: date,
                        }));
                      }}
                    />
                  </div>
                  <Show when={rangeCompare() != null}>
                    <div class="flex gap-2">
                      <DateInput
                        value={rangeCompare()?.from}
                        onChange={(date) => {
                          const currentRangeCompare = rangeCompare();
                          if (currentRangeCompare) {
                            const compareToDate =
                              currentRangeCompare.to == null || date > currentRangeCompare.to
                                ? date
                                : currentRangeCompare.to;
                            setRangeCompare((prevRangeCompare) => ({
                              ...prevRangeCompare!,
                              from: date,
                              to: compareToDate,
                            }));
                          } else {
                            setRangeCompare({
                              from: date,
                              to: new Date(),
                            });
                          }
                        }}
                      />
                      <div class="py-1">-</div>
                      <DateInput
                        value={rangeCompare()?.to}
                        onChange={(date) => {
                          const currentRangeCompare = rangeCompare();
                          if (currentRangeCompare?.from) {
                            const compareFromDate =
                              date < currentRangeCompare.from ? date : currentRangeCompare.from;
                            setRangeCompare({
                              ...currentRangeCompare,
                              from: compareFromDate,
                              to: date,
                            });
                          }
                        }}
                      />
                    </div>
                  </Show>
                </div>
              </div>
              <Show when={isSmallScreen()}>
                <Select
                  defaultValue={selectedPreset()}
                  onValueChange={(value) => {
                    setPreset(value);
                  }}
                >
                  <SelectTrigger class="w-[180px] mx-auto mb-2">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <For each={PRESETS}>
                      {(preset) => <SelectItem value={preset.name}>{preset.label}</SelectItem>}
                    </For>
                  </SelectContent>
                </Select>
              </Show>
              <div>
                <Calendar
                  mode="range"
                  onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                    if (value?.from != null) {
                      setRange({ from: value.from, to: value?.to });
                    }
                  }}
                  selected={range()}
                  numberOfMonths={isSmallScreen() ? 1 : 2}
                  defaultMonth={
                    new Date(new Date().setMonth(new Date().getMonth() - (isSmallScreen() ? 0 : 1)))
                  }
                />
              </div>
            </div>
          </div>
          <Show when={!isSmallScreen()}>
            <div class="flex flex-col items-end gap-1 pr-2 pl-6 pb-6">
              <div class="flex w-full flex-col items-end gap-1 pr-2 pl-6 pb-6">
                <For each={PRESETS}>
                  {(preset) => (
                    <PresetButton
                      preset={preset.name}
                      label={preset.label}
                      isSelected={selectedPreset() === preset.name}
                    />
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
        <div class="flex justify-end gap-2 py-2 pr-4">
          <Button
            onClick={() => {
              setIsOpen(false);
              resetValues();
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
              if (
                !areRangesEqual(range(), openedRangeRef) ||
                !areRangesEqual(rangeCompare(), openedRangeCompareRef)
              ) {
                props.onUpdate?.({ range: range(), rangeCompare: rangeCompare() });
              }
            }}
          >
            Update
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.filePath = 'libs/shared/ui-kit/src/lib/date-range-picker/date-range-picker.tsx';
