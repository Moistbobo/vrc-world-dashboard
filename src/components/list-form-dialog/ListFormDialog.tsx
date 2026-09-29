import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { CreateListInput, WorldList } from '../../types/lists';
import {
  validateListMemo,
  MAX_LIST_MEMO_LENGTH,
} from '../../utils/listMemoValidation';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const MAX_MEMO_HEIGHT_PX = 144;

interface ListFormDialogProps {
  open: boolean;
  list?: WorldList;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateListInput) => boolean;
}

export function ListFormDialog({
  open,
  list,
  onOpenChange,
  onSubmit,
}: ListFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(list?.name ?? '');
  const [color, setColor] = useState(list?.color ?? '#4f46e5');
  const [memo, setMemo] = useState(list?.memo ?? '');
  const [error, setError] = useState<string | null>(null);
  const memoRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus({ open, containerRef: dialogRef, onClose: () => onOpenChange(false) });

  const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_MEMO_HEIGHT_PX)}px`;
  }, []);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('lists.nameRequired'));
      return;
    }
    const memoResult = validateListMemo(memo);
    if (!memoResult.valid) {
      setError(t('lists.memoTooLong'));
      return;
    }
    const ok = onSubmit({ name: trimmed, color, memo });
    if (!ok) return;
    if (!list) {
      setName('');
      setColor('#4f46e5');
      setMemo('');
    }
    setError(null);
    onOpenChange(false);
  };

  const handleMemoChange = (value: string) => {
    setMemo(value);
    const memoResult = validateListMemo(value);
    if (!memoResult.valid) {
      setError(t('lists.memoTooLong'));
    } else if (error === t('lists.memoTooLong')) {
      setError(null);
    }
    const el = memoRef.current;
    if (el) {
      autoGrow(el);
    }
  };

  const memoLength = memo.trim().length;
  const isEdit = Boolean(list);

  return createPortal(
    <div className="contents">
      <div
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-white/95 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-slate-950/95"
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {isEdit ? t('lists.editList') : t('lists.newList')}
            </h3>
            <button type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('common.close')}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="list-name"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {t('lists.listName')}
              </label>
              <input
                id="list-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder={t('lists.listNamePlaceholder')}
              />
            </div>
            <div>
              <label
                htmlFor="list-color"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {t('lists.listColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="list-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-11 w-11 cursor-pointer rounded border border-slate-300 bg-transparent p-1 dark:border-slate-700"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {color}
                </span>
              </div>
            </div>
            <div>
              <label
                htmlFor="list-memo"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {t('lists.listMemo')}
              </label>
              <textarea
                id="list-memo"
                ref={(el) => {
                  memoRef.current = el;
                  autoGrow(el);
                }}
                value={memo}
                onChange={(e) => handleMemoChange(e.target.value)}
                placeholder={t('lists.listMemoPlaceholder')}
                maxLength={MAX_LIST_MEMO_LENGTH + 1}
                rows={3}
                className="input w-full resize-none overflow-y-auto"
              />
              <span
                className={`mt-1 block text-xs ${
                  memoLength > MAX_LIST_MEMO_LENGTH
                    ? 'text-red-500'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t('lists.memoCount', { count: memoLength })}
              </span>
            </div>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-ghost text-sm py-2"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary text-sm py-2">
                {isEdit ? t('common.save') : t('lists.createList')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
