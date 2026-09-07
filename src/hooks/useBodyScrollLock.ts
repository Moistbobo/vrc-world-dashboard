import { useEffect, useRef } from 'react';

/**
 * Locks page scroll while `locked` is true. The background page scrolls on the
 * document itself, so `overflow: hidden` resets the scroll position in some
 * browsers; we record it before locking and restore it after unlocking.
 */
export function useBodyScrollLock(locked: boolean) {
  const savedScrollY = useRef(0);

  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    savedScrollY.current = window.scrollY;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = '';
      documentElement.style.overflow = '';
      window.scrollTo(0, savedScrollY.current);
    };
  }, [locked]);
}
