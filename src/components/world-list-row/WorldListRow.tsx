import { memo, useState } from 'react';
import { List, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RatingSummary, World } from '../../types';
import { TagBadge } from '../tag-badge';
import { getPlatformLabel } from '../../utils/platformLabel';
import { createWSRVUrl } from '../../utils/worldImageUrl';
import { WorldRatingBar } from '../world-rating-bar';

interface WorldListRowProps {
  world: World;
  onSelect: (worldId: string) => void;
  onAuthorClick?: (authorName: string) => void;
  ratingSummary?: RatingSummary | null | undefined;
  showCuratorBadges?: boolean;
}

export const WorldListRow = memo(function WorldListRow({ world, onSelect, onAuthorClick, ratingSummary, showCuratorBadges = true }: WorldListRowProps) {
  const { t } = useTranslation();
  const [excludeOpen, setExcludeOpen] = useState(false);
  const flags = world.flags ?? [];

  const handleSelect = () => onSelect(world.worldId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
      className="card flex w-full min-w-0 cursor-pointer items-center gap-3 p-3 text-left transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:gap-4 dark:hover:border-slate-600"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
        {world.imageUrl ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_20%,rgba(100,116,139,0.55)_50%,transparent_80%)] dark:bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.12)_50%,transparent_80%)]"
            />
            <img
              src={createWSRVUrl(world.imageUrl, 128)}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="low"
              className="relative h-full w-full object-cover"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
            <List className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{world.name}</p>
          {showCuratorBadges && world.highPriority === true && (
            <span className="shrink-0 rounded-md bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
              {t('common.highPriority')}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {world.authorName && onAuthorClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAuthorClick(world.authorName);
              }}
              className="cursor-pointer rounded px-1 py-1.5 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:hover:text-indigo-400"
              aria-label={t('common.byAuthor', { author: world.authorName })}
              title={t('common.byAuthor', { author: world.authorName })}
            >
              {t('common.byAuthor', { author: world.authorName })}
            </button>
          ) : (
            t('common.byAuthor', { author: world.authorName || t('common.unknown') })
          )}{' '}
          · {world.capacity} capacity · {world.platforms.map(getPlatformLabel).join(', ')}
        </p>
      </div>
      <div
        className="hidden flex-wrap items-center gap-1 sm:flex"
        onClick={(e) => e.stopPropagation()}
      >
        {world.tags.slice(0, 3).map((t) => (
          <TagBadge key={t} tag={t} />
        ))}
        {world.tags.length > 3 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">+{world.tags.length - 3}</span>
        )}
        {flags.length > 0 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExcludeOpen((open) => !open);
              }}
              aria-expanded={excludeOpen}
              aria-controls="worldrow-exclude-row"
              className="inline-flex min-h-11 items-center gap-1 rounded px-2 text-xs font-medium text-rose-600 transition hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:text-rose-400 dark:hover:text-rose-300"
            >
              {t('worldCard.showFlags')}
              <ChevronDown
                aria-hidden="true"
                className={`h-3 w-3 transition-transform motion-reduce:transition-none ${excludeOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {excludeOpen && (
              <div id="worldrow-exclude-row" className="flex flex-wrap items-center gap-1">
                {flags.slice(0, 3).map((flag) => (
                  <TagBadge key={flag} tag={flag} exclude className="cursor-default" />
                ))}
                {flags.length > 3 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">+{flags.length - 3}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {ratingSummary !== undefined && (
        <div className="hidden shrink-0 sm:block">
          <WorldRatingBar
            summary={
              ratingSummary === null
                ? { worldId: world.worldId, good: 0, bad: 0, userRating: null }
                : ratingSummary
            }
            variant="list"
          />
        </div>
      )}
      <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
        {showCuratorBadges
          ? world.quality === 'good'
            ? '✅'
            : world.quality === 'bad'
              ? '❌'
              : '—'
          : '—'}
      </div>
    </div>
  );
});