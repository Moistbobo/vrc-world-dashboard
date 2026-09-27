import type { WorldsAgentFilters } from '../src/types';

export interface WorldsQueryOptions {
  limit?: number;
  offset?: number;
}

export function toWorldsQuery(
  filters: WorldsAgentFilters,
  options: WorldsQueryOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  const search = filters.search.trim();
  if (search) params.set('search', search);
  params.set('minCapacity', String(filters.minCapacity));
  params.set('maxCapacity', String(filters.maxCapacity));
  for (const tag of filters.tags) params.append('tag', tag);
  if (filters.quality !== 'any') params.set('quality', filters.quality);
  for (const platform of filters.platforms) params.append('platform', platform);
  for (const flag of filters.excludeFlags) params.append('exclude', flag);
  return params.toString();
}
