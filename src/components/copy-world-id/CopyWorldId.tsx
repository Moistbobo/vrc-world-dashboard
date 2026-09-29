import { Copy, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface CopyWorldIdProps {
  worldId: string;
}

export function CopyWorldId({ worldId }: CopyWorldIdProps) {
  const { t } = useTranslation();

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(worldId);
      toast.success(t('worldDetail.idCopied'));
    } catch {
      toast.error(t('worldDetail.idCopyError'));
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-left transition-colors hover:text-indigo-600 focus-visible:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400 dark:focus-visible:text-indigo-400"
      aria-label={t('worldDetail.idCopyAriaLabel', { id: worldId })}
      title={t('worldDetail.idCopyAriaLabel', { id: worldId })}
      data-testid="copy-world-id"
    >
      <Hash className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      <span>{t('worldDetail.id', { id: worldId })}</span>
      <Copy className="h-4 w-4 text-slate-500 dark:text-slate-400" />
    </button>
  );
}
