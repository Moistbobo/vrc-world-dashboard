import { useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import {
  fetchComments,
  fetchRatings,
  fetchRatingsForWorldIds,
  fetchRecentActivity,
  submitComment,
  submitRating,
  updateRating,
  deleteRating,
} from '../api/sentiment';
import type { FetchCommentsResult } from '../api/sentiment';
import {
  isFinalFailure,
  useApiInfiniteQuery,
  useApiMutation,
  useApiQuery,
  useFinalErrorToast,
} from './useApiToasts';
import { useWorldsByIds } from './useWorldsByIds';
import { useCurrentUserId } from './useCurrentUser';
import { generateUsername } from '../utils/username';
import type { Comment, RatingSummary, World, RecentActivityItem, RecentActivityRow } from '../types';

export function useRatings(worldId: string | undefined) {
  return useApiQuery<RatingSummary>({
    queryKey: ['ratings', worldId],
    queryFn: () => fetchRatings(worldId!),
    enabled: !!worldId,
  });
}

export const RATINGS_BATCH_SIZE = 20;

export interface RatingsChunk {
  ids: string[];
  key: string;
}

export function chunkRatingsWorldIds(worldIds: readonly string[]): RatingsChunk[] {
  const uniqueIds = Array.from(new Set(worldIds));
  const chunks: RatingsChunk[] = [];
  for (let i = 0; i < uniqueIds.length; i += RATINGS_BATCH_SIZE) {
    const ids = uniqueIds.slice(i, i + RATINGS_BATCH_SIZE);
    const sorted = Array.from(ids).sort();
    chunks.push({ ids: sorted, key: sorted.join('|') });
  }
  return chunks;
}

export interface RatingsBatchResult {
  data: Map<string, RatingSummary> | undefined;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
}

export function useRatingsForWorldIds(worldIds: readonly string[]): RatingsBatchResult {
  const chunks = chunkRatingsWorldIds(worldIds);

  const queries = useQueries({
    queries: chunks.map(({ ids, key }) => ({
      queryKey: ['ratings-chunk', key],
      queryFn: () => fetchRatingsForWorldIds(ids),
      staleTime: 60_000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    })),
  });

  const isPending = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const isFetching = queries.some((query) => query.isFetching);

  const data =
    chunks.length === 0
      ? undefined
      : chunks.reduce<Map<string, RatingSummary>>((merged, _chunk, index) => {
          const chunkData = queries[index]?.data;
          if (chunkData) {
            for (const [worldId, summary] of chunkData) {
              merged.set(worldId, summary);
            }
          }
          return merged;
        }, new Map());

  const isSuccess = chunks.length > 0 && !isPending && !isError;

  const error = queries.find((query) => query.isError)?.error ?? null;
  const hasFinalFailure = queries.some(
    (query) => query.isError && isFinalFailure(query.isError, query.failureCount, undefined),
  );
  useFinalErrorToast(error, true, hasFinalFailure, 'Request failed');

  return { data, isPending, isError, isSuccess, isFetching };
}

const COMMENTS_PAGE_SIZE = 20;

interface CommentsPageParam {
  offset: number;
  limit: number;
}

export function useInfiniteComments(worldId: string | undefined) {
  return useApiInfiniteQuery<FetchCommentsResult, Error, InfiniteData<FetchCommentsResult, CommentsPageParam>, (string | undefined)[], CommentsPageParam>({
    queryKey: ['comments', worldId],
    queryFn: ({ pageParam }) => fetchComments(worldId!, pageParam),
    initialPageParam: { offset: 0, limit: COMMENTS_PAGE_SIZE },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.comments.length, 0);
      if (lastPage.total <= loadedCount) return undefined;
      return { offset: loadedCount, limit: COMMENTS_PAGE_SIZE };
    },
    enabled: !!worldId,
  });
}

type RatingMutationVariables = {
  worldId: string;
  value?: 'good' | 'bad';
  captchaToken?: string;
};

function useRatingMutation<TVariables extends RatingMutationVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  computeNext: (previous: RatingSummary, variables: TVariables) => RatingSummary | undefined,
) {
  const queryClient = useQueryClient();

  return useApiMutation({
    mutationFn,
    suppressErrorToast: true,
    onMutate: async (variables) => {
      const queryKey = ['ratings', variables.worldId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RatingSummary>(queryKey);

      if (previous) {
        const next = computeNext(previous, variables);
        if (next) {
          queryClient.setQueryData(queryKey, next);
        }
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['ratings', variables.worldId], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', variables.worldId] });
    },
  });
}

export function useSubmitRating() {
  return useRatingMutation(
    ({ worldId, value, captchaToken }) => submitRating(worldId, value!, captchaToken),
    (previous, { value }) => {
      if (!value) return undefined;
      const next: RatingSummary = { ...previous };
      if (previous.userRating && previous.userRating !== value) {
        next[previous.userRating] = Math.max(0, next[previous.userRating] - 1);
        next[value]++;
      } else if (!previous.userRating) {
        next[value]++;
      } else {
        return undefined;
      }
      next.userRating = value;
      return next;
    },
  );
}

export function useUpdateRating() {
  return useRatingMutation(
    ({ worldId, value, captchaToken }) => updateRating(worldId, value!, captchaToken),
    (previous, { value }) => {
      if (!value || !previous.userRating || previous.userRating === value) {
        return undefined;
      }
      return {
        ...previous,
        good: value === 'good' ? previous.good + 1 : Math.max(0, previous.good - 1),
        bad: value === 'bad' ? previous.bad + 1 : Math.max(0, previous.bad - 1),
        userRating: value,
      };
    },
  );
}

export function useDeleteRating() {
  return useRatingMutation(
    ({ worldId, captchaToken }) => deleteRating(worldId, captchaToken),
    (previous) => {
      if (!previous.userRating) return undefined;
      return {
        ...previous,
        good: previous.userRating === 'good' ? Math.max(0, previous.good - 1) : previous.good,
        bad: previous.userRating === 'bad' ? Math.max(0, previous.bad - 1) : previous.bad,
        userRating: null,
      };
    },
  );
}

export function useSubmitComment() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  return useApiMutation({
    mutationFn: ({ worldId, content, captchaToken }: {
      worldId: string;
      content: string;
      captchaToken?: string;
    }) => submitComment(worldId, content, captchaToken),
    suppressErrorToast: true,
    onMutate: async ({ worldId, content }) => {
      const queryKey = ['comments', worldId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<FetchCommentsResult, CommentsPageParam>>(queryKey);

      const optimistic: Comment = {
        id: `optimistic-${Date.now()}`,
        world_id: worldId,
        user_id: currentUserId ?? '',
        username: generateUsername(),
        content,
        created_at: new Date().toISOString(),
      };

      if (previous) {
        const next: InfiniteData<FetchCommentsResult, CommentsPageParam> = {
          ...previous,
          pages: previous.pages.map((page, index) =>
            index === 0
              ? { ...page, comments: [optimistic, ...page.comments], total: page.total + 1 }
              : { ...page, total: page.total + 1 },
          ),
        };
        queryClient.setQueryData<InfiniteData<FetchCommentsResult, CommentsPageParam>>(queryKey, next);
      }

      return { previous };
    },
    onError: (_err, { worldId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comments', worldId], context.previous);
      }
    },
    onSettled: (_, __, { worldId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', worldId] });
    },
  });
}

export interface RecentActivityResult {
  rows: RecentActivityRow[];
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useRecentActivity(enabled: boolean): RecentActivityResult {
  const queryClient = useQueryClient();
  const query = useApiQuery<RecentActivityItem[]>({
    queryKey: ['recent-activity'],
    queryFn: fetchRecentActivity,
    enabled,
    retry: 1,
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const items = query.data;

  const worldIds = useMemo(
    () => Array.from(new Set((items ?? []).map((item) => item.worldId))),
    [items],
  );

  const {
    worlds: worldResults,
    isPending: worldsPending,
    isError: worldsError,
  } = useWorldsByIds(enabled ? worldIds : []);

  const worldById = useMemo(() => {
    const map = new Map<string, World>();
    for (const result of worldResults) {
      if (result.data) map.set(result.worldId, result.data);
    }
    return map;
  }, [worldResults]);

  const rows = useMemo(() => {
    if (!enabled || !items) return [];
    return items
      .filter((item) => worldById.has(item.worldId))
      .map((item) => ({ ...item, worldName: worldById.get(item.worldId)!.name }));
  }, [enabled, items, worldById]);

  const needsWorlds = worldIds.length > 0;
  const isPending = enabled && (query.isPending || (needsWorlds && worldsPending));
  const isError = enabled && (query.isError || (needsWorlds && worldsError));

  return {
    rows,
    isPending,
    isError,
    error: query.error ?? null,
    refetch: () => {
      void queryClient.invalidateQueries({ queryKey: ['worlds-by-ids'] });
      void query.refetch();
    },
  };
}
