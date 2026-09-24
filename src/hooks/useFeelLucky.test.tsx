import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useFeelLucky } from './useFeelLucky';
import { useTestPathname } from '../test/next-navigation';
import * as client from '../api/client';
import type { World } from '../types';

function LocationTracker({ onPath }: { onPath: (path: string) => void }) {
  const pathname = useTestPathname();
  useEffect(() => {
    onPath(pathname);
  }, [pathname, onPath]);
  return null;
}

let latestPath = '/';
function setLatestPath(path: string) {
  latestPath = path;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LocationTracker onPath={setLatestPath} />
      {children}
    </>
  );
}

const createWorld = (overrides: Partial<World> = {}): World => ({
  worldId: 'wrld_random',
  name: 'Random World',
  authorName: 'Random Author',
  imageUrl: 'https://example.com/image.png',
  tags: [],
  platforms: ['pc'],
  capacity: 10,
  quality: 'good',
  createdAt: '2024-01-01T00:00:00Z',
  internalAddDate: '2024-02-01T00:00:00Z',
  vrchatUrl: 'https://vrchat.com/home/world/wrld_random',
  ...overrides,
});

describe('useFeelLucky', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestPath = '/';
  });

  it('fetches health, picks a random offset, and navigates to the chosen world', async () => {
    vi.spyOn(client, 'fetchHealth').mockResolvedValue({
      status: 'ok',
      worldCount: 10,
      dbVersion: 1,
    });
    const world = createWorld({ worldId: 'wrld_42', name: 'Lucky World' });
    const worldsSpy = vi
      .spyOn(client, 'fetchWorlds')
      .mockResolvedValue({ worlds: [world], total: 10, limit: 1, offset: 3 });

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.feelLucky();
    });

    expect(client.fetchHealth).toHaveBeenCalledTimes(1);
    expect(worldsSpy).toHaveBeenCalledTimes(1);
    expect(worldsSpy).toHaveBeenCalledWith({ limit: 1, offset: expect.any(Number) });
    const offsetArg = worldsSpy.mock.calls[0][0]?.offset as number;
    expect(offsetArg).toBeGreaterThanOrEqual(0);
    expect(offsetArg).toBeLessThan(10);
    expect(toast.error).not.toHaveBeenCalled();
    await waitFor(() => expect(latestPath).toBe('/worlds/wrld_42'));
  });

  it('keeps loading true while the request is in flight and resets afterwards', async () => {
    let resolveWorlds!: (value: { worlds: World[]; total: number; limit: number; offset: number }) => void;
    vi.spyOn(client, 'fetchHealth').mockResolvedValue({
      status: 'ok',
      worldCount: 5,
      dbVersion: 1,
    });
    const worldsSpy = vi
      .spyOn(client, 'fetchWorlds')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveWorlds = resolve;
          }),
      );

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.feelLucky();
    });

    // Flush microtasks so fetchWorlds gets called and resolveWorlds gets assigned.
    await act(async () => {
      await Promise.resolve();
    });
    expect(worldsSpy).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveWorlds({ worlds: [createWorld()], total: 5, limit: 1, offset: 0 });
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('ignores a second click while a request is in flight (no double-click race)', async () => {
    let resolveHealth!: (value: { status: 'ok'; worldCount: number; dbVersion: number }) => void;
    const healthSpy = vi
      .spyOn(client, 'fetchHealth')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveHealth = resolve;
          }),
      );
    vi.spyOn(client, 'fetchWorlds').mockResolvedValue({
      worlds: [createWorld()],
      total: 1,
      limit: 1,
      offset: 0,
    });

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    let first!: Promise<void>;
    act(() => {
      first = result.current.feelLucky();
    });

    await act(async () => {
      await result.current.feelLucky();
    });

    resolveHealth({ status: 'ok', worldCount: 1, dbVersion: 1 });
    await act(async () => {
      await first;
    });

    expect(healthSpy).toHaveBeenCalledTimes(1);
  });

  it('toasts an error and stops loading when the request fails', async () => {
    vi.spyOn(client, 'fetchHealth').mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.feelLucky();
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('toasts an error when the world pool is empty', async () => {
    vi.spyOn(client, 'fetchHealth').mockResolvedValue({
      status: 'ok',
      worldCount: 0,
      dbVersion: 1,
    });
    vi.spyOn(client, 'fetchWorlds').mockResolvedValue({
      worlds: [],
      total: 0,
      limit: 1,
      offset: 0,
    });

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.feelLucky();
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('exposes loading as false initially', () => {
    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });
    expect(result.current.loading).toBe(false);
  });

  it('clears loading after navigation completes', async () => {
    vi.spyOn(client, 'fetchHealth').mockResolvedValue({
      status: 'ok',
      worldCount: 2,
      dbVersion: 1,
    });
    vi.spyOn(client, 'fetchWorlds').mockResolvedValue({
      worlds: [createWorld()],
      total: 2,
      limit: 1,
      offset: 0,
    });

    const { result } = renderHook(() => useFeelLucky(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.feelLucky();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
