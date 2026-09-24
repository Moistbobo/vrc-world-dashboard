import { useMe } from './useApi';
import { useStoredApiToken } from './useStoredApiToken';

export function useCanManageCurator(): boolean {
  const { data: me, isError: meError } = useMe();
  const hasEnteredToken = Boolean(useStoredApiToken());
  return hasEnteredToken && !meError && (me?.permissions.includes('worlds:write') ?? false);
}
