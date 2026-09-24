import { describe, it, expect, vi, afterEach } from 'vitest';
import { serverFetchTags } from './api';

const originalEnv = { ...process.env };

describe('serverFetchTags', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('sends the server base URL and token', async () => {
    process.env.API_BASE_URL = 'https://api.test';
    process.env.API_BEARER_TOKEN = 'server-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tags: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await serverFetchTags();

    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://api.test/api/tags');
    expect(init.headers.Authorization).toBe('Bearer server-secret');
  });

  it('falls back to the public env when server env is unset', async () => {
    delete process.env.API_BASE_URL;
    delete process.env.API_BEARER_TOKEN;
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://public.test/';
    process.env.NEXT_PUBLIC_API_BEARER_TOKEN = 'public-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tags: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await serverFetchTags();

    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://public.test/api/tags');
    expect(init.headers.Authorization).toBe('Bearer public-secret');
  });
});
