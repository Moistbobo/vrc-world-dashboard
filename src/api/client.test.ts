import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearWorldHighPriority,
  fetchMe,
  fetchMeta,
  fetchWorlds,
  setWorldHighPriority,
  setWorldQuality,
  setWorldTags,
} from './client';

globalThis.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchWorlds', () => {
  it('includes minCapacity and maxCapacity query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ minCapacity: 10, maxCapacity: 40 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('minCapacity=10');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('maxCapacity=40');
  });

  it('does not include capacity params when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ limit: 10 });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('minCapacity');
    expect(url).not.toContain('maxCapacity');
  });

  it('includes platform query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ platform: ['android', 'ios'] });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('platform=android');
    expect(url).toContain('platform=ios');
  });

  it('includes dayRange query param when provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ dayRange: 7 });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('dayRange=7');
  });

  it('does not include dayRange query param when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ limit: 10 });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('dayRange');
  });

  it('includes highPriority=true when enabled', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ highPriority: true });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('highPriority=true');
  });

  it('omits highPriority when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ worlds: [], total: 0, limit: 20, offset: 0 }), { status: 200 })
    );
    await fetchWorlds({ limit: 10 });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('highPriority');
  });
});

describe('fetchMe', () => {
  it('fetches /api/me and returns the response body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ name: 'Curator', role: 'curator', permissions: ['worlds:write'] }),
        { status: 200 }
      )
    );

    const result = await fetchMe();

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('/api/me');
    expect(result).toEqual({
      name: 'Curator',
      role: 'curator',
      permissions: ['worlds:write'],
    });
  });

  it('sends the bearer token when VITE_API_BEARER_TOKEN is set', async () => {
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'test-token');
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ name: 'Curator', role: 'curator', permissions: [] }),
        { status: 200 }
      )
    );

    await fetchMe();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('prefers the stored API token over VITE_API_BEARER_TOKEN', async () => {
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'env-token');
    window.localStorage.setItem('sos-api-token', 'stored-token');
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ name: 'Curator', role: 'curator', permissions: [] }),
        { status: 200 }
      )
    );

    await fetchMe();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer stored-token' });
  });

  it('falls back to VITE_API_BEARER_TOKEN when no token is stored', async () => {
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'env-token');
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ name: 'Curator', role: 'curator', permissions: [] }),
        { status: 200 }
      )
    );

    await fetchMe();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer env-token' });
  });
});

describe('fetchMeta', () => {
  it('fetches /api/meta with no query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          qualityGood: 123,
          qualityBad: 12,
          platformDesktop: 80,
          platformAndroid: 45,
          platformiOS: 6,
        }),
        { status: 200 }
      )
    );

    const result = await fetchMeta();

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('/api/meta');
    expect(url).not.toContain('?');
    expect(result).toEqual({
      qualityGood: 123,
      qualityBad: 12,
      platformDesktop: 80,
      platformAndroid: 45,
      platformiOS: 6,
    });
  });
});

describe('setWorldQuality', () => {
  it('PUTs the quality to /api/worlds/:id/quality with guildId and quality in the body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 })
    );

    const result = await setWorldQuality('wrld_123', 'guild_1', 'good');

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/worlds/wrld_123/quality');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ guildId: 'guild_1', quality: 'good' });
    expect(result).toEqual({ updated: true });
  });

  it('sends quality null to clear the tag', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 })
    );

    await setWorldQuality('wrld_123', 'guild_1', null);

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ guildId: 'guild_1', quality: null });
  });
});

describe('setWorldTags', () => {
  it('PUTs the tags to /api/worlds/:id/tags with guildId and tags in the body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 })
    );

    const result = await setWorldTags('wrld_123', 'guild_1', ['chill', 'social']);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/worlds/wrld_123/tags');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      guildId: 'guild_1',
      tags: ['chill', 'social'],
    });
    expect(result).toEqual({ updated: true });
  });

  it('sends the bearer token when a token is stored', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 })
    );
    window.localStorage.setItem('sos-api-token', 'stored-token');

    await setWorldTags('wrld_123', undefined, []);

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer stored-token' });
  });
});

describe('setWorldHighPriority', () => {
  it('PUTs the world id to /api/worlds/:id/high-priority with guildId in the body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ added: true }), { status: 200 })
    );

    const result = await setWorldHighPriority('wrld_123', 'guild_1');

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/worlds/wrld_123/high-priority');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ guildId: 'guild_1' });
    expect(result).toEqual({ added: true });
  });
});

describe('clearWorldHighPriority', () => {
  it('DELETEs /api/worlds/:id/high-priority with guildId in the body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ removed: true }), { status: 200 })
    );

    const result = await clearWorldHighPriority('wrld_123', 'guild_1');

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/worlds/wrld_123/high-priority');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ guildId: 'guild_1' });
    expect(result).toEqual({ removed: true });
  });
});
