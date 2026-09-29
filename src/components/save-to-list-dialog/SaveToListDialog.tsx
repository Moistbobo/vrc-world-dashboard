import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Plus } from 'lucide-react';
import { useLists } from '../../contexts/ListsContext';
import { ListFormDialog } from '../list-form-dialog/ListFormDialog';
import { ListIcon } from '../../utils/listIcon';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface SaveToListDialogProps {
  worldId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveToListDialog({
  worldId,
  open,
  onOpenChange,
}: SaveToListDialogProps) {
  const { t } = useTranslation();
  const {
    lists,
    isWorldInList,
    addWorldToList,
    removeWorldFromList,
    createList,
  } = useLists();
  const [showCreate, setShowCreate] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(open);
  useDialogFocus({ open, containerRef: dialogRef, onClose: () => onOpenChange(false) });

  if (!open) return null;

  const toggle = (listId: string) => {
    if (isWorldInList(worldId, listId)) {
      removeWorldFromList(listId, worldId);
      return;
    }
    addWorldToList(listId, worldId);
  };

  const handleInlineCreate = (input: Parameters<typeof createList>[0]) => {
    const result = createList(input);
    addWorldToList(result.list.id, worldId);
    return true;
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-white/95 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-slate-950/95"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          ref={dialogRef}
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3
              id={titleId}
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              {t('lists.saveToList')}
            </h3>
            <button
              onClick={() => onOpenChange(false)}
              aria-label={t('common.close')}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {lists.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>{t('lists.noListsYet')}</p>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {lists.map((list) => (
                <label
                  key={list.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={isWorldInList(worldId, list.id)}
                    onChange={() => toggle(list.id)}
                    className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                  />
                  <ListIcon
                    icon={list.icon}
                    color={list.color}
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                    {list.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {list.worldIds.length}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-ghost w-full gap-1.5 text-sm py-2"
            >
              <Plus className="h-4 w-4" />
              {t('lists.createNewListInline')}
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="btn-primary text-sm py-2"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>
      <ListFormDialog
        key="new"
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleInlineCreate}
      />
    </>,
    document.body,
  );
}
