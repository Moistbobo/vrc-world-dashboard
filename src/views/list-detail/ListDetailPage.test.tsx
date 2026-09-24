import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { ListsProvider } from '../../contexts/ListsContext';
import { ListsPreferencesProvider } from '../../contexts/ListsPreferencesContext';
import { ListDetailPage } from './ListDetailPage';
import { resetListsDb, seedListsDb } from '../../test/listsDb';
import * as client from '../../api/client';
import type { World } from '../../types';
import type { WorldList } from '../../types/lists';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function makeList(overrides: Partial<WorldList> & Pick<WorldList, 'id' | 'name'>): WorldList {
  return {
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
  queryClient.clear();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ListsPreferencesProvider>
          <ListsProvider>{children}</ListsProvider>
        </ListsPreferencesProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderList(listId: string) {
  return render(
    <Wrapper>
      <Routes>
        <Route path="/" element={<ListDetailPage listId={listId} />} />
      </Routes>
    </Wrapper>,
  );
}

describe('ListDetailPage', () => {
  it('renders a full short memo without a toggle', async () => {
    await seedListsDb([makeList({ id: 'l1', name: 'Favorites', memo: 'Short memo' })]);
    renderList('l1');

    await screen.findByText('Short memo');
    expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument();
  });

  it('truncates a long memo and reveals the full text via the toggle', async () => {
    const longMemo = 'x'.repeat(200);
    await seedListsDb([makeList({ id: 'l1', name: 'Favorites', memo: longMemo })]);

    const user = userEvent.setup();
    renderList('l1');

    const preview = await screen.findByText(/^x{128}…$/);
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveClass('break-words');
    expect(screen.queryByText(longMemo)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view more/i }));
    expect(screen.getByText(longMemo)).toBeInTheDocument();
    expect(screen.queryByText(/^x{128}…$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view less/i }));
    expect(screen.queryByText(longMemo)).not.toBeInTheDocument();
  });

  it('shows empty state for a list with no worlds', async () => {
    await seedListsDb([makeList({ id: 'l1', name: 'Favorites' })]);
    renderList('l1');
    expect(
      await screen.findByText(/no worlds in this list/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /browse worlds/i }),
    ).toBeInTheDocument();
  });

  it('uses the singular world count label for a single-world list', async () => {
    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_1'] }),
    ]);
    renderList('l1');
    expect(await screen.findByText('1 world')).toBeInTheDocument();
  });

  it('uses the plural world count label for a multi-world list', async () => {
    await seedListsDb([
      makeList({
        id: 'l1',
        name: 'Favorites',
        worldIds: ['wrld_1', 'wrld_2'],
      }),
    ]);
    renderList('l1');
    expect(await screen.findByText('2 worlds')).toBeInTheDocument();
  });

  it('navigates to the worlds page from the empty state', async () => {
    await seedListsDb([makeList({ id: 'l1', name: 'Favorites' })]);
    render(
      <Wrapper>
        <Routes>
          <Route path="/" element={<ListDetailPage listId="l1" />} />
          <Route path="/worlds" element={<div>Worlds route</div>} />
        </Routes>
      </Wrapper>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /browse worlds/i }));
    expect(screen.getByText(/worlds route/i)).toBeInTheDocument();
  });

  it('renders a saved world using WorldCard', async () => {
    const world: World = {
      worldId: 'wrld_1',
      name: 'Saved World',
      authorName: 'Author',
      capacity: 10,
      platforms: ['pc'],
      tags: [],
      imageUrl: 'https://example.com/image.jpg',
      vrchatUrl: 'https://vrchat.com/home/world/wrld_1',
      quality: 'good',
      createdAt: '2024-01-01',
      internalAddDate: '2024-02-01',
    };
    vi.spyOn(client, 'fetchWorldsByIds').mockResolvedValue([world]);

    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_1'] }),
    ]);
    renderList('l1');

    await waitFor(() => {
      expect(screen.getByText('Saved World')).toBeInTheDocument();
    });

    expect(screen.getByAltText('Saved World')).toHaveAttribute(
      'src',
      'https://wsrv.nl/?url=https%3A%2F%2Fexample.com%2Fimage.jpg&w=280&output=webp&q=65',
    );
    expect(
      screen.getByRole('link', { name: /open in vrchat/i }),
    ).toHaveAttribute('href', 'https://vrchat.com/home/world/wrld_1');
    expect(
      screen.getByRole('button', { name: /remove world from list/i }),
    ).toBeInTheDocument();
  });

  it('removes a world from the list when the remove button is clicked', async () => {
    const world: World = {
      worldId: 'wrld_1',
      name: 'Saved World',
      authorName: 'Author',
      capacity: 10,
      platforms: ['pc'],
      tags: [],
      imageUrl: '',
      vrchatUrl: '',
      quality: 'good',
      createdAt: '2024-01-01',
      internalAddDate: '2024-02-01',
    };
    vi.spyOn(client, 'fetchWorldsByIds').mockResolvedValue([world]);

    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_1'] }),
    ]);
    renderList('l1');

    await waitFor(() => {
      expect(screen.getByText('Saved World')).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole('button', { name: /remove world from list/i }),
    );

    expect(screen.getByText(/remove world/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Saved World')).not.toBeInTheDocument();
    });
  });

  it('paginates worlds and only fetches the current page', async () => {
    const fetchSpy = vi.spyOn(client, 'fetchWorldsByIds').mockResolvedValue([]);

    const ids = Array.from({ length: 35 }, (_, i) => `wrld_${i}`);
    await seedListsDb([makeList({ id: 'l1', name: 'Big List', worldIds: ids })]);
    renderList('l1');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(ids.slice(0, 28));
    });

    expect(screen.getByText(/of 35/i)).toBeInTheDocument();
  });

  it('renders a deleted-world placeholder card for IDs missing from the fetch', async () => {
    const world: World = {
      worldId: 'wrld_1',
      name: 'Saved World',
      authorName: 'Author',
      capacity: 10,
      platforms: ['pc'],
      tags: [],
      imageUrl: '',
      vrchatUrl: '',
      quality: 'good',
      createdAt: '2024-01-01',
      internalAddDate: '2024-02-01',
    };
    vi.spyOn(client, 'fetchWorldsByIds').mockResolvedValue([world]);

    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_1', 'wrld_gone'] }),
    ]);
    renderList('l1');

    await waitFor(() => {
      expect(screen.getByText('Saved World')).toBeInTheDocument();
    });

    expect(screen.getByText(/world deleted from db/i)).toBeInTheDocument();
    expect(screen.getByText('wrld_gone')).toBeInTheDocument();
  });

  it('suppresses placeholder cards when the world fetch fails', async () => {
    vi.spyOn(client, 'fetchWorldsByIds').mockRejectedValue(
      new Error('network down'),
    );

    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_gone'] }),
    ]);
    renderList('l1');

    await waitFor(() => {
      expect(client.fetchWorldsByIds).toHaveBeenCalled();
    });

    expect(
      screen.queryByText(/world deleted from db/i),
    ).not.toBeInTheDocument();
  });

  it('removes a deleted world via the confirmation dialog', async () => {
    vi.spyOn(client, 'fetchWorldsByIds').mockResolvedValue([]);

    await seedListsDb([
      makeList({ id: 'l1', name: 'Favorites', worldIds: ['wrld_gone'] }),
    ]);
    renderList('l1');

    await waitFor(() => {
      expect(screen.getByText(/world deleted from db/i)).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole('button', { name: /remove world from list/i }),
    );
    expect(screen.getByText(/remove world/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove$/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/world deleted from db/i),
      ).not.toBeInTheDocument();
    });
  });
});
