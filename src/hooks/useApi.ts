import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, fetchMeta, fetchTags, fetchWorld, fetchWorlds } from '../api/client';
import type { PaginatedWorlds } from '../types';
import { useApiInfiniteQuery, useApiQuery } from './useApiToasts';
import { getStoredApiToken } from '../utils/tokenStorage';

export function useMe(options?: { suppressErrorToast?: boolean }) {
  const identityRequested = useQuery<boolean>({
    queryKey: ['identity', 'requested'],
    queryFn: () => false,
    enabled: false,
    initialData: () => Boolean(getStoredApiToken()),
  });

  return useApiQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    enabled: identityRequested.data === true,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    suppressErrorToast: options?.suppressErrorToast ?? true,
  });
}

export function useTags(options?: { suppressErrorToast?: boolean }) {
  return useApiQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    staleTime: 60_000,
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export function useMeta(options?: { suppressErrorToast?: boolean }) {
  return useApiQuery({
    queryKey: ['meta'],
    queryFn: fetchMeta,
    staleTime: 60_000,
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export function useWorlds(
  params?: {
    limit?: number;
    offset?: number;
    tag?: string[];
    quality?: ('good' | 'bad')[];
    highPriority?: boolean;
    search?: string;
    minCapacity?: number;
    maxCapacity?: number;
    platform?: string[];
    dayRange?: number;
    enabled?: boolean;
  },
  options?: { suppressErrorToast?: boolean },
) {
  return useApiQuery({
    queryKey: ['worlds', params],
    queryFn: () => fetchWorlds(params),
    enabled: params?.enabled,
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export function useInfiniteWorlds(
  params?: {
    limit?: number;
    tag?: string[];
    quality?: ('good' | 'bad')[];
    highPriority?: boolean;
    search?: string;
    minCapacity?: number;
    maxCapacity?: number;
    platform?: string[];
    dayRange?: number;
    enabled?: boolean;
  },
  options?: { suppressErrorToast?: boolean },
) {
  const limit = params?.limit ?? 20;
  return useApiInfiniteQuery({
    queryKey: ['worlds-infinite', { ...params, limit }],
    queryFn: ({ pageParam }) =>
      fetchWorlds({
        ...params,
        limit,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: params?.enabled,
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export function useWorld(
  worldId: string | undefined,
  options?: { suppressErrorToast?: boolean },
) {
  const queryClient = useQueryClient();
  return useApiQuery({
    queryKey: ['world', worldId],
    queryFn: () => {
      if (!worldId) throw new Error('No worldId provided');
      return fetchWorld(worldId);
    },
    enabled: !!worldId,
    suppressErrorToast: options?.suppressErrorToast,
    placeholderData: () => {
      if (!worldId) return undefined;

      const paginatedQueries = queryClient.getQueriesData<PaginatedWorlds>({
        queryKey: ['worlds'],
      });
      const fromPaginated = paginatedQueries
        .flatMap(([, data]) => data?.worlds ?? [])
        .find((w) => w.worldId === worldId);
      if (fromPaginated) return fromPaginated;

      const infiniteQueries = queryClient.getQueriesData<{ pages: PaginatedWorlds[] }>({
        queryKey: ['worlds-infinite'],
      });
      const fromInfinite = infiniteQueries
        .flatMap(([, data]) => data?.pages.flatMap((page) => page.worlds) ?? [])
        .find((w) => w.worldId === worldId);

      return fromInfinite;
    },
  });
}
