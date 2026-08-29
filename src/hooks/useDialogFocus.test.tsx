import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

function makeFixture() {
  const trigger = document.createElement('button');
  trigger.textContent = 'trigger';
  document.body.appendChild(trigger);
  trigger.focus();

  return { trigger };
}

describe('useDialogFocus', () => {
  it('moves focus into the dialog when it opens', () => {
    const { trigger } = makeFixture();

    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open: true, containerRef: ref });
      return (
        <div ref={ref}>
          <button>first</button>
          <button>last</button>
        </div>
      );
    }

    render(<Harness />);

    const allButtons = document.querySelectorAll<HTMLButtonElement>('button');
    const first = Array.from(allButtons).find(
      (b) => b.textContent === 'first',
    )!;
    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(trigger);
  });

  it('restores focus to the trigger when the dialog closes', () => {
    const { trigger } = makeFixture();

    function Harness({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open, containerRef: ref });
      return (
        <div ref={ref}>
          <button>first</button>
        </div>
      );
    }

    const { rerender } = render(<Harness open={true} />);
    // Trigger now loses focus because we moved it into the dialog.
    expect(document.activeElement).not.toBe(trigger);

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(trigger);
  });

  it('does nothing when open is false on initial render', () => {
    const { trigger } = makeFixture();

    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open: false, containerRef: ref });
      return (
        <div ref={ref}>
          <button>first</button>
        </div>
      );
    }

    render(<Harness />);
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus inside the dialog while open', () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open: true, containerRef: ref });
      return (
        <div ref={ref}>
          <button>first</button>
          <button>last</button>
        </div>
      );
    }

    render(<Harness />);
    const buttons = document.querySelectorAll<HTMLButtonElement>('button');
    const first = buttons[0];
    const last = buttons[1];
    expect(document.activeElement).toBe(first);

    // Tab from the last element wraps to the first.
    last.focus();
    expect(document.activeElement).toBe(last);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(first);

    // Shift+Tab from the first element wraps to the last.
    first.focus();
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        }),
      );
    });
    expect(document.activeElement).toBe(last);
  });

  it('does not trap Tab when the dialog is closed', () => {
    function Harness({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open, containerRef: ref });
      return (
        <div ref={ref}>
          <button>first</button>
        </div>
      );
    }

    const { rerender } = render(<Harness open={true} />);
    rerender(<Harness open={false} />);

    const preventDefault = vi.fn();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('captures a fresh trigger each time the dialog opens', () => {
    const triggerA = document.createElement('button');
    triggerA.textContent = 'triggerA';
    document.body.appendChild(triggerA);
    triggerA.focus();

    function Harness({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open, containerRef: ref });
      return (
        <div ref={ref}>
          <button>inside</button>
        </div>
      );
    }

    const { rerender } = render(<Harness open={true} />);
    const inside = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent === 'inside')!;
    expect(document.activeElement).toBe(inside);

    // Close → focus returns to triggerA.
    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(triggerA);

    // Move focus to a new trigger and reopen; the new trigger should be restored.
    const triggerB = document.createElement('button');
    triggerB.textContent = 'triggerB';
    document.body.appendChild(triggerB);
    triggerB.focus();

    rerender(<Harness open={true} />);
    expect(document.activeElement).toBe(inside);

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(triggerB);
  });

  it('places focus on the container when no focusable children exist', () => {
    makeFixture();

    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open: true, containerRef: ref });
      return <div ref={ref}>static content only</div>;
    }

    const { container: root } = render(<Harness />);
    const dialogContainer = root.querySelector<HTMLDivElement>('div')!;
    expect(document.activeElement).toBe(dialogContainer);
    expect(dialogContainer.getAttribute('tabindex')).toBe('-1');
  });

  it('focuses initialFocusRef when provided and provided element is in the container', () => {
    makeFixture();

    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLInputElement>(null);
      useDialogFocus({ open: true, containerRef: ref, initialFocusRef: inputRef });
      return (
        <div ref={ref}>
          <button>first</button>
          <input ref={inputRef} aria-label="search" />
        </div>
      );
    }

    render(<Harness />);
    const input = document.querySelector<HTMLInputElement>('input')!;
    expect(document.activeElement).toBe(input);
  });

  it('falls back to the first focusable element when initialFocusRef is null', () => {
    const { trigger } = makeFixture();

    function Harness({ showInput }: { showInput: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLInputElement>(null);
      useDialogFocus({ open: true, containerRef: ref, initialFocusRef: inputRef });
      return (
        <div ref={ref}>
          <button>first</button>
          {showInput && <input ref={inputRef} aria-label="search" />}
        </div>
      );
    }

    render(<Harness showInput={false} />);
    const first = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent === 'first')!;
    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(trigger);
  });

  it('calls onClose when Escape is pressed while open', () => {
    const onClose = vi.fn();

    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open: true, containerRef: ref, onClose });
      return (
        <div ref={ref}>
          <button>inside</button>
        </div>
      );
    }

    render(<Harness />);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the dialog is closed', () => {
    const onClose = vi.fn();

    function Harness({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus({ open, containerRef: ref, onClose });
      return (
        <div ref={ref}>
          <button>inside</button>
        </div>
      );
    }

    const { rerender } = render(<Harness open={true} />);
    rerender(<Harness open={false} />);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
