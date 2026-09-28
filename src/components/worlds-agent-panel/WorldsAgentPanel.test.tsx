import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorldsAgentPanel } from './WorldsAgentPanel';
import { ListsProvider } from '../../contexts/ListsContext';
import { resetListsDb } from '../../test/listsDb';
import type { World, WorldsAgentResponse } from '../../types';

const mockMutate = vi.fn();

let mockState: {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: WorldsAgentResponse | undefined;
};

vi.mock('../../hooks/useWorldsAgent', () => ({
  useWorldsAgent: () => ({
    mutate: mockMutate,
    isPending: mockState.isPending,
    isError: mockState.isError,
    error: mockState.error,
    data: mockState.data,
  }),
}));

function createWorld(overrides: Partial<World> = {}): World {
  return {
    worldId: 'wrld_1',
    name: 'Alpha World',
    authorName: 'Tester',
    capacity: 40,
    platforms: ['standalonewindows'],
    tags: ['scary'],
    imageUrl: '',
    vrchatUrl: '',
    quality: 'good',
    createdAt: '2024-01-01',
    internalAddDate: '2024-02-01',
    ...overrides,
  };
}

function createResponse(overrides: Partial<WorldsAgentResponse> = {}): WorldsAgentResponse {
  return {
    interpretation: 'Scary worlds for four players',
    query: {
      groups: [
        {
          connector: 'and',
          conditions: [
            {
              field: 'tag',
              op: 'has',
              value: 'scary',
              value2: '',
              values: [],
              negate: false,
            },
          ],
        },
      ],
    },
    appliedFilters: ['scary'],
    unmatchedTags: [],
    worlds: [createWorld()],
    total: 1,
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ListsProvider>{children}</ListsProvider>
    </QueryClientProvider>
  );
}

describe('WorldsAgentPanel', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await resetListsDb();
    mockMutate.mockReset();
    mockState = { isPending: false, isError: false, error: null, data: undefined };
  });

  it('renders the header and input', () => {
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText('Worlds assistant')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /describe the worlds you want/i })).toBeInTheDocument();
  });

  it('submits the trimmed query', async () => {
    const user = userEvent.setup();
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox', { name: /describe the worlds you want/i });
    await user.type(input, '  scary worlds  ');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { query: 'scary worlds' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('ignores a second submit while the first is in flight', async () => {
    const user = userEvent.setup();
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox', { name: /describe the worlds you want/i });
    await user.type(input, 'scary worlds');
    const submit = screen.getByRole('button', { name: /^search$/i });
    await user.click(submit);
    await user.click(submit);

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('disables submit and shows loading while pending', () => {
    mockState = { isPending: true, isError: false, error: null, data: undefined };
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/finding worlds/i);
  });

  it('renders the interpretation, a card per world, and the unmatched warning', () => {
    mockState = {
      isPending: false,
      isError: false,
      error: null,
      data: createResponse({
        unmatchedTags: ['zombie'],
        worlds: [
          createWorld(),
          createWorld({ worldId: 'wrld_2', name: 'Beta World' }),
        ],
        total: 2,
      }),
    };
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText(/scary worlds for four players/i)).toBeInTheDocument();
    expect(screen.getByText('Alpha World')).toBeInTheDocument();
    expect(screen.getByText('Beta World')).toBeInTheDocument();
    expect(screen.getByText(/ignored unknown tags: zombie/i)).toBeInTheDocument();
  });

  it('shows the empty message naming the interpreted tags and no cards', () => {
    mockState = {
      isPending: false,
      isError: false,
      error: null,
      data: createResponse({
        appliedFilters: ['scary', 'kino'],
        worlds: [],
        total: 0,
      }),
    };
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText(/no worlds matched the tags: scary, kino/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /details -/i })).not.toBeInTheDocument();
  });

  it('renders the retry affordance and no world list on error', () => {
    mockState = { isPending: false, isError: true, error: new Error('boom'), data: undefined };
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText(/could not run the assistant: boom/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /details -/i })).not.toBeInTheDocument();
  });

  it('calls onViewAll with the returned query', async () => {
    const user = userEvent.setup();
    const onViewAll = vi.fn();
    const query = createResponse().query;
    mockState = { isPending: false, isError: false, error: null, data: createResponse() };
    render(<WorldsAgentPanel onViewAll={onViewAll} />, { wrapper: Wrapper });

    await user.click(screen.getByRole('button', { name: /view all in worlds/i }));

    expect(onViewAll).toHaveBeenCalledWith(query);
  });

  it('shows the clarifying message when the backend rejects the query', () => {
    mockState = {
      isPending: false,
      isError: true,
      error: new Error('agent_query_rejected'),
      data: undefined,
    };
    render(<WorldsAgentPanel onViewAll={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText(/could not turn that into a valid world query/i)).toBeInTheDocument();
  });
});
