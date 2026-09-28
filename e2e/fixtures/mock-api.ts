import type { Page, Route } from '@playwright/test';
import { flagsResponse, meResponse, metaResponse, paginate, tagsResponse, worlds } from './worlds-fixtures';
import type { World, WorldsQuery, WorldsQueryCondition, WorldsQueryGroup } from '../src/types';

const CURATOR_TOKEN = 'e2e-curator-token';

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

function filterWorlds(query: URLSearchParams, source: World[]): World[] {
  const search = query.get('search')?.trim().toLowerCase() ?? '';
  const tags = parseList(query.get('tag'));
  const qualities = parseList(query.get('quality')) as ('good' | 'bad')[];
  const qualityMode = query.get('qualityMode');
  const platforms = parseList(query.get('platform'));
  const rawMinCapacity = query.get('minCapacity');
  const rawMaxCapacity = query.get('maxCapacity');
  const minCapacity = rawMinCapacity === null ? NaN : Number(rawMinCapacity);
  const maxCapacity = rawMaxCapacity === null ? NaN : Number(rawMaxCapacity);
  const dayRange = Number(query.get('dayRange'));
  const highPriorityOnly = query.get('highPriority') === 'true';
  const excludes = parseList(query.get('exclude'));

  return source.filter((w) => {
    if (highPriorityOnly && w.highPriority !== true) return false;
    if (excludes.some((e) => w.flags?.includes(e))) return false;
    if (search) {
      const haystack = `${w.name} ${w.authorName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (tags.length && !tags.every((t) => w.tags.includes(t))) return false;
    if (qualities.length && (w.quality === null || !qualities.includes(w.quality))) {
      return false;
    }
    if (qualityMode === 'exclude' && w.quality !== null) return false;
    if (
      platforms.length &&
      !platforms.every((p) => w.platforms.includes(p))
    ) {
      return false;
    }
    if (Number.isFinite(minCapacity) && w.capacity < minCapacity) return false;
    if (Number.isFinite(maxCapacity) && w.capacity > maxCapacity) return false;
    if (Number.isFinite(dayRange) && dayRange > 0) {
      const cutoff = Date.now() - dayRange * 86_400_000;
      if (!w.internalAddDate) return false;
      const added = new Date(w.internalAddDate).getTime();
      if (!Number.isFinite(added) || added < cutoff) return false;
    }
    return true;
  });
}

function condition(
  field: WorldsQueryCondition['field'],
  op: WorldsQueryCondition['op'],
  value: string,
): WorldsQueryCondition {
  return { field, op, value, value2: '', values: [], negate: false };
}

function matchesCondition(world: World, item: WorldsQueryCondition): boolean {
  const flags = world.flags ?? [];
  let matched: boolean;
  if (item.field === 'tag' || item.field === 'flag') {
    const source = item.field === 'tag' ? world.tags : flags;
    if (item.op === 'has') matched = source.includes(item.value);
    else if (item.op === 'hasAny') matched = item.values.some((v) => source.includes(v));
    else if (item.op === 'hasAll') matched = item.values.every((v) => source.includes(v));
    else matched = !source.includes(item.value);
  } else if (item.field === 'capacity') {
    const bound = Number(item.value);
    if (item.op === 'gte') matched = world.capacity >= bound;
    else if (item.op === 'gt') matched = world.capacity > bound;
    else if (item.op === 'lte') matched = world.capacity <= bound;
    else if (item.op === 'lt') matched = world.capacity < bound;
    else if (item.op === 'between') matched = world.capacity >= bound && world.capacity <= Number(item.value2);
    else if (item.op === 'in') matched = item.values.includes(String(world.capacity));
    else matched = world.capacity === bound;
  } else {
    matched = true;
  }
  return item.negate ? !matched : matched;
}

function matchesQuery(world: World, query: WorldsQuery): boolean {
  if (query.groups.length === 0) return true;
  return query.groups.some((group: WorldsQueryGroup) =>
    group.connector === 'or'
      ? group.conditions.some((item) => matchesCondition(world, item))
      : group.conditions.every((item) => matchesCondition(world, item)),
  );
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

/**
 * Install a request interceptor that returns deterministic fixture data for
 * every /api/* endpoint the /worlds page calls. Mirrors the contract of the
 * real backend (`src/api/client.ts` → `fetchWorlds` / `fetchTags` / `fetchMeta`).
 *
 * The pattern deliberately targets root-anchored `/api/...` paths so it does
 * not intercept Vite's `src/api/...` module URLs in dev mode.
 *
 * Mutations (quality / high-priority) mutate a per-page copy of the fixture
 * worlds, so tests see the state they created and never leak it into other
 * tests or spec files. Worlds carry a `guildId` only when the request is
 * authenticated with the harness's curator token, matching the backend.
 */
export async function mockApi(page: Page) {
  const state: World[] = worlds.map((w) => ({ ...w }));
  await page.route(/\/api\/(tags|flags|meta|me|agent|worlds(?:\/[^/]+(?:\/[^/]+)?(?:\/[^/]+)?)?|health)(?:[?#].*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const query = url.searchParams;
    const isCurator = route.request().headers()['authorization'] === `Bearer ${CURATOR_TOKEN}`;
    const forClient = (w: World): World => (isCurator ? { ...w, guildId: 'guild_e2e' } : w);

    if (path === '/api/tags') {
      return json(route, tagsResponse);
    }
    if (path === '/api/flags') {
      return json(route, flagsResponse);
    }
    if (path === '/api/meta') {
      return json(route, metaResponse);
    }
    if (path === '/api/me') {
      return json(route, meResponse);
    }
    if (path === '/api/agent') {
      if (!isCurator) return json(route, { error: 'unauthorized' }, 401);
      const body = (route.request().postDataJSON() ?? {}) as { query?: string };
      const query = (body.query ?? '').trim();
      const text = query.toLowerCase();
      if (!text) return json(route, { error: 'invalid_request' }, 400);
      if (text.includes('error')) return json(route, { error: 'agent_unavailable' }, 502);

      const conditions: WorldsQueryCondition[] = [];
      if (text.includes('chill')) conditions.push(condition('tag', 'has', 'chill'));
      if (text.includes('kino')) conditions.push(condition('tag', 'has', 'kino'));
      if (/(?:^|\D)4(?:\D|$)/.test(text)) conditions.push(condition('capacity', 'gte', '4'));
      const worldsQuery: WorldsQuery = {
        groups: conditions.length > 0 ? [{ connector: 'and', conditions }] : [],
      };
      const unmatchedTags = text.includes('zombie') ? ['zombie'] : [];
      const appliedFilters = conditions.map((item) =>
        item.field === 'tag' ? item.value : `capacity ≥ ${item.value}`,
      );
      const matched = state.filter((w) => matchesQuery(w, worldsQuery)).map(forClient);

      return json(route, {
        interpretation: `Interpreted "${query}"`,
        query: worldsQuery,
        appliedFilters,
        unmatchedTags,
        worlds: matched,
        total: matched.length,
      });
    }
    if (path === '/api/worlds' || path.startsWith('/api/worlds?')) {
      const limit = Number(query.get('limit') ?? 20);
      const offset = Number(query.get('offset') ?? 0);
      const filtered = filterWorlds(query, state).map(forClient);
      return json(route, paginate(filtered, limit, offset));
    }
    const mutationMatch = path.match(/^\/api\/worlds\/([^/]+)\/(quality|high-priority|tags(?:\/edit)?|flags\/edit)$/);
    if (mutationMatch) {
      const target = state.find((w) => w.worldId === mutationMatch[1]);
      if (!target) return json(route, { error: 'not found' }, 404);
      const method = route.request().method();
      if (mutationMatch[2] === 'quality' && method === 'PUT') {
        const { quality } = route.request().postDataJSON() as { quality: 'good' | 'bad' | null };
        target.quality = quality;
        target.highPriority = false;
        return json(route, { updated: true });
      }
      if (mutationMatch[2] === 'high-priority' && method === 'PUT') {
        target.highPriority = true;
        return json(route, { added: true });
      }
      if (mutationMatch[2] === 'high-priority' && method === 'DELETE') {
        target.highPriority = false;
        return json(route, { removed: true });
      }
      if (mutationMatch[2].startsWith('tags') && method === 'PUT') {
        const { tags } = route.request().postDataJSON() as { tags: string[] };
        target.tags = tags;
        return json(route, { updated: true });
      }
      if (mutationMatch[2] === 'flags/edit' && method === 'PUT') {
        const { flags } = route.request().postDataJSON() as { flags: string[] };
        target.flags = flags;
        return json(route, { updated: true });
      }
      return json(route, { error: 'method not allowed' }, 405);
    }
    const worldIdMatch = path.match(/^\/api\/worlds\/([^/]+)$/);
    if (worldIdMatch) {
      const found = state.find((w) => w.worldId === worldIdMatch[1]);
      if (!found) return json(route, { error: 'not found' }, 404);
      return json(route, forClient(found));
    }
    return json(route, { error: 'unhandled' }, 404);
  });
}
