import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportDialog } from './ImportDialog';
import * as listsImportExport from '../../utils/listsImportExport';

vi.mock('../../utils/listsImportExport', async () => {
  const actual = await vi.importActual('../../utils/listsImportExport');
  return {
    ...actual,
    validateWorldIds: vi.fn(),
  };
});

const sampleList = {
  id: 'l1',
  name: 'Favorites',
  icon: null,
  color: '#4f46e5',
  worldIds: ['wrld_1'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const onOpenChange = vi.fn();
  const onImport = vi.fn();
  return {
    user: userEvent.setup(),
    onOpenChange,
    onImport,
    render: () =>
      render(
        <ImportDialog
          open
          existingLists={[]}
          onOpenChange={onOpenChange}
          onImport={onImport}
        />,
      ),
  };
}

function createJsonFile(contents: object, name = 'backup.json') {
  const blob = new Blob([JSON.stringify(contents)], {
    type: 'application/json',
  });
  return new File([blob], name, { type: 'application/json' });
}

describe('ImportDialog', () => {
  it('shows transfer screen', () => {
    setup().render();
    expect(screen.getByText(/transfer your lists/i)).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when close button clicked', async () => {
    const { user, onOpenChange, render } = setup();
    render();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows preview after dropping a valid file', async () => {
    vi.mocked(listsImportExport.validateWorldIds).mockImplementation(
      async (ids) => ids,
    );
    const { onImport, render } = setup();
    render();
    const dropZone = screen.getByText(/drag and drop/i).parentElement!;
    const file = createJsonFile({ version: 1, lists: [sampleList] });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(await screen.findByText(/import preview/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import 1 list/i }));
    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: sampleList.id,
          name: sampleList.name,
          worldIds: sampleList.worldIds,
        }),
      ]),
      'backup.json',
    );
  });

  it('shows error for invalid json', async () => {
    const { render } = setup();
    render();
    const dropZone = screen.getByText(/drag and drop/i).parentElement!;
    const file = createJsonFile({ version: 1, lists: [{ id: 'bad' }] });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(await screen.findByText(/could not import/i)).toBeInTheDocument();
  });

  it('announces import errors and links them to the file input', async () => {
    const { render } = setup();
    render();
    const dropZone = screen.getByText(/drag and drop/i).parentElement!;
    const file = createJsonFile({ version: 1, lists: [{ id: 'bad' }] });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no valid lists/i);
    expect(screen.getByLabelText(/import from file/i)).toHaveAttribute(
      'aria-describedby',
      alert.id,
    );
  });

  it('announces the validating state while world ids are checked', async () => {
    let resolveIds: (ids: string[]) => void = () => {};
    vi.mocked(listsImportExport.validateWorldIds).mockImplementation(
      (ids) =>
        new Promise((resolve) => {
          resolveIds = () => resolve(ids);
        }),
    );
    const { render } = setup();
    render();
    const dropZone = screen.getByText(/drag and drop/i).parentElement!;
    const file = createJsonFile({ version: 1, lists: [sampleList] });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(await screen.findByRole('status')).toHaveTextContent(/checking worlds/i);
    resolveIds([]);
  });

  it('warns when worlds are removed after API validation', async () => {
    vi.mocked(listsImportExport.validateWorldIds).mockImplementation(
      async (ids) => ids.filter((id) => id === 'wrld_1'),
    );
    const { render } = setup();
    render();
    const dropZone = screen.getByText(/drag and drop/i).parentElement!;
    const file = createJsonFile({
      version: 1,
      lists: [{ ...sampleList, worldIds: ['wrld_1', 'wrld_deleted'] }],
    });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(
      await screen.findByText(/world\(s\) were not found/i),
    ).toBeInTheDocument();
  });

  it('moves focus into the dialog and restores it on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ImportDialog
        open
        existingLists={[]}
        onOpenChange={onOpenChange}
        onImport={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const focused = document.activeElement;
    expect(focused).not.toBe(trigger);
    expect(dialog.contains(focused)).toBe(true);

    rerender(
      <ImportDialog
        open={false}
        existingLists={[]}
        onOpenChange={onOpenChange}
        onImport={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus within the dialog while open', async () => {
    const user = userEvent.setup();
    setup().render();

    const close = screen.getByRole('button', { name: /^close$/i });
    const importBtn = screen.getByRole('button', { name: /import from file/i });

    // First focusable is the close (×) button, followed by the import-from-file
    // button. The hidden file input is excluded from the focusable list.
    expect(document.activeElement).toBe(close);

    await user.tab();
    expect(document.activeElement).toBe(importBtn);

    // Tab from the last element wraps back to the first.
    await user.tab();
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first element wraps back to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(importBtn);
  });

  it('calls onOpenChange(false) when Escape is pressed while open', async () => {
    const { user, onOpenChange, render } = setup();
    render();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
