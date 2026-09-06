import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorldListRow } from '../world-list-row';
import type { World, RatingSummary } from '../../types';

const mockWorld: World = {
  worldId: 'wrld_test',
  name: 'Test World',
  authorName: 'Tester',
  capacity: 40,
  platforms: ['standalonewindows', 'android', 'ios'],
  tags: ['chill', 'social', 'japanese', 'night'],
  imageUrl: '',
  vrchatUrl: 'https://vrchat.com/home/world/wrld_test',
  quality: 'good',
  createdAt: '2024-01-01',
  internalAddDate: '2024-02-01',
};

const mockSummary: RatingSummary = {
  worldId: 'wrld_test',
  good: 4,
  bad: 1,
  userRating: null,
};

describe('WorldListRow', () => {
  it('renders world name, author, and capacity', () => {
    render(<WorldListRow world={mockWorld} onSelect={vi.fn()} />);
    expect(screen.getByText('Test World')).toBeInTheDocument();
    expect(screen.getByText(/by Tester/)).toBeInTheDocument();
    expect(screen.getByText(/40 capacity/)).toBeInTheDocument();
  });

  it('does not nest a button inside a button (invalid HTML)', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} onSelect={vi.fn()} onAuthorClick={vi.fn()} ratingSummary={mockSummary} />,
    );
    const rowButtons = container.querySelectorAll('button');
    rowButtons.forEach((btn) => {
      expect(btn.querySelector('button')).toBeNull();
    });
  });

  it('renders the author as a real button when onAuthorClick is provided', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} onSelect={vi.fn()} onAuthorClick={vi.fn()} />,
    );
    // The author control is rendered as an actual <button>, not a span with role=button.
    const authorButton = container.querySelector('button[class*="cursor-pointer"]');
    expect(authorButton).not.toBeNull();
    expect(authorButton!.tagName).toBe('BUTTON');
    expect(authorButton!.getAttribute('aria-label')).toMatch(/by tester/i);
  });

  it('clicking the author does not trigger onSelect', () => {
    const onSelect = vi.fn();
    const onAuthorClick = vi.fn();
    const { container } = render(
      <WorldListRow
        world={mockWorld}
        onSelect={onSelect}
        onAuthorClick={onAuthorClick}
      />,
    );
    const authorButton = container.querySelector('button[class*="cursor-pointer"]') as HTMLElement;
    expect(authorButton).not.toBeNull();
    fireEvent.click(authorButton);
    expect(onAuthorClick).toHaveBeenCalledWith('Tester');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicking a tag badge does not trigger onSelect', () => {
    const onSelect = vi.fn();
    const { container } = render(<WorldListRow world={mockWorld} onSelect={onSelect} />);
    // TagBadge is rendered as <button title={tag}>.
    const tagBadge = container.querySelector('button[title="chill"]') as HTMLElement;
    expect(tagBadge).not.toBeNull();
    fireEvent.click(tagBadge);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selecting the row via Enter key triggers onSelect', () => {
    const onSelect = vi.fn();
    render(<WorldListRow world={mockWorld} onSelect={onSelect} />);
    const row = screen.getByRole('button', { name: /test world/i });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('wrld_test');
  });

  it('renders the rating bar when a summary is provided', () => {
    render(<WorldListRow world={mockWorld} onSelect={vi.fn()} ratingSummary={mockSummary} />);
    expect(screen.getByTestId('world-rating-bar-list')).toBeInTheDocument();
  });

  it('hides the rating bar when summary is undefined', () => {
    render(<WorldListRow world={mockWorld} onSelect={vi.fn()} />);
    expect(screen.queryByTestId('world-rating-bar-list')).not.toBeInTheDocument();
  });

  it('hides the rating bar below the sm breakpoint so the row cannot overflow a narrow viewport', () => {
    render(<WorldListRow world={mockWorld} onSelect={vi.fn()} ratingSummary={mockSummary} />);
    const wrapper = screen.getByTestId('world-rating-bar-list').parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toMatch(/\bhidden\b/);
    expect(wrapper!.className).toMatch(/\bsm:block\b/);
  });

  it('renders the thumbnail through wsrv.nl at w=128 with fetchpriority low', () => {
    render(
      <WorldListRow
        world={{ ...mockWorld, imageUrl: 'https://api.vrchat.cloud/image.png' }}
        onSelect={vi.fn()}
      />,
    );
    const img = document.querySelector('img');
    expect(img).toHaveAttribute(
      'src',
      'https://wsrv.nl/?url=https%3A%2F%2Fapi.vrchat.cloud%2Fimage.png&w=128&output=webp&q=80',
    );
    expect(img).toHaveAttribute('fetchpriority', 'low');
  });

  it('shows a shimmer placeholder behind the row thumbnail', () => {
    render(
      <WorldListRow
        world={{ ...mockWorld, imageUrl: 'https://api.vrchat.cloud/image.png' }}
        onSelect={vi.fn()}
      />,
    );
    const shimmer = document.querySelector('.animate-shimmer');
    expect(shimmer).not.toBeNull();
    expect(shimmer).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('WorldListRow curator badges', () => {
  it('shows the high priority badge when showCuratorBadges is true (default)', () => {
    render(<WorldListRow world={{ ...mockWorld, highPriority: true }} onSelect={vi.fn()} />);
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('hides the high priority badge when showCuratorBadges is false', () => {
    render(
      <WorldListRow
        world={{ ...mockWorld, highPriority: true }}
        onSelect={vi.fn()}
        showCuratorBadges={false}
      />,
    );
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
  });

  it('hides the quality indicator when showCuratorBadges is false', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} onSelect={vi.fn()} showCuratorBadges={false} />,
    );
    expect(container.textContent).not.toContain('✅');
  });
});

describe('WorldListRow show flags', () => {
  const flagWorld = { ...mockWorld, flags: ['furry', 'booth slop', 'poor performance', 'noisy'] };

  it('renders no Show flags toggle when the world has no flags', () => {
    render(<WorldListRow world={mockWorld} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /show flags/i })).not.toBeInTheDocument();
  });

  it('hides exclude chips by default, caps at 3 with +N, and expands on click', async () => {
    render(<WorldListRow world={flagWorld} onSelect={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Show flags' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTitle('furry')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTitle('furry')).toBeInTheDocument();
    expect(screen.getByTitle('booth slop')).toBeInTheDocument();
    expect(screen.queryByTitle('noisy')).not.toBeInTheDocument();
    expect(screen.getAllByText('+1')).toHaveLength(2);
    expect(screen.getByTitle('furry')).toHaveClass('bg-rose-500/15');
  });

  it('collapses again on second click and does not trigger onSelect', () => {
    const onSelect = vi.fn();
    render(<WorldListRow world={flagWorld} onSelect={onSelect} />);

    const toggle = screen.getByRole('button', { name: 'Show flags' });
    fireEvent.click(toggle);
    expect(screen.getByTitle('furry')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTitle('furry')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
