import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateComment, MAX_LENGTH } from '../../utils/commentValidation';
import type { CommentValidationError } from '../../utils/commentValidation';

interface SentimentCommentFormProps {
  isSubmitting: boolean;
  onSubmit: (content: string) => void;
}

const errorKeyMap: Record<CommentValidationError, string> = {
  tooLong: 'sentiment.validation.tooLong',
  noLinks: 'sentiment.validation.noLinks',
  noEmails: 'sentiment.validation.noEmails',
  noMarkup: 'sentiment.validation.noMarkup',
  noExcessWhitespace: 'sentiment.validation.noExcessWhitespace',
  empty: 'sentiment.validation.empty',
};

export function SentimentCommentForm({ isSubmitting, onSubmit }: SentimentCommentFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [error, setError] = useState<CommentValidationError | null>(null);

  const handleChange = (value: string) => {
    setContent(value);
    const result = validateComment(value);
    setError(result.valid || result.reason === 'empty' ? null : result.reason);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateComment(content);
    if (!result.valid) {
      setError(result.reason);
      return;
    }
    onSubmit(content.trim());
    setContent('');
    setError(null);
  };

  const length = content.trim().length;

  return (
    <form onSubmit={handleSubmit} data-testid="sentiment-comment-form">
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('sentiment.comments.placeholder')}
        maxLength={MAX_LENGTH + 1}
        rows={3}
        disabled={isSubmitting}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {error && (
            <span className="block text-xs text-red-500">
              {t(errorKeyMap[error])}
            </span>
          )}
          <span
            className={`block text-xs text-slate-500 dark:text-slate-400 ${length > MAX_LENGTH ? 'text-red-500' : ''}`}
          >
            {t('sentiment.comments.count', { count: length, max: MAX_LENGTH })}
          </span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim() || !!error}
          className="btn-primary text-sm"
        >
          {t('sentiment.comments.submit')}
        </button>
      </div>
    </form>
  );
}
