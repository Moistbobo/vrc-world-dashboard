import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentActivity } from '../../hooks/useSentiment';
import { RecentActivityItem } from './RecentActivityItem';

export function RecentActivityPanel({ maxHeight }: { maxHeight?: number }) {
  const { t } = useTranslation();
  const enabled = process.env.NEXT_PUBLIC_ENABLE_COMMUNITY_SENTIMENT === 'true';
  const { rows, isPending, isError, refetch } = useRecentActivity(enabled);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bodyMaxHeight =
    typeof maxHeight === 'number' && maxHeight > 0 ? Math.max(0, maxHeight - headerHeight) : undefined;

  return (
    <div className="card flex h-full min-h-0 flex-col" data-testid="recent-activity-panel">
      <div ref={headerRef} className="flex items-center border-b border-slate-200 px-5 py-3 dark:border-slate-700/50">
        <h2 className="flex min-h-11 items-center text-sm font-semibold text-slate-900 dark:text-white">
          {t('dashboard.recentActivity')}
        </h2>
      </div>
      {isPending ? (
        <div aria-busy="true" data-testid="recent-activity-loading" className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ))}
          <p className="sr-only">{t('dashboard.activityLoading')}</p>
        </div>
      ) : isError ? (
        <div
          role="status"
          className="m-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300"
        >
          <p>{t('dashboard.activityError')}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 text-indigo-600 underline dark:text-indigo-400"
          >
            {t('worlds.tryAgain')}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.activityEmpty')}
        </p>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={bodyMaxHeight !== undefined ? { maxHeight: bodyMaxHeight } : undefined}
        >
          <ul className="divide-y divide-slate-200 p-2 dark:divide-slate-700/50">
            {rows.map((row) => (
              <RecentActivityItem key={`${row.type}-${row.id}`} row={row} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
