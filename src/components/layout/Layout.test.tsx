import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

function setMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

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

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
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

  it('marks the closed sidebar inert below the lg breakpoint', () => {
    setMatchMedia(false);
    const { container } = renderLayout();
    expect(container.querySelector('aside')).toHaveAttribute('inert');
  });

  it('clears inert and focuses the close button when opened below lg', () => {
    setMatchMedia(false);
    const { container } = renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));

    expect(container.querySelector('aside')).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toHaveFocus();
  });

  it('keeps the sidebar non-inert at the lg breakpoint', () => {
    setMatchMedia(true);
    const { container } = renderLayout();
    expect(container.querySelector('aside')).not.toHaveAttribute('inert');
  });

  it('closes on Escape and restores focus to the open button', () => {
    setMatchMedia(false);
    const { container } = renderLayout();

    const open = screen.getByRole('button', { name: 'Open sidebar' });
    fireEvent.click(open);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close sidebar' }), { key: 'Escape' });

    expect(container.querySelector('aside')).toHaveAttribute('inert');
    expect(open).toHaveFocus();
  });
});
