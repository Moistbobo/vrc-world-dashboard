import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useWorlds } from '../../hooks/useApi';
import { useHealth } from '../../hooks/useHealth';
import { useRatingsForWorldIds } from '../../hooks/useSentiment';
import { WorldCard } from '../../components/world-card';
import { RecentActivityPanel } from '../../components/recent-activity';

const SENTIMENT_ENABLED = import.meta.env.VITE_ENABLE_COMMUNITY_SENTIMENT === 'true';

export function DashboardPage() {
  const { t } = useTranslation();
  usePageTitle(t('dashboard.title'));
  const { data: worldsData, isPending: worldsLoading } = useWorlds({ limit: 6 });
  const { data: health, isPending: healthLoading, isError: healthIsError } = useHealth();
  const navigate = useNavigate();
  const recentWorldsRef = useRef<HTMLDivElement>(null);
  const [recentWorldsHeight, setRecentWorldsHeight] = useState(0);

  useEffect(() => {
    const el = recentWorldsRef.current;
    if (!el) return;
    const update = () => setRecentWorldsHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [worldsLoading]);

  const latestWorlds = useMemo(() => worldsData?.worlds ?? [], [worldsData]);
  const latestWorldIds = useMemo(() => latestWorlds.map((w) => w.worldId), [latestWorlds]);
  const { data: ratingSummaries } = useRatingsForWorldIds(
    SENTIMENT_ENABLED ? latestWorldIds : [],
  );

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.subtitle', { count: healthLoading ? '…' : healthIsError ? '?' : health?.worldCount ?? 0 })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Worlds */}
        <div className="lg:col-span-2">
          <div ref={recentWorldsRef} className="card">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.recentWorlds')}</h2>
              <button
                onClick={() => navigate('/worlds')}
                className="min-h-11 px-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('dashboard.viewAll')}
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {worldsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card h-64 animate-pulse bg-slate-200 dark:bg-slate-800" />
                  ))
                : latestWorlds.map((w) => (
                    <WorldCard
                      key={w.worldId}
                      world={w}
                      onSelect={(id) => navigate(`/worlds/${id}`)}
                      onTagClick={(tag) => navigate(`/worlds?tag=${encodeURIComponent(tag)}`)}
                      onPlatformClick={(platform) => navigate(`/worlds?platform=${encodeURIComponent(platform)}`)}
                      onAuthorClick={(author) => navigate(`/worlds?search=${encodeURIComponent(author)}`)}
                      ratingSummary={ratingSummaries ? ratingSummaries.get(w.worldId) ?? null : undefined}
                    />
                  ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="order-first min-w-0 lg:order-none">
          <RecentActivityPanel maxHeight={recentWorldsHeight} />
        </div>
      </div>
    </div>
  );
}
