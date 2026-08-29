import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import * as clientApi from '../api/client';
import type { PaginatedWorlds, World } from '../types';
import { useCurationMutation } from './useCuration';

const untagged: World = {
  worldId: 'wrld_untagged',
  name: 'Untagged',
  authorName: 'A',
  capacity: 10,
  platforms: [],
  tags: [],
  imageUrl: '',
  vrchatUrl: '',
  quality: null,
  createdAt: '2024-01-01',
  guildId: 'guild_1',
};

const hpOnly: World = {
  worldId: 'wrld_hp',
  name: 'HP Only',
  authorName: 'A',
  capacity: 10,
  platforms: [],
  tags: [],
  imageUrl: '',
  vrchatUrl: '',
  quality: null,
  highPriority: true,
  createdAt: '2024-01-01',
  guildId: 'guild_1',
};

const tagged: World = {
  worldId: 'wrld_tagged',
  name: 'Tagged',
  authorName: 'A',
  capacity: 10,
  platforms: [],
  tags: [],
  imageUrl: '',
  vrchatUrl: '',
  quality: 'good',
  createdAt: '2024-01-01',
  guildId: 'guild_1',
};

function paginatedWorlds(worlds: World[]): PaginatedWorlds {
  return { total: worlds.length, limit: 20, offset: 0, worlds };
}

function seedCache(queryClient: QueryClient) {
  queryClient.setQueryData(['worlds', { limit: 20, offset: 0 }], paginatedWorlds([untagged, hpOnly, tagged]));
  queryClient.setQueryData<InfiniteData<PaginatedWorlds>>(
    ['worlds-infinite', { limit: 20 }],
    { pages: [paginatedWorlds([untagged, hpOnly, tagged])], pageParams: [0] },
  );
  queryClient.setQueryData(['world', 'wrld_hp'], hpOnly);
  queryClient.setQueryData(['worlds-by-ids', 'wrld_untagged,wrld_hp'], [untagged, hpOnly]);
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function worldFromList(queryClient: QueryClient, worldId: string): World | undefined {
  const data = queryClient.getQueryData<PaginatedWorlds>(['worlds', { limit: 20, offset: 0 }]);
  return data?.worlds.find((w) => w.worldId === worldId);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(clientApi, 'setWorldQuality').mockResolvedValue({ updated: true });
  vi.spyOn(clientApi, 'setWorldHighPriority').mockResolvedValue({ added: true });
  vi.spyOn(clientApi, 'clearWorldHighPriority').mockResolvedValue({ removed: true });
  vi.spyOn(clientApi, 'setWorldTags').mockResolvedValue({ updated: true });
  vi.spyOn(clientApi, 'fetchWorld').mockResolvedValue(untagged);
});

describe('useCurationMutation', () => {
  it('set-tags reconciles the fetched server world into every cached family without refetching lists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    const serverWorld: World = { ...untagged, tags: ['chill', 'social', 'server-normalized'] };
    vi.mocked(clientApi.fetchWorld).mockResolvedValue(serverWorld);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_untagged',
      guildId: 'guild_1',
      action: { type: 'set-tags', tags: ['chill', 'social'] },
    });

    expect(clientApi.fetchWorld).toHaveBeenCalledTimes(1);
    expect(clientApi.fetchWorld).toHaveBeenCalledWith('wrld_untagged');

    const keys = invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).not.toContainEqual(['worlds']);
    expect(keys).not.toContainEqual(['worlds-infinite']);
    expect(keys).not.toContainEqual(['worlds-by-ids']);
    expect(keys).toContainEqual(['meta']);
    expect(keys).toContainEqual(['tags']);

    expect(worldFromList(queryClient, 'wrld_untagged')).toMatchObject({
      tags: ['chill', 'social', 'server-normalized'],
    });
    const infinite = queryClient.getQueryData<InfiniteData<PaginatedWorlds>>([
      'worlds-infinite',
      { limit: 20 },
    ]);
    expect(
      infinite?.pages[0].worlds.find((w) => w.worldId === 'wrld_untagged'),
    ).toMatchObject({ tags: ['chill', 'social', 'server-normalized'] });
    const byIds = queryClient.getQueryData<World[]>(['worlds-by-ids', 'wrld_untagged,wrld_hp']);
    expect(byIds?.find((w) => w.worldId === 'wrld_untagged')).toMatchObject({
      tags: ['chill', 'social', 'server-normalized'],
    });
    expect(queryClient.getQueryData<World>(['world', 'wrld_untagged'])).toEqual(serverWorld);
  });

  it('removes the world from caches whose quality filter it no longer matches and keeps it in matching ones', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    const goodFilterKey = ['worlds', { tag: [], quality: ['good'], limit: 20, offset: 0 }] as const;
    queryClient.setQueryData(goodFilterKey, paginatedWorlds([tagged]));
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({ ...tagged, quality: 'bad' });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_tagged',
      guildId: 'guild_1',
      action: { type: 'set-quality', quality: 'bad' },
    });

    const filtered = queryClient.getQueryData<PaginatedWorlds>(goodFilterKey);
    expect(filtered?.worlds.find((w) => w.worldId === 'wrld_tagged')).toBeUndefined();
    expect(worldFromList(queryClient, 'wrld_tagged')).toMatchObject({ quality: 'bad' });
  });

  it('rolls every cache family back to the snapshot when set-tags fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    const worldWithTags: World = { ...untagged, tags: ['chill'] };
    queryClient.setQueryData(
      ['worlds', { limit: 20, offset: 0 }],
      paginatedWorlds([worldWithTags]),
    );
    vi.mocked(clientApi.setWorldTags).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(clientApi.fetchWorld).mockResolvedValue(worldWithTags);
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        worldId: 'wrld_untagged',
        guildId: 'guild_1',
        action: { type: 'set-tags', tags: ['social'] },
      }),
    ).rejects.toThrow('boom');

    expect(worldFromList(queryClient, 'wrld_untagged')).toMatchObject({ tags: ['chill'] });
  });

  it('set-quality optimistically updates every cached copy of the world', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({
      ...untagged,
      quality: 'good',
      highPriority: false,
    });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_untagged',
      guildId: 'guild_1',
      action: { type: 'set-quality', quality: 'good' },
    });

    expect(clientApi.setWorldQuality).toHaveBeenCalledWith('wrld_untagged', 'guild_1', 'good');
    expect(clientApi.clearWorldHighPriority).not.toHaveBeenCalled();

    expect(worldFromList(queryClient, 'wrld_untagged')).toMatchObject({
      quality: 'good',
      highPriority: false,
    });
    const infinite = queryClient.getQueryData<InfiniteData<PaginatedWorlds>>([
      'worlds-infinite',
      { limit: 20 },
    ]);
    expect(infinite?.pages[0].worlds.find((w) => w.worldId === 'wrld_untagged')).toMatchObject({
      quality: 'good',
    });
    const byIds = queryClient.getQueryData<World[]>(['worlds-by-ids', 'wrld_untagged,wrld_hp']);
    expect(byIds?.find((w) => w.worldId === 'wrld_untagged')).toMatchObject({ quality: 'good' });
    expect(queryClient.getQueryData<World>(['world', 'wrld_hp'])).toEqual(hpOnly);
  });

  it('set-quality on a high-priority world fires the quality PUT and the high-priority DELETE in parallel and clears the flag', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({
      ...hpOnly,
      quality: 'bad',
      highPriority: false,
    });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_hp',
      guildId: 'guild_1',
      action: { type: 'set-quality', quality: 'bad' },
    });

    expect(clientApi.setWorldQuality).toHaveBeenCalledWith('wrld_hp', 'guild_1', 'bad');
    expect(clientApi.clearWorldHighPriority).toHaveBeenCalledWith('wrld_hp', 'guild_1');
    expect(worldFromList(queryClient, 'wrld_hp')).toMatchObject({
      quality: 'bad',
      highPriority: false,
    });
    expect(queryClient.getQueryData<World>(['world', 'wrld_hp'])).toMatchObject({
      quality: 'bad',
      highPriority: false,
    });
  });

  it('set-high-priority flags the world without touching quality', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({ ...untagged, highPriority: true });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_untagged',
      guildId: 'guild_1',
      action: { type: 'set-high-priority' },
    });

    expect(clientApi.setWorldHighPriority).toHaveBeenCalledWith('wrld_untagged', 'guild_1');
    expect(worldFromList(queryClient, 'wrld_untagged')).toMatchObject({
      quality: null,
      highPriority: true,
    });
  });

  it('clear-high-priority removes the flag without touching quality', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({ ...hpOnly, highPriority: false });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_hp',
      guildId: 'guild_1',
      action: { type: 'clear-high-priority' },
    });

    expect(clientApi.clearWorldHighPriority).toHaveBeenCalledWith('wrld_hp', 'guild_1');
    expect(clientApi.setWorldQuality).not.toHaveBeenCalled();
    expect(worldFromList(queryClient, 'wrld_hp')).toMatchObject({
      quality: null,
      highPriority: false,
    });
    const infinite = queryClient.getQueryData<InfiniteData<PaginatedWorlds>>([
      'worlds-infinite',
      { limit: 20 },
    ]);
    expect(infinite?.pages[0].worlds.find((w) => w.worldId === 'wrld_hp')).toMatchObject({
      highPriority: false,
    });
    const byIds = queryClient.getQueryData<World[]>(['worlds-by-ids', 'wrld_untagged,wrld_hp']);
    expect(byIds?.find((w) => w.worldId === 'wrld_hp')).toMatchObject({ highPriority: false });
    expect(queryClient.getQueryData<World>(['world', 'wrld_hp'])).toMatchObject({
      highPriority: false,
    });
  });

  it('clear-quality resets the cached world to untagged', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue({ ...tagged, quality: null, highPriority: false });
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      worldId: 'wrld_tagged',
      guildId: 'guild_1',
      action: { type: 'clear-quality' },
    });

    expect(clientApi.setWorldQuality).toHaveBeenCalledWith('wrld_tagged', 'guild_1', null);
    expect(worldFromList(queryClient, 'wrld_tagged')).toMatchObject({
      quality: null,
      highPriority: false,
    });
  });

  it('rolls every cache family back to the snapshot when the mutation fails', async () => {
    vi.mocked(clientApi.setWorldQuality).mockRejectedValueOnce(new Error('boom'));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedCache(queryClient);
    vi.mocked(clientApi.fetchWorld).mockResolvedValue(untagged);
    const { result } = renderHook(() => useCurationMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        worldId: 'wrld_untagged',
        guildId: 'guild_1',
        action: { type: 'set-quality', quality: 'bad' },
      }),
    ).rejects.toThrow('boom');

    expect(worldFromList(queryClient, 'wrld_untagged')).toMatchObject({
      quality: null,
    });
    const infinite = queryClient.getQueryData<InfiniteData<PaginatedWorlds>>([
      'worlds-infinite',
      { limit: 20 },
    ]);
    expect(infinite?.pages[0].worlds.find((w) => w.worldId === 'wrld_untagged')).toMatchObject({
      quality: null,
    });
    const byIds = queryClient.getQueryData<World[]>(['worlds-by-ids', 'wrld_untagged,wrld_hp']);
    expect(byIds?.find((w) => w.worldId === 'wrld_untagged')).toMatchObject({ quality: null });
  });
});
