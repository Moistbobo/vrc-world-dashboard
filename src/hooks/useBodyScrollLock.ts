import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

/**
 * Locks page scroll while `locked` is true. The background page scrolls on the
 * document itself, so `overflow: hidden` resets the scroll position in some
 * browsers; we record it before locking and restore it after unlocking.
 *
 * The lock is ref-counted across consumers so a nested dialog (e.g. the
 * create-list form opened from the save-to-list dialog) does not unlock the
 * page when only the inner dialog closes.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) {
      const { body, documentElement } = document;
      savedScrollY = window.scrollY;
      body.style.overflow = 'hidden';
      documentElement.style.overflow = 'hidden';
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const { body, documentElement } = document;
        body.style.overflow = '';
        documentElement.style.overflow = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [locked]);
}
