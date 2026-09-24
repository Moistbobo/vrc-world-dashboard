export const API_TOKEN_STORAGE_KEY = 'sos-api-token';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getStoredApiToken(): string {
  const saved = getStorage()?.getItem(API_TOKEN_STORAGE_KEY);
  return saved?.trim() ?? '';
}

export function setStoredApiToken(token: string): void {
  const storage = getStorage();
  if (!storage) return;
  const trimmed = token.trim();
  if (trimmed) {
    storage.setItem(API_TOKEN_STORAGE_KEY, trimmed);
  } else {
    storage.removeItem(API_TOKEN_STORAGE_KEY);
  }
}

export function clearStoredApiToken(): void {
  getStorage()?.removeItem(API_TOKEN_STORAGE_KEY);
}
