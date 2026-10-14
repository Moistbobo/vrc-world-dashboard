import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Slider from '@radix-ui/react-slider';

export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 80;

export interface CapacityRangeValue {
  min: number;
  max: number;
}

interface CapacityRangeProps {
  min: number;
  max: number;
  onChange: (range: CapacityRangeValue) => void;
}

function clamp(value: number, floor: number, ceiling: number): number {
  return Math.max(floor, Math.min(ceiling, value));
}

function parseCapacity(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeRange(a: number, b: number): CapacityRangeValue {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return {
    min: clamp(min, MIN_CAPACITY, MAX_CAPACITY),
    max: clamp(max, MIN_CAPACITY, MAX_CAPACITY),
  };
}

export function CapacityRange({ min, max, onChange }: CapacityRangeProps) {
  const { t } = useTranslation();
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState<CapacityRangeValue>(() =>
    normalizeRange(min, max)
  );

  const commit = () => {
    const rawMin = minRef.current?.value ?? String(range.min);
    const rawMax = maxRef.current?.value ?? String(range.max);
    const parsedMin =
      rawMin.trim() === '' ? MIN_CAPACITY : parseCapacity(rawMin, min);
    const parsedMax =
      rawMax.trim() === '' ? MAX_CAPACITY : parseCapacity(rawMax, max);
    const next = normalizeRange(parsedMin, parsedMax);

    if (minRef.current) minRef.current.value = String(next.min);
    if (maxRef.current) maxRef.current.value = String(next.max);
    setRange(next);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const handleSliderChange = (values: number[]) => {
    const [nextMin, nextMax] = values;
    const next = { min: nextMin, max: nextMax };
    if (minRef.current) minRef.current.value = String(nextMin);
    if (maxRef.current) maxRef.current.value = String(nextMax);
    setRange(next);
  };

  const handleSliderCommit = (values: number[]) => {
    const [nextMin, nextMax] = values;
    const next = normalizeRange(nextMin, nextMax);
    if (minRef.current) minRef.current.value = String(next.min);
    if (maxRef.current) maxRef.current.value = String(next.max);
    setRange(next);
    onChange(next);
  };

  const ticks = [MIN_CAPACITY, 20, 40, 60, MAX_CAPACITY];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <label
          htmlFor="min-capacity"
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {t('filter.minCapacity')}
        </label>
        <input
          ref={minRef}
          id="min-capacity"
          type="number"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          step="1"
          defaultValue={range.min}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="input w-20"
        />
        <span className="hidden text-xs text-slate-600 dark:text-slate-400 sm:inline">
          {t('filter.capacityTo')}
        </span>
        <label
          htmlFor="max-capacity"
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {t('filter.maxCapacity')}
        </label>
        <input
          ref={maxRef}
          id="max-capacity"
          type="number"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          step="1"
          defaultValue={range.max}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="input w-20"
        />
      </div>

      <div className="space-y-2">
        <div
          className="relative h-5"
          aria-hidden="true"
        >
          {ticks.map((tick) => {
            const pct =
              ((tick - MIN_CAPACITY) / (MAX_CAPACITY - MIN_CAPACITY)) * 100;
            return (
              <div
                key={tick}
                className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center sm:hidden"
                style={{ left: `${pct}%` }}
              >
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {tick}
                </span>
              </div>
            );
          })}
          {ticks.map((tick) => {
            const pct =
              ((tick - MIN_CAPACITY) / (MAX_CAPACITY - MIN_CAPACITY)) * 100;
            return (
              <div
                key={`${tick}-desktop`}
                className="absolute bottom-0 hidden -translate-x-1/2 flex-col items-center sm:flex"
                style={{ left: `${pct * 0.6}%` }}
              >
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {tick}
                </span>
              </div>
            );
          })}
        </div>

        <Slider.Root
          value={[range.min, range.max]}
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          step={1}
          minStepsBetweenThumbs={1}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          className="relative flex w-full touch-none select-none items-center sm:w-[60%]"
          aria-label={t('filter.capacity')}
        >
          <Slider.Track className="relative mx-4 h-2 grow rounded-full bg-slate-200 dark:bg-slate-700">
            <Slider.Range className="absolute h-full rounded-full bg-indigo-500" />
          </Slider.Track>
          <Slider.Thumb
            className="block h-8 w-8 rounded-full border-2 border-white bg-indigo-500 shadow transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-900"
            aria-label={t('filter.minCapacity')}
          />
          <Slider.Thumb
            className="block h-8 w-8 rounded-full border-2 border-white bg-indigo-500 shadow transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-900"
            aria-label={t('filter.maxCapacity')}
          />
        </Slider.Root>
      </div>
    </div>
  );
}
