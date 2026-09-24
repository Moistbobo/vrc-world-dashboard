import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, List, Download, Globe } from 'lucide-react';
import { useLists } from '../../contexts/ListsContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useListsPreferences } from '../../hooks/useListsPreferences';
import { ListFormDialog } from '../../components/list-form-dialog/ListFormDialog';
import { ListIcon } from '../../utils/listIcon';
import { useWorldsByIds } from '../../hooks/useWorldsByIds';
import { useRatingsForWorldIds } from '../../hooks/useSentiment';
import { Pagination } from '../../components/pagination';
import { WorldCard } from '../../components/world-card/WorldCard';
import { DeletedWorldCard } from '../../components/deleted-world-card';
import { ConfirmDialog } from '../../components/confirm-dialog';

const WORLDS_PER_PAGE = 28;
const MEMO_PREVIEW_LENGTH = 128;
const SENTIMENT_ENABLED = import.meta.env.VITE_ENABLE_COMMUNITY_SENTIMENT === 'true';

export function ListDetailPage({
  listId: listIdProp,
}: {
  listId?: string;
} = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { listId: paramListId } = useParams<{ listId: string }>();
  const listId = listIdProp ?? paramListId;
  const { getList, updateList, deleteList, removeWorldFromList, exportList, isHydrated } = useLists();
  const { skipRemoveWorldConfirmation, setSkipRemoveWorldConfirmation } = useListsPreferences();
  const list = listId ? getList(listId) : undefined;
  usePageTitle(list?.name ? list.name : t('lists.title'));
  const [offset, setOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveWorldId, setPendingRemoveWorldId] = useState<string | null>(null);
  const [memoExpanded, setMemoExpanded] = useState(false);

  const paginatedIds = useMemo(() => {
    if (!list) return [];
    return list.worldIds.slice(offset, offset + WORLDS_PER_PAGE);
  }, [list, offset]);

  const { worlds, isPending, isError } = useWorldsByIds(paginatedIds);

  const visibleWorldIds = useMemo(
    () => worlds.filter((entry) => entry.data).map((entry) => entry.worldId),
    [worlds],
  );
  const { data: ratingSummaries } = useRatingsForWorldIds(
    SENTIMENT_ENABLED ? visibleWorldIds : [],
  );

  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="card p-8">
          <div className="mx-auto h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost gap-1.5 text-sm py-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </button>
        <div className="card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('lists.listNotFound')}
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(t('lists.deleteConfirm', { name: list.name }))) {
      deleteList(list.id);
      navigate('/lists');
    }
  };

  const handleRemove = (worldId: string) => {
    if (skipRemoveWorldConfirmation) {
      removeWorldFromList(list.id, worldId);
      return;
    }
    setPendingRemoveWorldId(worldId);
    setConfirmOpen(true);
  };

  const confirmRemove = (dontAskAgain: boolean) => {
    if (pendingRemoveWorldId) {
      removeWorldFromList(list.id, pendingRemoveWorldId);
    }
    if (dontAskAgain) {
      setSkipRemoveWorldConfirmation(true);
    }
    setPendingRemoveWorldId(null);
    setConfirmOpen(false);
  };

  const cancelRemove = () => {
    setPendingRemoveWorldId(null);
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost gap-1.5 text-sm py-2"
      >
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${list.color}20` }}
          >
            <ListIcon icon={list.icon} color={list.color} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {list.name}
            </h1>
            {list.memo && (
              <div className="mt-1 max-w-xl">
                <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {memoExpanded || list.memo.length <= MEMO_PREVIEW_LENGTH
                    ? list.memo
                    : `${list.memo.slice(0, MEMO_PREVIEW_LENGTH)}…`}
                </p>
                {list.memo.length > MEMO_PREVIEW_LENGTH && (
                  <button
                    type="button"
                    onClick={() => setMemoExpanded((expanded) => !expanded)}
                    className="btn-ghost mt-1 text-sm py-2"
                  >
                    {memoExpanded
                      ? t('lists.memoViewLess')
                      : t('lists.memoViewMore')}
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('lists.worldCount', { count: list.worldIds.length })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => exportList(list)}
            className="btn-secondary gap-1.5 text-sm py-2"
          >
            <Download className="h-4 w-4" /> {t('lists.exportList')}
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="btn-secondary gap-1.5 text-sm py-2"
          >
            <Pencil className="h-4 w-4" /> {t('common.edit')}
          </button>
          <button
            onClick={handleDelete}
            className="btn-ghost gap-1.5 text-sm py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </button>
        </div>
      </div>

      {list.worldIds.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <List className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p>{t('lists.emptyDetailTitle')}</p>
          <p>{t('lists.emptyDetailSubtitle')}</p>
          <button
            onClick={() => navigate('/worlds')}
            className="btn-primary gap-1.5 text-sm"
          >
            <Globe className="h-4 w-4" />
            {t('lists.browseWorlds')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('lists.worldsSection')}
          </h2>
          {isPending && worlds.every((w) => !w.data) ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: WORLDS_PER_PAGE }).map((_, i) => (
                <div
                  key={i}
                  className="card h-64 animate-pulse bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {worlds.map((entry) => {
                if (entry.data) {
                  return (
                    <WorldCard
                      key={entry.worldId}
                      world={entry.data}
                      onSelect={(id) => navigate(`/worlds/${id}`)}
                      onRemove={() => handleRemove(entry.worldId)}
                      onAuthorClick={(author) => navigate(`/worlds?search=${encodeURIComponent(author)}`)}
                      ratingSummary={ratingSummaries ? ratingSummaries.get(entry.worldId) ?? null : undefined}
                    />
                  );
                }
                if (isError) return null;
                return (
                  <DeletedWorldCard
                    key={entry.worldId}
                    worldId={entry.worldId}
                    onRemove={() => handleRemove(entry.worldId)}
                  />
                );
              })}
            </div>
          )}

          {list.worldIds.length > WORLDS_PER_PAGE && (
            <div className="flex justify-center pt-2">
              <Pagination
                offset={offset}
                limit={WORLDS_PER_PAGE}
                total={list.worldIds.length}
                onChangeOffset={(o) => setOffset(o)}
              />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('lists.removeWorldConfirmTitle')}
        message={t('lists.removeWorldConfirmMessage')}
        confirmLabel={t('lists.remove')}
        cancelLabel={t('common.cancel')}
        showDontAskAgain
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />

      <ListFormDialog
        open={formOpen}
        list={list}
        onOpenChange={setFormOpen}
        onSubmit={(input) => {
          updateList(list.id, input);
          return true;
        }}
      />
    </div>
  );
}
