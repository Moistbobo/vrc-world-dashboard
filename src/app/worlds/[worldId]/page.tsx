import { HydrationBoundary } from '@tanstack/react-query';
import { serverFetchWorld } from '../../../server/api';
import { createServerQueryClient } from '../../../server/prefetch';
import { WorldDetailPage } from '../../../views/world-detail';

export default async function Page({ params }: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await params;

  const state = await createServerQueryClient(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['world', worldId],
      queryFn: () => serverFetchWorld(worldId),
    });
  });

  return (
    <HydrationBoundary state={state}>
      <WorldDetailPage />
    </HydrationBoundary>
  );
}
