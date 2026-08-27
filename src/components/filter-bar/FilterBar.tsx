import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import type { TagCount } from '../../types';
import { getTagEmoji, getTagMetaMap } from '../../utils/tagMeta';
import { COMMON_PLATFORM_VALUES, getPlatformLabel } from '../../utils/platformLabel';
import {
  CapacityRange,
  CapacityRangeValue,
  MIN_CAPACITY,
  MAX_CAPACITY,
} from '../capacity-range';

const PRESET_DAY_RANGES = [1, 7, 14, 30, 90, 180];

interface FilterBarProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  selectedQuality: ('good' | 'bad')[];
  onToggleQuality: (quality: 'good' | 'bad') => void;
  onClear: () => void;
  availableTags: TagCount[];
  qualityCounts: { quality: 'good' | 'bad'; count: number }[];
  platformCounts: { platform: string; count: number }[];
  capacityRange: CapacityRangeValue;
  onCapacityChange: (range: CapacityRangeValue) => void;
  selectedPlatforms: string[];
  onTogglePlatform: (platform: string) => void;
  onRemovePlatform: (platform: string) => void;
  dayRange: number | null;
  onDayRangeChange: (dayRange: number | null) => void;
  showCurator?: boolean;
  highPriority: boolean;
  onToggleHighPriority: () => void;
  highPriorityCount?: number;
}

export function FilterBar({
  selectedTags,
  onToggleTag,
  onRemoveTag,
  selectedQuality,
  onToggleQuality,
  onClear,
  availableTags,
  qualityCounts,
  platformCounts,
  capacityRange,
  onCapacityChange,
  selectedPlatforms,
  onTogglePlatform,
  onRemovePlatform,
  dayRange,
  onDayRangeChange,
  showCurator,
  highPriority,
  onToggleHighPriority,
  highPriorityCount,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [customDayRangeInput, setCustomDayRangeInput] = useState(() =>
    PRESET_DAY_RANGES.includes(dayRange ?? -1) ? '' : String(dayRange ?? '')
  );

  const tagFilters = [...availableTags].sort((a, b) => a.tag.localeCompare(b.tag));
  const tagMeta = useMemo(() => getTagMetaMap(availableTags), [availableTags]);
  const qualityCountMap = new Map(qualityCounts.map((q) => [q.quality, q.count]));
  const platformCountMap = new Map(platformCounts.map((p) => [p.platform, p.count]));

  const isCapacityActive =
    capacityRange.min > MIN_CAPACITY || capacityRange.max < MAX_CAPACITY;

  const isDayRangeActive = dayRange !== null;

  const hasFilters =
    selectedTags.length > 0 ||
    selectedQuality.length > 0 ||
    isCapacityActive ||
    selectedPlatforms.length > 0 ||
    isDayRangeActive ||
    highPriority;

  const activeFilterCount =
    selectedTags.length +
    selectedQuality.length +
    (isCapacityActive ? 1 : 0) +
    selectedPlatforms.length +
    (isDayRangeActive ? 1 : 0) +
    (highPriority ? 1 : 0);

  return (
    <div className="card mb-4">
      <div
        data-testid="filter-bar-header"
        className="flex flex-wrap items-center gap-2 p-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={`btn-ghost gap-1.5 text-sm py-2 ${expanded ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('filter.filters')}
          {hasFilters && (
            <span className="ml-1 rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {isCapacityActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-500/30 dark:text-indigo-300">
            <span>{capacityRange.min}–{capacityRange.max} {t('filter.capacityUnit')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCapacityChange({ min: MIN_CAPACITY, max: MAX_CAPACITY });
              }}
              aria-label={t('filter.removeCapacity')}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:text-indigo-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        )}

        {isDayRangeActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-500/30 dark:text-indigo-300">
            <span>🏷️ {t('filter.lastNDays', { count: dayRange })}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDayRangeChange(null);
              }}
              aria-label={t('filter.removeDateTagged')}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:text-indigo-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        )}

        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-500/30 dark:text-indigo-300"
          >
            <span className="leading-none">{getTagEmoji(tagMeta, tag)}</span>
            <span>{tag}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(tag);
              }}
              aria-label={t('filter.removeTag', { tag })}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:text-indigo-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ))}

        {selectedPlatforms.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-500/30 dark:text-indigo-300"
          >
            <span>{getPlatformLabel(p)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemovePlatform(p);
              }}
              aria-label={t('filter.removePlatform')}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:text-indigo-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ))}

        {showCurator &&
          selectedQuality.map((q) => (
            <span
              key={q}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium ring-1 ${
                q === 'good'
                  ? 'bg-green-500/20 text-green-700 ring-green-500/30 dark:text-green-300'
                  : 'bg-red-500/20 text-red-700 ring-red-500/30 dark:text-red-300'
              }`}
            >
              {q === 'good' ? t('filter.good') : t('filter.bad')}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleQuality(q);
                }}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  q === 'good'
                    ? 'hover:text-green-900 dark:hover:text-green-200'
                    : 'hover:text-red-900 dark:hover:text-red-200'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}

        {showCurator && highPriority && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-2.5 text-sm font-medium text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
            <span>{t('filter.highPriority')}</span>
            {highPriorityCount !== undefined && (
              <span className="opacity-70">({highPriorityCount})</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleHighPriority();
              }}
              aria-label={t('filter.removeHighPriority')}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:text-amber-900 dark:hover:text-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        )}

        {hasFilters && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="btn-ghost text-sm py-2"
          >
            {t('filter.clearAll')}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-700/50">
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('filter.tags')}</label>
            <div className="flex flex-wrap gap-2 pr-1">
              {tagFilters.map((t) => (
                <button
                  key={t.tag}
                  onClick={() => onToggleTag(t.tag)}
                  className={`min-h-12 rounded-lg border px-3.5 py-2 text-sm transition ${
                    selectedTags.includes(t.tag)
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  {t.emoji} {t.tag} <span className="text-slate-400 dark:text-slate-500">({t.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('filter.platforms')}</label>
            <div className="flex flex-wrap gap-2 pr-1">
              {COMMON_PLATFORM_VALUES.map((p) => {
                const label = getPlatformLabel(p);
                const count = platformCountMap.get(p);
                return (
                  <button
                    key={p}
                    data-testid={`platform-toggle-${p || 'unknown'}`}
                    onClick={() => onTogglePlatform(p)}
                    className={`min-h-12 rounded-lg border px-3.5 py-2 text-sm transition ${
                      selectedPlatforms.includes(p)
                        ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {label}
                    {count !== undefined && (
                      <span className="text-slate-400 dark:text-slate-500"> ({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('filter.capacity')}</label>
            <CapacityRange
              key={`capacity-${capacityRange.min}-${capacityRange.max}`}
              min={capacityRange.min}
              max={capacityRange.max}
              onChange={onCapacityChange}
            />
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('filter.dateTagged')}</label>
            <div className="flex flex-wrap gap-2 pr-1">
              {PRESET_DAY_RANGES.map((days) => {
                const selected = dayRange === days;
                return (
                  <button
                    key={days}
                    data-testid={`day-range-preset-${days}`}
                    onClick={() => onDayRangeChange(days)}
                    className={`min-h-12 rounded-lg border px-3.5 py-2 text-sm transition ${
                      selected
                        ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {t('filter.lastNDays', { count: days })}
                  </button>
                );
              })}
              <button
                data-testid="day-range-preset-all"
                onClick={() => onDayRangeChange(null)}
                className={`min-h-12 rounded-lg border px-3.5 py-2 text-sm transition ${
                  !isDayRangeActive
                    ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {t('filter.allTime')}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label
                htmlFor="custom-day-range"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {t('filter.custom')}:
              </label>
              <input
                id="custom-day-range"
                type="number"
                min={1}
                placeholder={t('filter.days')}
                value={customDayRangeInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomDayRangeInput(value);
                  if (value === '') {
                    onDayRangeChange(null);
                    return;
                  }
                  const parsed = Number(value);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    onDayRangeChange(parsed);
                  }
                }}
                className="input w-24"
                aria-label={t('filter.custom')}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('filter.days')}</span>
            </div>
          </div>

          {showCurator && (
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{t('filter.curator')}</label>
              <div className="flex flex-wrap gap-2">
                {(['good', 'bad'] as const).map((q) => {
                  const count = qualityCountMap.get(q);
                  return (
                    <button
                      key={q}
                      onClick={() => onToggleQuality(q)}
                      className={`min-h-12 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        selectedQuality.includes(q)
                          ? q === 'good'
                            ? 'border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-300'
                            : 'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {q === 'good' ? t('filter.good') : t('filter.bad')}
                      {count !== undefined && (
                        <span className="text-slate-400 dark:text-slate-500"> ({count})</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={onToggleHighPriority}
                  aria-pressed={highPriority}
                  className={`min-h-12 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                    highPriority
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  {t('filter.highPriority')}
                  {highPriorityCount !== undefined && (
                    <span className="text-slate-400 dark:text-slate-500">
                      {' '}
                      ({highPriorityCount})
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
