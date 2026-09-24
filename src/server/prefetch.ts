import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';

export async function createServerQueryClient(
  seed: (queryClient: QueryClient) => Promise<void>,
): Promise<DehydratedState> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await seed(queryClient);
  return dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => query.state.status === 'success',
  });
}
