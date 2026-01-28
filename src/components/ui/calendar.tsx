import { ChevronLeft, ChevronRight } from 'lucide-solid';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

export interface CalendarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | Date[] | { from?: Date; to?: Date } | undefined;
  onSelect?: (value: Date | Date[] | { from?: Date; to?: Date } | undefined) => void;
  numberOfMonths?: number;
  defaultMonth?: Date;
  disabled?: Date[] | ((date: Date) => boolean);
  showOutsideDays?: boolean;
  locale?: string;
}

function Calendar(props: CalendarProps) {
  const [local, others] = splitProps(props, [
    'class',
    'mode',
    'selected',
    'onSelect',
    'numberOfMonths',
    'defaultMonth',
    'disabled',
    'showOutsideDays',
    'locale',
  ]);

  const month = () => local.defaultMonth ?? new Date();
  const year = () => month().getFullYear();
  const currentMonth = () => month().getMonth();

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateSelected = (date: Date) => {
    if (!local.selected) return false;
    if (local.mode === 'range' && typeof local.selected === 'object' && 'from' in local.selected) {
      const selected = local.selected as { from?: Date; to?: Date };
      if (selected.from && date.getTime() === selected.from.getTime()) return true;
      if (selected.to && date.getTime() === selected.to.getTime()) return true;
      if (selected.from && selected.to && date > selected.from && date < selected.to) return true;
    }
    if (Array.isArray(local.selected)) {
      return local.selected.some((d) => d.getTime() === date.getTime());
    }
    if (local.selected instanceof Date) {
      return local.selected.getTime() === date.getTime();
    }
    return false;
  };

  const isDateToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isDateDisabled = (date: Date) => {
    if (!local.disabled) return false;
    if (Array.isArray(local.disabled)) {
      return local.disabled.some((d) => d.getTime() === date.getTime());
    }
    if (typeof local.disabled === 'function') {
      return local.disabled(date);
    }
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    if (local.onSelect) {
      if (
        local.mode === 'range' &&
        typeof local.selected === 'object' &&
        'from' in (local.selected ?? {})
      ) {
        const current = local.selected as { from?: Date; to?: Date };
        if (!current.from || (current.from && current.to)) {
          local.onSelect({ from: date, to: undefined });
        } else if (date < current.from!) {
          local.onSelect({ from: date, to: current.from });
        } else {
          local.onSelect({ from: current.from, to: date });
        }
      } else {
        local.onSelect(date);
      }
    }
  };

  const prevMonth = () => {
    const newDate = new Date(month());
    newDate.setMonth(newDate.getMonth() - 1);
    if (local.onSelect) local.onSelect(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(month());
    newDate.setMonth(newDate.getMonth() + 1);
    if (local.onSelect) local.onSelect(newDate);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month];
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  const renderDays = () => {
    const totalDays = daysInMonth(month());
    const firstDay = firstDayOfMonth(month());
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      const prevMonthDate = new Date(
        year(),
        currentMonth() - 1,
        daysInMonth(new Date(year(), currentMonth() - 1, 1)) - firstDay + i + 1
      );
      days.push(<div class="h-9 w-9 text-center text-sm p-0 text-muted-foreground opacity-50" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year(), currentMonth(), day);
      const selected = isDateSelected(date);
      const today = isDateToday(date);
      const disabled = isDateDisabled(date);
      days.push(
        <button
          type="button"
          disabled={disabled}
          class={cn(
            'h-9 w-9 p-0 font-normal text-sm rounded-md transition-colors',
            selected &&
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
            today && !selected && 'bg-accent text-accent-foreground',
            disabled && 'text-muted-foreground opacity-50 pointer-events-none',
            !selected && !disabled && 'hover:bg-accent'
          )}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </button>
      );
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(<div class="h-9 w-9 text-center text-sm p-0 text-muted-foreground opacity-50" />);
    }

    return days;
  };

  return (
    <div class={cn('p-3', local.class)} {...others}>
      <div class="space-y-4">
        <div class="flex justify-center pt-1 relative items-center">
          <button
            type="button"
            onClick={prevMonth}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 absolute left-1"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="text-sm font-medium">
            {getMonthName(currentMonth())} {year()}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 absolute right-1"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <div class="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          {[...Array(local.numberOfMonths ?? 1)].map((_, monthIndex) => (
            <div key={monthIndex} class="space-y-4">
              <div class="grid grid-cols-7 gap-1 text-center">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <div
                    key={day}
                    class="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"
                  >
                    {getDayName(day)}
                  </div>
                ))}
              </div>
              <div class="grid grid-cols-7 gap-1">{renderDays()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
