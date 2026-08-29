import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedWorlds, World } from '../types';

export type CurationQuality = 'good' | 'bad';

export type CurationAction =
  | { type: 'set-quality'; quality: CurationQuality }
  | { type: 'set-tags'; tags: string[] }
  | { type: 'set-high-priority' }
  | { type: 'clear-quality' }
  | { type: 'clear-high-priority' };

export type CurationState =
  | { kind: 'untagged'; quality: null; highPriority: boolean }
  | { kind: 'high-priority'; quality: null; highPriority: boolean }
  | { kind: 'quality-tagged'; quality: CurationQuality; highPriority: boolean };

export function getCurationState(world: World): CurationState {
  if (world.quality) {
    return {
      kind: 'quality-tagged',
      quality: world.quality,
      highPriority: world.highPriority === true,
    };
  }
  if (world.highPriority === true) {
    return { kind: 'high-priority', quality: null, highPriority: true };
  }
  return { kind: 'untagged', quality: null, highPriority: false };
}

export function applyCuration(world: World, action: CurationAction): World {
  switch (action.type) {
    case 'set-quality':
      // Quality dominates: a quality tag supersedes high priority both on the
      // server (the HP row is deleted) and in the cache.
      return { ...world, quality: action.quality, highPriority: false };
    case 'set-high-priority':
      return { ...world, highPriority: true };
    case 'set-tags':
      return { ...world, tags: action.tags };
    case 'clear-quality':
      return { ...world, quality: null, highPriority: false };
    case 'clear-high-priority':
      return { ...world, highPriority: false };
  }
}

interface WorldListFilterParams {
  tag?: string[];
  quality?: ('good' | 'bad')[];
  highPriority?: boolean;
}

export function worldMatchesListParams(world: World, params: unknown): boolean {
  if (typeof params !== 'object' || params === null) return true;
  const filter = params as WorldListFilterParams;
  if (filter.tag?.length && !filter.tag.every((t) => world.tags.includes(t))) return false;
  if (filter.quality?.length && !(world.quality !== null && filter.quality.includes(world.quality)))
    return false;
  if (filter.highPriority === true && world.highPriority !== true) return false;
  return true;
}

export function upsertWorldInPaginated(
  data: PaginatedWorlds,
  world: World,
  params: unknown,
): PaginatedWorlds {
  if (!worldMatchesListParams(world, params)) {
    if (!data.worlds.some((w) => w.worldId === world.worldId)) return data;
    return { ...data, worlds: data.worlds.filter((w) => w.worldId !== world.worldId) };
  }
  const existing = data.worlds.find((w) => w.worldId === world.worldId);
  if (!existing || existing === world) return data;
  return { ...data, worlds: data.worlds.map((w) => (w.worldId === world.worldId ? world : w)) };
}

export function upsertWorldInPages(
  data: InfiniteData<PaginatedWorlds>,
  world: World,
  params: unknown,
): InfiniteData<PaginatedWorlds> {
  return { ...data, pages: data.pages.map((page) => upsertWorldInPaginated(page, world, params)) };
}
