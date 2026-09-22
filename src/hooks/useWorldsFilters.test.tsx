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

describe('useWorldsFilters sort order toggle', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('seeds orderAsc from order=asc in the URL', () => {
    const { result } = renderFilters('/worlds?order=asc');
    expect(result.current.orderAsc).toBe(true);
  });

  it('defaults orderAsc to false without the URL param', () => {
    const { result } = renderFilters('/worlds');
    expect(result.current.orderAsc).toBe(false);
  });

  it('passes order=asc to the worlds queries when ascending', async () => {
    renderFilters('/worlds?order=asc');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ order: 'asc' });
      expect(mocks.infiniteParams).toMatchObject({ order: 'asc' });
    });
  });

  it('passes no order when descending', async () => {
    renderFilters('/worlds');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ order: undefined });
    });
  });

  it('writes order=asc on toggle and removes it on untoggle', async () => {
    const { result } = renderFilters('/worlds');

    act(() => result.current.handleToggleOrder());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('order')).toBe('asc');
      expect(result.current.orderAsc).toBe(true);
    });

    act(() => result.current.handleToggleOrder());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('order')).toBeNull();
      expect(result.current.orderAsc).toBe(false);
    });
  });

  it('resets to the first page on toggle', async () => {
    const { result } = renderFilters('/worlds');
    await waitFor(() => {
      expect(result.current.orderAsc).toBe(false);
    });

    act(() => result.current.setOffset(40));
    act(() => result.current.handleToggleOrder());
    expect(result.current.offset).toBe(0);
  });

  it('does not reset orderAsc via handleClear', async () => {
    const { result } = renderFilters('/worlds?order=asc');

    act(() => result.current.handleClear());
    await waitFor(() => {
      expect(result.current.orderAsc).toBe(true);
      expect(new URLSearchParams(locationRef!.search).get('order')).toBe('asc');
    });
  });

  it('round-trips order through back/forward navigation', async () => {
    const { result } = renderFilters('/worlds');
    await waitFor(() => {
      expect(result.current.orderAsc).toBe(false);
    });

    act(() => result.current.handleToggleOrder());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('order')).toBe('asc');
    });

    act(() => navigateRef!('/worlds?exclude=a'));
    await waitFor(() => {
      expect(result.current.orderAsc).toBe(false);
    });

    act(() => navigateRef!(-1));
    await waitFor(() => {
      expect(result.current.orderAsc).toBe(true);
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

describe('useWorldsFilters quality exclude mode', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('seeds qualityExclude from qualityMode=exclude in the URL', () => {
    const { result } = renderFilters('/worlds?qualityMode=exclude');
    expect(result.current.qualityExclude).toBe(true);
  });

  it('defaults qualityExclude to false without the URL param', () => {
    const { result } = renderFilters('/worlds');
    expect(result.current.qualityExclude).toBe(false);
  });

  it('passes qualityMode exclude to the worlds queries when on', async () => {
    renderFilters('/worlds?qualityMode=exclude');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ qualityMode: 'exclude' });
      expect(mocks.infiniteParams).toMatchObject({ qualityMode: 'exclude' });
    });
  });

  it('passes no qualityMode when off', async () => {
    renderFilters('/worlds');
    await waitFor(() => {
      expect(mocks.worldsParams).toMatchObject({ qualityMode: undefined });
    });
  });

  it('writes qualityMode=exclude on toggle, clears quality, and removes it on untoggle', async () => {
    const { result } = renderFilters('/worlds?quality=good');

    act(() => result.current.handleToggleQualityExclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('qualityMode')).toBe('exclude');
      expect(result.current.selectedQuality).toEqual([]);
    });

    act(() => result.current.handleToggleQualityExclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('qualityMode')).toBeNull();
    });
  });

  it('normalizes selectedQuality to empty when deep-linked with qualityMode=exclude', () => {
    const { result } = renderFilters('/worlds?qualityMode=exclude&quality=good');
    expect(result.current.selectedQuality).toEqual([]);
  });

  it('clears selectedQuality when navigation enters qualityMode=exclude', async () => {
    const { result } = renderFilters('/worlds?quality=good');
    await waitFor(() => {
      expect(result.current.selectedQuality).toEqual(['good']);
    });

    act(() => navigateRef!('/worlds?qualityMode=exclude'));
    await waitFor(() => {
      expect(result.current.qualityExclude).toBe(true);
      expect(result.current.selectedQuality).toEqual([]);
    });
  });

  it('resets qualityExclude via handleClear and drops it from the URL', async () => {
    const { result } = renderFilters('/worlds?qualityMode=exclude');

    act(() => result.current.handleClear());
    await waitFor(() => {
      expect(result.current.qualityExclude).toBe(false);
      expect(new URLSearchParams(locationRef!.search).get('qualityMode')).toBeNull();
    });
  });

  it('round-trips qualityMode through back/forward navigation', async () => {
    const { result } = renderFilters('/worlds');
    await waitFor(() => {
      expect(result.current.qualityExclude).toBe(false);
    });

    act(() => result.current.handleToggleQualityExclude());
    await waitFor(() => {
      expect(new URLSearchParams(locationRef!.search).get('qualityMode')).toBe('exclude');
    });

    act(() => navigateRef!('/worlds?exclude=a'));
    await waitFor(() => {
      expect(result.current.qualityExclude).toBe(false);
    });

    act(() => navigateRef!(-1));
    await waitFor(() => {
      expect(result.current.qualityExclude).toBe(true);
    });
  });
});
