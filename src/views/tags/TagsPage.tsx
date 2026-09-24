import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTags } from '../../hooks/useApi';
import { TagBadge } from '../../components/tag-badge';
import { WaffleChart } from '../../components/waffle-chart';
import { getTagColorHex, getTagEmoji, getTagMetaMap } from '../../utils/tagMeta';

export function TagsPage() {
  const { t } = useTranslation();
  usePageTitle(t('tags.title'));
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useTags({ suppressErrorToast: true });
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const tags = data?.tags || [];
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [data, search]);

  const maxCount = data?.tags?.[0]?.count || 1;

  const tagMeta = useMemo(() => getTagMetaMap(data?.tags ?? []), [data]);

  const waffleData = useMemo(
    () => filtered.map((t) => ({ name: t.tag, value: t.count })),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('tags.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('tags.subtitle')}</p>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tags.searchPlaceholder')}
            aria-label={t('tags.searchLabel')}
            className="input w-full pl-9"
          />
        </div>
      </div>

      {isError && (
        <div
          role="status"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
        >
          {t('tags.loadError', { message: error?.message })}
        </div>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!isPending && !isError && (
        <>
          <div className="card p-4">
            <div className="mx-auto max-w-xl">
              <WaffleChart
                data={waffleData}
                getColor={(tag) => getTagColorHex(tagMeta, tag)}
                getEmoji={(tag) => getTagEmoji(tagMeta, tag)}
                onSelectTag={(tag) => navigate(`/worlds?tag=${encodeURIComponent(tag)}`)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const pct = Math.round((t.count / maxCount) * 100);
              const handleSelect = () => navigate(`/worlds?tag=${encodeURIComponent(t.tag)}`);
              return (
                <div
                  key={t.tag}
                  role="button"
                  tabIndex={0}
                  onClick={handleSelect}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect();
                    }
                  }}
                  className="card cursor-pointer p-4 text-left transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TagBadge tag={t.tag} />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{t.count}</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500/60 transition-all hover:bg-indigo-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
