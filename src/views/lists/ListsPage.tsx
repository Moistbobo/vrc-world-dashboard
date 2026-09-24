import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, List, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useLists } from '../../contexts/ListsContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ListFormDialog } from '../../components/list-form-dialog/ListFormDialog';
import { ImportDialog } from '../../components/import-dialog';
import { ConfirmDialog } from '../../components/confirm-dialog';
import type { WorldList } from '../../types/lists';
import { ListIcon } from '../../utils/listIcon';

export function ListsPage() {
  const { t } = useTranslation();
  usePageTitle(t('lists.title'));
  const navigate = useNavigate();
  const {
    lists,
    error,
    isHydrated,
    createList,
    updateList,
    deleteList,
    clearError,
    exportList,
    importLists,
  } = useLists();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingList, setEditingList] = useState(
    undefined as ReturnType<typeof useLists>['lists'][number] | undefined,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleEdit = (
    list: ReturnType<typeof useLists>['lists'][number] | undefined,
  ) => {
    setEditingList(list);
    setFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setPendingDelete({ id, name });
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteList(pendingDelete.id);
    }
    setPendingDelete(null);
    setConfirmOpen(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setConfirmOpen(false);
  };

  const handleExport = useCallback(
    (e: React.MouseEvent, list: WorldList) => {
      e.stopPropagation();
      exportList(list);
    },
    [exportList],
  );

  const handleImport = useCallback(
    (incoming: WorldList[], filename: string) => {
      const result = importLists(incoming);
      if (result.ok) {
        toast.success(
          t('lists.importSuccess', {
            lists: incoming.length,
            worlds: incoming.reduce((sum, list) => sum + list.worldIds.length, 0),
            filename,
          }),
        );
      }
    },
    [importLists, t],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="space-x-2 text-xl font-bold text-slate-900 dark:text-white">
            <span>{t('lists.title')}</span>
            <span
              data-testid="list-count"
              className="align-middle text-sm font-normal tabular-nums text-slate-500 dark:text-slate-400"
            >
              {t('lists.listCount', { count: lists.length })}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('lists.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="btn-secondary gap-1.5 text-sm py-2"
          >
            <Upload className="h-4 w-4" />
            {t('lists.importLists')}
          </button>
          <button
            onClick={() => {
              setEditingList(undefined);
              setFormOpen(true);
            }}
            className="btn-primary gap-1.5 text-sm py-2"
            aria-label={t('lists.newList')}
          >
            <Plus className="h-4 w-4" />
            {t('lists.newList')}
          </button>
        </div>
      </div>

      {!isHydrated ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card flex items-center gap-3 p-4">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('lists.listsSection')}
          </h2>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {t('lists.storageErrorMessage', { message: error })}
              <button onClick={clearError} className="ml-2 underline">
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {lists.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <List className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p>{t('lists.emptyTitle')}</p>
              <p>{t('lists.emptySubtitle')}</p>
              <button
                onClick={() => {
                  setEditingList(undefined);
                  setFormOpen(true);
                }}
                className="btn-primary gap-1.5 text-sm"
              >
                <Plus className="h-4 w-4" />
                {t('lists.createFirstList')}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lists.map((list) => (
            <div
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              className="card flex min-w-0 cursor-pointer items-center gap-3 p-4 transition hover:border-slate-400 dark:hover:border-slate-600"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${list.color}20` }}
              >
                <ListIcon
                  icon={list.icon}
                  color={list.color}
                  className="h-5 w-5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {list.name}
                </p>
                {list.memo && (
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-500 dark:text-slate-400">
                    {list.memo}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('lists.worldCount', { count: list.worldIds.length })} ·{' '}
                  {t('lists.updated', {
                    date: new Date(list.updatedAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              <div
                className="flex shrink-0 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => handleExport(e, list)}
                  className="btn-ghost p-2.5 text-sm"
                  aria-label={t('lists.exportList')}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(list)}
                  className="btn-ghost p-2.5 text-sm"
                  aria-label={t('lists.editList')}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(list.id, list.name)}
                  className="btn-ghost p-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  aria-label={t('lists.deleteList')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('lists.deleteConfirmTitle')}
        message={
          pendingDelete
            ? t('lists.deleteConfirmMessage', { name: pendingDelete.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ListFormDialog
        key={editingList?.id ?? 'new'}
        open={formOpen}
        list={editingList}
        onOpenChange={setFormOpen}
        onSubmit={(input) => {
          if (editingList) {
            updateList(editingList.id, input);
            return true;
          }
          return createList(input).ok;
        }}
      />

      <ImportDialog
        open={importOpen}
        existingLists={lists}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </div>
  );
}
