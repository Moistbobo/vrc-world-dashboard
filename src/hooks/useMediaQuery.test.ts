import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

type ChangeListener = () => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mediaQueryList = {
    matches: initialMatches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: vi.fn((_type: string, listener: ChangeListener) => listeners.delete(listener)),
    dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mediaQueryList) as unknown as typeof window.matchMedia;
  return {
    mediaQueryList,
    setMatches(next: boolean) {
      mediaQueryList.matches = next;
      act(() => {
        listeners.forEach((listener) => listener());
      });
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('useMediaQuery', () => {
  it('returns the current match on mount', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('re-renders when the media query changes', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);
    media.setMatches(true);
    expect(result.current).toBe(true);
  });

  it('unsubscribes from change events on unmount', () => {
    const media = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    unmount();
    expect(media.mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('returns false when matchMedia is unavailable', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });
});
