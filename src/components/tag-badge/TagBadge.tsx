import { useMemo } from 'react';
import { useTagMeta } from '../../contexts/TagMetaContext';
import { getTagBadgeClass, getTagEmoji } from '../../utils/tagMeta';

interface TagBadgeProps {
  tag: string;
  onClick?: (tag: string) => void;
  active?: boolean;
  className?: string;
  /** Show only the emoji when space is tight */
  emojiOnly?: boolean;
  /** Render the exclude variant: fixed 🚩 marker with a rose scheme */
  exclude?: boolean;
}

export function TagBadge({
  tag,
  onClick,
  active,
  className = '',
  emojiOnly = false,
  exclude = false,
}: TagBadgeProps) {
  const meta = useTagMeta();
  const colorClass = useMemo(
    () => (exclude ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' : getTagBadgeClass(meta, tag)),
    [exclude, meta, tag],
  );
  const emoji = useMemo(() => (exclude ? '🚩' : getTagEmoji(meta, tag)), [exclude, meta, tag]);

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(tag) : undefined}
      title={tag}
      className={`
        inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition
        ${active ? 'ring-1 ring-offset-0 ring-indigo-500' : ''}
        ${onClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
        ${colorClass}
        ${className}
      `}
    >
      <span className="mr-1 leading-none">{emoji}</span>
      {!emojiOnly && <span className="max-w-[8rem] truncate">{tag}</span>}
    </button>
  );
}