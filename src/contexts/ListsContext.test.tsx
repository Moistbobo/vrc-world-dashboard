import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ListsProvider, useLists } from './ListsContext';
import * as listsImportExport from '../utils/listsImportExport';
import { getAllLists } from '../utils/listsDb';
import { resetListsDb, seedListsDb } from '../test/listsDb';
import type { WorldList } from '../types/lists';

function makeList(id: string, name: string, overrides: Partial<WorldList> = {}): WorldList {
  return {
    id,
    name,
    icon: null,
    color: '#ffffff',
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

async function seedLists(count: number) {
  await seedListsDb(
    Array.from({ length: count }, (_, i) => makeList(`list-${i}`, `List ${i}`)),
  );
}

function TestHelper() {
  const {
    lists,
    isHydrated,
    createList,
    updateList,
    addWorldToList,
    isWorldInAnyList,
    exportList,
    importLists,
  } = useLists();
  return (
    <div>
      <span data-testid="hydrated">{isHydrated ? 'yes' : 'no'}</span>
      <span data-testid="count">{lists.length}</span>
      <span data-testid="memo">{lists[0]?.memo ?? 'none'}</span>
      <button type="button" onClick={() => createList({ name: 'Favorites' })}>Create</button>
      <button type="button" onClick={() => createList({ name: 'WithMemo', memo: '  hi  ' })}>
        CreateWithMemo
      </button>
      <button type="button"
        onClick={() =>
          updateList(lists[0]?.id ?? '', { memo: '  my notes  ' })
        }
      >
        SetMemo
      </button>
      <button type="button" onClick={() => updateList(lists[0]?.id ?? '', { memo: null })}>
        ClearMemo
      </button>
      <button type="button" onClick={() => addWorldToList(lists[0]?.id, 'wrld_1')}>
        Add
      </button>
      <span data-testid="saved">
        {isWorldInAnyList('wrld_1') ? 'yes' : 'no'}
      </span>
      <button type="button"
        onClick={() =>
          exportList({
            id: 'exp1',
            name: 'Exportable',
            icon: null,
            color: '#ffffff',
            worldIds: ['wrld_2'],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          })
        }
      >
        Export
      </button>
      <button type="button"
        onClick={() =>
          importLists([
            {
              id: 'imp1',
              name: 'Imported',
              icon: null,
              color: '#ffffff',
              worldIds: ['wrld_1'],
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ])
        }
      >
        Import
      </button>
    </div>
  );
}

async function renderHydrated() {
  const result = render(
    <ListsProvider>
      <TestHelper />
    </ListsProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId('hydrated').textContent).toBe('yes'),
  );
  return result;
}

describe('ListsContext', () => {
  it('starts empty after hydration', async () => {
    await renderHydrated();
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(await getAllLists()).toHaveLength(0);
  });

  it('hydrates lists from IndexedDB', async () => {
    await seedLists(2);
    await renderHydrated();
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('creates a list and persists it', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    expect(screen.getByTestId('count').textContent).toBe('1');
    await waitFor(async () => {
      const stored = await getAllLists();
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Favorites');
    });
  });

  it('stores a trimmed memo when creating', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('CreateWithMemo'));
    expect(screen.getByTestId('memo').textContent).toBe('hi');
    await waitFor(async () => {
      const stored = await getAllLists();
      expect(stored[0].memo).toBe('hi');
    });
  });

  it('sets and trims a memo on update', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('SetMemo'));
    expect(screen.getByTestId('memo').textContent).toBe('my notes');
    await waitFor(async () => {
      const stored = await getAllLists();
      expect(stored[0].memo).toBe('my notes');
    });
  });

  it('clears a memo on update', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('SetMemo'));
    fireEvent.click(screen.getByText('ClearMemo'));
    expect(screen.getByTestId('memo').textContent).toBe('none');
    await waitFor(async () => {
      const stored = await getAllLists();
      expect(stored[0].memo).toBeNull();
    });
  });

  it('adds a world to a list', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('saved').textContent).toBe('yes');
    await waitFor(async () => {
      const stored = await getAllLists();
      expect(stored[0].worldIds).toEqual(['wrld_1']);
    });
  });

  it('exports lists', async () => {
    vi.spyOn(listsImportExport, 'serializeLists').mockReturnValue('{}');
    vi.spyOn(listsImportExport, 'makeExportFilename').mockReturnValue(
      'sosd-exportable-1.json',
    );
    const downloadJson = vi
      .spyOn(listsImportExport, 'downloadJson')
      .mockImplementation(() => {});

    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('Export'));
    expect(downloadJson).toHaveBeenCalledWith(
      'sosd-exportable-1.json',
      '{}',
    );
  });

  it('imports lists by id merge', async () => {
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('allows creating lists beyond the former cap', async () => {
    await seedLists(10);
    await renderHydrated();
    fireEvent.click(screen.getByText('Create'));
    expect(screen.getByTestId('count').textContent).toBe('11');
  });

  it('allows imports beyond the former cap', async () => {
    await seedLists(10);
    await renderHydrated();
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByTestId('count').textContent).toBe('11');
  });
});
