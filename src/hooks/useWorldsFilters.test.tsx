import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorldsFilters } from './useWorldsFilters';

vi.mock('./useApi', () => ({
  useTags: () => ({ data: { tags: [] } }),
  useFlags: () => ({ data: { flags: [{ flag: 'scary', count: 3 }] } }),
  useMeta: () => ({ data: undefined }),
  useWorlds: () => ({
    data: { worlds: [], total: 0, limit: 20, offset: 0 },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInfiniteWorlds: () => ({
    data: { pages: [] },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

let navigateRef: ReturnType<typeof useNavigate> | null = null;
let locationRef: ReturnType<typeof useLocation> | null = null;

function NavigateProbe() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    navigateRef = navigate;
    locationRef = location;
  }, [navigate, location]);
  return null;
}

function wrapper({ initialEntry }: { initialEntry: string }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <NavigateProbe />
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function renderFilters(initialEntry: string) {
  const rendered = renderHook(() => useWorldsFilters('infinite'), {
    wrapper: wrapper({ initialEntry }),
  });
  return rendered;
}

describe('useWorldsFilters URL round-trip', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('seeds selectedTags and selectedFlags from all URL values', () => {
    const { result } = renderFilters('/worlds?exclude=a&exclude=b&tag=x&tag=y');

    expect(result.current.selectedFlags).toEqual(['a', 'b']);
    expect(result.current.selectedTags).toEqual(['x', 'y']);
  });

  it('appends every selected tag and flag to the URL', async () => {
    const { result } = renderFilters('/worlds?exclude=a&exclude=b&tag=x&tag=y');

    act(() => result.current.handleToggleFlag('c'));
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).getAll('exclude')).toEqual(['a', 'b', 'c']);
    });

    act(() => result.current.handleToggleTag('z'));
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).getAll('tag')).toEqual(['x', 'y', 'z']);
      expect(new URLSearchParams(locationRef!.search).getAll('exclude')).toEqual(['a', 'b', 'c']);
    });
  });

  it('removes a flag from the URL via handleRemoveFlag', async () => {
    const { result } = renderFilters('/worlds?exclude=a&exclude=b');

    act(() => result.current.handleRemoveFlag('a'));
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).getAll('exclude')).toEqual(['b']);
    });
  });

  it('clears tags and flags from the URL via handleClear', async () => {
    const { result } = renderFilters('/worlds?exclude=a&tag=x');

    act(() => result.current.handleClear());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).getAll('exclude')).toEqual([]);
      expect(new URLSearchParams(locationRef!.search).getAll('tag')).toEqual([]);
    });
  });

  it('restores both states after back navigation', async () => {
    const { result } = renderFilters('/worlds?exclude=a&exclude=b&tag=x&tag=y');
    await waitFor(() => {
      expect(result.current.selectedFlags).toEqual(['a', 'b']);
    });

    act(() => navigateRef!('/worlds?exclude=c'));
    await waitFor(() => {
      expect(result.current.selectedFlags).toEqual(['c']);
    });

    act(() => navigateRef!(-1));
    await waitFor(() => {
      expect(result.current.selectedFlags).toEqual(['a', 'b']);
      expect(result.current.selectedTags).toEqual(['x', 'y']);
    });
  });
});
