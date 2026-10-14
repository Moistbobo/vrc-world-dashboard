import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the alert dialog when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete list?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('exposes the title as the accessible name and the message as the description', () => {
    render(
      <ConfirmDialog
        open
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Delete list?' });
    expect(dialog).toHaveAccessibleDescription('Are you sure?');
  });

  it('moves focus into the dialog and restores it on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <ConfirmDialog
        open
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog');
    const focused = document.activeElement;
    expect(focused).not.toBe(trigger);
    expect(dialog.contains(focused) || focused === dialog).toBe(true);

    rerender(
      <ConfirmDialog
        open={false}
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus within the dialog while open', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const close = screen.getByRole('button', { name: /close/i });
    const cancel = screen.getByRole('button', { name: /^cancel$/i });
    const confirm = screen.getByRole('button', { name: /confirm/i });

    // First focusable is the close (×) button, followed by cancel and confirm.
    expect(document.activeElement).toBe(close);

    await user.tab();
    expect(document.activeElement).toBe(cancel);

    await user.tab();
    expect(document.activeElement).toBe(confirm);

    // Tab from the last element wraps back to the first.
    await user.tab();
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first element wraps back to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('does not move focus when closed', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    render(
      <ConfirmDialog
        open={false}
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(trigger);
  });

  it('calls onCancel when Escape is pressed while open', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete list?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
