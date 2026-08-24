import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRatings,
  useInfiniteComments,
  useRatingsForWorldIds,
  chunkRatingsWorldIds,
  useSubmitRating,
  useUpdateRating,
  useDeleteRating,
  useSubmitComment,
  useRecentActivity,
} from './useSentiment';
import { useCurrentUserId } from './useCurrentUser';
import * as sentimentApi from '../api/sentiment';
import * as clientApi from '../api/client';
import type { RatingSummary } from '../types';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe('useRatings', () => {
  it('fetches rating summary for the given world', async () => {
    vi.spyOn(sentimentApi, 'fetchRatings').mockResolvedValue({
      worldId: 'wrld_123',
      good: 5,
      bad: 1,
      userRating: null,
    });
    const { result } = renderHook(() => useRatings('wrld_123'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sentimentApi.fetchRatings).toHaveBeenCalledWith('wrld_123');
    expect(result.current.data).toMatchObject({ worldId: 'wrld_123', good: 5, bad: 1, userRating: null });
  });
});

describe('chunkRatingsWorldIds', () => {
  it('chunks ids in 20s in input order', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `w_${String(i).padStart(2, '0')}`);
    const chunks = chunkRatingsWorldIds(ids);
    expect(chunks.map((c) => c.ids.length)).toEqual([20, 20, 5]);
    expect(chunks[0].ids[0]).toBe('w_00');
    expect(chunks[0].ids[19]).toBe('w_19');
    expect(chunks[1].ids[0]).toBe('w_20');
  });

  it('keeps chunk boundaries and keys stable as ids stream in', () => {
    const firstPage = Array.from({ length: 20 }, (_, i) => `w_${String(i).padStart(2, '0')}`);
    const secondPage = Array.from({ length: 20 }, (_, i) => `w_${String(i + 20).padStart(2, '0')}`);
    const firstChunks = chunkRatingsWorldIds(firstPage);
    const bothChunks = chunkRatingsWorldIds([...firstPage, ...secondPage]);
    expect(bothChunks[0]).toEqual(firstChunks[0]);
    expect(bothChunks[1].ids).toEqual(secondPage);
  });

  it('sorts ids within each chunk', () => {
    const [chunk] = chunkRatingsWorldIds(['wrld_b', 'wrld_a', 'wrld_c']);
    expect(chunk.ids).toEqual(['wrld_a', 'wrld_b', 'wrld_c']);
    expect(chunk.key).toBe('wrld_a|wrld_b|wrld_c');
  });

  it('returns an empty array for empty input', () => {
    expect(chunkRatingsWorldIds([])).toEqual([]);
  });
});

describe('useRatingsForWorldIds', () => {
  function makeMap(entries: Record<string, { good: number; bad: number; userRating?: 'good' | 'bad' | null }>): Map<string, RatingSummary> {
    return new Map(
      Object.entries(entries).map(([worldId, v]) => [
        worldId,
        { worldId, good: v.good, bad: v.bad, userRating: v.userRating ?? null },
      ]),
    );
  }

  it('issues one batched fetch for the visible world ids', async () => {
    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockResolvedValue(makeMap({ wrld_a: { good: 5, bad: 1 }, wrld_b: { good: 0, bad: 3 } }));

    const { result } = renderHook(() => useRatingsForWorldIds(['wrld_a', 'wrld_b']), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(['wrld_a', 'wrld_b']);
    expect(result.current.data?.get('wrld_a')).toMatchObject({ good: 5, bad: 1 });
    expect(result.current.data?.get('wrld_b')).toMatchObject({ good: 0, bad: 3 });
  });

  it('reuses the cached batch when the same set is requested in a different order', async () => {
    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockResolvedValue(makeMap({ wrld_a: { good: 1, bad: 0 }, wrld_b: { good: 0, bad: 1 } }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const hook = renderHook(
      ({ ids }: { ids: string[] }) => useRatingsForWorldIds(ids),
      { wrapper: TestWrapper, initialProps: { ids: ['wrld_a', 'wrld_b'] } },
    );
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));

    hook.rerender({ ids: ['wrld_b', 'wrld_a'] });
    await new Promise((r) => setTimeout(r, 20));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('refetches ratings on a fresh mount even when the same set was just cached', async () => {
    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockResolvedValue(makeMap({ wrld_a: { good: 1, bad: 0 }, wrld_b: { good: 0, bad: 1 } }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const first = renderHook(() => useRatingsForWorldIds(['wrld_a', 'wrld_b']), { wrapper: TestWrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useRatingsForWorldIds(['wrld_a', 'wrld_b']), { wrapper: TestWrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, ['wrld_a', 'wrld_b']);
    expect(spy).toHaveBeenNthCalledWith(2, ['wrld_a', 'wrld_b']);
  });

  it('does not fetch when the input is empty', async () => {
    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockResolvedValue(new Map());

    const { result } = renderHook(() => useRatingsForWorldIds([]), { wrapper });
    await new Promise((r) => setTimeout(r, 20));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('treats a repeated request for the same set as a cache hit', async () => {
    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockResolvedValue(makeMap({ wrld_a: { good: 2, bad: 0 } }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const hook = renderHook(
      ({ ids }: { ids: string[] }) => useRatingsForWorldIds(ids),
      { wrapper: TestWrapper, initialProps: { ids: ['wrld_a'] as string[] } },
    );
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));

    hook.rerender({ ids: ['wrld_a'] });
    await new Promise((r) => setTimeout(r, 20));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fetches only the newly added chunk when the id set grows', async () => {
    const firstIds = Array.from({ length: 20 }, (_, i) => `w_${String(i).padStart(2, '0')}`);
    const secondIds = Array.from({ length: 20 }, (_, i) => `w_${String(i + 20).padStart(2, '0')}`);
    const allIds = [...firstIds, ...secondIds];

    const spy = vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockImplementation((ids) => {
        const entries = Object.fromEntries(ids.map((id) => [id, { good: 1, bad: 0 }]));
        return Promise.resolve(makeMap(entries));
      });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const hook = renderHook(
      ({ ids }: { ids: string[] }) => useRatingsForWorldIds(ids),
      { wrapper: TestWrapper, initialProps: { ids: firstIds } },
    );
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(firstIds);

    hook.rerender({ ids: allIds });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy).toHaveBeenLastCalledWith(secondIds);
    expect(hook.result.current.data?.size).toBe(40);
    expect(hook.result.current.data?.get('w_00')).toMatchObject({ good: 1, bad: 0 });
    expect(hook.result.current.data?.get('w_39')).toMatchObject({ good: 1, bad: 0 });
  });

  it('keeps previously loaded summaries while a new chunk is still fetching', async () => {
    const firstIds = Array.from({ length: 20 }, (_, i) => `w_${String(i).padStart(2, '0')}`);
    const secondIds = Array.from({ length: 20 }, (_, i) => `w_${String(i + 20).padStart(2, '0')}`);
    const allIds = [...firstIds, ...secondIds];

    let resolveSecond!: (value: Map<string, RatingSummary>) => void;
    const secondPromise = new Promise<Map<string, RatingSummary>>((resolve) => {
      resolveSecond = resolve;
    });
    vi
      .spyOn(sentimentApi, 'fetchRatingsForWorldIds')
      .mockImplementationOnce((ids) =>
        Promise.resolve(
          makeMap(Object.fromEntries(ids.map((id) => [id, { good: 1, bad: 0 }]))),
        ),
      )
      .mockImplementationOnce(() => secondPromise);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const hook = renderHook(
      ({ ids }: { ids: string[] }) => useRatingsForWorldIds(ids),
      { wrapper: TestWrapper, initialProps: { ids: firstIds } },
    );
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));

    hook.rerender({ ids: allIds });
    await waitFor(() => expect(hook.result.current.isFetching).toBe(true));
    expect(hook.result.current.data?.get('w_00')).toMatchObject({ good: 1, bad: 0 });
    expect(hook.result.current.data?.get('w_20')).toBeUndefined();

    resolveSecond(
      makeMap(Object.fromEntries(secondIds.map((id) => [id, { good: 2, bad: 1 }]))),
    );
    await waitFor(() => expect(hook.result.current.data?.get('w_20')).toMatchObject({ good: 2, bad: 1 }));
    expect(hook.result.current.data?.get('w_00')).toMatchObject({ good: 1, bad: 0 });
    expect(hook.result.current.data?.size).toBe(40);
  });
});

describe('useInfiniteComments', () => {
  it('fetches the first page of comments with pagination params', async () => {
    vi.spyOn(sentimentApi, 'fetchComments').mockResolvedValue({
      comments: [
        { id: 'c1', world_id: 'wrld_123', user_id: 'u1', username: 'user1', content: 'hi', created_at: '2024-01-01T00:00:00Z' },
      ],
      total: 1,
    });
    const { result } = renderHook(() => useInfiniteComments('wrld_123'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sentimentApi.fetchComments).toHaveBeenCalledWith('wrld_123', { offset: 0, limit: 20 });
    expect(result.current.data?.pages[0].comments).toHaveLength(1);
    expect(result.current.data?.pages[0].comments[0].id).toBe('c1');
    expect(result.current.data?.pages[0].total).toBe(1);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('has more pages when total exceeds loaded count', async () => {
    vi.spyOn(sentimentApi, 'fetchComments').mockResolvedValue({
      comments: Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        world_id: 'wrld_123',
        user_id: 'u1',
        username: 'user1',
        content: `comment ${i}`,
        created_at: '2024-01-01T00:00:00Z',
      })),
      total: 42,
    });
    const { result } = renderHook(() => useInfiniteComments('wrld_123'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });
});

describe('useSubmitRating', () => {
  it('submits a rating and optimistically updates the summary', async () => {
    vi.spyOn(sentimentApi, 'submitRating').mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    queryClient.setQueryData(['ratings', 'wrld_123'], {
      worldId: 'wrld_123',
      good: 2,
      bad: 1,
      userRating: null,
    });

    const { result } = renderHook(() => useSubmitRating(), { wrapper: TestWrapper });
    await result.current.mutateAsync({ worldId: 'wrld_123', value: 'good' });

    expect(sentimentApi.submitRating).toHaveBeenCalledWith('wrld_123', 'good', undefined);

    const summary = queryClient.getQueryData<RatingSummary>(['ratings', 'wrld_123']);
    expect(summary).toMatchObject({ good: 3, bad: 1, userRating: 'good' });
  });
});

describe('useUpdateRating', () => {
  it('updates a rating and switches the cached counts', async () => {
    vi.spyOn(sentimentApi, 'updateRating').mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    queryClient.setQueryData(['ratings', 'wrld_123'], {
      worldId: 'wrld_123',
      good: 2,
      bad: 1,
      userRating: 'good',
    });

    const { result } = renderHook(() => useUpdateRating(), { wrapper: TestWrapper });
    await result.current.mutateAsync({ worldId: 'wrld_123', value: 'bad' });

    expect(sentimentApi.updateRating).toHaveBeenCalledWith('wrld_123', 'bad', undefined);

    const summary = queryClient.getQueryData<RatingSummary>(['ratings', 'wrld_123']);
    expect(summary).toMatchObject({ good: 1, bad: 2, userRating: 'bad' });
  });
});

describe('useDeleteRating', () => {
  it('deletes a rating and removes it from the cached summary', async () => {
    vi.spyOn(sentimentApi, 'deleteRating').mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    queryClient.setQueryData(['ratings', 'wrld_123'], {
      worldId: 'wrld_123',
      good: 2,
      bad: 1,
      userRating: 'good',
    });

    const { result } = renderHook(() => useDeleteRating(), { wrapper: TestWrapper });
    await result.current.mutateAsync({ worldId: 'wrld_123' });

    expect(sentimentApi.deleteRating).toHaveBeenCalledWith('wrld_123', undefined);

    const summary = queryClient.getQueryData<RatingSummary>(['ratings', 'wrld_123']);
    expect(summary).toMatchObject({ good: 1, bad: 1, userRating: null });
  });
});

describe('useSubmitComment', () => {
  it('calls submitComment and invalidates comments query', async () => {
    vi.spyOn(sentimentApi, 'submitComment').mockResolvedValue({
      id: 'c2',
      world_id: 'wrld_123',
      user_id: 'u2',
      username: 'user2',
      content: 'hello',
      created_at: '2024-01-01T00:00:00Z',
    });
    const { result } = renderHook(() => useSubmitComment(), { wrapper });
    await result.current.mutateAsync({ worldId: 'wrld_123', content: 'hello' });
    expect(sentimentApi.submitComment).toHaveBeenCalledWith('wrld_123', 'hello', undefined);
  });

  it('optimistically inserts a comment into the first page marked as the current user', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u-current' } } },
      error: null,
    });
    vi.spyOn(sentimentApi, 'submitComment').mockResolvedValue({
      id: 'c2',
      world_id: 'wrld_123',
      user_id: 'u-current',
      username: 'Anonymous',
      content: 'hello',
      created_at: '2024-01-01T00:00:00Z',
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => {
        const userId = useCurrentUserId();
        const submit = useSubmitComment();
        return { userId, submit };
      },
      { wrapper: TestWrapper },
    );

    await waitFor(() => expect(result.current.userId).toBe('u-current'));

    queryClient.setQueryData(['comments', 'wrld_123'], {
      pages: [
        {
          comments: [
            { id: 'c1', world_id: 'wrld_123', user_id: 'u1', username: 'user1', content: 'hi', created_at: '2024-01-01T00:00:00Z' },
          ],
          total: 1,
        },
      ],
      pageParams: [{ offset: 0, limit: 20 }],
    });

    await result.current.submit.mutateAsync({ worldId: 'wrld_123', content: 'hello' });

    const comments = queryClient.getQueryData(['comments', 'wrld_123']) as {
      pages: { comments: { user_id: string }[]; total: number }[];
    };
    expect(comments.pages[0].comments).toHaveLength(2);
    expect(comments.pages[0].comments[0].user_id).toBe('u-current');
    expect(comments.pages[0].total).toBe(2);
  });
});

describe('useRecentActivity', () => {
  function makeWorld(id: string, name: string) {
    return {
      worldId: id,
      name,
      authorName: 'Author',
      capacity: 10,
      platforms: ['pc'],
      tags: [],
      imageUrl: 'https://example.com/image.png',
      vrchatUrl: 'https://vrchat.com',
      quality: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
  }

  it('does not fetch when disabled', async () => {
    const spy = vi.spyOn(sentimentApi, 'fetchRecentActivity');

    const { result } = renderHook(() => useRecentActivity(false), { wrapper });
    await new Promise((r) => setTimeout(r, 20));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
    expect(result.current.isPending).toBe(false);
  });

  it('enriches items with world names', async () => {
    vi.spyOn(sentimentApi, 'fetchRecentActivity').mockResolvedValue([
      { type: 'comment', id: 'c1', worldId: 'w1', username: 'Ann', content: 'hi', createdAt: '2024-01-03T00:00:00Z' },
      { type: 'rating', id: 'r1', worldId: 'w2', value: 'good', createdAt: '2024-01-02T00:00:00Z' },
    ]);
    vi.spyOn(clientApi, 'fetchWorldsByIds').mockResolvedValue([
      makeWorld('w1', 'Alpha'),
      makeWorld('w2', 'Beta'),
    ]);

    const { result } = renderHook(() => useRecentActivity(true), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(sentimentApi.fetchRecentActivity).toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0]).toMatchObject({ type: 'comment', id: 'c1', username: 'Ann', content: 'hi', worldName: 'Alpha' });
    expect(result.current.rows[1]).toMatchObject({ type: 'rating', id: 'r1', value: 'good', worldName: 'Beta' });
  });

  it('filters out items whose world is missing or deleted', async () => {
    vi.spyOn(sentimentApi, 'fetchRecentActivity').mockResolvedValue([
      { type: 'comment', id: 'c1', worldId: 'w1', username: 'Ann', content: 'hi', createdAt: '2024-01-03T00:00:00Z' },
      { type: 'rating', id: 'r1', worldId: 'w-missing', value: 'good', createdAt: '2024-01-02T00:00:00Z' },
    ]);
    vi.spyOn(clientApi, 'fetchWorldsByIds').mockResolvedValue([makeWorld('w1', 'Alpha')]);

    const { result } = renderHook(() => useRecentActivity(true), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({ id: 'c1', worldName: 'Alpha' });
  });

  it('surfaces an error and a refetch when the activity fetch fails', async () => {
    vi.spyOn(sentimentApi, 'fetchRecentActivity').mockRejectedValue(new Error('supabase down'));

    const { result } = renderHook(() => useRecentActivity(true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

    expect(result.current.rows).toEqual([]);
    expect(result.current.error?.message).toBe('supabase down');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('surfaces an error when the worlds fetch fails while activity succeeds', async () => {
    vi.spyOn(sentimentApi, 'fetchRecentActivity').mockResolvedValue([
      { type: 'comment', id: 'c1', worldId: 'w1', username: 'Ann', content: 'hi', createdAt: '2024-01-03T00:00:00Z' },
    ]);
    vi.spyOn(clientApi, 'fetchWorldsByIds').mockRejectedValue(new Error('worlds down'));

    const { result } = renderHook(() => useRecentActivity(true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.rows).toEqual([]);
  });

  it('refetches recent activity on a fresh mount even when still fresh', async () => {
    const spy = vi.spyOn(sentimentApi, 'fetchRecentActivity').mockResolvedValue([
      { type: 'comment', id: 'c1', worldId: 'w1', username: 'Ann', content: 'hi', createdAt: '2024-01-03T00:00:00Z' },
    ]);
    vi.spyOn(clientApi, 'fetchWorldsByIds').mockResolvedValue([makeWorld('w1', 'Alpha')]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const first = renderHook(() => useRecentActivity(true), { wrapper: TestWrapper });
    await waitFor(() => expect(first.result.current.isPending).toBe(false));

    const second = renderHook(() => useRecentActivity(true), { wrapper: TestWrapper });
    await waitFor(() => expect(second.result.current.isPending).toBe(false));

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
