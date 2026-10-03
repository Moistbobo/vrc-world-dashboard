import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListsProvider, useLists } from '../../contexts/ListsContext';
import { SaveToListDialog } from './SaveToListDialog';
import { resetListsDb, seedListsDb } from '../../test/listsDb';
import type { WorldList } from '../../types/lists';

function makeList(id: string, name: string, overrides: Partial<WorldList> = {}): WorldList {
  return {
    id,
    name,
    icon: null,
    color: '#4f46e5',
    worldIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  window.localStorage.clear();
  await resetListsDb();
});

function HydrationProbe() {
  const { isHydrated } = useLists();
  return <span data-testid="hydrated">{isHydrated ? 'yes' : 'no'}</span>;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ListsProvider>
      <HydrationProbe />
      {children}
    </ListsProvider>
  );
}

async function renderDialog() {
  const result = render(
    <SaveToListDialog worldId="wrld_1" open={true} onOpenChange={vi.fn()} />,
    { wrapper: Wrapper },
  );
  await screen.findByRole('dialog', undefined, { timeout: 2000 });
  await screen.findByText(/create new list/i, undefined, { timeout: 2000 });
  // Wait for ListsProvider to finish its async IndexedDB hydration; the
  // dialog is rendered before hydration completes and the seeded list rows
  // only appear after `lists` state is populated.
  await screen.findByTestId('hydrated', undefined, { timeout: 2000 });
  await waitFor(
    () => {
      expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    },
    { timeout: 2000 },
  );
  return result;
}

describe('SaveToListDialog', () => {
  it('renders the nested create-list dialog as a descendant of document.body', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await user.click(screen.getByRole('button', { name: /create new list/i }));
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(2);
    expect(document.body).toContainElement(dialogs[1]);
  });

  it('shows empty state when no lists exist', async () => {
    await renderDialog();
    expect(screen.getByText(/haven't created any lists/i)).toBeInTheDocument();
  });

  it('exposes the dialog title as its accessible name', async () => {
    await renderDialog();
    expect(
      screen.getByRole('dialog', { name: /save to list/i }),
    ).toBeInTheDocument();
  });

  it('closes only the create-list dialog on the first Escape', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await user.click(screen.getByRole('button', { name: /create new list/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    await user.keyboard('{Escape}');

    const remaining = screen.getAllByRole('dialog');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAccessibleName(/save to list/i);
  });

  it('displays world count for each list', async () => {
    await seedListsDb([makeList('list-1', 'Favorites', { worldIds: ['wrld_0'] })]);
    await renderDialog();

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('toggles a world in a list', async () => {
    await seedListsDb([makeList('list-1', 'Favorites')]);
    const user = userEvent.setup();
    await renderDialog();

    const checkbox = screen.getByRole('checkbox', { name: /favorites/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('creates a new list and adds the world to it', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await user.click(screen.getByRole('button', { name: /create new list/i }));
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Favorites');
    await user.click(screen.getByRole('button', { name: /create list/i }));

    const checkbox = screen.getByRole('checkbox', { name: /favorites/i });
    expect(checkbox).toBeChecked();
  });

  it('shows many lists without a cap guard', async () => {
    await seedListsDb(
      Array.from({ length: 12 }, (_, i) => makeList(`list-${i}`, `List ${i}`)),
    );
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByRole('button', { name: /create new list/i }));
    expect(
      screen.getByRole('textbox', { name: /name/i }),
    ).toBeInTheDocument();
  });

  it('moves focus into the dialog when opened', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <SaveToListDialog worldId="wrld_1" open={true} onOpenChange={vi.fn()} />,
      { wrapper: Wrapper },
    );
    await screen.findByRole('dialog');

    const focused = document.activeElement;
    expect(focused).not.toBe(trigger);
    expect(focused).not.toBe(document.body);
    expect(document.body.contains(focused)).toBe(true);

    rerender(
      <SaveToListDialog worldId="wrld_1" open={false} onOpenChange={vi.fn()} />,
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus within the dialog while open', async () => {
    const user = userEvent.setup();
    await renderDialog();

    const close = screen.getByRole('button', { name: /close/i });
    const done = screen.getByRole('button', { name: /done/i });

    done.focus();
    expect(document.activeElement).toBe(done);
    await user.tab();
    expect(document.activeElement).toBe(close);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(done);
  });

  it('calls onOpenChange(false) when Escape is pressed while open', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SaveToListDialog worldId="wrld_1" open={true} onOpenChange={onOpenChange} />,
      { wrapper: Wrapper },
    );
    await screen.findByRole('dialog', undefined, { timeout: 2000 });
    await screen.findByTestId('hydrated', undefined, { timeout: 2000 });

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
