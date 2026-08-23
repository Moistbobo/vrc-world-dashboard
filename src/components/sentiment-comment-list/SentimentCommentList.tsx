import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useCurrentUserId } from '../../hooks/useCurrentUser';
import { formatTimestamp } from '../../utils/formatTimestamp';
import type { Comment } from '../../types';

interface SentimentCommentListProps {
  comments: Comment[] | undefined;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function AuthorLabel({
  username,
  isCurrentUser,
}: {
  username: string;
  isCurrentUser: boolean;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={`font-medium ${
        isCurrentUser
          ? 'font-bold text-indigo-700 dark:text-indigo-300'
          : 'text-slate-700 dark:text-slate-300'
      }`}
      title={isCurrentUser ? t('sentiment.comments.youIndicator') : undefined}
    >
      {username}
      {isCurrentUser && (
        <span className="ml-1 font-bold text-indigo-600 dark:text-indigo-300">
          {' '}
          {t('sentiment.comments.youIndicator')}
        </span>
      )}
    </span>
  );
}

export function SentimentCommentList({
  comments,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: SentimentCommentListProps) {
  const { t } = useTranslation();
  const currentUserId = useCurrentUserId();

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="sentiment-comment-list-loading">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <p className="sr-only">{t('sentiment.comments.loading')}</p>
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('sentiment.comments.empty')}</p>;
  }

  return (
    <div className="space-y-3" data-testid="sentiment-comment-list">
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <AuthorLabel username={comment.username} isCurrentUser={comment.user_id === currentUserId} />
              <span title={formatTimestamp(comment.created_at)}>{formatTimestamp(comment.created_at)}</span>
              <span title={comment.id}>{comment.id.split('-').pop()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-200">
              {comment.content}
            </p>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="btn-secondary flex w-full items-center justify-center gap-2"
          aria-busy={isLoadingMore}
        >
          {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isLoadingMore ? t('sentiment.comments.loadingMore') : t('sentiment.comments.loadMore')}
        </button>
      )}
    </div>
  );
}
