import { useEffect, useState } from 'react';
import { getStoredApiToken } from '../utils/tokenStorage';

export function useStoredApiToken(): string {
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(getStoredApiToken());
  }, []);

  return token;
}
