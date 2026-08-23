import type { Page, Route } from '@playwright/test';
import { meResponse, metaResponse, paginate, tagsResponse, worlds } from './worlds-fixtures';
import type { World } from '../src/types';

const CURATOR_TOKEN = 'e2e-curator-token';

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

function filterWorlds(query: URLSearchParams, source: World[]): World[] {
  const search = query.get('search')?.trim().toLowerCase() ?? '';
  const tags = parseList(query.get('tag'));
  const qualities = parseList(query.get('quality')) as ('good' | 'bad')[];
  const platforms = parseList(query.get('platform'));
  const rawMinCapacity = query.get('minCapacity');
  const rawMaxCapacity = query.get('maxCapacity');
  const minCapacity = rawMinCapacity === null ? NaN : Number(rawMinCapacity);
  const maxCapacity = rawMaxCapacity === null ? NaN : Number(rawMaxCapacity);
  const dayRange = Number(query.get('dayRange'));
  const highPriorityOnly = query.get('highPriority') === 'true';

  return source.filter((w) => {
    if (highPriorityOnly && w.highPriority !== true) return false;
    if (search) {
      const haystack = `${w.name} ${w.authorName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (tags.length && !tags.every((t) => w.tags.includes(t))) return false;
    if (qualities.length && (w.quality === null || !qualities.includes(w.quality))) {
      return false;
    }
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
  await page.route(/\/api\/(tags|meta|me|worlds(?:\/[^/]+(?:\/[^/]+)?(?:\/[^/]+)?)?|health)(?:[?#].*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const query = url.searchParams;
    const isCurator = route.request().headers()['authorization'] === `Bearer ${CURATOR_TOKEN}`;
    const forClient = (w: World): World => (isCurator ? { ...w, guildId: 'guild_e2e' } : w);

    if (path === '/api/tags') {
      return json(route, tagsResponse);
    }
    if (path === '/api/meta') {
      return json(route, metaResponse);
    }
    if (path === '/api/me') {
      return json(route, meResponse);
    }
    if (path === '/api/worlds' || path.startsWith('/api/worlds?')) {
      const limit = Number(query.get('limit') ?? 20);
      const offset = Number(query.get('offset') ?? 0);
      const filtered = filterWorlds(query, state).map(forClient);
      return json(route, paginate(filtered, limit, offset));
    }
    const mutationMatch = path.match(/^\/api\/worlds\/([^/]+)\/(quality|high-priority|tags(?:\/edit)?)$/);
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
