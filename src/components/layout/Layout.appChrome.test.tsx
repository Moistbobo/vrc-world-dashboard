import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

vi.mock('../../hooks/useCanManageCurator', () => ({
  useCanManageCurator: () => true,
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

describe('Layout app chrome accessibility', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('sos-sidebar-collapsed', 'true');
    setMatchMedia(true);
  });

  it('names every collapsed nav link', () => {
    renderLayout();

    const links = within(screen.getByRole('navigation')).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('renders the collapsed logo as a named toggle button with state', () => {
    renderLayout();

    const logo = screen.getByRole('button', { name: /show version/i });
    expect(logo).toHaveAttribute('aria-expanded', 'false');
    expect(logo).toHaveAttribute('aria-controls');

    fireEvent.focus(logo);

    expect(logo).toHaveAttribute('aria-expanded', 'true');
  });

  it('no longer exposes the logo as a div with role button', () => {
    const { container } = renderLayout();

    expect(container.querySelector('div[role="button"]')).toBeNull();
  });
});
