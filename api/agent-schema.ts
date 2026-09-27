import { z } from 'zod';
import type {
  WorldsQuery,
  WorldsQueryCondition,
  WorldsQueryField,
  WorldsQueryGroup,
  WorldsQueryOp,
  WorldsSortField,
} from '../src/types';

export const AGENT_DEFAULT_MIN_CAPACITY = 1;
export const AGENT_DEFAULT_MAX_CAPACITY = 80;
export const AGENT_LARGE_GROUP_CAPACITY = 16;
export const AGENT_PAGE_LIMIT = 20;
export const AGENT_MODEL_DEFAULT = 'gemini-3.5-flash';

export const AGENT_QUERY_MAX_GROUPS = 8;
export const AGENT_QUERY_MAX_CONDITIONS_PER_GROUP = 8;
export const AGENT_QUERY_MAX_TOTAL_CONDITIONS = 64;
export const AGENT_QUERY_MAX_VALUES = 20;
export const AGENT_QUERY_MAX_VALUE_LENGTH = 200;

export const WORLDS_SORT_FIELDS: readonly WorldsSortField[] = [
  'none',
  'addedAt',
  'createdAt',
  'updatedAt',
  'capacity',
  'name',
];

export const AGENT_SCRIPT_VALUES = [
  'latin',
  'cjk',
  'hiragana',
  'katakana',
  'hangul',
  'cyrillic',
  'greek',
  'arabic',
  'hebrew',
  'thai',
  'devanagari',
] as const;

export const WORLDS_QUERY_OPS: Record<WorldsQueryField, readonly WorldsQueryOp[]> = {
  name: ['eq', 'ne', 'in', 'contains', 'prefix', 'not_contains', 'script'],
  author: ['eq', 'ne', 'in', 'contains', 'prefix', 'not_contains', 'script'],
  worldId: ['eq', 'ne', 'in', 'contains', 'prefix', 'not_contains', 'script'],
  source: ['eq', 'ne', 'in', 'contains', 'prefix', 'not_contains', 'script'],
  capacity: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'in'],
  addedAt: ['before', 'after', 'between'],
  createdAt: ['before', 'after', 'between'],
  updatedAt: ['before', 'after', 'between'],
  platform: ['has', 'hasAny', 'hasAll', 'not_has'],
  tag: ['has', 'hasAny', 'hasAll', 'not_has'],
  flag: ['has', 'hasAny', 'hasAll', 'not_has'],
  quality: ['eq', 'ne', 'isNull'],
  highPriority: ['eq'],
};

const conditionSchema = z.object({
  field: z.string(),
  op: z.string(),
  value: z.string(),
  value2: z.string(),
  values: z.array(z.string()),
  negate: z.boolean(),
});

const groupSchema = z.object({
  connector: z.enum(['and', 'or']),
  conditions: z.array(conditionSchema),
});

export const agentModelSchema = z.object({
  interpretation: z.string(),
  groups: z.array(groupSchema),
  sortField: z.enum(['none', 'addedAt', 'createdAt', 'updatedAt', 'capacity', 'name']),
  sortDir: z.enum(['asc', 'desc']),
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

export interface SanitizedQuery {
  query: WorldsQuery;
  appliedFilters: string[];
  unmatchedTags: string[];
  droppedAll: boolean;
}

const FIELD_LABELS: Record<WorldsQueryField, string> = {
  name: 'name',
  author: 'author',
  worldId: 'world id',
  source: 'source',
  capacity: 'capacity',
  addedAt: 'added',
  createdAt: 'created',
  updatedAt: 'updated',
  platform: 'platform',
  tag: 'tag',
  flag: 'flag',
  quality: 'quality',
  highPriority: 'high priority',
};

export function buildSystemPrompt(catalog: AgentCatalog): string {
  const tags = catalog.tags.length > 0 ? catalog.tags.join(', ') : '(none available)';
  const flags = catalog.flags.length > 0 ? catalog.flags.join(', ') : '(none available)';
  return [
    "You translate a curator's plain-language request for VRChat worlds into a boolean query.",
    'Return every field; never omit or rename a field.',
    'The query is a disjunction (OR) of groups; each group is a conjunction (AND) of conditions.',
    'Express "A and (B or C)" by distributing: two groups, each with A plus one of B or C.',
    `Available tags: ${tags}`,
    `Available flags: ${flags}`,
    'Choose tag and flag values only from the lists above, copied exactly as written. Never invent a tag or flag.',
    'Fields and their allowed operators:',
    '- name, author, worldId, source: eq, ne, in, contains, prefix, not_contains, script',
    '- capacity: eq, ne, gt, gte, lt, lte, between, in',
    '- addedAt, createdAt, updatedAt: before, after, between',
    '- platform, tag, flag: has, hasAny, hasAll, not_has',
    '- quality: eq, ne, isNull',
    '- highPriority: eq',
    `script values are limited to: ${AGENT_SCRIPT_VALUES.join(', ')}. Use script for a writing-system check on a text field.`,
    "capacity is a world's MAX player count and is bounded to " +
      `${AGENT_DEFAULT_MIN_CAPACITY} to ${AGENT_DEFAULT_MAX_CAPACITY}. "for 4 people" means a capacity gte 4. ` +
      `"large group" means capacity gte ${AGENT_LARGE_GROUP_CAPACITY}.`,
    'Dates use ISO 8601 (YYYY-MM-DD).',
    'Put the text or single value in value for eq, ne, contains, prefix, not_contains, script, has, not_has, ' +
      'gt, gte, lt, lte, before, and after.',
    'For between, put the lower bound in value and the upper bound in value2.',
    'For in, hasAny, and hasAll, put every value in values; leave value and value2 as "".',
    'Set negate true to exclude a condition\'s matches; otherwise false.',
    'Use quality eq "good" or "bad", or isNull for worlds with no quality rating.',
    'Use highPriority eq "true" for high-priority worlds.',
    'Leave value, value2, and values empty on a condition that does not use them. Leave unused arrays as [].',
    'If the request is off-topic or gibberish, return empty groups.',
    `sortField chooses the result order from ${WORLDS_SORT_FIELDS.join(', ')}. sortDir is asc or desc. ` +
      'Use none when the curator does not ask for an order.',
  ].join('\n');
}

function lookupSet(values: string[]): Map<string, string> {
  return new Map(values.map((value) => [value.toLowerCase(), value]));
}

function clampCapacity(value: number): number {
  return Math.min(AGENT_DEFAULT_MAX_CAPACITY, Math.max(AGENT_DEFAULT_MIN_CAPACITY, Math.round(value)));
}

function matchCatalogValue(
  raw: string,
  lookup: Map<string, string>,
  unmatched: Set<string>,
): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const canonical = lookup.get(key);
  if (!canonical) {
    unmatched.add(raw.trim());
    return null;
  }
  return canonical;
}

function sanitizeBetween(
  field: WorldsQueryField,
  value: string,
  value2: string,
  unavailable: string[],
): boolean {
  if (field === 'capacity') {
    const low = Number(value);
    const high = Number(value2);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
    if (clampCapacity(low) > clampCapacity(high)) {
      unavailable.push(`${FIELD_LABELS[field]} ${value}–${value2} (unavailable)`);
      return false;
    }
    return true;
  }
  const low = Date.parse(value);
  const high = Date.parse(value2);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
  if (low > high) {
    unavailable.push(`${FIELD_LABELS[field]} ${value}–${value2} (unavailable)`);
    return false;
  }
  return true;
}

function sanitizeCondition(
  raw: AgentModelOutput['groups'][number]['conditions'][number],
  tagLookup: Map<string, string>,
  flagLookup: Map<string, string>,
  unmatched: Set<string>,
  unavailable: string[],
): WorldsQueryCondition | null {
  const field = raw.field as WorldsQueryField;
  const allowedOps = WORLDS_QUERY_OPS[field];
  if (!allowedOps) return null;
  const op = raw.op as WorldsQueryOp;
  if (!allowedOps.includes(op)) return null;

  let value = raw.value;
  let value2 = raw.value2;
  let values = raw.values.slice(0, AGENT_QUERY_MAX_VALUES);

  if (field === 'tag' || field === 'flag') {
    const lookup = field === 'tag' ? tagLookup : flagLookup;
    if (op === 'has' || op === 'not_has') {
      const matched = matchCatalogValue(value, lookup, unmatched);
      if (!matched) return null;
      value = matched;
      values = [];
    } else {
      const matched: string[] = [];
      const seen = new Set<string>();
      for (const candidate of values) {
        const canonical = matchCatalogValue(candidate, lookup, unmatched);
        if (canonical && !seen.has(canonical)) {
          seen.add(canonical);
          matched.push(canonical);
        }
      }
      if (matched.length === 0) return null;
      value = '';
      values = matched;
    }
  } else {
    if (value.length > AGENT_QUERY_MAX_VALUE_LENGTH || value2.length > AGENT_QUERY_MAX_VALUE_LENGTH) {
      return null;
    }
    values = values.filter((candidate) => candidate.length <= AGENT_QUERY_MAX_VALUE_LENGTH);
  }

  if (field === 'capacity') {
    if (op === 'between') {
      if (!sanitizeBetween(field, value, value2, unavailable)) return null;
      value = String(clampCapacity(Number(value)));
      value2 = String(clampCapacity(Number(value2)));
    } else if (op === 'in') {
      const clamped: string[] = [];
      const seen = new Set<string>();
      for (const candidate of values) {
        const parsed = Number(candidate);
        if (!Number.isFinite(parsed)) continue;
        const next = String(clampCapacity(parsed));
        if (seen.has(next)) continue;
        seen.add(next);
        clamped.push(next);
      }
      if (clamped.length === 0) return null;
      values = clamped;
    } else {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      value = String(clampCapacity(parsed));
    }
  }

  if (field === 'addedAt' || field === 'createdAt' || field === 'updatedAt') {
    if (op === 'between') {
      if (!sanitizeBetween(field, value, value2, unavailable)) return null;
    } else if (!Number.isFinite(Date.parse(value))) {
      return null;
    }
  }

  if (op === 'script' && !(AGENT_SCRIPT_VALUES as readonly string[]).includes(value)) {
    return null;
  }

  return { field, op, value, value2, values, negate: raw.negate };
}

function conditionChip(condition: WorldsQueryCondition): string {
  const { field, op, value, value2, values } = condition;
  let text: string;
  if (field === 'tag' || field === 'flag') {
    const label = value;
    if (op === 'has') text = label;
    else if (op === 'not_has') text = `not ${label}`;
    else text = `${op === 'hasAll' ? 'all of' : 'any of'} ${values.join(', ')}`;
  } else {
    const label = FIELD_LABELS[field];
    switch (op) {
      case 'eq':
        text = `${label} = ${value}`;
        break;
      case 'ne':
        text = `${label} ≠ ${value}`;
        break;
      case 'in':
        text = `${label} in [${values.join(', ')}]`;
        break;
      case 'contains':
        text = `${label} contains ${value}`;
        break;
      case 'prefix':
        text = `${label} starts with ${value}`;
        break;
      case 'not_contains':
        text = `${label} doesn't contain ${value}`;
        break;
      case 'script':
        text = `${label} script ${value}`;
        break;
      case 'gt':
        text = `${label} > ${value}`;
        break;
      case 'gte':
        text = `${label} ≥ ${value}`;
        break;
      case 'lt':
        text = `${label} < ${value}`;
        break;
      case 'lte':
        text = `${label} ≤ ${value}`;
        break;
      case 'between':
        text = `${label} ${value}–${value2}`;
        break;
      case 'before':
        text = `${label} before ${value}`;
        break;
      case 'after':
        text = `${label} after ${value}`;
        break;
      case 'isNull':
        text = `${label} is empty`;
        break;
      default:
        text = label;
    }
  }
  return condition.negate ? `not (${text})` : text;
}

function deriveAppliedFilters(groups: WorldsQueryGroup[]): string[] {
  const chips: string[] = [];
  for (const group of groups) {
    for (const condition of group.conditions) {
      chips.push(conditionChip(condition));
    }
  }
  return chips;
}

export function sanitizeQuery(model: AgentModelOutput, catalog: AgentCatalog): SanitizedQuery {
  const unmatched = new Set<string>();
  const unavailable: string[] = [];
  const tagLookup = lookupSet(catalog.tags);
  const flagLookup = lookupSet(catalog.flags);

  const hadConditions = model.groups.some((group) => group.conditions.length > 0);
  const groups: WorldsQueryGroup[] = [];
  let total = 0;

  for (const rawGroup of model.groups.slice(0, AGENT_QUERY_MAX_GROUPS)) {
    if (total >= AGENT_QUERY_MAX_TOTAL_CONDITIONS) break;
    const conditions: WorldsQueryCondition[] = [];
    for (const rawCondition of rawGroup.conditions.slice(0, AGENT_QUERY_MAX_CONDITIONS_PER_GROUP)) {
      if (total >= AGENT_QUERY_MAX_TOTAL_CONDITIONS) break;
      const condition = sanitizeCondition(rawCondition, tagLookup, flagLookup, unmatched, unavailable);
      if (!condition) continue;
      conditions.push(condition);
      total += 1;
    }
    if (conditions.length > 0) {
      groups.push({ connector: rawGroup.connector, conditions });
    }
  }

  return {
    query: { groups },
    appliedFilters: [...deriveAppliedFilters(groups), ...unavailable],
    unmatchedTags: [...unmatched],
    droppedAll: hadConditions && groups.length === 0,
  };
}
