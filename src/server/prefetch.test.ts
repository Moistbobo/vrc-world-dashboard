import { describe, it, expect } from 'vitest';
import { createServerQueryClient } from './prefetch';

describe('createServerQueryClient', () => {
  it('dehydrates only successful queries', async () => {
    const state = await createServerQueryClient(async (queryClient) => {
      await queryClient.prefetchQuery({
        queryKey: ['ok'],
        queryFn: async () => ({ value: 1 }),
      });
      await queryClient.prefetchQuery({
        queryKey: ['bad'],
        queryFn: async () => {
          throw new Error('boom');
        },
      });
    });

    const keys = (state.queries ?? []).map((query) => query.queryKey[0]);
    expect(keys).toContain('ok');
    expect(keys).not.toContain('bad');
  });
});
