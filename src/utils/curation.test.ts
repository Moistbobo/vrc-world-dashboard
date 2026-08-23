import { describe, expect, it } from 'vitest';
import type { World } from '../types';
import { applyCuration, getCurationState } from './curation';

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
