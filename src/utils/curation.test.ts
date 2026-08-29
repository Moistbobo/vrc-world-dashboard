import { describe, expect, it } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedWorlds, World } from '../types';
import {
  applyCuration,
  getCurationState,
  upsertWorldInPaginated,
  upsertWorldInPages,
  worldMatchesListParams,
} from './curation';

function makeWorld(overrides: Partial<World> = {}): World {
  return {
    worldId: 'wrld_test',
    name: 'Test World',
    authorName: 'Tester',
    capacity: 40,
    platforms: ['standalonewindows'],
    tags: [],
    imageUrl: '',
    vrchatUrl: '',
    quality: null,
    createdAt: '2024-01-01',
    ...overrides,
  };
}

function paginatedWorlds(worlds: World[]): PaginatedWorlds {
  return { total: worlds.length, limit: 20, offset: 0, worlds };
}

describe('getCurationState', () => {
  it('returns untagged for a world with no quality and no high priority', () => {
    expect(getCurationState(makeWorld())).toEqual({
      kind: 'untagged',
      quality: null,
      highPriority: false,
    });
  });

  it('returns high-priority for a world flagged high priority without quality', () => {
    expect(getCurationState(makeWorld({ highPriority: true }))).toEqual({
      kind: 'high-priority',
      quality: null,
      highPriority: true,
    });
  });

  it('returns quality-tagged for a good world', () => {
    expect(getCurationState(makeWorld({ quality: 'good' }))).toEqual({
      kind: 'quality-tagged',
      quality: 'good',
      highPriority: false,
    });
  });

  it('returns quality-tagged for a bad world', () => {
    expect(getCurationState(makeWorld({ quality: 'bad' }))).toEqual({
      kind: 'quality-tagged',
      quality: 'bad',
      highPriority: false,
    });
  });

  it('quality dominates when both quality and high priority are set', () => {
    expect(getCurationState(makeWorld({ quality: 'good', highPriority: true }))).toEqual({
      kind: 'quality-tagged',
      quality: 'good',
      highPriority: true,
    });
  });
});

describe('applyCuration', () => {
  it('set-quality tags an untagged world', () => {
    const next = applyCuration(makeWorld(), { type: 'set-quality', quality: 'good' });
    expect(next.quality).toBe('good');
    expect(next.highPriority).toBe(false);
  });

  it('set-quality on a high-priority world clears the high priority flag', () => {
    const next = applyCuration(makeWorld({ highPriority: true }), {
      type: 'set-quality',
      quality: 'bad',
    });
    expect(next.quality).toBe('bad');
    expect(next.highPriority).toBe(false);
  });

  it('set-quality replaces an existing quality tag', () => {
    const next = applyCuration(makeWorld({ quality: 'good' }), {
      type: 'set-quality',
      quality: 'bad',
    });
    expect(next.quality).toBe('bad');
  });

  it('set-high-priority flags an untagged world without touching quality', () => {
    const next = applyCuration(makeWorld(), { type: 'set-high-priority' });
    expect(next.highPriority).toBe(true);
    expect(next.quality).toBeNull();
  });

  it('set-tags replaces the world tags', () => {
    const next = applyCuration(makeWorld({ tags: ['chill'] }), {
      type: 'set-tags',
      tags: ['social', 'dance'],
    });
    expect(next.tags).toEqual(['social', 'dance']);
  });

  it('clear-quality resets a quality-tagged world to untagged', () => {
    const next = applyCuration(makeWorld({ quality: 'good' }), { type: 'clear-quality' });
    expect(next.quality).toBeNull();
    expect(next.highPriority).toBe(false);
  });

  it('clear-quality also resets high priority when both flags are set', () => {
    const next = applyCuration(makeWorld({ quality: 'good', highPriority: true }), {
      type: 'clear-quality',
    });
    expect(next.quality).toBeNull();
    expect(next.highPriority).toBe(false);
  });

  it('preserves all other fields', () => {
    const world = makeWorld({ name: 'Keep Me', capacity: 77 });
    const next = applyCuration(world, { type: 'set-high-priority' });
    expect(next.name).toBe('Keep Me');
    expect(next.capacity).toBe(77);
  });
});

describe('worldMatchesListParams', () => {
  it('returns true when params lack the curation-filter keys', () => {
    const world = makeWorld();
    expect(worldMatchesListParams(world, undefined)).toBe(true);
    expect(worldMatchesListParams(world, null)).toBe(true);
    expect(worldMatchesListParams(world, { limit: 20, offset: 40 })).toBe(true);
  });

  it('ignores search, capacity, platform, and dayRange', () => {
    const world = makeWorld({ capacity: 40, platforms: ['standalonewindows'] });
    expect(
      worldMatchesListParams(world, {
        search: 'test world',
        minCapacity: 10,
        maxCapacity: 50,
        platform: ['standalonewindows'],
        dayRange: 7,
      }),
    ).toBe(true);
  });

  it('requires every requested tag on the world', () => {
    const world = makeWorld({ tags: ['chill', 'social'] });
    expect(worldMatchesListParams(world, { tag: ['chill'] })).toBe(true);
    expect(worldMatchesListParams(world, { tag: ['chill', 'social'] })).toBe(true);
    expect(worldMatchesListParams(world, { tag: ['dance'] })).toBe(false);
    expect(worldMatchesListParams(world, { tag: ['chill', 'dance'] })).toBe(false);
    expect(worldMatchesListParams(world, { tag: [] })).toBe(true);
  });

  it('requires the world quality to be in the requested quality list', () => {
    const good = makeWorld({ quality: 'good' });
    expect(worldMatchesListParams(good, { quality: ['good'] })).toBe(true);
    expect(worldMatchesListParams(good, { quality: ['good', 'bad'] })).toBe(true);
    expect(worldMatchesListParams(good, { quality: ['bad'] })).toBe(false);
    const untagged = makeWorld({ quality: null });
    expect(worldMatchesListParams(untagged, { quality: [] })).toBe(true);
    expect(worldMatchesListParams(untagged, { quality: ['good'] })).toBe(false);
  });

  it('requires the high-priority flag only when the filter requests it', () => {
    const hp = makeWorld({ highPriority: true });
    expect(worldMatchesListParams(hp, { highPriority: true })).toBe(true);
    expect(worldMatchesListParams(hp, { highPriority: false })).toBe(true);
    const notHp = makeWorld();
    expect(worldMatchesListParams(notHp, { highPriority: true })).toBe(false);
    expect(worldMatchesListParams(notHp, { highPriority: false })).toBe(true);
    expect(worldMatchesListParams(notHp, {})).toBe(true);
  });
});

describe('upsertWorldInPaginated', () => {
  it('replaces the matching world entry and keeps other entries and total', () => {
    const kept = makeWorld({ worldId: 'wrld_kept' });
    const stale = makeWorld({ worldId: 'wrld_test', tags: ['old'] });
    const data = paginatedWorlds([kept, stale]);
    const fresh = makeWorld({ worldId: 'wrld_test', tags: ['new', 'fresh'], quality: 'good' });

    const next = upsertWorldInPaginated(data, fresh, { tag: ['new'], quality: ['good'] });

    expect(next.worlds).toEqual([kept, fresh]);
    expect(next.total).toBe(2);
    expect(next.worlds[1]).toBe(fresh);
  });

  it('drops the world when it no longer matches the list params', () => {
    const kept = makeWorld({ worldId: 'wrld_kept' });
    const stale = makeWorld({ worldId: 'wrld_test', quality: 'bad' });
    const data = paginatedWorlds([kept, stale]);
    const fresh = makeWorld({ worldId: 'wrld_test', quality: null });

    const next = upsertWorldInPaginated(data, fresh, { quality: ['bad'] });

    expect(next.worlds).toEqual([kept]);
    expect(next.total).toBe(2);
  });

  it('returns the original data when nothing changed', () => {
    const world = makeWorld();
    const data = paginatedWorlds([world]);

    expect(upsertWorldInPaginated(data, world, {})).toBe(data);
    expect(upsertWorldInPaginated(data, makeWorld({ worldId: 'wrld_other' }), { tag: ['x'] })).toBe(
      data,
    );
  });
});

describe('upsertWorldInPages', () => {
  function infiniteData(pages: PaginatedWorlds[]): InfiniteData<PaginatedWorlds> {
    return { pages, pageParams: pages.map((_, i) => i * 20) };
  }

  it('replaces the world in the page that holds it', () => {
    const first = makeWorld({ worldId: 'wrld_first' });
    const target = makeWorld({ worldId: 'wrld_target', tags: ['old'] });
    const third = makeWorld({ worldId: 'wrld_third' });
    const data = infiniteData([paginatedWorlds([first]), paginatedWorlds([target, third])]);
    const fresh = makeWorld({ worldId: 'wrld_target', tags: ['new'] });

    const next = upsertWorldInPages(data, fresh, {});

    expect(next.pages[0]).toBe(data.pages[0]);
    expect(next.pages[1].worlds).toEqual([fresh, third]);
    expect(next.pageParams).toEqual([0, 20]);
  });

  it('drops the world from every page when it no longer matches the list params', () => {
    const target = makeWorld({ worldId: 'wrld_target', highPriority: true });
    const other = makeWorld({ worldId: 'wrld_other' });
    const data = infiniteData([paginatedWorlds([target]), paginatedWorlds([other, target])]);
    const fresh = makeWorld({ worldId: 'wrld_target', highPriority: false });

    const next = upsertWorldInPages(data, fresh, { highPriority: true });

    expect(next.pages[0].worlds).toEqual([]);
    expect(next.pages[1].worlds).toEqual([other]);
  });
});
