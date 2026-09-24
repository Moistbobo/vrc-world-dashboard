import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, within, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TagsPage } from './TagsPage';

const mockTags = [
  { tag: 'chill', count: 12 },
  { tag: 'social', count: 7 },
];

let isPending = false;
let isError = false;
let error: Error | null = null;

vi.mock('../../hooks/useApi', () => ({
  useTags: () => ({
    data: isPending || isError ? undefined : { tags: mockTags },
    isPending,
    isError,
    error,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('TagsPage', () => {
  beforeEach(() => {
    isPending = false;
    isError = false;
    error = null;
    queryClient.clear();
  });

  it('renders tag cards for each tag', () => {
    const { container } = render(<TagsPage />, { wrapper: Wrapper });
    const cardGrid = container.querySelector('.grid.gap-4');
    expect(cardGrid).not.toBeNull();
    const cards = within(cardGrid as HTMLElement).getAllByText(/^(chill|social)$/);
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('does not nest a button inside a button (invalid HTML)', () => {
    const { container } = render(<TagsPage />, { wrapper: Wrapper });
    const allButtons = container.querySelectorAll('button');
    allButtons.forEach((btn) => {
      expect(btn.querySelector('button')).toBeNull();
    });
  });

  it('gives the search input an accessible name', () => {
    render(<TagsPage />, { wrapper: Wrapper });
    expect(screen.getByRole('textbox', { name: /search tags/i })).toBeInTheDocument();
  });

  it('selecting a tag card via the keyboard triggers navigation', () => {
    const { container } = render(<TagsPage />, { wrapper: Wrapper });
    // The tag cards are the outer role=button containers (TagBadge inner buttons must not match).
    const cards = container.querySelectorAll('div[role="button"].card');
    expect(cards.length).toBe(2);
    const chillCard = Array.from(cards).find((el) => el.textContent?.includes('chill')) as HTMLElement;
    expect(chillCard).toBeDefined();
    fireEvent.keyDown(chillCard, { key: 'Enter' });
    expect(window.location.pathname).toBe('/worlds');
    expect(window.location.search).toContain('tag=chill');
  });
});
