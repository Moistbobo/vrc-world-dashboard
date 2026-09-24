import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { RecentActivityPanel } from './RecentActivityPanel';
import { formatTimestamp } from '../../utils/formatTimestamp';

const mocks = vi.hoisted(() => ({
  useRecentActivity: vi.fn(),
}));

vi.mock('../../hooks/useSentiment', () => ({
  useRecentActivity: mocks.useRecentActivity,
}));

const commentRow = {
  type: 'comment',
  id: 'c1',
  worldId: 'w1',
  username: 'Ann',
  content: 'Nice world',
  createdAt: '2024-01-03T10:30:00Z',
  worldName: 'Alpha',
} as const;

const ratingRow = {
  type: 'rating',
  id: 'r1',
  worldId: 'w2',
  value: 'good',
  createdAt: '2024-01-02T09:00:00Z',
  worldName: 'Beta',
} as const;

const badRatingRow = {
  type: 'rating',
  id: 'r2',
  worldId: 'w3',
  value: 'bad',
  createdAt: '2024-01-01T08:00:00Z',
  worldName: 'Gamma',
} as const;

function WorldProbe() {
  const { id } = useParams();
  return <div>world {id}</div>;
}

function mockResult(overrides: Record<string, unknown> = {}) {
  return { rows: [], isPending: false, isError: false, error: null, refetch: vi.fn(), ...overrides };
}

describe('RecentActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows a loading skeleton while pending', () => {
    mocks.useRecentActivity.mockReturnValue(mockResult({ isPending: true }));

    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('recent-activity-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading recent activity...')).toBeInTheDocument();
  });

  it('renders comment and rating rows with names, content, and timestamps', () => {
    mocks.useRecentActivity.mockReturnValue(
      mockResult({ rows: [commentRow, ratingRow, badRatingRow] }),
    );

    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Nice world')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(commentRow.createdAt))).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(ratingRow.createdAt))).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(badRatingRow.createdAt))).toBeInTheDocument();

    expect(screen.getByTestId('activity-icon-comment')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-good')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-bad')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute('href', '/worlds/w1');
    expect(screen.getByRole('link', { name: /Beta/ })).toHaveAttribute('href', '/worlds/w2');
    expect(screen.getByRole('link', { name: /Gamma/ })).toHaveAttribute('href', '/worlds/w3');
  });

  it('navigates to the world detail page when a row is clicked', async () => {
    mocks.useRecentActivity.mockReturnValue(mockResult({ rows: [commentRow] }));

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true }}>
        <Routes>
          <Route path="/" element={<RecentActivityPanel />} />
          <Route path="/worlds/:id" element={<WorldProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('link', { name: /Alpha/ }));

    expect(await screen.findByText('world w1')).toBeInTheDocument();
  });

  it('shows the empty state when there are no rows', () => {
    mocks.useRecentActivity.mockReturnValue(mockResult());

    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('No community activity yet. Be the first to like or comment!'),
    ).toBeInTheDocument();
  });

  it('shows an error state with a retry button when the fetch fails', async () => {
    const refetch = vi.fn();
    mocks.useRecentActivity.mockReturnValue(mockResult({ isError: true, error: new Error('boom'), refetch }));

    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Recent activity is unavailable right now.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes the env flag to the hook, disabling when sentiment is off', () => {
    mocks.useRecentActivity.mockReturnValue(mockResult());

    vi.stubEnv('NEXT_PUBLIC_ENABLE_COMMUNITY_SENTIMENT', 'false');
    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );
    expect(mocks.useRecentActivity).toHaveBeenCalledWith(false);

    vi.stubEnv('NEXT_PUBLIC_ENABLE_COMMUNITY_SENTIMENT', 'true');
    render(
      <MemoryRouter>
        <RecentActivityPanel />
      </MemoryRouter>,
    );
    expect(mocks.useRecentActivity).toHaveBeenLastCalledWith(true);
  });
});
