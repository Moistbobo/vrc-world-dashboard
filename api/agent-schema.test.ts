import { describe, it, expect } from 'vitest';
import {
  AGENT_QUERY_MAX_CONDITIONS_PER_GROUP,
  AGENT_QUERY_MAX_GROUPS,
  AGENT_QUERY_MAX_VALUE_LENGTH,
  AGENT_QUERY_MAX_VALUES,
  AGENT_MODEL_DEFAULT,
  AGENT_SCRIPT_VALUES,
  agentModelSchema,
  agentRequestSchema,
  buildSystemPrompt,
  sanitizeQuery,
  type AgentCatalog,
  type AgentModelOutput,
} from './agent-schema';
import { buildWorldsQueryBody, toWhereParam } from './agent-query';

const catalog: AgentCatalog = { tags: ['Scary', 'Kino', 'chill'], flags: ['NSFW'] };

interface RawCondition {
  field: string;
  op: string;
  value: string;
  value2: string;
  values: string[];
  negate: boolean;
}

function stringCondition(overrides: Partial<RawCondition> = {}): RawCondition {
  return {
    field: 'tag',
    op: 'has',
    value: 'Scary',
    value2: '',
    values: [],
    negate: false,
    ...overrides,
  };
}

function decodeWhere(value: string): unknown {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return JSON.parse(atob(padded));
}

function model(overrides: Partial<AgentModelOutput> = {}): AgentModelOutput {
  return {
    interpretation: 'test',
    groups: [],
    sortField: 'none',
    sortDir: 'desc',
    ...overrides,
  };
}

function group(conditions: ReturnType<typeof stringCondition>[], connector: 'and' | 'or' = 'and') {
  return { connector, conditions };
}

describe('AGENT_MODEL_DEFAULT', () => {
  it('defaults to the flash-lite model', () => {
    expect(AGENT_MODEL_DEFAULT).toBe('gemini-3.5-flash-lite');
  });
});

describe('agentModelSchema', () => {
  it('requires every field', () => {
    expect(agentModelSchema.safeParse({}).success).toBe(false);
    expect(agentModelSchema.safeParse({ interpretation: 'x' }).success).toBe(false);
  });

  it('accepts a complete object', () => {
    expect(agentModelSchema.safeParse(model({ interpretation: 'x' })).success).toBe(true);
  });

  it('rejects an out-of-range sortField', () => {
    expect(agentModelSchema.safeParse(model({ sortField: 'sideways' as 'none' })).success).toBe(false);
  });

  it('contains no union, record, nullable, or optional constructs', () => {
    const sources = import.meta.glob('./agent-schema.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = sources['./agent-schema.ts'];
    expect(source).toBeTruthy();
    const schemaSection = source.slice(
      source.indexOf('const conditionSchema'),
      source.indexOf('export type AgentModelOutput'),
    );
    expect(schemaSection).not.toMatch(/z\.union|z\.record|\.nullable\(|\.optional\(/);
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

describe('sanitizeQuery', () => {
  it('keeps two OR groups', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([stringCondition({ field: 'tag', op: 'has', value: 'Kino' })], 'or'),
          group([stringCondition({ field: 'tag', op: 'has', value: 'Scary' })], 'or'),
        ],
      }),
      catalog,
    );
    expect(result.query.groups).toHaveLength(2);
    expect(result.query.groups.every((item) => item.connector === 'or')).toBe(true);
    expect(result.appliedFilters).toEqual(['Kino', 'Scary']);
    expect(result.droppedAll).toBe(false);
  });

  it('keeps a tag condition and a capacity condition', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'tag', op: 'has', value: 'chill' }),
            stringCondition({ field: 'capacity', op: 'gte', value: '4' }),
          ]),
        ],
      }),
      catalog,
    );
    const conditions = result.query.groups[0].conditions;
    expect(conditions).toEqual([
      { field: 'tag', op: 'has', value: 'chill', value2: '', values: [], negate: false },
      { field: 'capacity', op: 'gte', value: '4', value2: '', values: [], negate: false },
    ]);
    expect(result.appliedFilters).toEqual(['chill', 'capacity ≥ 4']);
  });

  it('keeps a valid script value and drops an invalid one', () => {
    const valid = sanitizeQuery(
      model({
        groups: [group([stringCondition({ field: 'name', op: 'script', value: 'cjk' })])],
      }),
      catalog,
    );
    expect(valid.query.groups[0].conditions[0]).toMatchObject({ field: 'name', op: 'script', value: 'cjk' });

    const invalid = sanitizeQuery(
      model({
        groups: [group([stringCondition({ field: 'name', op: 'script', value: 'klingon' })])],
      }),
      catalog,
    );
    expect(invalid.droppedAll).toBe(true);
    expect(invalid.query.groups).toEqual([]);
  });

  it('accepts an absolute addedAt between range', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({
              field: 'addedAt',
              op: 'between',
              value: '2026-01-03',
              value2: '2026-02-09',
            }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.query.groups[0].conditions[0]).toMatchObject({
      field: 'addedAt',
      op: 'between',
      value: '2026-01-03',
      value2: '2026-02-09',
    });
  });

  it('drops unknown tag and flag values into unmatchedTags', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'tag', op: 'has', value: 'Scary' }),
            stringCondition({ field: 'tag', op: 'has', value: 'Vibe' }),
            stringCondition({ field: 'flag', op: 'has', value: 'NSFW' }),
            stringCondition({ field: 'flag', op: 'has', value: 'Unknown' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.unmatchedTags).toEqual(['Vibe', 'Unknown']);
    expect(result.query.groups[0].conditions).toHaveLength(2);
    expect(result.query.groups[0].conditions.map((item) => item.value)).toEqual(['Scary', 'NSFW']);
  });

  it('matches catalog values case-insensitively and preserves canonical casing', () => {
    const result = sanitizeQuery(
      model({ groups: [group([stringCondition({ value: 'scary' })])] }),
      catalog,
    );
    expect(result.query.groups[0].conditions[0].value).toBe('Scary');
  });

  it('drops an unknown field or operator', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'bogus', op: 'has', value: 'Scary' }),
            stringCondition({ field: 'tag', op: 'bogus', value: 'Scary' }),
            stringCondition({ field: 'tag', op: 'has', value: 'Kino' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.query.groups[0].conditions).toHaveLength(1);
    expect(result.query.groups[0].conditions[0].value).toBe('Kino');
  });

  it('drops every condition and flags droppedAll when nothing survives', () => {
    const result = sanitizeQuery(
      model({ groups: [group([stringCondition({ field: 'bogus', op: 'has', value: 'Scary' })])] }),
      catalog,
    );
    expect(result.query.groups).toEqual([]);
    expect(result.droppedAll).toBe(true);
  });

  it('treats empty groups as unfiltered', () => {
    const result = sanitizeQuery(model({ groups: [] }), catalog);
    expect(result.query.groups).toEqual([]);
    expect(result.droppedAll).toBe(false);
    expect(result.appliedFilters).toEqual([]);
  });

  it('caps groups and conditions per group', () => {
    const manyGroups = Array.from({ length: AGENT_QUERY_MAX_GROUPS + 3 }, () =>
      group([stringCondition()]),
    );
    expect(sanitizeQuery(model({ groups: manyGroups }), catalog).query.groups).toHaveLength(
      AGENT_QUERY_MAX_GROUPS,
    );

    const manyConditions = Array.from({ length: AGENT_QUERY_MAX_CONDITIONS_PER_GROUP + 3 }, () =>
      stringCondition(),
    );
    const capped = sanitizeQuery(model({ groups: [group(manyConditions)] }), catalog);
    expect(capped.query.groups[0].conditions).toHaveLength(AGENT_QUERY_MAX_CONDITIONS_PER_GROUP);
  });

  it('caps values and drops over-long values', () => {
    const values = Array.from({ length: AGENT_QUERY_MAX_VALUES + 5 }, (_, index) => `tag-${index}`);
    const capped = sanitizeQuery(
      model({ groups: [group([stringCondition({ field: 'name', op: 'in', value: '', values })])] }),
      catalog,
    );
    expect(capped.query.groups[0].conditions[0].values).toHaveLength(AGENT_QUERY_MAX_VALUES);

    const long = 'x'.repeat(AGENT_QUERY_MAX_VALUE_LENGTH + 1);
    const dropped = sanitizeQuery(
      model({ groups: [group([stringCondition({ field: 'name', op: 'contains', value: long })])] }),
      catalog,
    );
    expect(dropped.droppedAll).toBe(true);
  });

  it('drops an inverted between and notes it as unavailable', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'capacity', op: 'between', value: '60', value2: '20' }),
            stringCondition({ field: 'tag', op: 'has', value: 'Scary' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.query.groups[0].conditions).toHaveLength(1);
    expect(result.appliedFilters).toContain('capacity 60–20 (unavailable)');
  });

  it('drops an inverted capacity between whose bounds clamp to the same value', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'capacity', op: 'between', value: '90', value2: '85' }),
            stringCondition({ field: 'tag', op: 'has', value: 'Scary' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.query.groups[0].conditions).toHaveLength(1);
    expect(result.query.groups[0].conditions[0].field).toBe('tag');
    expect(result.appliedFilters).toContain('capacity 90–85 (unavailable)');
  });

  it('renders platform chips with their values', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'platform', op: 'has', value: 'android' }),
            stringCondition({
              field: 'platform',
              op: 'hasAny',
              value: '',
              values: ['android', 'ios'],
            }),
            stringCondition({
              field: 'platform',
              op: 'hasAll',
              value: '',
              values: ['ios', 'android'],
            }),
            stringCondition({ field: 'platform', op: 'not_has', value: 'ios' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.appliedFilters).toEqual([
      'android',
      'any of android, ios',
      'all of ios, android',
      'not ios',
    ]);
  });

  it('wraps a negated platform chip', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([stringCondition({ field: 'platform', op: 'has', value: 'android', negate: true })]),
        ],
      }),
      catalog,
    );
    expect(result.appliedFilters).toEqual(['not (android)']);
  });

  it('keeps only valid quality and highPriority values', () => {
    const valid = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'quality', op: 'eq', value: 'good' }),
            stringCondition({ field: 'quality', op: 'isNull', value: '' }),
            stringCondition({ field: 'highPriority', op: 'eq', value: 'true' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(valid.query.groups[0].conditions).toHaveLength(3);
    expect(valid.appliedFilters).toEqual(['quality = good', 'quality is empty', 'high priority = true']);

    const invalid = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'quality', op: 'eq', value: 'excellent' }),
            stringCondition({ field: 'highPriority', op: 'eq', value: 'yes' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(invalid.droppedAll).toBe(true);
    expect(invalid.query.groups).toEqual([]);
  });

  it('dedupes chips across distributed groups while preserving first-seen order', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'tag', op: 'has', value: 'Scary' }),
            stringCondition({ field: 'tag', op: 'has', value: 'Kino' }),
          ], 'or'),
          group([
            stringCondition({ field: 'tag', op: 'has', value: 'Scary' }),
            stringCondition({ field: 'tag', op: 'has', value: 'chill' }),
          ], 'or'),
        ],
      }),
      catalog,
    );
    expect(result.query.groups).toHaveLength(2);
    expect(result.appliedFilters).toEqual(['Scary', 'Kino', 'chill']);
  });

  it('clamps capacity into range', () => {
    const result = sanitizeQuery(
      model({
        groups: [
          group([
            stringCondition({ field: 'capacity', op: 'gte', value: '900' }),
            stringCondition({ field: 'capacity', op: 'lte', value: '0' }),
          ]),
        ],
      }),
      catalog,
    );
    expect(result.query.groups[0].conditions[0].value).toBe('80');
    expect(result.query.groups[0].conditions[1].value).toBe('1');
  });

  it('drops a date that does not parse', () => {
    const result = sanitizeQuery(
      model({ groups: [group([stringCondition({ field: 'createdAt', op: 'after', value: 'soon' })])] }),
      catalog,
    );
    expect(result.droppedAll).toBe(true);
  });
});

describe('buildSystemPrompt', () => {
  it('enumerates the catalog, fields, and script values', () => {
    const prompt = buildSystemPrompt(catalog);
    expect(prompt).toContain('Scary');
    expect(prompt).toContain('Kino');
    expect(prompt).toContain('NSFW');
    expect(prompt).toContain('capacity');
    expect(prompt).toContain(AGENT_SCRIPT_VALUES[0]);
  });
});

describe('buildWorldsQueryBody', () => {
  it('omits a none sort and carries the pagination bounds', () => {
    const body = buildWorldsQueryBody({ groups: [] }, { sortField: 'none', limit: 20, offset: 0 });
    expect(body).toEqual({ query: { groups: [] }, limit: 20, offset: 0 });
    expect('sortField' in body).toBe(false);
  });

  it('carries an explicit sort', () => {
    const body = buildWorldsQueryBody(
      { groups: [] },
      { sortField: 'capacity', sortDir: 'asc', limit: 20, offset: 0 },
    );
    expect(body).toEqual({
      query: { groups: [] },
      sortField: 'capacity',
      sortDir: 'asc',
      limit: 20,
      offset: 0,
    });
  });
});

describe('toWhereParam', () => {
  it('round-trips a query through base64url', () => {
    const query = {
      groups: [
        {
          connector: 'and' as const,
          conditions: [
            {
              field: 'tag' as const,
              op: 'has' as const,
              value: 'chill',
              value2: '',
              values: [],
              negate: false,
            },
          ],
        },
      ],
    };
    expect(toWhereParam(query)).not.toMatch(/[+/=]/);
    expect(decodeWhere(toWhereParam(query))).toEqual(query);
  });
});
