import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

interface UseDialogFocusOptions {
  /**
   * Whether the dialog is currently open. When false, the hook is a no-op.
   */
  open: boolean;
  /**
   * Ref pointing at the dialog container. The hook will move focus into this
   * container, trap Tab/Shift+Tab inside it, and return focus to the trigger on
   * close.
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Optional ref pointing at the element that should receive focus when the
   * dialog opens (e.g. the dialog's primary input). When it is set and
   * connected inside the container it wins over the first focusable element;
   * otherwise focus falls back to the existing behaviour.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /**
   * Optional callback invoked when the user presses Escape while the dialog is
   * open. Pass the dialog's close handler to make Escape dismiss the dialog.
   */
  onClose?: () => void;
}

/**
 * Shared focus-management for modal dialogs.
 *
 * Behaviour:
 *   1. When `open` becomes true, remembers the element that currently has focus
 *      (the trigger), then moves focus into the dialog. If `initialFocusRef`
 *      points at an element inside the dialog, that element is focused;
 *      otherwise the first focusable element is. If the container has no
 *      focusable descendants, focus is placed on the container itself.
 *   2. While the dialog is open, Tab and Shift+Tab cycle within the dialog, and
 *      pressing Escape invokes the optional `onClose` callback (so the dialog
 *      closes itself).
 *   3. When `open` becomes false, focus is restored to the trigger that was
 *      active when the dialog opened.
 */
export function useDialogFocus({
  open,
  containerRef,
  initialFocusRef,
  onClose,
}: UseDialogFocusOptions): void {
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Capture the trigger on the open transition and move focus into the dialog.
  useEffect(() => {
    if (!open) {
      return;
    }

    // Only capture the trigger on the open transition, so closing-and-reopening
    // the dialog quickly (e.g. toggling create-list from inside the parent
    // dialog) doesn't overwrite the trigger we still need to restore to.
    if (!wasOpenRef.current) {
      const previousActive = document.activeElement as HTMLElement | null;
      // Don't treat a focus call originating inside the dialog as a "trigger".
      if (previousActive && !containerRef.current?.contains(previousActive)) {
        triggerRef.current = previousActive;
      } else {
        triggerRef.current = null;
      }
      wasOpenRef.current = true;

      const container = containerRef.current;
      if (container) {
        const initial = initialFocusRef?.current;
        if (initial && container.contains(initial)) {
          initial.focus();
        } else {
          const focusables = getFocusable(container);
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            container.setAttribute('tabindex', '-1');
            container.focus();
          }
        }
      }
    }
  }, [open, containerRef, initialFocusRef]);

  // Focus trap while the dialog is open.
  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = getFocusable(container!);
      if (focusables.length === 0) {
        event.preventDefault();
        container!.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container!.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container!.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, containerRef, onClose]);

  // Restore focus when the dialog closes (or the hook unmounts while open).
  useEffect(() => {
    if (open) return;
    if (!wasOpenRef.current) return;

    const trigger = triggerRef.current;
    wasOpenRef.current = false;
    triggerRef.current = null;

    if (!trigger) return;
    if (!trigger.isConnected) return;
    trigger.focus();
  }, [open]);

  // Also restore focus if the dialog hook unmounts while open (e.g. when the
  // dialog is conditionally rendered and the parent flips `open` back to false
  // while keeping the same component, or when the dialog is torn down on close).
  useEffect(() => {
    return () => {
      if (!wasOpenRef.current) return;
      const trigger = triggerRef.current;
      wasOpenRef.current = false;
      triggerRef.current = null;
      if (!trigger) return;
      if (!trigger.isConnected) return;
      trigger.focus();
    };
  }, []);
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => isVisible(el));
}

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  // Treat elements explicitly hidden via Tailwind's `hidden` / `invisible`
  // utility classes (display:none / visibility:hidden) as non-focusable so we
  // match real-browser behaviour where such elements are skipped by Tab.
  const className = el.className;
  if (typeof className === 'string') {
    const tokens = className.split(/\s+/);
    if (tokens.includes('hidden') || tokens.includes('invisible')) return false;
  }
  return true;
}
