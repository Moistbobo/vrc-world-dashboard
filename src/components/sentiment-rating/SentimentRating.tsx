import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RatingSummary } from '../../types';

interface SentimentRatingProps {
  summary: RatingSummary | undefined;
  isLoading: boolean;
  isSubmitting: boolean;
  onRate: (value: 'good' | 'bad') => void;
  onRemove: () => void;
}

interface BarSegmentProps {
  percent: number;
  isActive: boolean;
  colorClass: string;
  activeTextClass: string;
  label: string;
}

function BarSegment({ percent, isActive, colorClass, activeTextClass, label }: BarSegmentProps) {
  if (percent <= 0) return null;
  return (
    <div
      className={`h-full ${colorClass}`}
      style={{ width: `${percent}%` }}
      title={`${percent}% ${label}`}
    >
      <span
        className={`flex h-full items-center justify-center text-lg font-semibold ${
          isActive ? activeTextClass : 'text-white'
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}

export function SentimentRating({
  summary,
  isLoading,
  isSubmitting,
  onRate,
  onRemove,
}: SentimentRatingProps) {
  const { t } = useTranslation();

  const isGoodActive = summary?.userRating === 'good';
  const isBadActive = summary?.userRating === 'bad';
  const hasVoted = isGoodActive || isBadActive;
  const total = (summary?.good ?? 0) + (summary?.bad ?? 0);
  const goodPercent = total > 0 ? Math.round(((summary?.good ?? 0) / total) * 100) : 0;
  const badPercent = total > 0 ? 100 - goodPercent : 0;

  const handleGoodClick = () => {
    if (isGoodActive) {
      onRemove();
    } else {
      onRate('good');
    }
  };

  const handleBadClick = () => {
    if (isBadActive) {
      onRemove();
    } else {
      onRate('bad');
    }
  };

  return (
    <div className="space-y-2" data-testid="sentiment-rating">
      <div
        className="relative flex h-12 w-full overflow-hidden rounded-full border border-slate-300 bg-slate-200 transition-shadow duration-150 ease-out hover:shadow-md dark:border-slate-600 dark:bg-slate-700"
        aria-label={t('sentiment.ratings.ratingBarLabel')}
        aria-valuenow={goodPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        role="progressbar"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-0 flex h-full w-full"
          data-testid="rating-fill-container"
        >
          <BarSegment
            percent={goodPercent}
            isActive={isGoodActive}
            colorClass="bg-emerald-500"
            activeTextClass="text-emerald-800 dark:text-emerald-900"
            label={t('sentiment.ratings.good')}
          />
          <BarSegment
            percent={badPercent}
            isActive={isBadActive}
            colorClass="bg-rose-500"
            activeTextClass="text-rose-800 dark:text-rose-900"
            label={t('sentiment.ratings.bad')}
          />
        </div>
        <button
          type="button"
          disabled={isLoading || isSubmitting}
          onClick={handleGoodClick}
          className="group relative z-10 flex w-1/2 items-center justify-start px-4 text-sm font-medium text-slate-700 transition-colors duration-150 ease-out hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:text-white"
          aria-label={t('sentiment.ratings.good')}
          aria-pressed={isGoodActive}
        >
          <ThumbsUp className="h-5 w-5 transition-transform duration-150 ease-out group-hover:scale-110" />
        </button>
        <button
          type="button"
          disabled={isLoading || isSubmitting}
          onClick={handleBadClick}
          className="group relative z-10 flex w-1/2 items-center justify-end px-4 text-sm font-medium text-slate-700 transition-colors duration-150 ease-out hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:text-white"
          aria-label={t('sentiment.ratings.bad')}
          aria-pressed={isBadActive}
        >
          <ThumbsDown className="h-5 w-5 transition-transform duration-150 ease-out group-hover:scale-110" />
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {hasVoted ? (
          <>
            <span>{t('sentiment.ratings.yourVote')}</span>
            {isGoodActive ? (
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ThumbsDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            )}
          </>
        ) : (
          <span>{t('sentiment.ratings.ratingBarLabel')}</span>
        )}
      </p>
    </div>
  );
}
