import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMe, useMeta, useTags, useWorld, useWorlds, useInfiniteWorlds } from './useApi';
import * as client from '../api/client';
import type { World } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const createWorld = (overrides: Partial<World> = {}): World => ({
  worldId: 'wrld_123',
  name: 'Test World',
  authorName: 'Test Author',
  imageUrl: 'https://example.com/image.png',
  tags: [],
  platforms: ['pc'],
  capacity: 42,
  quality: 'good',
  createdAt: '2024-01-01T00:00:00Z',
  internalAddDate: '2024-02-01T00:00:00Z',
  vrchatUrl: 'https://vrchat.com/home/world/wrld_123',
  ...overrides,
});

describe('useWorld', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('returns placeholder data from paginated worlds cache and fetches in background', async () => {
    const cachedWorld = createWorld({ worldId: 'wrld_cached', name: 'Cached World' });
    const fetchedWorld = createWorld({ worldId: 'wrld_cached', name: 'Fetched World' });

    queryClient.setQueryData(['worlds', {}], {
      worlds: [cachedWorld],
      total: 1,
      limit: 20,
      offset: 0,
    });

    vi.spyOn(client, 'fetchWorld').mockResolvedValue(fetchedWorld);

    const { result } = renderHook(() => useWorld('wrld_cached'), { wrapper: Wrapper });

    expect(result.current.data?.name).toBe('Cached World');
    expect(result.current.isPending).toBe(false);
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.data?.name).toBe('Fetched World'));
    expect(result.current.isFetching).toBe(false);
    expect(client.fetchWorld).toHaveBeenCalledWith('wrld_cached');
  });

  it('returns placeholder data from infinite worlds cache', () => {
    const cachedWorld = createWorld({ worldId: 'wrld_infinite', name: 'Infinite World' });

    queryClient.setQueryData(['worlds-infinite', {}], {
      pages: [{ worlds: [cachedWorld], total: 1, limit: 20, offset: 0 }],
      pageParams: [0],
    });

    vi.spyOn(client, 'fetchWorld').mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorld('wrld_infinite'), { wrapper: Wrapper });

    expect(result.current.data?.name).toBe('Infinite World');
    expect(result.current.isPending).toBe(false);
  });

  it('prefers paginated cache over infinite cache when both are present', async () => {
    const paginatedWorld = createWorld({
      worldId: 'wrld_both',
      name: 'Paginated World',
    });
    const infiniteWorld = createWorld({
      worldId: 'wrld_both',
      name: 'Infinite World',
    });
    const fetchedWorld = createWorld({ worldId: 'wrld_both', name: 'Fetched World' });

    queryClient.setQueryData(['worlds', {}], {
      worlds: [paginatedWorld],
      total: 1,
      limit: 20,
      offset: 0,
    });
    queryClient.setQueryData(['worlds-infinite', {}], {
      pages: [{ worlds: [infiniteWorld], total: 1, limit: 20, offset: 0 }],
      pageParams: [0],
    });

    vi.spyOn(client, 'fetchWorld').mockResolvedValue(fetchedWorld);

    const { result } = renderHook(() => useWorld('wrld_both'), { wrapper: Wrapper });

    expect(result.current.data?.name).toBe('Paginated World');
    await waitFor(() => expect(result.current.data?.name).toBe('Fetched World'));
  });

  it('returns undefined when worldId is undefined', () => {
    const { result } = renderHook(() => useWorld(undefined), { wrapper: Wrapper });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
  });
});

describe('useWorlds', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('passes the TanStack Query signal into fetchWorlds', async () => {
    vi.spyOn(client, 'fetchWorlds').mockResolvedValue({
      worlds: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    const { result } = renderHook(() => useWorlds({ limit: 5 }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(client.fetchWorlds).toHaveBeenCalledWith(
      { limit: 5 },
      expect.objectContaining({ aborted: false }),
    );
  });

  it('keeps previous data while the next query key is pending', async () => {
    const worldA = createWorld({ worldId: 'wrld_a', name: 'World A' });
    const worldB = createWorld({ worldId: 'wrld_b', name: 'World B' });

    let resolveB: (value: never) => void = () => {};
    vi.spyOn(client, 'fetchWorlds')
      .mockResolvedValueOnce({ worlds: [worldA], total: 1, limit: 20, offset: 0 })
      .mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve as never; }));

    const { result, rerender } = renderHook(
      ({ search }: { search?: string }) => useWorlds({ search }),
      { wrapper: Wrapper, initialProps: { search: 'first' } },
    );

    await waitFor(() => expect(result.current.data?.worlds[0]?.name).toBe('World A'));

    rerender({ search: 'second' });

    expect(result.current.data?.worlds[0]?.name).toBe('World A');
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isFetching).toBe(true);

    resolveB({ worlds: [worldB], total: 1, limit: 20, offset: 0 } as never);
    await waitFor(() => expect(result.current.data?.worlds[0]?.name).toBe('World B'));
  });

  it('does not toast and lands on the last key when a superseded query rejects with AbortError', async () => {
    vi.spyOn(client, 'fetchWorlds').mockImplementation(
      (_params, signal) =>
        new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
          resolve({ worlds: [], total: 0, limit: 20, offset: 0 } as never);
        }),
    );

    const { result, rerender } = renderHook(
      ({ search }: { search?: string }) => useWorlds({ search }),
      { wrapper: Wrapper, initialProps: { search: 'first' } },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    rerender({ search: 'second' });
    await waitFor(() => expect(client.fetchWorlds).toHaveBeenCalledTimes(2));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ worlds: [], total: 0, limit: 20, offset: 0 });
  });
});

describe('useInfiniteWorlds', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches the next page with the TanStack Query signal and the right offset', async () => {
    const pageOne = [createWorld({ worldId: 'wrld_1' })];
    const pageTwo = [createWorld({ worldId: 'wrld_2' })];

    vi.spyOn(client, 'fetchWorlds')
      .mockResolvedValueOnce({ worlds: pageOne, total: 2, limit: 1, offset: 0 })
      .mockResolvedValueOnce({ worlds: pageTwo, total: 2, limit: 1, offset: 1 });

    const { result } = renderHook(() => useInfiniteWorlds({ limit: 1 }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(client.fetchWorlds).toHaveBeenNthCalledWith(
      2,
      { limit: 1, offset: 1 },
      expect.any(AbortSignal),
    );
  });
});

describe('useMeta', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches meta data without params', async () => {
    vi.spyOn(client, 'fetchMeta').mockResolvedValue({
      qualityGood: 123,
      qualityBad: 12,
      platformDesktop: 80,
      platformAndroid: 45,
      platformiOS: 6,
    });

    const { result } = renderHook(() => useMeta(), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual({
      qualityGood: 123,
      qualityBad: 12,
      platformDesktop: 80,
      platformAndroid: 45,
      platformiOS: 6,
    });
    expect(client.fetchMeta).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.fetchMeta).mock.calls[0]).toHaveLength(1);
  });
});

describe('useTags', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('sets an explicit staleTime so the cached value is reused on remount', async () => {
    const fetchSpy = vi.spyOn(client, 'fetchTags').mockResolvedValue({ tags: [] });

    const first = renderHook(() => useTags(), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.isPending).toBe(false));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    first.unmount();

    renderHook(() => useTags(), { wrapper: Wrapper });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });
});

describe('useMe', () => {
  beforeEach(() => {
    queryClient.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('does not fetch identity until a token is stored or Apply is clicked', async () => {
    const fetchSpy = vi.spyOn(client, 'fetchMe');

    renderHook(() => useMe(), { wrapper: Wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('verifies identity on mount when a token was stored in a previous session', async () => {
    window.localStorage.setItem('sos-api-token', 'stored-curator-token');
    vi.spyOn(client, 'fetchMe').mockResolvedValue({
      name: 'Curator',
      role: 'curator',
      permissions: ['worlds:read', 'worlds:write'],
    });

    const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(client.fetchMe).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({
      name: 'Curator',
      role: 'curator',
      permissions: ['worlds:read', 'worlds:write'],
    });
  });

  it('returns the current user with role and permissions', async () => {
    queryClient.setQueryData(['identity', 'requested'], true);
    vi.spyOn(client, 'fetchMe').mockResolvedValue({
      name: 'Curator',
      role: 'curator',
      permissions: ['worlds:read', 'worlds:write'],
    });

    const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual({
      name: 'Curator',
      role: 'curator',
      permissions: ['worlds:read', 'worlds:write'],
    });
    expect(client.fetchMe).toHaveBeenCalledTimes(1);
  });

  it('suppresses the error toast by default when the request fails', async () => {
    queryClient.setQueryData(['identity', 'requested'], true);
    vi.spyOn(client, 'fetchMe').mockRejectedValue(new Error('unauthorized'));

    const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not retry a rejected identity request, so the error surfaces after a single call', async () => {
    // This client keeps TanStack's default retry, so a single fetchMe call
    // proves useMe's own retry: false (the shared client disables retries globally).
    const retryClient = new QueryClient();
    retryClient.setQueryData(['identity', 'requested'], true);
    const fetchSpy = vi.spyOn(client, 'fetchMe').mockRejectedValue(new Error('unauthorized'));

    const retryWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={retryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMe(), { wrapper: retryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
