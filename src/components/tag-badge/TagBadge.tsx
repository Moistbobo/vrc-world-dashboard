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
}

export function TagBadge({
  tag,
  onClick,
  active,
  className = '',
  emojiOnly = false,
}: TagBadgeProps) {
  const meta = useTagMeta();
  const colorClass = useMemo(() => getTagBadgeClass(meta, tag), [meta, tag]);
  const emoji = useMemo(() => getTagEmoji(meta, tag), [meta, tag]);

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