import { HydrationBoundary } from '@tanstack/react-query';
import { serverFetchTags } from '../../server/api';
import { createServerQueryClient } from '../../server/prefetch';
import { TagsPage } from '../../views/tags';

export default async function Page() {
  const state = await createServerQueryClient(async (queryClient) => {
    await queryClient.prefetchQuery({ queryKey: ['tags'], queryFn: serverFetchTags });
  });

  return (
    <HydrationBoundary state={state}>
      <TagsPage />
    </HydrationBoundary>
  );
}
