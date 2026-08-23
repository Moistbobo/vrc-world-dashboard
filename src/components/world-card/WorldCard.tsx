import { memo, useState } from 'react';
import { Globe, Users, Calendar, ExternalLink, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RatingSummary, World } from '../../types';
import { TagBadge } from '../tag-badge';
import { getPlatformLabel } from '../../utils/platformLabel';
import { getWorldAddDate } from '../../utils/worldAddDate';
import { createWSRVUrl } from '../../utils/worldImageUrl';
import { ShareButton } from '../share-button';
import { useLists } from '../../contexts/ListsContext';
import { SaveToListDialog } from '../save-to-list-dialog/SaveToListDialog';
import { WorldRatingBar } from '../world-rating-bar';
import { WorldCurationActions } from '../world-curation-actions';
import { EditTagsDialog } from '../edit-tags-dialog';

interface WorldCardProps {
  world: World;
  onTagClick?: (tag: string) => void;
  onPlatformClick?: (platform: string) => void;
  onSelect?: (worldId: string) => void;
  onRemove?: () => void;
  onAuthorClick?: (authorName: string) => void;
  ratingSummary?: RatingSummary | null | undefined;
  showCuratorBadges?: boolean;
  canCurate?: boolean;
}

export const WorldCard = memo(function WorldCard({ world, onTagClick, onPlatformClick, onSelect, onRemove, onAuthorClick, ratingSummary, showCuratorBadges = true, canCurate = false }: WorldCardProps) {
  const { t } = useTranslation();
  const { isWorldInAnyList } = useLists();
  const [saveOpen, setSaveOpen] = useState(false);
  const [editTagsOpen, setEditTagsOpen] = useState(false);
  const isSaved = isWorldInAnyList(world.worldId);

  return (
    <div className="card group relative overflow-hidden flex flex-col transition hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer">
      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(world.worldId)}
          className="absolute inset-0 z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl"
          aria-label={`${t('common.details')} - ${world.name}`}
        />
      )}
      <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-800">
        {world.imageUrl ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_20%,rgba(100,116,139,0.55)_50%,transparent_80%)] dark:bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.12)_50%,transparent_80%)]"
            />
            <img
              src={createWSRVUrl(world.imageUrl, 280, 65)}
              alt={world.name}
              className="relative h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
            <Globe className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {showCuratorBadges && world.quality === 'good' && (
            <span className="rounded-md bg-green-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
              {t('common.good')}
            </span>
          )}
          {showCuratorBadges && world.quality === 'bad' && (
            <span className="rounded-md bg-red-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
              {t('common.bad')}
            </span>
          )}
          {showCuratorBadges && world.highPriority === true && (
            <span className="rounded-md bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
              {t('common.highPriority')}
            </span>
          )}
        </div>
        {!onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSaveOpen(true);
            }}
            className="absolute top-2 right-2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white hover:text-indigo-600 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-indigo-300"
            aria-label={isSaved ? t('worldCard.savedToList') : t('worldCard.saveToList')}
            title={isSaved ? t('worldCard.savedToList') : t('worldCard.saveToList')}
          >
            <Star className={`h-5 w-5 ${isSaved ? 'fill-current text-indigo-500' : ''}`} />
          </button>
        )}
        {onRemove && (
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
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 dark:text-white" title={world.name}>
          {world.name}
        </h3>
        {world.authorName && onAuthorClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick(world.authorName);
            }}
            className="relative z-30 mt-0.5 -mx-1 self-start rounded px-1 py-1.5 text-xs text-slate-500 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-slate-400 dark:hover:text-indigo-400"
            aria-label={t('common.byAuthor', { author: world.authorName })}
            title={t('common.byAuthor', { author: world.authorName })}
          >
            {t('common.byAuthor', { author: world.authorName })}
          </button>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('common.byAuthor', { author: world.authorName || t('common.unknown') })}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {world.capacity}
          </span>
          <span className="inline-flex items-center gap-1" title={world.internalAddDate ? t('worldCard.tagged') : t('worldCard.added')}>
            <Calendar className="h-3 w-3" />
            {new Date(getWorldAddDate(world)).toLocaleDateString()}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {world.platforms.map((p) => {
            const label = getPlatformLabel(p);
            return onPlatformClick ? (
              <button
                key={p}
                type="button"
                onClick={() => onPlatformClick(p)}
                title={label}
                className="relative z-30 rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:brightness-110 dark:bg-slate-700 dark:text-slate-200"
              >
                {label}
              </button>
            ) : (
              <span
                key={p}
                className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              >
                {label}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {world.tags.slice(0, 4).map((t) => (
            <TagBadge key={t} tag={t} onClick={onTagClick} className="relative z-30" />
          ))}
          {world.tags.length > 4 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t('common.more', { count: world.tags.length - 4 })}
            </span>
          )}
          {canCurate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditTagsOpen(true);
              }}
              className="relative z-30 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-300"
            >
              {t('curator.editTags')}
            </button>
          )}
        </div>

        {canCurate && <WorldCurationActions world={world} />}

        {ratingSummary !== undefined && (
          <WorldRatingBar
            summary={
              ratingSummary === null
                ? { worldId: world.worldId, good: 0, bad: 0, userRating: null }
                : ratingSummary
            }
            variant="card"
          />
        )}

        <div className="mt-auto pt-3 flex items-center justify-center gap-2">
          {world.vrchatUrl ? (
            <a
              href={world.vrchatUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary gap-2 text-sm relative z-30"
            >
              <ExternalLink className="h-4 w-4" />
              {t('worldDetail.openInVRChat')}
              <span className="sr-only"> {t('common.opensInNewTab')}</span>
            </a>
          ) : (
            <span
              className="btn-primary gap-2 text-sm relative z-30 cursor-not-allowed opacity-50"
              aria-disabled="true"
              title={t('worldDetail.openInVRChatUnavailable')}
            >
              <ExternalLink className="h-4 w-4" />
              {t('worldDetail.openInVRChat')}
            </span>
          )}
          <ShareButton world={world} iconOnly />
        </div>
      </div>
      <SaveToListDialog worldId={world.worldId} open={saveOpen} onOpenChange={setSaveOpen} />
      {editTagsOpen && (
        <EditTagsDialog world={world} open={editTagsOpen} onOpenChange={setEditTagsOpen} />
      )}
    </div>
  );
});
