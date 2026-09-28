import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Info, Search, Sparkles } from 'lucide-react';
import type { WorldsQuery } from '../../types';
import { WorldCard } from '../world-card';
import { useWorldsAgent } from '../../hooks/useWorldsAgent';

interface WorldsAgentPanelProps {
  onViewAll: (query: WorldsQuery) => void;
}

export function WorldsAgentPanel({ onViewAll }: WorldsAgentPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const lastQueryRef = useRef('');
  const inFlightRef = useRef(false);
  const mutation = useWorldsAgent();

  const runQuery = (next: string) => {
    if (inFlightRef.current) return;
    lastQueryRef.current = next;
    inFlightRef.current = true;
    mutation.mutate(
      { query: next },
      { onSettled: () => { inFlightRef.current = false; } },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    runQuery(trimmed);
  };

  const result = mutation.data;
  const appliedFilters = result?.appliedFilters ?? [];
  const isRejectedQuery = mutation.error?.message === 'agent_query_rejected';

  return (
    <section className="card overflow-hidden" aria-label={t('agent.sectionLabel')}>
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('agent.title')}
            </h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {t('agent.curatorBadge')}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t('agent.subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            id="worlds-agent-query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('agent.inputLabel')}
            placeholder={t('agent.placeholder')}
            className="input flex-1"
            required
            maxLength={400}
          />
          <button type="submit" className="btn-primary gap-2" disabled={mutation.isPending}>
            <Search className="h-4 w-4" />
            {t('agent.submit')}
          </button>
        </form>

        {mutation.isPending && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            {t('agent.loading')}
          </p>
        )}

        {mutation.isError && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            <p>
              {isRejectedQuery
                ? t('agent.queryRejected')
                : t('agent.error', { message: mutation.error?.message ?? '' })}
            </p>
            <button
              type="button"
              onClick={() => runQuery(lastQueryRef.current)}
              className="btn-secondary self-start"
              disabled={mutation.isPending}
            >
              {t('agent.retry')}
            </button>
          </div>
        )}

        {result && !mutation.isPending && !mutation.isError && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {t('agent.interpretationLabel')}
                </span>{' '}
                {result.interpretation}
              </span>
            </p>

            {result.unmatchedTags.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t('agent.unmatched', { tags: result.unmatchedTags.join(', ') })}
              </p>
            )}

            {result.worlds.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {appliedFilters.length > 0
                  ? t('agent.noResults', { tags: appliedFilters.join(', ') })
                  : t('agent.noResultsNoTags')}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.worlds.map((world) => (
                  <WorldCard
                    key={world.worldId}
                    world={world}
                    showCuratorBadges
                    canCurate
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t('agent.matchCount', { shown: result.worlds.length, total: result.total })}
              </span>
              <button
                type="button"
                onClick={() => onViewAll(result.query)}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 underline transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('agent.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
