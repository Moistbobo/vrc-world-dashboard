import { useCallback, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, FileJson, Loader2, AlertTriangle } from 'lucide-react';
import type { WorldList } from '../../types/lists';
import {
  buildImportPreview,
  parseLists,
  prepareImport,
  validateWorldIds,
  type ImportPreview,
} from '../../utils/listsImportExport';
import { ListIcon } from '../../utils/listIcon';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface ImportDialogProps {
  open: boolean;
  existingLists: WorldList[];
  onOpenChange: (open: boolean) => void;
  onImport: (lists: WorldList[], filename: string) => void;
}

type Phase = 'transfer' | 'preview' | 'error';

export function ImportDialog({
  open,
  existingLists,
  onOpenChange,
  onImport,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('transfer');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [errorKey, setErrorKey] = useState<string>('');
  const [removedWorldIds, setRemovedWorldIds] = useState<
    Map<string, string[]>
  >(new Map());
  const [totalRemoved, setTotalRemoved] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const errorId = useId();

  const reset = useCallback(() => {
    setPhase('transfer');
    setPreview(null);
    setFilename('');
    setErrorKey('');
    setRemovedWorldIds(new Map());
    setTotalRemoved(0);
    setDragActive(false);
    setIsValidating(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [onOpenChange, reset]);

  useDialogFocus({ open, containerRef: dialogRef, onClose: handleClose });

  const processFile = useCallback(
    async (file: File) => {
      setFilename(file.name);
      let text: string;
      try {
        text = await file.text();
      } catch {
        setErrorKey('lists.importError.readFailed');
        setPhase('error');
        return;
      }
      const result = parseLists(text);
      if (result.error || !result.exportData) {
        setErrorKey(`lists.importError.${result.error}`);
        setPhase('error');
        return;
      }
      setIsValidating(true);
      try {
        const prepared = await prepareImport(
          result.exportData,
          file.name,
          validateWorldIds,
        );
        setRemovedWorldIds(prepared.removedWorldIds);
        setTotalRemoved(prepared.totalRemoved);
        setPreview(buildImportPreview(existingLists, prepared.lists));
        setPhase('preview');
      } catch {
        setErrorKey('lists.importError.unknown');
        setPhase('error');
      } finally {
        setIsValidating(false);
      }
    },
    [existingLists],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  const handleImport = useCallback(() => {
    if (!preview) return;
    onImport(
      preview.items.map((item) => item.list),
      filename,
    );
    handleClose();
  }, [preview, onImport, filename, handleClose]);

  if (!open) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-white/95 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-slate-950/95"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {phase === 'preview'
              ? t('lists.importPreview')
              : phase === 'error'
                ? t('lists.couldNotImport')
                : t('lists.transferYourLists')}
          </h3>
          <button
            onClick={handleClose}
            aria-label={t('common.close')}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === 'transfer' && (
          <>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {t('lists.transferYourListsHint')}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary mb-4 w-full gap-1.5 text-sm"
            >
              <Upload className="h-4 w-4" />
              {t('lists.importFromFile')}
            </button>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={[
                'rounded-xl border-2 border-dashed p-6 text-center text-sm transition',
                dragActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
                'text-slate-500 dark:text-slate-400',
              ].join(' ')}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                  <p role="status">{t('lists.validatingWorlds')}</p>
                </>
              ) : (
                <>
                  <FileJson className="mx-auto mb-2 h-6 w-6" />
                  <p>{t('lists.dragAndDropJson')}</p>
                </>
              )}
            </div>
          </>
        )}

        {phase === 'preview' && preview && (
          <>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              {t('lists.importSummary', {
                new: preview.newCount,
                updated: preview.updatedCount,
                unchanged: preview.unchangedCount,
                worlds: preview.totalWorlds,
                removed: totalRemoved,
              })}
            </p>

            {totalRemoved > 0 && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  {t('lists.removedWorldsWarning', {
                    count: totalRemoved,
                  })}
                </p>
              </div>
            )}

            <div className="mb-4 max-h-56 space-y-2 overflow-y-auto pr-1">
              {preview.items.map((item) => (
                <div
                  key={item.list.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${item.list.color}20` }}
                  >
                    <ListIcon
                      icon={item.list.icon}
                      color={item.list.color}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {item.list.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('lists.worldCount', {
                        count: item.list.worldIds.length,
                      })}
                      {removedWorldIds.has(item.list.id) &&
                        ` · ${t('lists.removedWorldsForList', {
                          count: removedWorldIds.get(item.list.id)?.length ?? 0,
                        })}`}
                    </p>
                  </div>
                  <span
                    className={[
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      item.status === 'new'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                    ].join(' ')}
                  >
                    {item.status === 'new'
                      ? t('lists.importRowNew')
                      : t('lists.importRowUpdated')}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="btn-ghost text-sm py-2"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImport}
                className="btn-primary text-sm py-2"
              >
                {t('lists.importListsButton', {
                  count: preview.items.length,
                })}
              </button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {t('lists.invalidBackupDescription')}
            </p>
            <p
              id={errorId}
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              {t(errorKey || 'lists.importError.unknown')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="btn-ghost text-sm py-2"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  reset();
                  fileInputRef.current?.click();
                }}
                className="btn-primary gap-1.5 text-sm py-2"
              >
                <Upload className="h-4 w-4" />
                {t('lists.tryAnotherFile')}
              </button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleInputChange}
          className="hidden"
          aria-label={t('lists.importFromFile')}
          aria-describedby={errorId}
        />
      </div>
    </div>
  );
}
