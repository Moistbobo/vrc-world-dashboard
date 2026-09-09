import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { WorldsPage } from './WorldsPage';
import { WorldsPreferencesProvider } from '../../contexts/WorldsPreferencesContext';
import { ListsProvider } from '../../contexts/ListsContext';
import { resetListsDb } from '../../test/listsDb';
import type { World } from '../../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

let lastUnmount: (() => void) | null = null;

function renderPage(ui: React.ReactElement) {
  const { unmount } = render(ui, { wrapper: Wrapper });
  lastUnmount = unmount;
  return { unmount };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorldsPreferencesProvider>
        <ListsProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </ListsProvider>
      </WorldsPreferencesProvider>
    </QueryClientProvider>
  );
}

function createMockWorld(overrides: Partial<World> = {}): World {
  return {
    worldId: 'wrld_1',
    name: 'Test World',
    authorName: 'Tester',
    capacity: 40,
    platforms: ['standalonewindows', 'android'],
    tags: ['chill'],
    imageUrl: '',
    vrchatUrl: '',
    quality: 'good',
    createdAt: '2024-01-01',
    internalAddDate: '2024-02-01',
    ...overrides,
  };
}

let mockWorlds: World[] = [createMockWorld()];
let mePermissions: string[] = [];
let meError = false;

let lastInfiniteParams: Record<string, unknown> | undefined;

let infiniteHasNextPage = true;
let infiniteIsPending = false;
let paginationIsPending = false;
const mockInfiniteFetchNextPage = vi.fn();

vi.mock('../../hooks/useApi', () => ({
  useMe: () => ({
    data: {
      name: 'Test User',
      role: mePermissions.includes('worlds:write') ? 'curator' : 'viewer',
      permissions: mePermissions,
    },
    isError: meError,
  }),
  useTags: () => ({ data: { tags: [] } }),
  useFlags: () => ({
    data: { flags: [{ flag: 'scary', count: 3 }, { flag: 'loud', count: 9 }] },
  }),
  useMeta: () => ({
    data: {
      qualityGood: 123,
      qualityBad: 12,
      platformDesktop: 80,
      platformAndroid: 45,
      platformiOS: 6,
    },
    isPending: false,
    isError: false,
    error: null,
  }),
  useWorlds: () => ({
    data: paginationIsPending ? undefined : { worlds: mockWorlds, total: 1, limit: 20, offset: 0 },
    isPending: paginationIsPending,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInfiniteWorlds: (params?: Record<string, unknown>) => {
    lastInfiniteParams = params;
    return {
    data: infiniteIsPending ? undefined : { pages: [{ worlds: mockWorlds, total: 1, limit: 20, offset: 0 }] },
    isPending: infiniteIsPending,
    isError: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: mockInfiniteFetchNextPage,
    hasNextPage: infiniteHasNextPage,
    isFetchingNextPage: false,
    };
  },
  useWorld: () => ({
    data: mockWorlds[0],
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
  }),
}));

describe('WorldsPage', () => {
  beforeEach(async () => {
    infiniteHasNextPage = true;
    infiniteIsPending = false;
    paginationIsPending = false;
    mockWorlds = [createMockWorld()];
    mePermissions = [];
    meError = false;
    lastInfiniteParams = undefined;
    queryClient.clear();
    window.localStorage.clear();
    await resetListsDb();
    window.history.pushState({}, '', '/');
    lastUnmount = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (lastUnmount) {
      lastUnmount();
      lastUnmount = null;
    }
    window.history.pushState({}, '', '/');
  });

  it('renders the worlds page with default endless scroll mode', () => {
    renderPage(<WorldsPage />);
    expect(screen.getByRole('heading', { name: /worlds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to pagination/i })).toBeInTheDocument();
  });

  it('toggles between endless scroll and pagination', () => {
    renderPage(<WorldsPage />);
    const toggleButton = screen.getByRole('button', { name: /switch to pagination/i });
    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: /switch to endless scroll/i })).toBeInTheDocument();
  });

  it('persists scroll mode to localStorage when toggled', () => {
    renderPage(<WorldsPage />);
    const toggleButton = screen.getByRole('button', { name: /switch to pagination/i });
    fireEvent.click(toggleButton);
    expect(window.localStorage.getItem('sos-worlds-scroll-mode')).toBe('pagination');
  });

  it('restores scroll mode from localStorage', () => {
    window.localStorage.setItem('sos-worlds-scroll-mode', 'pagination');
    renderPage(<WorldsPage />);
    expect(screen.getByRole('button', { name: /switch to endless scroll/i })).toBeInTheDocument();
  });

  it('renders pagination controls only in pagination mode', () => {
    renderPage(<WorldsPage />);
    expect(screen.queryByText(/of 1/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /switch to pagination/i }));
    expect(screen.getByText(/of 1/i)).toBeInTheDocument();
  });

  it('throttles back-to-top visibility updates to at most one per animation frame', async () => {
    renderPage(<WorldsPage />);

    Object.defineProperty(window, 'scrollY', {
      value: window.innerHeight + 1,
      writable: true,
      configurable: true,
    });
    fireEvent.scroll(window);
    expect(screen.getByLabelText(/back to top/i)).toBeInTheDocument();

    window.scrollY = 0;
    fireEvent.scroll(window);
    expect(screen.getByLabelText(/back to top/i)).toBeInTheDocument();

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.scroll(window);
    expect(screen.queryByLabelText(/back to top/i)).not.toBeInTheDocument();
  });

  it('does not scroll to top when filters change in infinite scroll mode', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mePermissions = ['worlds:read', 'worlds:write'];
    window.localStorage.setItem('sos-api-token', 'curator-token');

    renderPage(<WorldsPage />);
    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByRole('button', { name: /Good\s*\(123\)/ }));

    expect(scrollToSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
  });

  it('does not scroll to top when toggling scroll mode', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    renderPage(<WorldsPage />);
    fireEvent.click(screen.getByRole('button', { name: /switch to pagination/i }));

    expect(scrollToSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
  });

  it('renders mapped platform labels in list view', () => {
    window.localStorage.setItem('sos-worlds-view-mode', 'list');
    renderPage(<WorldsPage />);
    expect(screen.getByText(/Desktop, Android/)).toBeInTheDocument();
  });

  it('constrains the list container to the available width so rows cannot overflow', () => {
    window.localStorage.setItem('sos-worlds-view-mode', 'list');
    renderPage(<WorldsPage />);
    const listContainer = document.querySelector('.relative.w-full.min-w-0');
    expect(listContainer).not.toBeNull();
    const rows = listContainer?.querySelectorAll('[role="button"].card') ?? [];
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row).toHaveClass('min-w-0');
    });
  });

  it('renders the number of results from the filtered query', () => {
    renderPage(<WorldsPage />);
    expect(screen.getByText(/Number of results:/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('announces the result count via a status region', () => {
    renderPage(<WorldsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/Number of results:/i);
  });

  it('gives the search input an accessible name', () => {
    renderPage(<WorldsPage />);
    expect(screen.getByRole('textbox', { name: /search worlds/i })).toBeInTheDocument();
  });

  it('exposes the active view mode via aria-pressed on the toggle buttons', () => {
    renderPage(<WorldsPage />);
    const gridToggle = screen.getByRole('button', { name: /grid view/i });
    const listToggle = screen.getByRole('button', { name: /list view/i });
    expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    expect(listToggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(listToggle);
    expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
    expect(listToggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes the active sort direction via aria-pressed and aria-label on the sort toggle', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/worlds');
    renderPage(<WorldsPage />);

    const sortToggle = screen.getByRole('button', { name: /newest first\. activate to sort oldest first/i });
    expect(sortToggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(sortToggle);
    expect(
      screen.getByRole('button', { name: /oldest first\. activate to sort newest first/i })
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /oldest first\. activate to sort newest first/i }));
    expect(
      screen.getByRole('button', { name: /newest first\. activate to sort oldest first/i })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets the document title from the page name', () => {
    renderPage(<WorldsPage />);
    expect(document.title).toBe('Worlds');
  });

  it('keeps the number of results label visible while count is loading', () => {
    infiniteIsPending = true;
    renderPage(<WorldsPage />);
    expect(screen.getByText(/Number of results:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loading result count/i)).toBeInTheDocument();
    infiniteIsPending = false;
  });

  it('navigates to world detail when a card is selected', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/worlds');
    renderPage(<WorldsPage />);

    const worldCard = screen.getByRole('button', { name: /details - test world/i });
    expect(worldCard).toBeInTheDocument();

    await user.click(worldCard);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/worlds/wrld_1');
    });
  });

  describe('WorldsPage author filter', () => {
    it('seeds the search input from the ?search= URL param', () => {
      window.history.pushState({}, '', '/worlds?search=Tester');
      renderPage(<WorldsPage />);
      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Tester');
    });

    it('fills the search input and syncs URL when the author is clicked', async () => {
      const user = userEvent.setup();
      window.history.pushState({}, '', '/worlds');
      renderPage(<WorldsPage />);

      const authorButton = screen.getByRole('button', { name: /by tester/i });
      await user.click(authorButton);

      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Tester');
      await waitFor(() => {
        expect(window.location.search).toContain('search=Tester');
      });
    });

    it('replaces the existing search when a new author is clicked', async () => {
      const user = userEvent.setup();
      window.history.pushState({}, '', '/worlds?search=quest');
      renderPage(<WorldsPage />);

      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(searchInput.value).toBe('quest');

      await user.click(screen.getByRole('button', { name: /by tester/i }));

      expect(searchInput.value).toBe('Tester');
      await waitFor(() => {
        expect(window.location.search).toContain('search=Tester');
        expect(window.location.search).not.toContain('quest');
      });
    });

    it('preserves other URL filters when an author is clicked', async () => {
      const user = userEvent.setup();
      window.history.pushState({}, '', '/worlds?tag=chill');
      renderPage(<WorldsPage />);

      await user.click(screen.getByRole('button', { name: /by tester/i }));

      await waitFor(() => {
        expect(window.location.search).toContain('tag=chill');
        expect(window.location.search).toContain('search=Tester');
      });
    });

    it('wires the author click in the list view', async () => {
      const user = userEvent.setup();
      window.localStorage.setItem('sos-worlds-view-mode', 'list');
      window.history.pushState({}, '', '/worlds');
      renderPage(<WorldsPage />);

      const authorSpan = screen.getByLabelText(/by tester/i);
      await user.click(authorSpan);

      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Tester');
    });

    it('clears the search param from the URL when the input is emptied', async () => {
      const user = userEvent.setup();
      window.history.pushState({}, '', '/worlds?search=Tester');
      renderPage(<WorldsPage />);
      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      await user.clear(searchInput);
      await waitFor(() => {
        expect(window.location.search).not.toContain('search=Tester');
      });
    });
  });

  describe('WorldsPage infinite scroll prefetch', () => {
    it('calls fetchNextPage when the virtualized range is at the end of the loaded data', () => {
      mockInfiniteFetchNextPage.mockClear();
      infiniteHasNextPage = true;

      renderPage(<WorldsPage />);

      // The default mock only has one world, so the virtualized range already
      // covers the end of the loaded data. The prefetch effect should fire
      // and request the next page.
      expect(mockInfiniteFetchNextPage).toHaveBeenCalled();
    });

    it('does not call fetchNextPage when there is no next page', () => {
      mockInfiniteFetchNextPage.mockClear();
      infiniteHasNextPage = false;

      renderPage(<WorldsPage />);

      expect(mockInfiniteFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('WorldsPage curator features', () => {
    const setEnteredToken = (token = 'curator-token') =>
      window.localStorage.setItem('sos-api-token', token);

    const openFilters = async () => {
      const user = userEvent.setup();
      renderPage(<WorldsPage />);
      await user.click(screen.getByRole('button', { name: /filters/i }));
    };

    it('shows curator filter controls for an entered token with worlds:write', async () => {
      mePermissions = ['worlds:read', 'worlds:write'];
      setEnteredToken();

      await openFilters();

      expect(screen.getByText('Curator')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^high priority/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Good/ })).toBeInTheDocument();
    });

    it('hides curator filter controls when the entered token lacks worlds:write', async () => {
      setEnteredToken('viewer-token');

      await openFilters();

      expect(screen.queryByText('Curator')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^high priority/i })).not.toBeInTheDocument();
    });

    it('hides curator filter controls when no token was entered, even with curator identity', async () => {
      mePermissions = ['worlds:read', 'worlds:write'];

      await openFilters();

      expect(screen.queryByText('Curator')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^high priority/i })).not.toBeInTheDocument();
    });

    it('hides curator filter controls when the identity fetch errored', async () => {
      mePermissions = ['worlds:read', 'worlds:write'];
      meError = true;
      setEnteredToken();

      await openFilters();

      expect(screen.queryByText('Curator')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^high priority/i })).not.toBeInTheDocument();
    });

    it('shows the high priority badge on world cards for curators', async () => {
      mePermissions = ['worlds:read', 'worlds:write'];
      setEnteredToken();
      mockWorlds = [{ ...mockWorlds[0], highPriority: true }];

      renderPage(<WorldsPage />);

      expect(
        await screen.findByText('High Priority', { selector: '[class*="bg-amber-500/80"]' }),
      ).toBeInTheDocument();
    });

    it('hides the high priority badge for viewers', async () => {
      setEnteredToken('viewer-token');
      mockWorlds = [{ ...mockWorlds[0], highPriority: true }];

      renderPage(<WorldsPage />);

      expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
    });
  });
});

describe('WorldsPage flags filter', () => {
  it('sends repeated exclude params when flags are toggled', async () => {
    const user = userEvent.setup();
    renderPage(<WorldsPage />);

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByRole('button', { name: /🚩 scary \(3\)/ }));
    await user.click(screen.getByRole('button', { name: /🚩 loud \(9\)/ }));

    expect(lastInfiniteParams?.exclude).toEqual(['scary', 'loud']);
  });

  it('applies the exclude filter when a card flag chip is clicked', async () => {
    const user = userEvent.setup();
    mockWorlds = [createMockWorld({ flags: ['scary'] })];
    renderPage(<WorldsPage />);

    await user.click(screen.getByRole('button', { name: /show flags/i }));
    await user.click(screen.getByRole('button', { name: /🚩\s*scary/ }));

    expect(lastInfiniteParams?.exclude).toContain('scary');
  });

  it('sends flagMode=include when the include checkbox is toggled', async () => {
    const user = userEvent.setup();
    renderPage(<WorldsPage />);

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByTestId('flag-include-toggle'));

    expect(lastInfiniteParams?.flagMode).toBe('include');
  });
});
