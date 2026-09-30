import { useCallback, useSyncExternalStore } from 'react';

function getSnapshot(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

function subscribe(query: string, onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

/**
 * Tracks whether a CSS media query currently matches. Backed by
 * `matchMedia` so the value updates when the viewport crosses the breakpoint,
 * and falls back to `false` when `matchMedia` is unavailable (e.g. jsdom).
 */
export function useMediaQuery(query: string): boolean {
  const subscribeToQuery = useCallback(
    (onStoreChange: () => void) => subscribe(query, onStoreChange),
    [query],
  );
  const getMatch = useCallback(() => getSnapshot(query), [query]);
  return useSyncExternalStore(subscribeToQuery, getMatch, () => false);
}
