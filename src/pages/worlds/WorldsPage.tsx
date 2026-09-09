import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown10, ArrowUp, ArrowUp10, LayoutGrid, List, Search } from 'lucide-react';
import { BeatLoader } from 'react-spinners';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useWorldsPreferences } from '../../hooks/useWorldsPreferences';
import { useMe } from '../../hooks/useApi';
import { getStoredApiToken } from '../../utils/tokenStorage';
import { useWorldsFilters } from '../../hooks/useWorldsFilters';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useRatingsForWorldIds } from '../../hooks/useSentiment';
import { FilterBar } from '../../components/filter-bar';
import { Pagination } from '../../components/pagination';
import { WorldCard } from '../../components/world-card';
import { WorldListRow } from '../../components/world-list-row';

const SENTIMENT_ENABLED = import.meta.env.VITE_ENABLE_COMMUNITY_SENTIMENT === 'true';

const GRID_GAP = 16;
const LIST_GAP = 12;
const GRID_ROW_ESTIMATE = 420;
const GRID_ROW_ESTIMATE_DESKTOP = 380;
const LIST_ROW_ESTIMATE = 88;
// Number of virtualized rows from the end of the loaded data at which to
// start prefetching the next page. The IntersectionObserver sentinel
// (200px rootMargin) still runs as a safety net; this trigger fires earlier
// so the fetch usually completes before the user reaches the end of the list.
const PREFETCH_AHEAD_ROWS = 4;

function getColumnCount(windowWidth: number) {
  return windowWidth >= 1280 ? 4 : windowWidth >= 640 ? 2 : 1;
}

function getGridRowHeight(columnCount: number) {
  // Desktop cards fit two rows of content; the mobile card layout is taller.
  return columnCount === 4 ? GRID_ROW_ESTIMATE_DESKTOP : GRID_ROW_ESTIMATE;
}

export function WorldsPage() {
  const { t } = useTranslation();
  usePageTitle(t('worlds.title'));
  const { viewMode, setViewMode, scrollMode, setScrollMode } = useWorldsPreferences();

  const { data: me, isError: meError } = useMe();
  const hasEnteredToken = Boolean(getStoredApiToken());
  const canManageCurator =
    hasEnteredToken && !meError && (me?.permissions.includes('worlds:write') ?? false);

  const {
    limit,
    offset,
    setOffset,
    selectedTags,
    handleToggleTag,
    handleRemoveTag,
    selectedFlags,
    handleToggleFlag,
    handleRemoveFlag,
    selectedQuality,
    handleToggleQuality,
    selectedPlatforms,
    handleTogglePlatform,
    handleRemovePlatform,
    capacityRange,
    handleCapacityChange,
    dayRange,
    handleDayRangeChange,
    highPriority,
    handleToggleHighPriority,
    flagInclude,
    handleToggleFlagInclude,
    orderAsc,
    handleToggleOrder,
    searchInput,
    setSearchInput,
    handleAuthorClick,
    handleClear,
    availableTags,
    availableFlags,
    qualityCounts,
    highPriorityCount,
    platformCounts,
    worlds,
    isPending,
    isError,
    error,
    refetch,
    total,
    infiniteQuery,
    isPagination,
    onSelect,
    onTagClick,
    onPlatformClick,
    onFlagClick,
  } = useWorldsFilters(scrollMode, { suppressErrorToast: true });

  const visibleWorldIds = useMemo(() => worlds.map((w) => w.worldId), [worlds]);
  const { data: ratingSummaries } = useRatingsForWorldIds(
    SENTIMENT_ENABLED ? visibleWorldIds : [],
  );

  const [showBackToTop, setShowBackToTop] = useState(false);

  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Back-to-top visibility
  useEffect(() => {
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      setShowBackToTop(window.scrollY > window.innerHeight);
      frame = requestAnimationFrame(() => {
        frame = null;
      });
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  const handleToggleMode = () => {
    setScrollMode(scrollMode === 'infinite' ? 'pagination' : 'infinite');
    setOffset(0);
  };

  const sentinelRef = useRef<HTMLDivElement>(null);

  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (isPagination || !sentinelRef.current) return;
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          infiniteQuery.fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isPagination, infiniteQuery]);

  // Measure the page chrome above the grid/list (header, filters, search bar,
  // results row, view toggle) so virtual items align with the real scroll
  // offset. A layout pass on `worlds`/`viewMode`/`scrollMode` keeps the cached
  // value fresh; it is stable between passes so the state update is skipped.
  const gridRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const gridSizeRef = useRef(0);
  const listSizeRef = useRef(0);
  useEffect(() => {
    if (isPending || worlds.length === 0) return;
    const node = viewMode === 'grid' ? gridRef.current : listRef.current;
    if (!node) return;
    const prev = viewMode === 'grid' ? gridSizeRef.current : listSizeRef.current;
    const next = Math.max(node.offsetTop, prev);
    if (viewMode === 'grid') {
      gridSizeRef.current = next;
    } else {
      listSizeRef.current = next;
    }
    const nextMargin = Math.max(gridSizeRef.current, listSizeRef.current);
    if (nextMargin !== scrollMargin) {
      setScrollMargin(nextMargin);
    }
  }, [worlds, isPending, viewMode, scrollMode, scrollMargin]);

  const columnCount = getColumnCount(windowWidth);
  const gridVirtualizer = useWindowVirtualizer({
    count: Math.ceil(worlds.length / columnCount),
    getScrollElement: () => window,
    estimateSize: () => getGridRowHeight(columnCount),
    measureElement: (el) => (el as HTMLElement).offsetHeight || getGridRowHeight(columnCount),
    // This page owns scroll position (filters/mode changes must not touch the
    // window scroll), so the virtualizer only reads the scroll offset and
    // never writes it. scrollToIndex/scrollToEnd are unused here.
    scrollToFn: () => undefined,
    overscan: 6,
    scrollMargin,
    gap: GRID_GAP,
  });
  const listVirtualizer = useWindowVirtualizer({
    count: worlds.length,
    getScrollElement: () => window,
    estimateSize: () => LIST_ROW_ESTIMATE,
    measureElement: (el) => (el as HTMLElement).offsetHeight || LIST_ROW_ESTIMATE,
    scrollToFn: () => undefined,
    overscan: 8,
    scrollMargin,
    gap: LIST_GAP,
  });

  const gridVirtualItems = gridVirtualizer.getVirtualItems();
  const listVirtualItems = listVirtualizer.getVirtualItems();
  const gridRows = gridVirtualItems.map((row) => ({
    row,
    items: worlds.slice(row.index * columnCount, row.index * columnCount + columnCount),
  }));
  const listRows = listVirtualItems;

  // Index of the last virtualized row currently rendered. The window
  // virtualizer triggers a re-render whenever the range changes, so this
  // value updates as the user scrolls and can be used as an effect dep to
  // decide when to prefetch the next page.
  const activeVirtualItems = viewMode === 'grid' ? gridVirtualItems : listVirtualItems;
  const lastVirtualRowIndex =
    activeVirtualItems.length > 0 ? activeVirtualItems[activeVirtualItems.length - 1].index : -1;

  // Prefetch the next page when the virtualized range is within a few rows
  // of the end of the loaded data, so the fetch can finish before the user
  // reaches the bottom of the list. The sentinel IntersectionObserver
  // above remains as a safety net; the guards below prevent duplicate
  // fetches when both triggers fire while a page is in flight.
  useEffect(() => {
    if (isPagination) return;
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;
    if (lastVirtualRowIndex < 0) return;

    const totalRows =
      viewMode === 'grid'
        ? Math.max(0, Math.ceil(worlds.length / columnCount) - 1)
        : Math.max(0, worlds.length - 1);

    if (lastVirtualRowIndex >= totalRows - PREFETCH_AHEAD_ROWS) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery, isPagination, viewMode, worlds.length, columnCount, lastVirtualRowIndex]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('worlds.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('worlds.subtitle')}</p>
        </div>
        <button
          onClick={handleToggleMode}
          className="btn-secondary flex items-center gap-2 px-3 text-sm"
        >
          {scrollMode === 'infinite' ? t('worlds.switchToPagination') : t('worlds.switchToInfinite')}
        </button>
      </div>

      <FilterBar
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onRemoveTag={handleRemoveTag}
        selectedFlags={selectedFlags}
        onToggleFlag={handleToggleFlag}
        onRemoveFlag={handleRemoveFlag}
        availableFlags={availableFlags}
        selectedQuality={selectedQuality}
        onToggleQuality={handleToggleQuality}
        onClear={handleClear}
        availableTags={availableTags}
        qualityCounts={qualityCounts}
        highPriorityCount={highPriorityCount}
        platformCounts={platformCounts}
        capacityRange={capacityRange}
        onCapacityChange={handleCapacityChange}
        selectedPlatforms={selectedPlatforms}
        onTogglePlatform={handleTogglePlatform}
        onRemovePlatform={handleRemovePlatform}
        dayRange={dayRange}
        onDayRangeChange={handleDayRangeChange}
        showCurator={canManageCurator}
        highPriority={highPriority}
        onToggleHighPriority={handleToggleHighPriority}
        flagInclude={flagInclude}
        onToggleFlagInclude={handleToggleFlagInclude}
      />

      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('worlds.resultsSection')}</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('worlds.searchPlaceholder')}
            aria-label={t('worlds.searchLabel')}
            className="input w-full pl-9"
          />
        </div>
        {!isError && (
          <p role="status" className="hidden items-center gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex">
            <span>{t('worlds.numberOfResultsLabel')}</span>
            {isPending ? (
              <BeatLoader size={6} color="currentColor" aria-label={t('worlds.loadingResultCount')} />
            ) : (
              <span>{t('worlds.numberOfResultsCount', { count: total })}</span>
            )}
          </p>
        )}
        <button
          type="button"
          onClick={handleToggleOrder}
          aria-pressed={orderAsc}
          aria-label={t(orderAsc ? 'worlds.orderAsc' : 'worlds.orderDesc')}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
            orderAsc
              ? 'border-slate-300 bg-slate-300 text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-white'
              : 'border-slate-300 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {orderAsc ? <ArrowUp10 className="h-4 w-4" /> : <ArrowDown10 className="h-4 w-4" />}
          <span>{t(orderAsc ? 'worlds.sortOldest' : 'worlds.sortNewest')}</span>
        </button>
        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100/50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            onClick={() => setViewMode('grid')}
            aria-label={t('worlds.gridView')}
            aria-pressed={viewMode === 'grid'}
            className={`flex h-11 w-11 items-center justify-center rounded-md transition ${
              viewMode === 'grid'
                ? 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label={t('worlds.listView')}
            aria-pressed={viewMode === 'list'}
            className={`flex h-11 w-11 items-center justify-center rounded-md transition ${
              viewMode === 'list'
                ? 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isError && (
        <div
          role="status"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
        >
          {t('worlds.loadError', { message: error?.message })}
        </div>
      )}

      {isPending && (
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'space-y-3'}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="card animate-pulse bg-slate-200 dark:bg-slate-800 h-64" />
          ))}
        </div>
      )}

      {!isPending && !isError && worlds.length === 0 && (
        <div
          role="status"
          className="card p-8 text-center text-sm text-slate-500 dark:text-slate-400"
        >
          {t('worlds.noWorlds')}{' '}
          <button onClick={() => refetch()} className="text-indigo-600 underline dark:text-indigo-400">
            {t('worlds.tryAgain')}
          </button>
          .
        </div>
      )}

      {!isPending && !isError && worlds.length > 0 && viewMode === 'grid' && (
        <div
          ref={gridRef}
          style={{ height: gridVirtualizer.getTotalSize() }}
          className="relative"
        >
          {gridRows.map(({ row, items }) => (
            <div
              key={row.key}
              data-index={row.index}
              ref={gridVirtualizer.measureElement}
              className="absolute left-0 right-0 top-0"
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {items.map((w) => (
                  <WorldCard
                    key={w.worldId}
                    world={w}
                    onSelect={onSelect}
                    onTagClick={onTagClick}
                    onFlagClick={onFlagClick}
                    onPlatformClick={onPlatformClick}
                    onAuthorClick={handleAuthorClick}
                    showCuratorBadges={canManageCurator}
                    canCurate={canManageCurator}
                    ratingSummary={ratingSummaries ? ratingSummaries.get(w.worldId) ?? null : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isPending && !isError && worlds.length > 0 && viewMode === 'list' && (
        <div
          ref={listRef}
          style={{ height: listVirtualizer.getTotalSize() }}
          className="relative w-full min-w-0"
        >
          {listRows.map((row) => (
            <div
              key={row.key}
              data-index={row.index}
              ref={listVirtualizer.measureElement}
              className="absolute left-0 right-0 top-0"
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
            >
              <WorldListRow
                world={worlds[row.index]}
                onSelect={onSelect}
                onAuthorClick={handleAuthorClick}
                onFlagClick={onFlagClick}
                showCuratorBadges={canManageCurator}
                ratingSummary={ratingSummaries ? ratingSummaries.get(worlds[row.index].worldId) ?? null : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {scrollMode === 'infinite' && !isError && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {infiniteQuery.isFetchingNextPage && (
            <span aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
              {t('worlds.loadingMore')}
            </span>
          )}
        </div>
      )}

      {scrollMode === 'pagination' && total > 0 && (
        <div className="flex justify-center pt-2">
          <Pagination
            offset={offset}
            limit={limit}
            total={total}
            onChangeOffset={(o) => {
              setOffset(o);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {showBackToTop && scrollMode === 'infinite' && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          aria-label={t('worlds.backToTop')}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}