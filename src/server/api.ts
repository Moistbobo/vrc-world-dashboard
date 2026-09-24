import type {
  FlagsResponse,
  HealthResponse,
  MetaResponse,
  TagsResponse,
  World,
} from '../types';

const REQUEST_TIMEOUT_MS = 3000;

function getBaseUrl(): string {
  const url = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof url === 'string' && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

function getToken(): string {
  const token = process.env.API_BEARER_TOKEN ?? process.env.NEXT_PUBLIC_API_BEARER_TOKEN;
  return typeof token === 'string' ? token : '';
}

async function serverRequest<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function serverFetchTags(): Promise<TagsResponse> {
  return serverRequest('/api/tags');
}

export function serverFetchFlags(): Promise<FlagsResponse> {
  return serverRequest('/api/flags');
}

export function serverFetchMeta(): Promise<MetaResponse> {
  return serverRequest('/api/meta');
}

export function serverFetchHealth(): Promise<HealthResponse> {
  return serverRequest('/api/health');
}

export function serverFetchWorld(worldId: string): Promise<World> {
  return serverRequest(`/api/worlds/${encodeURIComponent(worldId)}`);
}
