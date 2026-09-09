import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onChangeOffset: (offset: number) => void;
  showPageInput?: boolean;
  onJumpToPage?: (page: number) => void;
}

export function Pagination({
  offset,
  limit,
  total,
  onChangeOffset,
  showPageInput = false,
  onJumpToPage,
}: PaginationProps) {
  const { t } = useTranslation();
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [prevPage, setPrevPage] = useState(currentPage);
  if (prevPage !== currentPage) {
    setPrevPage(currentPage);
    setDraft(null);
    setInvalid(false);
  }

  const pages = (() => {
    const arr: number[] = [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  })();

  const commitDraft = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    setDraft(null);
    setInvalid(false);
    if (trimmed === '') return;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 1 || n > totalPages) {
      setInvalid(true);
      return;
    }
    onJumpToPage?.(n);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={!canPrev}
        onClick={() => onChangeOffset(Math.max(0, offset - limit))}
        className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm"
      >
        {t('pagination.prev')}
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChangeOffset((p - 1) * limit)}
          className={`
            min-w-11 rounded-lg px-3 py-2 text-sm font-medium transition
            ${p === currentPage
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
          `}
        >
          {p}
        </button>
      ))}

      <button
        disabled={!canNext}
        onClick={() => onChangeOffset(offset + limit)}
        className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm"
      >
        {t('pagination.next')}
      </button>

      <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
        {t('pagination.range', {
          start: offset + 1,
          end: Math.min(offset + limit, total),
          total,
        })}
      </span>

      {showPageInput && (
        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <input
            type="text"
            inputMode="numeric"
            aria-label={t('pagination.pageInputLabel')}
            value={draft ?? String(currentPage)}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
            }}
            onBlur={commitDraft}
            className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />
          {t('pagination.ofTotal', { total: totalPages })}
          {invalid && (
            <span role="alert" className="text-xs text-red-500 dark:text-red-400">
              {t('pagination.invalidPage', { total: totalPages })}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
