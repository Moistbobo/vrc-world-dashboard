import { useMe } from './useApi';
import { getStoredApiToken } from '../utils/tokenStorage';

export function useCanManageCurator(): boolean {
  const { data: me, isError: meError } = useMe();
  const hasEnteredToken = Boolean(getStoredApiToken());
  return hasEnteredToken && !meError && (me?.permissions.includes('worlds:write') ?? false);
}
