import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListFormDialog } from './ListFormDialog';
import { MAX_LIST_MEMO_LENGTH } from '../../utils/listMemoValidation';

beforeEach(() => {
  document.body.innerHTML = '';
  window.localStorage.clear();
});

describe('ListFormDialog', () => {
  it('renders the overlay as a descendant of document.body', () => {
    const { container } = render(
      <ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  it('clears the form after a successful create', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ListFormDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={() => true}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('');
  });

  it('keeps the form when create fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ListFormDialog
        open={true}
        onOpenChange={onOpenChange}
        onSubmit={() => false}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
      'Favorites',
    );
  });

  it('renders create mode with empty name field', () => {
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('');
    expect(screen.queryByRole('textbox', { name: /icon/i })).not.toBeInTheDocument();
  });

  it('gives the memo textarea the same input styling as the title field', () => {
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /memo/i })).toHaveClass('input');
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveClass('input');
  });

  it('submits a new list', async () => {
    const onSubmit = vi.fn(() => true);
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Favorites' }),
    );
  });

  it('prevents submit when name is empty', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('announces the empty-name error and links it to the name field', async () => {
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const nameInput = screen.getByRole('textbox', { name: /name/i });

    await user.click(screen.getByRole('button', { name: /create/i }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/enter a list name/i);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', alert.id);

    await user.type(nameInput, 'F');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(nameInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('links the memo overflow error to the memo field and clears it on change', async () => {
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    const memo = screen.getByRole('textbox', { name: /memo/i });

    await user.type(memo, 'x'.repeat(MAX_LIST_MEMO_LENGTH + 1));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/512 characters or less/i);
    expect(memo).toHaveAttribute('aria-invalid', 'true');
    expect(memo).toHaveAttribute('aria-describedby', alert.id);

    await user.clear(memo);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fills fields for editing', () => {
    render(
      <ListFormDialog
        open={true}
        list={{
          id: 'l1',
          name: 'Old',
          icon: null,
          color: '#ff0000',
          memo: 'Existing memo',
          worldIds: [],
          createdAt: '',
          updatedAt: '',
        }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('Old');
    expect(screen.getByRole('textbox', { name: /memo/i })).toHaveValue(
      'Existing memo',
    );
  });

  it('submits the memo with the list', async () => {
    const onSubmit = vi.fn(() => true);
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.type(
      screen.getByRole('textbox', { name: /memo/i }),
      'my memo',
    );
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Favorites', memo: 'my memo' }),
    );
  });

  it('shows a live counter', async () => {
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: /memo/i }),
      'abc',
    );
    expect(screen.getByText('3 / 512')).toBeInTheDocument();
  });

  it('blocks save when the memo is over the limit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.type(
      screen.getByRole('textbox', { name: /memo/i }),
      'x'.repeat(MAX_LIST_MEMO_LENGTH + 1),
    );
    expect(screen.getByText(`${MAX_LIST_MEMO_LENGTH + 1} / 512`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog and restores it on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    const dialog = screen.getByRole('dialog');
    const focused = document.activeElement;
    expect(focused).not.toBe(trigger);
    expect(dialog.contains(focused)).toBe(true);

    rerender(
      <ListFormDialog open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus within the dialog while open', async () => {
    const user = userEvent.setup();
    render(
      <ListFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    const close = screen.getByRole('button', { name: /^close$/i });
    const cancel = screen.getByRole('button', { name: /^cancel$/i });
    const create = screen.getByRole('button', { name: /^create list$/i });
    const nameInput = screen.getByRole('textbox', { name: /name/i });

    // First focusable is the close (×) button; tabbing forward walks through
    // the form fields (name, color, memo) and ends on cancel + create.
    expect(document.activeElement).toBe(close);

    await user.tab();
    expect(document.activeElement).toBe(nameInput);

    // Tab all the way forward until we reach the create button (the last
    // focusable).
    for (let i = 0; i < 10; i++) {
      await user.tab();
      if (document.activeElement === create) break;
    }
    expect(document.activeElement).toBe(create);

    // Tab from the last element wraps back to the first.
    await user.tab();
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first element wraps back to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(create);

    // Sanity: cancel is also reachable via forward Tab from create.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(cancel);
  });

  it('calls onOpenChange(false) when Escape is pressed while open', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ListFormDialog open={true} onOpenChange={onOpenChange} onSubmit={vi.fn()} />,
    );

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
