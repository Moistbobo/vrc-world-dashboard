import { Link } from '../../lib/navigation';
import { Trans, useTranslation } from 'react-i18next';
import { ActivityIcon } from './ActivityIcon';
import { formatTimestamp } from '../../utils/formatTimestamp';
import type { RecentActivityRow } from '../../types';

export function RecentActivityItem({ row }: { row: RecentActivityRow }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={`/worlds/${row.worldId}`}
        className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-slate-200/60 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:hover:bg-slate-700/50 dark:hover:shadow-none"
      >
        <ActivityIcon row={row} />
        <span className="min-w-0 flex-1">
          {row.type === 'comment' ? (
            <>
              <span className="block text-[13px] leading-snug text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-indigo-600 dark:text-indigo-300">{row.username}</span>{' '}
                <Trans
                  i18nKey="dashboard.activityCommented"
                  values={{ world: row.worldName }}
                  components={{ world: <b className="font-semibold" /> }}
                />
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                {row.content}
              </span>
            </>
          ) : (
            <span className="block text-[13px] leading-snug text-slate-800 dark:text-slate-200">
              <b className="font-semibold">{row.worldName}</b>{' '}
              {t(row.value === 'good' ? 'dashboard.activityRatedGood' : 'dashboard.activityRatedBad')}
            </span>
          )}
          <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
            {formatTimestamp(row.createdAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}
