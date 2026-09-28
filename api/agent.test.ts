import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST, runAgent, loadCatalog, postWorldsQuery, WorldsRequestError, type AgentDeps } from './agent';
import { AGENT_PAGE_LIMIT, type AgentModelOutput } from './agent-schema';
import type { World, WorldsAgentResponse } from '../src/types';

interface RawCondition {
  field: string;
  op: string;
  value: string;
  value2: string;
  values: string[];
  negate: boolean;
}

const world: World = {
  worldId: 'w1',
  name: 'Cozy Cabin',
  authorName: 'Author',
  capacity: 8,
  platforms: ['PC'],
  tags: ['Scary'],
  imageUrl: 'https://example.com/w1.png',
  vrchatUrl: 'https://vrchat.com/home/world/w1',
  quality: 'good',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function stringCondition(overrides: Partial<RawCondition> = {}): RawCondition {
  return {
    field: 'tag',
    op: 'has',
    value: 'Scary',
    value2: '',
    values: [] as string[],
    negate: false,
    ...overrides,
  };
}

function modelOutput(overrides: Partial<AgentModelOutput> = {}): AgentModelOutput {
  return {
    interpretation: 'Scary worlds',
    groups: [{ connector: 'and', conditions: [stringCondition()] }],
    sortField: 'none',
    sortDir: 'desc',
    ...overrides,
  };
}

function stubDeps(overrides: Partial<AgentDeps> = {}): AgentDeps {
  return {
    authorize: vi.fn(async () => ({ ok: true as const })),
    loadCatalog: vi.fn(async () => ({ tags: ['Scary', 'Kino'], flags: ['NSFW'] })),
    generate: vi.fn(async () => modelOutput()),
    queryWorlds: vi.fn(async () => ({ total: 1, limit: 20, offset: 0, worlds: [world] })),
    ...overrides,
  };
}

function sentBody(deps: AgentDeps) {
  return vi.mocked(deps.queryWorlds).mock.calls[0][0];
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/agent', () => {
  it('returns 405 with Allow header for non-POST methods', async () => {
    const response = await POST(new Request('http://localhost/api/agent', { method: 'GET' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await POST(
      new Request('http://localhost/api/agent', { method: 'POST', body: '{not json' }),
    );
    expect(response.status).toBe(400);
  });

  it('rejects bodies larger than 64KB', async () => {
    const response = await POST(
      new Request('http://localhost/api/agent', {
        method: 'POST',
        body: 'x'.repeat(64 * 1024 + 1),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('returns JSON with content-type on a handled request', async () => {
    const response = await POST(
      new Request('http://localhost/api/agent', { method: 'POST', body: JSON.stringify({}) }),
    );
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.status).toBe(400);
  });
});

describe('runAgent', () => {
  it('rejects an invalid request before authorizing', async () => {
    const deps = stubDeps();
    const result = await runAgent({ query: '' }, deps);
    expect(result).toEqual({ status: 400, body: { error: 'invalid_request' } });
    expect(deps.authorize).not.toHaveBeenCalled();
    expect(deps.loadCatalog).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('returns 401 without calling upstream when authorize rejects the token', async () => {
    const deps = stubDeps({
      authorize: vi.fn(async () => ({ ok: false as const, status: 401 as const, error: 'unauthorized' })),
    });
    const result = await runAgent({ query: 'scary worlds' }, deps);
    expect(result).toEqual({ status: 401, body: { error: 'unauthorized' } });
    expect(deps.loadCatalog).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('returns 403 without calling upstream when the permission is missing', async () => {
    const deps = stubDeps({
      authorize: vi.fn(async () => ({ ok: false as const, status: 403 as const, error: 'forbidden' })),
    });
    const result = await runAgent({ query: 'scary worlds' }, deps);
    expect(result).toEqual({ status: 403, body: { error: 'forbidden' } });
    expect(deps.loadCatalog).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('returns the sanitized query, chips, and worlds on success', async () => {
    const deps = stubDeps();
    const result = await runAgent({ query: 'scary worlds' }, deps);
    expect(result.status).toBe(200);
    const body = result.body as WorldsAgentResponse;
    expect(body.interpretation).toBe('Scary worlds');
    expect(body.query).toEqual({
      groups: [
        {
          connector: 'and',
          conditions: [{ field: 'tag', op: 'has', value: 'Scary', value2: '', values: [], negate: false }],
        },
      ],
    });
    expect(body.appliedFilters).toEqual(['Scary']);
    expect(body.unmatchedTags).toEqual([]);
    expect(body.worlds).toEqual([world]);
    expect(body.total).toBe(1);
    expect(vi.mocked(deps.queryWorlds)).toHaveBeenCalledTimes(1);
    expect(sentBody(deps)).toEqual({
      query: body.query,
      limit: AGENT_PAGE_LIMIT,
      offset: 0,
    });
  });

  it('carries an explicit sort into the request body', async () => {
    const deps = stubDeps({
      generate: vi.fn(async () => modelOutput({ sortField: 'capacity', sortDir: 'asc' })),
    });
    await runAgent({ query: 'small worlds' }, deps);
    expect(sentBody(deps)).toMatchObject({ sortField: 'capacity', sortDir: 'asc' });
  });

  it('drops unmatched tags from the query and reports them', async () => {
    const deps = stubDeps({
      generate: vi.fn(async () =>
        modelOutput({
          groups: [
            {
              connector: 'and',
              conditions: [stringCondition(), stringCondition({ value: 'FakeTag' })],
            },
          ],
        }),
      ),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    const body = result.body as WorldsAgentResponse;
    expect(body.unmatchedTags).toEqual(['FakeTag']);
    expect(body.appliedFilters).toEqual(['Scary']);
    expect(sentBody(deps).query.groups[0].conditions).toHaveLength(1);
  });

  it('returns a generic error and skips the request when every condition is dropped', async () => {
    const deps = stubDeps({
      generate: vi.fn(async () =>
        modelOutput({ groups: [{ connector: 'and', conditions: [stringCondition({ field: 'bogus' })] }] }),
      ),
    });
    const result = await runAgent({ query: 'nonsense' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'agent_malformed' } });
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('returns 502 with no worlds when generate throws', async () => {
    const deps = stubDeps({
      generate: vi.fn(async () => {
        throw new Error('gemini down');
      }),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'agent_unavailable' } });
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('returns 502 when the model output is malformed', async () => {
    const deps = stubDeps({
      generate: vi.fn(async () => ({ interpretation: 'x', groups: 'not-an-array' })),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'agent_malformed' } });
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });

  it('maps a backend 400 to a clarifying error', async () => {
    const deps = stubDeps({
      queryWorlds: vi.fn(async () => {
        throw new WorldsRequestError(400);
      }),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'agent_query_rejected' } });
  });

  it('maps any other worlds failure to worlds_unavailable', async () => {
    const deps = stubDeps({
      queryWorlds: vi.fn(async () => {
        throw new WorldsRequestError(500);
      }),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'worlds_unavailable' } });
  });

  it('treats empty groups as an unfiltered request', async () => {
    const deps = stubDeps({ generate: vi.fn(async () => modelOutput({ groups: [] })) });
    const result = await runAgent({ query: 'any worlds' }, deps);
    expect(result.status).toBe(200);
    expect((result.body as WorldsAgentResponse).query).toEqual({ groups: [] });
    expect(sentBody(deps)).toEqual({ query: { groups: [] }, limit: AGENT_PAGE_LIMIT, offset: 0 });
  });

  it('falls back to an empty catalog and drops tag conditions when the catalog fails', async () => {
    const deps = stubDeps({
      loadCatalog: vi.fn(async () => {
        throw new Error('catalog down');
      }),
    });
    const result = await runAgent({ query: 'scary' }, deps);
    expect(result).toEqual({ status: 502, body: { error: 'agent_malformed' } });
    expect(deps.queryWorlds).not.toHaveBeenCalled();
  });
});

describe('postWorldsQuery', () => {
  it('POSTs the body to /api/worlds/query with the bot token', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ total: 0, limit: 20, offset: 0, worlds: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const body = { query: { groups: [] }, limit: 20, offset: 0 };
    await postWorldsQuery('http://backend', 'bot-token', body);

    expect(fetchMock).toHaveBeenCalledWith('http://backend/api/worlds/query', {
      method: 'POST',
      headers: { Authorization: 'Bearer bot-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  it('throws a WorldsRequestError carrying the status on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'bad query' }, false, 400)));
    await expect(postWorldsQuery('http://backend', 'bot-token', { query: { groups: [] } })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('loadCatalog', () => {
  it('reads the tags and flags envelopes and preserves their item values', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.endsWith('/api/tags')
        ? { tags: [{ tag: 'Scary', count: 3, emoji: 'x', hexColor: '#fff' }] }
        : { flags: [{ flag: 'NSFW', count: 1 }] };
      return jsonResponse(body);
    });
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await loadCatalog('http://backend', 'server-token');

    expect(catalog).toEqual({ tags: ['Scary'], flags: ['NSFW'] });
    expect(fetchMock).toHaveBeenCalledWith('http://backend/api/tags', {
      headers: { Authorization: 'Bearer server-token' },
    });
  });

  it('returns empty arrays when a catalog request is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 500)));
    await expect(loadCatalog('http://backend', 'server-token')).resolves.toEqual({
      tags: [],
      flags: [],
    });
  });
});
