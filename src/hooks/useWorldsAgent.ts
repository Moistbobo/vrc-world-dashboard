import type { WorldsAgentRequest, WorldsAgentResponse } from '../types';
import { postWorldsAgent } from '../api/agentClient';
import { useApiMutation } from './useApiToasts';

export function useWorldsAgent() {
  return useApiMutation<WorldsAgentResponse, Error, WorldsAgentRequest>({
    mutationFn: (body) => postWorldsAgent(body),
    retry: false,
    suppressErrorToast: true,
  });
}
