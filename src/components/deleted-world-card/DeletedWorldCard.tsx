import { Copy, X, Ghost } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface DeletedWorldCardProps {
  worldId: string;
  onRemove: () => void;
}

export function DeletedWorldCard({ worldId, onRemove }: DeletedWorldCardProps) {
  const { t } = useTranslation();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(worldId);
      toast.success(t('worldDetail.idCopied'));
    } catch {
      toast.error(t('worldDetail.idCopyError'));
    }
  }

  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:border-slate-400 dark:hover:border-slate-600">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute inset-0 z-20 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        aria-label={t('lists.deletedWorldCopyAriaLabel', { id: worldId })}
        title={t('lists.deletedWorldCopyAriaLabel', { id: worldId })}
      />
      <div className="relative flex h-40 items-center justify-center bg-slate-200 dark:bg-slate-800">
        <Ghost className="h-10 w-10 text-slate-500 dark:text-slate-600" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm transition hover:bg-white hover:text-red-700 dark:bg-slate-800/90 dark:text-red-400 dark:hover:text-red-300"
          aria-label={t('lists.removeWorld')}
          title={t('lists.removeWorld')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('lists.deletedWorldTitle')}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Copy className="h-3.5 w-3.5" />
          <span className="break-all">{worldId}</span>
        </p>
      </div>
    </div>
  );
}
