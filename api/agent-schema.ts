import { z } from 'zod';
import type { WorldsAgentFilters } from '../src/types';
export { toWorldsQuery } from './agent-query';

export const AGENT_DEFAULT_MIN_CAPACITY = 1;
export const AGENT_DEFAULT_MAX_CAPACITY = 80;
export const AGENT_LARGE_GROUP_CAPACITY = 16;
export const AGENT_PAGE_LIMIT = 20;
export const AGENT_MODEL_DEFAULT = 'gemini-3.5-flash';

export const agentModelSchema = z.object({
  interpretation: z.string(),
  tags: z.array(z.string()),
  excludeFlags: z.array(z.string()),
  platforms: z.array(z.string()),
  minCapacity: z.number().int(),
  maxCapacity: z.number().int(),
  quality: z.enum(['good', 'bad', 'any']),
  search: z.string(),
});

export type AgentModelOutput = z.infer<typeof agentModelSchema>;

export const agentRequestSchema = z.object({
  query: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional(),
});

export interface AgentCatalog {
  tags: string[];
  flags: string[];
}

export function buildSystemPrompt(catalog: AgentCatalog): string {
  const tags = catalog.tags.length > 0 ? catalog.tags.join(', ') : '(none available)';
  const flags = catalog.flags.length > 0 ? catalog.flags.join(', ') : '(none available)';
  return [
    "You translate a curator's plain-language request for VRChat worlds into search filters.",
    'Return every field; never omit or rename a field.',
    `Available tags: ${tags}`,
    `Available flags: ${flags}`,
    'Choose tags and flags only from the lists above, copied exactly as written. Never invent a tag or flag.',
    'If a vibe does not match a listed tag, leave tags empty. The caller reports the gap.',
    "capacity is a world's MAX player count. \"for 4 people\" means minCapacity 4. \"large group\" means minCapacity " +
      `${AGENT_LARGE_GROUP_CAPACITY}.`,
    'minCapacity 0 means no lower bound. maxCapacity 0 means no upper bound.',
    'quality is "good" for good or recommended worlds, "bad" for bad worlds, otherwise "any".',
    'search holds an author name or world title, and only when the curator names one. Otherwise "".',
    'platforms lists platform values the curator names, using exactly one of "standalonewindows" ' +
      '(PC or desktop), "android", or "ios". Otherwise []. Never use any other value.',
    'excludeFlags lists only flags the curator wants excluded.',
    'If the request is off-topic or gibberish, return empty tags, empty excludeFlags, empty platforms, ' +
      'quality "any", search "", minCapacity 0, and maxCapacity 0.',
  ].join('\n');
}

function matchCatalog(
  values: string[],
  lookup: Map<string, string>,
  seen: Set<string>,
  unmatched: string[],
): string[] {
  const matched: string[] = [];
  for (const raw of values) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const canonical = lookup.get(key);
    if (!canonical) {
      unmatched.push(raw.trim());
      continue;
    }
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    matched.push(canonical);
  }
  return matched;
}

function clampCapacity(value: number): number {
  return Math.min(AGENT_DEFAULT_MAX_CAPACITY, Math.max(AGENT_DEFAULT_MIN_CAPACITY, value));
}

export function sanitizeFilters(
  output: AgentModelOutput,
  catalog: AgentCatalog,
): { filters: WorldsAgentFilters; unmatchedTags: string[] } {
  const unmatchedTags: string[] = [];
  const tagLookup = new Map(catalog.tags.map((tag) => [tag.toLowerCase(), tag]));
  const flagLookup = new Map(catalog.flags.map((flag) => [flag.toLowerCase(), flag]));

  const tags = matchCatalog(output.tags, tagLookup, new Set(), unmatchedTags);
  const excludeFlags = matchCatalog(output.excludeFlags, flagLookup, new Set(), unmatchedTags);

  const catalogEmpty = catalog.tags.length === 0 && catalog.flags.length === 0;
  const platforms: string[] = [];
  if (!catalogEmpty) {
    const seenPlatforms = new Set<string>();
    for (const raw of output.platforms) {
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seenPlatforms.has(key)) continue;
      seenPlatforms.add(key);
      platforms.push(value);
    }
  }

  let minCapacity = output.minCapacity <= 0 ? AGENT_DEFAULT_MIN_CAPACITY : output.minCapacity;
  let maxCapacity = output.maxCapacity <= 0 ? AGENT_DEFAULT_MAX_CAPACITY : output.maxCapacity;
  minCapacity = clampCapacity(minCapacity);
  maxCapacity = clampCapacity(maxCapacity);
  if (minCapacity > maxCapacity) {
    [minCapacity, maxCapacity] = [maxCapacity, minCapacity];
  }

  return {
    filters: {
      tags,
      excludeFlags,
      platforms,
      minCapacity,
      maxCapacity,
      quality: output.quality,
      search: output.search.trim(),
    },
    unmatchedTags,
  };
}
