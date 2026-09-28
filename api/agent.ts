import type { WorldsAgentHistoryMessage, WorldsAgentResponse, PaginatedWorlds } from '../src/types';
import {
  AGENT_MODEL_DEFAULT,
  AGENT_PAGE_LIMIT,
  agentModelSchema,
  agentRequestSchema,
  buildSystemPrompt,
  sanitizeQuery,
  type AgentCatalog,
} from './agent-schema.js';
import { buildWorldsQueryBody, type WorldsQueryBody } from './agent-query.js';

export interface AgentDeps {
  authorize: () => Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }>;
  loadCatalog: () => Promise<AgentCatalog>;
  generate: (input: {
    system: string;
    prompt: string;
    history: WorldsAgentHistoryMessage[];
  }) => Promise<unknown>;
  queryWorlds: (body: WorldsQueryBody) => Promise<PaginatedWorlds>;
}

export type RunAgentResult = { status: number; body: WorldsAgentResponse | { error: string } };

export class WorldsRequestError extends Error {
  constructor(readonly status: number) {
    super(`worlds request failed: ${status}`);
    this.name = 'WorldsRequestError';
  }
}

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

  const { query, appliedFilters, unmatchedTags, droppedAll } = sanitizeQuery(model.data, catalog);
  if (droppedAll) {
    return { status: 502, body: { error: 'agent_malformed' } };
  }

  const queryBody = buildWorldsQueryBody(query, {
    sortField: model.data.sortField,
    sortDir: model.data.sortDir,
    limit: AGENT_PAGE_LIMIT,
    offset: 0,
  });

  let page: PaginatedWorlds;
  try {
    page = await deps.queryWorlds(queryBody);
  } catch (error) {
    if (error instanceof WorldsRequestError && error.status === 400) {
      return { status: 502, body: { error: 'agent_query_rejected' } };
    }
    return { status: 502, body: { error: 'worlds_unavailable' } };
  }

  return {
    status: 200,
    body: {
      interpretation: model.data.interpretation,
      query,
      appliedFilters,
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

export async function postWorldsQuery(
  baseUrl: string,
  apiToken: string,
  body: WorldsQueryBody,
): Promise<PaginatedWorlds> {
  const response = await fetch(`${baseUrl}/api/worlds/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new WorldsRequestError(response.status);
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
    queryWorlds: (body) => postWorldsQuery(baseUrl, apiToken, body),
  });

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json' },
  });
}
