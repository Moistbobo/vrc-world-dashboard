import type { WorldsAgentRequest, WorldsAgentResponse } from '../types';
import { getStoredApiToken } from '../utils/tokenStorage';

export { toWhereParam } from '../../api/agent-query';

export async function postWorldsAgent(
  body: WorldsAgentRequest,
  signal?: AbortSignal,
): Promise<WorldsAgentResponse> {
  const token = getStoredApiToken();
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  return (await response.json()) as WorldsAgentResponse;
}
