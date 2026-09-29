import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentimentRating } from './SentimentRating';

function renderComponent(props = {}) {
  return render(
    <SentimentRating
      summary={{ worldId: 'wrld_123', good: 3, bad: 1, userRating: null }}
      isLoading={false}
      isSubmitting={false}
      onRate={vi.fn()}
      onRemove={vi.fn()}
      {...props}
    />,
  );
}

describe('SentimentRating', () => {
  it('renders only thumbs up and thumbs down icons in the bar', () => {
    renderComponent();
    const goodButton = screen.getByRole('button', { name: /Good/i });
    const badButton = screen.getByRole('button', { name: /Bad/i });
    expect(goodButton).toHaveTextContent('');
    expect(badButton).toHaveTextContent('');
    expect(goodButton.querySelector('svg')).toBeInTheDocument();
    expect(badButton.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onRate("good") when the left half is clicked', () => {
    const onRate = vi.fn();
    renderComponent({ onRate });
    fireEvent.click(screen.getByRole('button', { name: /Good/i }));
    expect(onRate).toHaveBeenCalledWith('good');
  });

  it('calls onRate("bad") when the right half is clicked', () => {
    const onRate = vi.fn();
    renderComponent({ onRate });
    fireEvent.click(screen.getByRole('button', { name: /Bad/i }));
    expect(onRate).toHaveBeenCalledWith('bad');
  });

  it('marks the active half as pressed', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: 'good' } });
    expect(screen.getByRole('button', { name: /Good/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Bad/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onRemove when the active half is clicked again', () => {
    const onRemove = vi.fn();
    renderComponent({
      summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: 'good' },
      onRemove,
    });
    fireEvent.click(screen.getByRole('button', { name: /Good/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('exposes the good/bad segment labels as text instead of a title', () => {
    renderComponent();
    const fill = screen.getByTestId('rating-fill-container');
    expect(fill).toHaveTextContent('Good');
    expect(fill).toHaveTextContent('Bad');
    expect(fill.querySelector('[title]')).not.toBeInTheDocument();
  });

  it('renders a good/bad distribution bar', () => {
    renderComponent();
    const bar = screen.getByRole('progressbar', { name: /rating distribution/i });
    expect(bar).toBeInTheDocument();
  });

  it('renders clickable good and bad halves when there are no votes', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 0, bad: 0, userRating: null } });
    expect(screen.getByRole('button', { name: /Good/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Bad/i })).toBeEnabled();
  });

  it('fills the bar proportionally to good and bad percentages', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: null } });
    const fill = screen.getByTestId('rating-fill-container');
    expect(fill.children[0]).toHaveStyle('width: 75%');
    expect(fill.children[0]).toHaveTextContent('75%');
    expect(fill.children[1]).toHaveStyle('width: 25%');
    expect(fill.children[1]).toHaveTextContent('25%');
  });

  it('scales the thumbs up icon on the good half hover', () => {
    renderComponent();
    const goodButton = screen.getByRole('button', { name: /Good/i });
    const icon = goodButton.querySelector('svg');
    expect(icon).toHaveClass('group-hover:scale-110');
  });

  it('scales the thumbs down icon on the bad half hover', () => {
    renderComponent();
    const badButton = screen.getByRole('button', { name: /Bad/i });
    const icon = badButton.querySelector('svg');
    expect(icon).toHaveClass('group-hover:scale-110');
  });

  it('shows "Your Vote" with thumbs up under the bar when the user voted good', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: 'good' } });
    expect(screen.getByText(/Your Vote/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Vote/i).parentElement).toContainHTML('svg');
  });

  it('shows "Your Vote" with thumbs down under the bar when the user voted bad', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: 'bad' } });
    expect(screen.getByText(/Your Vote/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Vote/i).parentElement).toContainHTML('svg');
  });

  it('does not show "Your Vote" when the user has not voted', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: null } });
    expect(screen.queryByText(/Your Vote/i)).not.toBeInTheDocument();
  });

  it('shows the rating distribution label under the bar when the user has not voted', () => {
    renderComponent({ summary: { worldId: 'wrld_123', good: 3, bad: 1, userRating: null } });
    expect(screen.getByText(/rating distribution/i)).toBeInTheDocument();
  });
});
