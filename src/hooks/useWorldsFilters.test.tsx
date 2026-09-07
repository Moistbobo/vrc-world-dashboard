import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorldsFilters } from './useWorldsFilters';

const mocks = vi.hoisted(() => ({
  worldsParams: undefined as unknown,
  infiniteParams: undefined as unknown,
}));

vi.mock('./useApi', () => ({
  useTags: () => ({ data: { tags: [] } }),
  useFlags: () => ({ data: { flags: [{ flag: 'scary', count: 3 }] } }),
  useMeta: () => ({ data: undefined }),
  useWorlds: (params: unknown) => {
    mocks.worldsParams = params;
    return {
      data: { worlds: [], total: 0, limit: 20, offset: 0 },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useInfiniteWorlds: (params: unknown) => {
    mocks.infiniteParams = params;
    return {
    data: { pages: [] },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    };
  },
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

describe('useWorldsFilters flag include mode', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('seeds flagInclude from flagMode=include in the URL', () => {
    const { result } = renderFilters('/worlds?flagMode=include');
    expect(result.current.flagInclude).toBe(true);
  });

  it('defaults flagInclude to false without the URL param', () => {
    const { result } = renderFilters('/worlds');
    expect(result.current.flagInclude).toBe(false);
  });

  it('passes flagMode include to the worlds queries when on', async () => {
    renderFilters('/worlds?flagMode=include');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ flagMode: 'include' });
      expect(mocks.infiniteParams).toMatchObject({ flagMode: 'include' });
    });
  });

  it('passes no flagMode when off', async () => {
    renderFilters('/worlds');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ flagMode: undefined });
    });
  });

  it('writes flagMode=include on toggle and removes it on untoggle', async () => {
    const { result } = renderFilters('/worlds');

    act(() => result.current.handleToggleFlagInclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('flagMode')).toBe('include');
    });

    act(() => result.current.handleToggleFlagInclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('flagMode')).toBeNull();
    });
  });

  it('resets flagInclude via handleClear and drops it from the URL', async () => {
    const { result } = renderFilters('/worlds?flagMode=include');

    act(() => result.current.handleClear());
    await waitFor(() => {
      expect(result.current.flagInclude).toBe(false);
      expect(new URLSearchParams(locationRef!.search).get('flagMode')).toBeNull();
    });
  });

  it('round-trips flagMode through back/forward navigation', async () => {
    const { result } = renderFilters('/worlds');
    await waitFor(() => {
      expect(result.current.flagInclude).toBe(false);
    });

    act(() => result.current.handleToggleFlagInclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('flagMode')).toBe('include');
    });

    act(() => navigateRef!('/worlds?exclude=a'));
    await waitFor(() => {
      expect(result.current.flagInclude).toBe(false);
    });

    act(() => navigateRef!(-1));
    await waitFor(() => {
      expect(result.current.flagInclude).toBe(true);
    });
  });
});
