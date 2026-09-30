import { useMemo } from 'react';
import { useApiQuery } from './useApiToasts';
import { fetchWorldsByIds } from '../api/client';
import type { World } from '../types';

interface WorldQueryResult {
  worldId: string;
  data: World | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useWorldsByIds(worldIds: string[]) {
  const uniqueIds = useMemo(() => worldIds.filter(Boolean), [worldIds]);
  const idKey = uniqueIds.join(',');

  const {
    data: fetchedWorlds,
    isPending,
    isError,
    error,
    refetch,
  } = useApiQuery({
    queryKey: ['worlds-by-ids', idKey],
    queryFn: () => fetchWorldsByIds(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: (previousData) => previousData,
  });

  const worldById = useMemo(() => {
    const map = new Map<string, World>();
    if (fetchedWorlds) {
      for (const world of fetchedWorlds) {
        map.set(world.worldId, world);
      }
    }
    return map;
  }, [fetchedWorlds]);

  const worlds: WorldQueryResult[] = useMemo(
    () =>
      uniqueIds.map((worldId) => ({
        worldId,
        data: worldById.get(worldId),
        isPending,
        isError,
        error: error ?? null,
      })),
    [uniqueIds, worldById, isPending, isError, error],
  );

  return {
    worlds,
    isPending,
    isError,
    refetch,
  };
}
