import type { WorldsQuery, WorldsSortField } from '../src/types';

export interface WorldsQueryBody {
  query: WorldsQuery;
  sortField?: WorldsSortField;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export function buildWorldsQueryBody(
  query: WorldsQuery,
  options: Pick<WorldsQueryBody, 'sortField' | 'sortDir' | 'limit' | 'offset'> = {},
): WorldsQueryBody {
  const body: WorldsQueryBody = { query };
  if (options.limit !== undefined) body.limit = options.limit;
  if (options.offset !== undefined) body.offset = options.offset;
  if (options.sortField && options.sortField !== 'none') {
    body.sortField = options.sortField;
    if (options.sortDir) body.sortDir = options.sortDir;
  }
  return body;
}

export function toWhereParam(query: WorldsQuery): string {
  const bytes = new TextEncoder().encode(JSON.stringify(query));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
