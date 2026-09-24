import { useSyncExternalStore } from 'react';

interface TestLocation {
  pathname: string;
  search: string;
  params: Record<string, string>;
}

let location: TestLocation = { pathname: '/', search: '', params: {} };
let stack: string[] = ['/'];
let index = 0;
let cachedParams = new URLSearchParams();
const listeners = new Set<() => void>();

function emit() {
  cachedParams = new URLSearchParams(location.search);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applyHref(href: string) {
  window.history.replaceState({}, '', href);
  const url = new URL(href, 'http://localhost');
  location = { pathname: url.pathname, search: url.search, params: location.params };
  emit();
}

function setHistoryDepth(depth: number) {
  try {
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: depth,
    });
  } catch {
    // jsdom may refuse to redefine History.length; harmless for the tests that
    // do not depend on it.
  }
}

export function seedRoute(href: string) {
  stack = [href];
  index = 0;
  applyHref(href);
  setHistoryDepth(1);
}

export function seedRouteStack(entries: string[]) {
  const last = entries[entries.length - 1] ?? '/';
  stack = [...entries];
  index = stack.length - 1;
  applyHref(last);
  setHistoryDepth(entries.length);
}

export function setTestRoute(next: Partial<TestLocation>) {
  if (next.pathname !== undefined) location.pathname = next.pathname;
  if (next.search !== undefined) location.search = next.search;
  if (next.params !== undefined) location.params = next.params;
  stack = [`${location.pathname}${location.search}`];
  index = 0;
  emit();
}

export function resetTestRoute() {
  location = { pathname: '/', search: '', params: {} };
  stack = ['/'];
  index = 0;
  cachedParams = new URLSearchParams();
  setHistoryDepth(1);
}

export const testRouter = {
  push(href: string) {
    stack = stack.slice(0, index + 1);
    stack.push(href);
    index = stack.length - 1;
    applyHref(href);
  },
  replace(href: string) {
    stack[index] = href;
    applyHref(href);
  },
  back() {
    if (index > 0) {
      index -= 1;
      applyHref(stack[index]);
    }
  },
  forward() {
    if (index < stack.length - 1) {
      index += 1;
      applyHref(stack[index]);
    }
  },
  refresh() {},
  prefetch() {},
};

export function useTestPathname() {
  return useSyncExternalStore(subscribe, () => location.pathname);
}

export function useTestSearchString() {
  return useSyncExternalStore(subscribe, () => location.search);
}

export function useTestParams() {
  return location.params;
}

export function useTestSearchParams() {
  return useSyncExternalStore(subscribe, () => cachedParams);
}
