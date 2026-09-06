import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft, Globe, Users, Calendar, ExternalLink, Hash, Star, X } from 'lucide-react';
import { useWorld } from '../../hooks/useApi';
import { TagBadge } from '../../components/tag-badge';
import { getPlatformLabel } from '../../utils/platformLabel';
import { getWorldAddDate } from '../../utils/worldAddDate';
import { createWSRVUrl } from '../../utils/worldImageUrl';
import { ShareButton } from '../../components/share-button';
import { CopyWorldId } from '../../components/copy-world-id';
import { WorldAddDate } from '../../components/world-add-date';
import { useLists } from '../../contexts/ListsContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SaveToListDialog } from '../../components/save-to-list-dialog/SaveToListDialog';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const SentimentSection = lazy(() =>
  import('../../components/sentiment-section').then((m) => ({ default: m.SentimentSection })),
);

interface ImageLightboxProps {
  open: boolean;
  imageUrl: string;
  imageAlt: string;
  label: string;
  closeLabel: string;
  onClose: () => void;
}

function ImageLightbox({
  open,
  imageUrl,
  imageAlt,
  label,
  closeLabel,
  onClose,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus({ open, containerRef: dialogRef, onClose });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.currentTarget === e.target) {
          onClose();
        }
      }}
      data-testid="world-image-lightbox"
    >
      <div ref={dialogRef} className="contents">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label={closeLabel}
        >
          <X className="h-6 w-6" />
        </button>
        <img
          src={imageUrl}
          alt={imageAlt}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>
    </div>
  );
}

export function WorldDetailPage({ worldId: worldIdProp }: { worldId?: string } = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { worldId: paramWorldId } = useParams<{ worldId: string }>();
  const worldId = worldIdProp ?? paramWorldId;
  const { isWorldInAnyList } = useLists();
  const [saveOpen, setSaveOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { data, isPending, isError, error, isFetching } = useWorld(worldId, {
    suppressErrorToast: true,
  });
  usePageTitle(data?.name ?? t('nav.worlds'));

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [worldId]);

  function handleGoBack() {
    if (location.key === 'default') {
      navigate('/worlds');
    } else {
      navigate(-1);
    }
  }

  useEffect(() => {
    if (lightboxOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (isPending && !data) {
    return (
      <div
        data-testid="world-detail-backdrop"
        className="-m-4 min-h-[calc(100vh-3.5rem)] cursor-pointer p-4 lg:-m-6 lg:p-6"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            handleGoBack();
          }
        }}
      >
        <div className="mx-auto max-w-3xl space-y-5">
          <button
            type="button"
            disabled
            className="btn-ghost gap-1.5 text-sm opacity-50"
            aria-hidden="true"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>

          <div className="card overflow-hidden">
            <div className="relative h-56 animate-pulse bg-slate-200 sm:h-72 dark:bg-slate-800" />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="w-full max-w-md space-y-2">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('worldDetail.platforms')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 w-16 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('worldDetail.tags')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div
        data-testid="world-detail-backdrop"
        className="-m-4 min-h-[calc(100vh-3.5rem)] cursor-pointer p-4 lg:-m-6 lg:p-6"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            handleGoBack();
          }
        }}
      >
        <div className="mx-auto max-w-3xl space-y-5">
          <button
            type="button"
            onClick={() => handleGoBack()}
            className="btn-ghost gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>
          <div className="card p-8 text-center text-sm text-red-700 dark:text-red-300">
            {t('worldDetail.loadError', { message: error?.message || 'Not found' })}
          </div>
        </div>
      </div>
    );
  }

  const w = data;

  return (
    <div
      data-testid="world-detail-backdrop"
      className="-m-4 min-h-[calc(100vh-3.5rem)] cursor-pointer p-4 lg:-m-6 lg:p-6"
      onClick={(e) => {
        // Only navigate when the user clicks the empty background area, not the card.
        if (e.currentTarget === e.target) {
          handleGoBack();
        }
      }}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <button
          type="button"
          onClick={() => handleGoBack()}
          className="btn-ghost gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="card overflow-hidden relative cursor-default">
          {isFetching && (
            <div
              data-testid="world-detail-loading-bar"
              className="absolute left-0 right-0 top-0 z-10 h-1 overflow-hidden bg-slate-200 dark:bg-slate-800"
            >
              <div className="h-full w-1/3 animate-[shimmer_1.5s_infinite] bg-indigo-500" />
            </div>
          )}
          {isError && (
            <div className="border-b border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              {t('worldDetail.refreshError', { message: error?.message })}
            </div>
          )}
          <div className="relative h-56 overflow-hidden bg-slate-200 sm:h-72 dark:bg-slate-800">
            {w.imageUrl ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="h-full w-full cursor-pointer"
                aria-label={t('worldDetail.openImageLightbox', { name: w.name })}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_20%,rgba(100,116,139,0.55)_50%,transparent_80%)] dark:bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.12)_50%,transparent_80%)]"
                />
                <img
                  src={createWSRVUrl(w.imageUrl, 1600)}
                  alt={w.name}
                  className="relative h-full w-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
                <Globe className="h-16 w-16" />
              </div>
            )}
          </div>

          {lightboxOpen && w.imageUrl && (
            <ImageLightbox
              open={lightboxOpen}
              imageUrl={createWSRVUrl(w.imageUrl, 1600)}
              imageAlt={w.name}
              label={t('worldDetail.imageLightbox', { name: w.name })}
              closeLabel={t('common.close')}
              onClose={() => setLightboxOpen(false)}
            />
          )}

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">{w.name}</h1>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t('worldDetail.byAuthor', { author: w.authorName || t('worldDetail.unknownAuthor') })}
                </p>
              </div>
              <div className="shrink-0">
                {w.quality === 'good' && (
                  <span className="rounded-lg bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-500/30 dark:text-green-400">
                    {t('worldDetail.qualityGood')}
                  </span>
                )}
                {w.quality === 'bad' && (
                  <span className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-500/30 dark:text-red-400">
                    {t('worldDetail.qualityBad')}
                  </span>
                )}
                {w.quality == null && (
                  <span className="rounded-lg bg-slate-200/40 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:ring-slate-600/30">
                    {t('worldDetail.noQuality')}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm text-slate-700 dark:border-slate-700/50 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                {t('worldDetail.capacity', { capacity: w.capacity })}
              </div>
              <CopyWorldId worldId={w.worldId} />
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Trans
                  i18nKey={w.internalAddDate ? 'worldDetail.tagged' : 'worldDetail.added'}
                  values={{ date: new Date(getWorldAddDate(w)).toLocaleString() }}
                  components={{ date: <WorldAddDate world={w} variant="datetime" /> }}
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('worldDetail.platforms')}</p>
              <div className="flex flex-wrap gap-2">
                {w.platforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => navigate(`/worlds?platform=${encodeURIComponent(p)}`)}
                    className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:brightness-110 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {getPlatformLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('worldDetail.tags')}</p>
              <div className="flex flex-wrap gap-2">
                {w.tags.map((t) => (
                  <TagBadge
                    key={t}
                    tag={t}
                    onClick={(tag) => navigate(`/worlds?tag=${encodeURIComponent(tag)}`)}
                  />
                ))}
              </div>
            </div>

            {w.flags && w.flags.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('worldDetail.flags')}</p>
                <div className="flex flex-wrap gap-2">
                  {w.flags.map((tag) => (
                    <TagBadge key={tag} tag={tag} exclude />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {w.vrchatUrl ? (
                <a
                  href={w.vrchatUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary gap-2 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('worldDetail.openInVRChat')}
                  <span className="sr-only"> {t('common.opensInNewTab')}</span>
                </a>
              ) : (
                <span
                  className="btn-primary gap-2 text-sm cursor-not-allowed opacity-50"
                  aria-disabled="true"
                  title={t('worldDetail.openInVRChatUnavailable')}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('worldDetail.openInVRChat')}
                </span>
              )}
              <ShareButton world={w} />
              <button
                type="button"
                onClick={() => setSaveOpen(true)}
                className={`btn-secondary gap-2 text-sm ${isWorldInAnyList(w.worldId) ? 'text-indigo-600 dark:text-indigo-300' : ''}`}
              >
                <Star className={`h-4 w-4 ${isWorldInAnyList(w.worldId) ? 'fill-current' : ''}`} />
                {isWorldInAnyList(w.worldId) ? t('worldDetail.savedToList') : t('worldDetail.saveToList')}
              </button>
              <SaveToListDialog worldId={w.worldId} open={saveOpen} onOpenChange={setSaveOpen} />
            </div>
            <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700/50">
              {import.meta.env.VITE_ENABLE_COMMUNITY_SENTIMENT === 'true' ? (
                <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />}>
                  <SentimentSection worldId={w.worldId} />
                </Suspense>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
