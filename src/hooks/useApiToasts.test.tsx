import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useApiDownToast, useApiQuery, useApiMutation } from './useApiToasts';
import * as client from '../api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useApiDownToast', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('shows a single warning toast when the health query transitions to error', async () => {
    const spy = vi.spyOn(client, 'fetchHealth').mockRejectedValue(new Error('boom'));

    renderHook(() => useApiDownToast(), { wrapper: Wrapper });

    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    expect(toast.warning).toHaveBeenCalledWith('API is unreachable', { duration: 4000 });

    await new Promise((r) => setTimeout(r, 30));
    expect(toast.warning).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('does not re-fire the toast when the health query flaps (error -> ok -> error)', async () => {
    const spy = vi.spyOn(client, 'fetchHealth').mockRejectedValue(new Error('boom'));

    renderHook(() => useApiDownToast(), { wrapper: Wrapper });
    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));

    spy.mockResolvedValue({ status: 'ok' } as never);
    await queryClient.invalidateQueries({ queryKey: ['health'] });
    await waitFor(() => expect(queryClient.getQueryState(['health'])?.status).toBe('success'));
    await new Promise((r) => setTimeout(r, 20));
    expect(toast.warning).toHaveBeenCalledTimes(1);

    spy.mockRejectedValue(new Error('boom again'));
    await queryClient.invalidateQueries({ queryKey: ['health'] });
    await waitFor(() => expect(queryClient.getQueryState(['health'])?.status).toBe('error'));
    await new Promise((r) => setTimeout(r, 20));
    expect(toast.warning).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('fires again after a remount (a fresh ref re-arms the one-shot latch)', async () => {
    const spy = vi.spyOn(client, 'fetchHealth').mockRejectedValue(new Error('boom'));

    const first = renderHook(() => useApiDownToast(), { wrapper: Wrapper });
    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = renderHook(() => useApiDownToast(), { wrapper: Wrapper });
    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(2));
    second.unmount();

    spy.mockRestore();
  });
});

describe('useApiQuery', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('toasts on final error when retries are exhausted', async () => {
    const spy = vi
      .spyOn(client, 'fetchTags')
      .mockRejectedValue(new Error('tags failed'));

    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['tags-final'],
          queryFn: client.fetchTags,
          retry: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('tags failed');

    spy.mockRestore();
  });

  it('does not toast when suppressErrorToast is true', async () => {
    const spy = vi
      .spyOn(client, 'fetchTags')
      .mockRejectedValue(new Error('hidden'));

    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['tags-suppressed'],
          queryFn: client.fetchTags,
          retry: false,
          suppressErrorToast: true,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('does not toast when the final error is an AbortError', async () => {
    vi.spyOn(client, 'fetchTags').mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['tags-aborted'],
          queryFn: client.fetchTags,
          retry: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not toast when the final error is an Error with name AbortError', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    vi.spyOn(client, 'fetchTags').mockRejectedValue(abortError);

    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['tags-aborted-error'],
          queryFn: client.fetchTags,
          retry: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('toasts only once for repeated identical final errors', async () => {
    const spy = vi
      .spyOn(client, 'fetchTags')
      .mockRejectedValue(new Error('same'));

    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['tags-once'],
          queryFn: client.fetchTags,
          retry: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledTimes(1);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(toast.error).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('useApiMutation', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('toasts when the mutation fails', async () => {
    const { result } = renderHook(
      () =>
        useApiMutation({
          mutationFn: async () => {
            throw new Error('mutation failed');
          },
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('mutation failed'));
  });

  it('does not toast when suppressErrorToast is true', async () => {
    const { result } = renderHook(
      () =>
        useApiMutation({
          mutationFn: async () => {
            throw new Error('hidden mutation');
          },
          suppressErrorToast: true,
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
