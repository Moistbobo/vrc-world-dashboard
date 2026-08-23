import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { World } from '../../types';
import { useTags } from '../../hooks/useApi';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useCurationMutation } from '../../hooks/useCuration';
import { getEmojiForTag } from '../../utils/tagEmoji';

interface EditTagsDialogProps {
  world: World;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTagsDialog({ world, open, onOpenChange }: EditTagsDialogProps) {
  const { t } = useTranslation();
  const { data: tagsResponse } = useTags();
  const mutation = useCurationMutation();
  const [selected, setSelected] = useState<string[]>(world.tags);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus({ open, containerRef: dialogRef, onClose: () => onOpenChange(false) });

  if (!open) return null;

  const toggle = (tag: string) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = () => {
    mutation.mutate({
      worldId: world.worldId,
      guildId: world.guildId,
      action: { type: 'set-tags', tags: selected },
    });
    onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-white/95 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-slate-950/95"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('curator.editTagsTitle', { world: world.name })}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {(tagsResponse?.tags.length ?? 0) === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('curator.noTagsAvailable')}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              {tagsResponse?.tags.map((tagItem) => {
                const isSelected = selected.includes(tagItem.tag);
                return (
                  <button
                    key={tagItem.tag}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggle(tagItem.tag)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${isSelected
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-300 bg-slate-100/50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'}`}
                  >
                    <span className="leading-none">{getEmojiForTag(tagItem.tag)}</span>
                    <span>{tagItem.tag}</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {tagItem.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-ghost text-sm py-2"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="btn-primary text-sm py-2"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}