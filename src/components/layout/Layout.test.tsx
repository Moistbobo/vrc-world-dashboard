import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

let canManageCurator = true;

vi.mock('../../hooks/useCanManageCurator', () => ({
  useCanManageCurator: () => canManageCurator,
}));

vi.mock('../../hooks/useApiToasts', () => ({
  useApiDownToast: () => {},
}));

vi.mock('../../hooks/useFeelLucky', () => ({
  useFeelLucky: () => ({ loading: false, feelLucky: vi.fn() }),
}));

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <div>content</div>
      </Layout>
    </MemoryRouter>,
  );
}

describe('Layout sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    canManageCurator = true;
  });

  it('shows the AI Search link for a curator', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'AI Search' })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('hides the AI Search link for a viewer', () => {
    canManageCurator = false;
    renderLayout();
    expect(screen.queryByRole('link', { name: 'AI Search' })).not.toBeInTheDocument();
  });
});
