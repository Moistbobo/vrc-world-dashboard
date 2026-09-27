import type { WorldsAgentHistoryMessage, WorldsAgentResponse, PaginatedWorlds } from '../src/types';
import {
  AGENT_MODEL_DEFAULT,
  AGENT_PAGE_LIMIT,
  agentModelSchema,
  agentRequestSchema,
  buildSystemPrompt,
  sanitizeFilters,
  toWorldsQuery,
  type AgentCatalog,
} from './agent-schema.js';

export interface AgentDeps {
  authorize: () => Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }>;
  loadCatalog: () => Promise<AgentCatalog>;
  generate: (input: {
    system: string;
    prompt: string;
    history: WorldsAgentHistoryMessage[];
  }) => Promise<unknown>;
  fetchWorlds: (query: string) => Promise<PaginatedWorlds>;
}

export type RunAgentResult = { status: number; body: WorldsAgentResponse | { error: string } };

const MAX_BODY_BYTES = 64 * 1024;

type Env = Record<string, string | undefined>;

function getEnv(): Env {
  return (globalThis as { process?: { env?: Env } }).process?.env ?? {};
}

function getBaseUrl(env: Env): string {
  const raw = env.VITE_API_BASE_URL;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

function readBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export async function runAgent(body: unknown, deps: AgentDeps): Promise<RunAgentResult> {
  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid_request' } };
  }

  const auth = await deps.authorize();
  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error } };
  }

  let catalog: AgentCatalog;
  try {
    catalog = await deps.loadCatalog();
  } catch {
    catalog = { tags: [], flags: [] };
  }

  let raw: unknown;
  try {
    raw = await deps.generate({
      system: buildSystemPrompt(catalog),
      prompt: parsed.data.query,
      history: parsed.data.history ?? [],
    });
  } catch {
    return { status: 502, body: { error: 'agent_unavailable' } };
  }

  const model = agentModelSchema.safeParse(raw);
  if (!model.success) {
    return { status: 502, body: { error: 'agent_malformed' } };
  }

  const { filters, unmatchedTags } = sanitizeFilters(model.data, catalog);

  let page: PaginatedWorlds;
  try {
    page = await deps.fetchWorlds(toWorldsQuery(filters, { limit: AGENT_PAGE_LIMIT, offset: 0 }));
  } catch {
    return { status: 502, body: { error: 'worlds_unavailable' } };
  }

  return {
    status: 200,
    body: {
      interpretation: model.data.interpretation,
      filters,
      unmatchedTags,
      worlds: page.worlds,
      total: page.total,
    },
  };
}

async function authorizeUser(
  token: string | null,
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  if (!token) return { ok: false, status: 401, error: 'unauthorized' };
  try {
    const response = await fetch(`${baseUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 200) {
      return { ok: false, status: 401, error: 'unauthorized' };
    }
    const payload = (await response.json()) as { permissions?: unknown };
    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    if (!permissions.includes('worlds:write')) {
      return { ok: false, status: 403, error: 'forbidden' };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
}

export async function loadCatalog(baseUrl: string, apiToken: string): Promise<AgentCatalog> {
  const headers = { Authorization: `Bearer ${apiToken}` };
  const load = async (path: string, envelopeKey: string, itemKey: string): Promise<string[]> => {
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers });
      if (!response.ok) return [];
      const data = (await response.json()) as Record<string, unknown> | null;
      const list = data?.[envelopeKey];
      if (!Array.isArray(list)) return [];
      return list.flatMap((item) => {
        const value =
          item && typeof item === 'object' ? (item as Record<string, unknown>)[itemKey] : undefined;
        return typeof value === 'string' ? [value] : [];
      });
    } catch {
      return [];
    }
  };
  const [tags, flags] = await Promise.all([
    load('/api/tags', 'tags', 'tag'),
    load('/api/flags', 'flags', 'flag'),
  ]);
  return { tags, flags };
}

function formatPrompt(query: string, history: WorldsAgentHistoryMessage[]): string {
  const lines = history.map(
    (message) => `${message.role === 'assistant' ? 'Assistant' : 'Curator'}: ${message.content}`,
  );
  lines.push(`Curator: ${query}`);
  return lines.join('\n');
}

async function generateDefault(input: {
  system: string;
  prompt: string;
  history: WorldsAgentHistoryMessage[];
}): Promise<unknown> {
  const [{ google }, { generateObject }] = await Promise.all([
    import('@ai-sdk/google'),
    import('ai'),
  ]);
  const env = getEnv();
  const modelId = env.AGENT_GEMINI_MODEL ?? AGENT_MODEL_DEFAULT;
  const { object } = await generateObject({
    model: google(modelId),
    schema: agentModelSchema,
    system: input.system,
    prompt: formatPrompt(input.prompt, input.history),
  });
  return object;
}

async function fetchWorldsDefault(
  baseUrl: string,
  apiToken: string,
  query: string,
): Promise<PaginatedWorlds> {
  const response = await fetch(`${baseUrl}/api/worlds?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`worlds request failed: ${response.status}`);
  }
  return (await response.json()) as PaginatedWorlds;
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(null, { status: 400 });
  }

  const token = readBearer(request.headers.get('authorization'));
  const env = getEnv();
  const baseUrl = getBaseUrl(env);
  const apiToken = env.AGENT_WORLDS_API_TOKEN ?? '';

  const result = await runAgent(body, {
    authorize: () => authorizeUser(token, baseUrl),
    loadCatalog: () => loadCatalog(baseUrl, apiToken),
    generate: (input) => generateDefault(input),
    fetchWorlds: (query) => fetchWorldsDefault(baseUrl, apiToken, query),
  });

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json' },
  });
}
