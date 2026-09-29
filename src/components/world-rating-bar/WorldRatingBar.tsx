import { useTranslation } from 'react-i18next';
import type { RatingSummary } from '../../types';

export type WorldRatingBarVariant = 'card' | 'list';

interface WorldRatingBarProps {
  summary: RatingSummary | undefined;
  variant: WorldRatingBarVariant;
}

export function WorldRatingBar({ summary, variant }: WorldRatingBarProps) {
  const { t } = useTranslation();
  const good = summary?.good ?? 0;
  const bad = summary?.bad ?? 0;
  const total = good + bad;
  const isEmpty = total === 0;
  const goodPercent = isEmpty ? 0 : Math.round((good / total) * 100);
  const badPercent = isEmpty ? 0 : 100 - goodPercent;

  if (isEmpty) {
    return null;
  }

  if (variant === 'list') {
    return (
      <div
        className="shrink-0 w-[110px] flex flex-col gap-1"
        data-testid="world-rating-bar-list"
      >
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="img"
          aria-label={`${goodPercent}% ${t('sentiment.ratings.good')} · ${t('sentiment.ratings.totalRatings', { count: total })}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
            style={{ width: `${goodPercent}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-rose-500"
            style={{ width: `${badPercent}%` }}
          />
        </div>
        <p className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          <span
            className={
              goodPercent >= 50
                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                : 'font-semibold text-rose-600 dark:text-rose-400'
            }
          >
            {goodPercent}%
          </span>{' '}
          {t('sentiment.ratings.good')} · {total}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3" data-testid="world-rating-bar-card">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="img"
        aria-label={`${goodPercent}% ${t('sentiment.ratings.good')} · ${t('sentiment.ratings.totalRatings', { count: total })}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
          style={{ width: `${goodPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-full bg-rose-500"
          style={{ width: `${badPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{goodPercent}%</span>{' '}
        · {t('sentiment.ratings.totalRatings', { count: total })}
      </p>
    </div>
  );
}
