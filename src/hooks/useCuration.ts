import { useRef } from 'react';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import {
  clearWorldHighPriority,
  fetchWorld,
  setWorldHighPriority,
  setWorldQuality,
  setWorldTags,
} from '../api/client';
import type { PaginatedWorlds, World } from '../types';
import {
  applyCuration,
  getCurationState,
  upsertWorldInPaginated,
  upsertWorldInPages,
  type CurationAction,
} from '../utils/curation';
import { useApiMutation } from './useApiToasts';

export interface CurationVariables {
  worldId: string;
  guildId?: string;
  action: CurationAction;
}

interface CurationSnapshot {
  worlds: [readonly unknown[], PaginatedWorlds | undefined][];
  worldsInfinite: [readonly unknown[], InfiniteData<PaginatedWorlds> | undefined][];
  world: World | undefined;
  worldsByIds: [readonly unknown[], World[] | undefined][];
}

function findCachedWorld(queryClient: QueryClient, worldId: string): World | undefined {
  for (const [, data] of queryClient.getQueriesData<PaginatedWorlds>({
    queryKey: ['worlds'],
  })) {
    const found = data?.worlds.find((w) => w.worldId === worldId);
    if (found) return found;
  }
  for (const [, data] of queryClient.getQueriesData<InfiniteData<PaginatedWorlds>>({
    queryKey: ['worlds-infinite'],
  })) {
    const found = data?.pages.flatMap((page) => page.worlds).find((w) => w.worldId === worldId);
    if (found) return found;
  }
  const single = queryClient.getQueryData<World>(['world', worldId]);
  if (single) return single;
  for (const [, data] of queryClient.getQueriesData<World[]>({
    queryKey: ['worlds-by-ids'],
  })) {
    const found = data?.find((w) => w.worldId === worldId);
    if (found) return found;
  }
  return undefined;
}

export function useCurationMutation() {
  const queryClient = useQueryClient();
  // Set by onMutate (which always runs before mutationFn) from the
  // pre-mutation cache; single-flight is guaranteed by disabled buttons.
  const clearHighPriorityRef = useRef(false);

  return useApiMutation({
    mutationFn: async ({ worldId, guildId, action }: CurationVariables) => {
      if (action.type === 'set-quality') {
        if (clearHighPriorityRef.current) {
          await Promise.all([
            setWorldQuality(worldId, guildId, action.quality),
            clearWorldHighPriority(worldId, guildId),
          ]);
        } else {
          await setWorldQuality(worldId, guildId, action.quality);
        }
        return;
      }
      if (action.type === 'set-high-priority') {
        await setWorldHighPriority(worldId, guildId);
        return;
      }
      if (action.type === 'clear-high-priority') {
        await clearWorldHighPriority(worldId, guildId);
        return;
      }
      if (action.type === 'set-tags') {
        await setWorldTags(worldId, guildId, action.tags);
        return;
      }
      await setWorldQuality(worldId, guildId, null);
    },
    onMutate: async ({ worldId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['worlds'] });
      await queryClient.cancelQueries({ queryKey: ['worlds-infinite'] });
      await queryClient.cancelQueries({ queryKey: ['world', worldId] });
      await queryClient.cancelQueries({ queryKey: ['worlds-by-ids'] });

      const snapshot: CurationSnapshot = {
        worlds: queryClient.getQueriesData<PaginatedWorlds>({ queryKey: ['worlds'] }),
        worldsInfinite: queryClient.getQueriesData<InfiniteData<PaginatedWorlds>>({
          queryKey: ['worlds-infinite'],
        }),
        world: queryClient.getQueryData<World>(['world', worldId]),
        worldsByIds: queryClient.getQueriesData<World[]>({ queryKey: ['worlds-by-ids'] }),
      };

      const cached = findCachedWorld(queryClient, worldId);
      clearHighPriorityRef.current =
        action.type === 'set-quality' &&
        cached !== undefined &&
        getCurationState(cached).kind === 'high-priority';

      for (const [key, data] of snapshot.worlds) {
        if (!data) continue;
        queryClient.setQueryData<PaginatedWorlds>(key, {
          ...data,
          worlds: data.worlds.map((w) =>
            w.worldId === worldId ? applyCuration(w, action) : w,
          ),
        });
      }
      for (const [key, data] of snapshot.worldsInfinite) {
        if (!data) continue;
        queryClient.setQueryData<InfiniteData<PaginatedWorlds>>(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            worlds: page.worlds.map((w) =>
              w.worldId === worldId ? applyCuration(w, action) : w,
            ),
          })),
        });
      }
      if (snapshot.world) {
        queryClient.setQueryData<World>(['world', worldId], applyCuration(snapshot.world, action));
      }
      for (const [key, data] of snapshot.worldsByIds) {
        if (!data) continue;
        queryClient.setQueryData<World[]>(
          key,
          data.map((w) => (w.worldId === worldId ? applyCuration(w, action) : w)),
        );
      }

      return { snapshot };
    },
    onError: (_err, { worldId }, context) => {
      if (!context) return;
      for (const [key, data] of context.snapshot.worlds) {
        if (data) queryClient.setQueryData<PaginatedWorlds>(key, data);
      }
      for (const [key, data] of context.snapshot.worldsInfinite) {
        if (data) queryClient.setQueryData<InfiniteData<PaginatedWorlds>>(key, data);
      }
      if (context.snapshot.world) {
        queryClient.setQueryData<World>(['world', worldId], context.snapshot.world);
      }
      for (const [key, data] of context.snapshot.worldsByIds) {
        if (data) queryClient.setQueryData<World[]>(key, data);
      }
    },
    onSettled: async (_data, _error, { worldId }) => {
      try {
        const world = await queryClient.fetchQuery<World>({
          queryKey: ['world', worldId],
          queryFn: () => fetchWorld(worldId),
        });
        for (const [key, data] of queryClient.getQueriesData<PaginatedWorlds>({
          queryKey: ['worlds'],
        })) {
          if (!data) continue;
          queryClient.setQueryData(key, upsertWorldInPaginated(data, world, key[1]));
        }
        for (const [key, data] of queryClient.getQueriesData<InfiniteData<PaginatedWorlds>>({
          queryKey: ['worlds-infinite'],
        })) {
          if (!data) continue;
          queryClient.setQueryData(key, upsertWorldInPages(data, world, key[1]));
        }
        for (const [key, data] of queryClient.getQueriesData<World[]>({
          queryKey: ['worlds-by-ids'],
        })) {
          if (!data) continue;
          queryClient.setQueryData<World[]>(
            key,
            data.map((w) => (w.worldId === world.worldId ? world : w)),
          );
        }
      } catch {
        queryClient.invalidateQueries({ queryKey: ['world', worldId] });
      }
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
