import { createSignal } from 'solid-js';

interface DateInputProps {
  value?: Date;
  onChange: (date: Date) => void;
}

interface DateParts {
  day: number;
  month: number;
  year: number;
}

function DateInput(props: DateInputProps) {
  const { value, onChange } = props;

  const [day, setDay] = createSignal(value ? value.getDate() : new Date().getDate());
  const [month, setMonth] = createSignal(value ? value.getMonth() + 1 : new Date().getMonth() + 1);
  const [year, setYear] = createSignal(value ? value.getFullYear() : new Date().getFullYear());

  const handleDayChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newDay = parseInt(target.value, 10);
    if (!isNaN(newDay) && newDay >= 1 && newDay <= 31) {
      setDay(newDay);
      updateDate(newDay, month(), year());
    }
  };

  const handleMonthChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newMonth = parseInt(target.value, 10);
    if (!isNaN(newMonth) && newMonth >= 1 && newMonth <= 12) {
      setMonth(newMonth);
      updateDate(day(), newMonth, year());
    }
  };

  const handleYearChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newYear = parseInt(target.value, 10);
    if (!isNaN(newYear) && newYear >= 1900 && newYear <= 2100) {
      setYear(newYear);
      updateDate(day(), month(), newYear);
    }
  };

  const updateDate = (d: number, m: number, y: number) => {
    const newDate = new Date(y, m - 1, d);
    onChange(newDate);
  };

  return (
    <div class="flex gap-2">
      <input
        type="number"
        min="1"
        max="31"
        value={day()}
        onInput={handleDayChange}
        class="w-16 px-2 py-1 border rounded text-center"
        placeholder="DD"
      />
      <span class="self-center">/</span>
      <input
        type="number"
        min="1"
        max="12"
        value={month()}
        onInput={handleMonthChange}
        class="w-16 px-2 py-1 border rounded text-center"
        placeholder="MM"
      />
      <span class="self-center">/</span>
      <input
        type="number"
        min="1900"
        max="2100"
        value={year()}
        onInput={handleYearChange}
        class="w-24 px-2 py-1 border rounded text-center"
        placeholder="YYYY"
      />
    </div>
  );
}

export default DateInput;
