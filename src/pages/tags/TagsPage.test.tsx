import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const tagsRefetch = vi.fn();

vi.mock('../../hooks/useApi', () => ({
  useTags: () => ({
    data: isPending || isError ? undefined : { tags: mockTags },
    isPending,
    isError,
    error,
    refetch: tagsRefetch,
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
    tagsRefetch.mockClear();
    queryClient.clear();
  });

  it('announces a load failure in an alert and retries on demand', async () => {
    const user = userEvent.setup();
    isError = true;
    error = new Error('down');
    render(<TagsPage />, { wrapper: Wrapper });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to load tags/i);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(tagsRefetch).toHaveBeenCalled();
  });

  it('renders tag cards for each tag', () => {
    const { container } = render(<TagsPage />, { wrapper: Wrapper });
    const cardGrid = container.querySelector('.grid.gap-4');
    expect(cardGrid).not.toBeNull();
    const cards = within(cardGrid as HTMLElement).getAllByText(/^(chill|social)$/);
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('does not nest interactive elements (invalid HTML)', () => {
    const { container } = render(<TagsPage />, { wrapper: Wrapper });
    container.querySelectorAll('a, button, [role="button"]').forEach((el) => {
      expect(el.querySelector('a, button, [role="button"]')).toBeNull();
    });
  });

  it('gives the search input an accessible name', () => {
    render(<TagsPage />, { wrapper: Wrapper });
    expect(screen.getByRole('textbox', { name: /search tags/i })).toBeInTheDocument();
  });

  it('renders each tag card as a link to the filtered worlds page', () => {
    render(<TagsPage />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: 'chill' });
    expect(link).toHaveAttribute('href', '/worlds?tag=chill');
  });

  it('navigates when a tag card link is activated', () => {
    render(<TagsPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('link', { name: 'social' }));
    expect(window.location.pathname).toBe('/worlds');
    expect(window.location.search).toContain('tag=social');
  });
});
