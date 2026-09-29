import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

let worldsError = false;
const worldsRefetch = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

let recentActivityFixture: {
  rows: Array<{
    type: 'comment' | 'rating';
    id: string;
    worldId: string;
    value?: 'good' | 'bad';
    username?: string;
    content?: string;
    createdAt: string;
    worldName: string;
  }>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} = { rows: [], isPending: false, isError: false, error: null, refetch: vi.fn() };

vi.mock('../../hooks/useApi', () => ({
  useWorlds: () => ({
    data: { worlds: [], total: 0, limit: 6, offset: 0 },
    isPending: false,
    isError: worldsError,
    error: worldsError ? new Error('boom') : null,
    refetch: worldsRefetch,
  }),
}));

vi.mock('../../hooks/useHealth', () => ({
  useHealth: () => ({
    data: { status: 'ok', worldCount: 7015, dbVersion: 1 },
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useSentiment', () => ({
  useRatingsForWorldIds: () => ({
    data: undefined,
    isPending: false,
    isError: false,
    isSuccess: false,
    isFetching: false,
  }),
  useRecentActivity: () => recentActivityFixture,
}));

let lastUnmount: (() => void) | null = null;

function renderPage() {
  const { unmount } = render(<DashboardPage />, { wrapper: Wrapper });
  lastUnmount = unmount;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    queryClient.clear();
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    lastUnmount = null;
    worldsError = false;
    worldsRefetch.mockClear();
    recentActivityFixture = { rows: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (lastUnmount) {
      lastUnmount();
      lastUnmount = null;
    }
    window.history.pushState({}, '', '/');
  });

  it('does not render the stat cards', () => {
    renderPage();

    expect(screen.queryByText('Total Worlds')).not.toBeInTheDocument();
    expect(screen.queryByText('Unique Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Database Version')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest')).not.toBeInTheDocument();
    expect(screen.getByText('7015 Worlds Tagged')).toBeInTheDocument();
    expect(screen.getByText('Recent Worlds')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('announces a worlds load failure and retries on demand', async () => {
    const user = userEvent.setup();
    worldsError = true;
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to load worlds/i);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(worldsRefetch).toHaveBeenCalled();
  });

  it('renders the recent activity panel with activity rows when sentiment is enabled', () => {
    vi.stubEnv('VITE_ENABLE_COMMUNITY_SENTIMENT', 'true');
    recentActivityFixture = {
      rows: [
        {
          type: 'comment',
          id: 'c1',
          worldId: 'w1',
          username: 'Ann',
          content: 'Nice world',
          createdAt: '2024-01-03T00:00:00Z',
          worldName: 'Alpha World',
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage();

    expect(screen.getByText('Alpha World')).toBeInTheDocument();
  });
});
