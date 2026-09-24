import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SentimentSection } from './SentimentSection';

const mocks = vi.hoisted(() => ({
  useRatings: vi.fn(),
  useInfiniteComments: vi.fn(),
  useSubmitRating: vi.fn(),
  useUpdateRating: vi.fn(),
  useDeleteRating: vi.fn(),
  useSubmitComment: vi.fn(),
  hasAnonymousSession: vi.fn(),
}));

vi.mock('../../hooks/useSentiment', () => ({
  useRatings: () => mocks.useRatings(),
  useInfiniteComments: () => mocks.useInfiniteComments(),
  useSubmitRating: () => mocks.useSubmitRating(),
  useUpdateRating: () => mocks.useUpdateRating(),
  useDeleteRating: () => mocks.useDeleteRating(),
  useSubmitComment: () => mocks.useSubmitComment(),
}));

vi.mock('../../api/sentiment', async () => {
  const actual = await vi.importActual<typeof import('../../api/sentiment')>('../../api/sentiment');
  return {
    ...actual,
    hasAnonymousSession: () => mocks.hasAnonymousSession(),
  };
});

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => {
    return <div data-testid="turnstile-widget">Turnstile</div>;
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const defaultRatings = { data: { worldId: 'w1', good: 0, bad: 0, userRating: null }, isLoading: false };
const defaultComments = {
  data: { pages: [{ comments: [], total: 0 }] },
  isLoading: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
};
const defaultMutation = { isPending: false, mutateAsync: vi.fn() };

describe('SentimentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
    mocks.useRatings.mockReturnValue(defaultRatings);
    mocks.useInfiniteComments.mockReturnValue(defaultComments);
    mocks.useSubmitRating.mockReturnValue(defaultMutation);
    mocks.useUpdateRating.mockReturnValue(defaultMutation);
    mocks.useDeleteRating.mockReturnValue(defaultMutation);
    mocks.useSubmitComment.mockReturnValue(defaultMutation);
    mocks.hasAnonymousSession.mockResolvedValue(true);
  });

  it('renders section', () => {
    render(<SentimentSection worldId="w1" />, { wrapper });
    expect(screen.getByTestId('sentiment-section')).toBeInTheDocument();
  });

  it('passes loading state to comment list', () => {
    mocks.useInfiniteComments.mockReturnValue({
      ...defaultComments,
      isLoading: true,
    });
    render(<SentimentSection worldId="w1" />, { wrapper });
    expect(screen.getByTestId('sentiment-comment-list-loading')).toBeInTheDocument();
  });

  it('uses submitRating when user has no rating and clicks a rating', async () => {
    const submitRating = { ...defaultMutation, mutateAsync: vi.fn().mockResolvedValue(undefined) };
    mocks.useSubmitRating.mockReturnValue(submitRating);
    render(<SentimentSection worldId="w1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Good/i }));
    await vi.waitFor(() =>
      expect(submitRating.mutateAsync).toHaveBeenCalledWith({
        worldId: 'w1',
        value: 'good',
        captchaToken: undefined,
      }),
    );
  });

  it('uses updateRating when user has a rating and clicks the opposite rating', async () => {
    const updateRating = { ...defaultMutation, mutateAsync: vi.fn().mockResolvedValue(undefined) };
    mocks.useUpdateRating.mockReturnValue(updateRating);
    mocks.useRatings.mockReturnValue({
      data: { worldId: 'w1', good: 1, bad: 0, userRating: 'good' as const },
      isLoading: false,
    });
    render(<SentimentSection worldId="w1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Bad/i }));
    await vi.waitFor(() =>
      expect(updateRating.mutateAsync).toHaveBeenCalledWith({
        worldId: 'w1',
        value: 'bad',
        captchaToken: undefined,
      }),
    );
  });

  it('uses deleteRating when user clicks the active rating', async () => {
    const deleteRating = { ...defaultMutation, mutateAsync: vi.fn().mockResolvedValue(undefined) };
    mocks.useDeleteRating.mockReturnValue(deleteRating);
    mocks.useRatings.mockReturnValue({
      data: { worldId: 'w1', good: 1, bad: 0, userRating: 'good' as const },
      isLoading: false,
    });
    render(<SentimentSection worldId="w1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Good/i }));
    await vi.waitFor(() =>
      expect(deleteRating.mutateAsync).toHaveBeenCalledWith({
        worldId: 'w1',
        captchaToken: undefined,
      }),
    );
  });

  it('shows Turnstile when there is no anonymous session and a rating is clicked', async () => {
    mocks.hasAnonymousSession.mockResolvedValue(false);
    render(<SentimentSection worldId="w1" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /Good/i }));
    await vi.waitFor(() => expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument());
  });
});
