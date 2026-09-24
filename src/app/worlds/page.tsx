import { Suspense } from 'react';
import { WorldsPage } from '../../views/worlds';

export default function Page() {
  return (
    <Suspense>
      <WorldsPage />
    </Suspense>
  );
}
