import { describe, it, expect } from 'vitest';
import {
  AGENT_DEFAULT_MAX_CAPACITY,
  AGENT_DEFAULT_MIN_CAPACITY,
  AGENT_LARGE_GROUP_CAPACITY,
  agentModelSchema,
  agentRequestSchema,
  buildSystemPrompt,
  sanitizeFilters,
  toWorldsQuery,
} from './agent-schema';
import type { WorldsAgentFilters } from '../src/types';

const catalog = { tags: ['Scary', 'Kino'], flags: ['NSFW'] };

function output(overrides: Partial<Parameters<typeof sanitizeFilters>[0]> = {}) {
  return {
    interpretation: 'test',
    tags: [] as string[],
    excludeFlags: [] as string[],
    platforms: [] as string[],
    minCapacity: 0,
    maxCapacity: 0,
    quality: 'any' as const,
    search: '',
    ...overrides,
  };
}

describe('agentModelSchema', () => {
  it('requires every field', () => {
    expect(agentModelSchema.safeParse({}).success).toBe(false);
    expect(agentModelSchema.safeParse({ interpretation: 'x' }).success).toBe(false);
  });

  it('accepts a complete object', () => {
    const result = agentModelSchema.safeParse(output({ interpretation: 'x' }));
    expect(result.success).toBe(true);
  });
});

describe('agentRequestSchema', () => {
  it('rejects an empty query', () => {
    expect(agentRequestSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('accepts a query with and without history', () => {
    expect(agentRequestSchema.safeParse({ query: 'scary' }).success).toBe(true);
    expect(
      agentRequestSchema.safeParse({
        query: 'scary',
        history: [{ role: 'user', content: 'hi' }],
      }).success,
    ).toBe(true);
  });
});

describe('sanitizeFilters', () => {
  it('matches tags and flags case-insensitively and keeps canonical casing', () => {
    const { filters, unmatchedTags } = sanitizeFilters(
      output({ tags: ['scary', 'KINO'], excludeFlags: ['nsfw'] }),
      catalog,
    );
    expect(filters.tags).toEqual(['Scary', 'Kino']);
    expect(filters.excludeFlags).toEqual(['NSFW']);
    expect(unmatchedTags).toEqual([]);
  });

  it('reports unmatched tags and flags', () => {
    const { unmatchedTags } = sanitizeFilters(
      output({ tags: ['Scary', 'Vibe'], excludeFlags: ['Unknown'] }),
      catalog,
    );
    expect(unmatchedTags).toEqual(['Vibe', 'Unknown']);
  });

  it('dedupes repeated matches', () => {
    const { filters } = sanitizeFilters(output({ tags: ['Scary', 'scary', 'SCARY'] }), catalog);
    expect(filters.tags).toEqual(['Scary']);
  });

  it('maps capacity sentinels to defaults', () => {
    const { filters } = sanitizeFilters(output({ minCapacity: 0, maxCapacity: 0 }), catalog);
    expect(filters.minCapacity).toBe(AGENT_DEFAULT_MIN_CAPACITY);
    expect(filters.maxCapacity).toBe(AGENT_DEFAULT_MAX_CAPACITY);
  });

  it('keeps an explicit minimum and clamps out-of-range values', () => {
    expect(sanitizeFilters(output({ minCapacity: 4 }), catalog).filters.minCapacity).toBe(4);
    const clamped = sanitizeFilters(output({ minCapacity: 4, maxCapacity: 900 }), catalog).filters;
    expect(clamped.maxCapacity).toBe(AGENT_DEFAULT_MAX_CAPACITY);
  });

  it('swaps an inverted capacity range', () => {
    const { filters } = sanitizeFilters(output({ minCapacity: 60, maxCapacity: 20 }), catalog);
    expect(filters.minCapacity).toBe(20);
    expect(filters.maxCapacity).toBe(60);
  });

  it('passes quality through and trims search', () => {
    const { filters } = sanitizeFilters(output({ quality: 'good', search: '  cozy  ' }), catalog);
    expect(filters.quality).toBe('good');
    expect(filters.search).toBe('cozy');
  });

  it('falls back to search-only when the catalog is empty', () => {
    const { filters, unmatchedTags } = sanitizeFilters(
      output({ tags: ['Scary'], excludeFlags: ['NSFW'], platforms: ['PC'] }),
      { tags: [], flags: [] },
    );
    expect(filters.tags).toEqual([]);
    expect(filters.excludeFlags).toEqual([]);
    expect(filters.platforms).toEqual([]);
    expect(unmatchedTags).toEqual(['Scary', 'NSFW']);
  });
});

describe('buildSystemPrompt', () => {
  it('enumerates every catalog tag and flag verbatim', () => {
    const prompt = buildSystemPrompt(catalog);
    expect(prompt).toContain('Scary');
    expect(prompt).toContain('Kino');
    expect(prompt).toContain('NSFW');
    expect(prompt).toContain(String(AGENT_LARGE_GROUP_CAPACITY));
  });
});

describe('toWorldsQuery', () => {
  it('serializes keys in the documented fetchWorlds order', () => {
    const filters: WorldsAgentFilters = {
      tags: ['Scary', 'Kino'],
      excludeFlags: ['NSFW'],
      platforms: ['PC', 'Android'],
      minCapacity: 4,
      maxCapacity: 16,
      quality: 'good',
      search: 'cozy',
    };
    const keys = [...new URLSearchParams(toWorldsQuery(filters, { limit: 20, offset: 0 })).keys()];
    expect(keys).toEqual([
      'limit',
      'offset',
      'search',
      'minCapacity',
      'maxCapacity',
      'tag',
      'tag',
      'quality',
      'platform',
      'platform',
      'exclude',
    ]);
  });
});
