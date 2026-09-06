import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useBodyScrollLock } from './useBodyScrollLock';

beforeEach(() => {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
});

afterEach(() => {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  vi.unstubAllGlobals();
});

function Harness({ open }: { open: boolean }) {
  useBodyScrollLock(open);
  return null;
}

describe('useBodyScrollLock', () => {
  it('sets overflow hidden on body and documentElement while open', () => {
    render(<Harness open={true} />);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('does nothing when open is false on initial render', () => {
    render(<Harness open={false} />);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('restores overflow and scroll position when it closes', () => {
    Object.defineProperty(window, 'scrollY', { value: 4242, configurable: true });
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    const { rerender } = render(<Harness open={true} />);
    rerender(<Harness open={false} />);

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 4242);
  });

  it('records the scroll position captured at lock time, not at unlock time', () => {
    let scrollY = 100;
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
    const scrollTo = vi.fn((_x: number, y: number) => {
      scrollY = y;
    });
    vi.stubGlobal('scrollTo', scrollTo);

    const { rerender } = render(<Harness open={true} />);
    scrollY = 9999;
    rerender(<Harness open={false} />);

    expect(scrollTo).toHaveBeenCalledWith(0, 100);
  });
});
