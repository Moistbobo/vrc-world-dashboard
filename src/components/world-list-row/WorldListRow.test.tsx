import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <span data-testid="location">{pathname}{search}</span>;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      {children}
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('WorldListRow', () => {
  it('renders world name, author, and capacity', () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    expect(screen.getByText('Test World')).toBeInTheDocument();
    expect(screen.getByText(/by Tester/)).toBeInTheDocument();
    expect(screen.getByText(/40 capacity/)).toBeInTheDocument();
  });

  it('exposes the row primary action as a link named after the world', () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: 'Test World' });
    expect(link).toHaveAttribute('href', '/worlds/wrld_test');
  });

  it('navigates to the world when the link is clicked', async () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    await userEvent.click(screen.getByRole('link', { name: 'Test World' }));
    expect(screen.getByTestId('location').textContent).toBe('/worlds/wrld_test');
  });

  it('navigates to the world when the focused link receives Enter', async () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: 'Test World' });
    link.focus();
    expect(link).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('location').textContent).toBe('/worlds/wrld_test');
  });

  it('does not nest interactive elements (invalid HTML)', () => {
    const { container } = render(
      <WorldListRow
        world={mockWorld}
        to="/worlds/wrld_test"
        onAuthorClick={vi.fn()}
        ratingSummary={mockSummary}
      />,
      { wrapper: Wrapper },
    );
    container.querySelectorAll('a, button, [role="button"]').forEach((el) => {
      expect(el.querySelector('a, button, [role="button"]')).toBeNull();
    });
  });

  it('renders the author as a real button when onAuthorClick is provided', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} to="/worlds/wrld_test" onAuthorClick={vi.fn()} />,
      { wrapper: Wrapper },
    );
    const authorButton = container.querySelector('button[class*="cursor-pointer"]');
    expect(authorButton).not.toBeNull();
    expect(authorButton!.tagName).toBe('BUTTON');
    expect(authorButton!.getAttribute('aria-label')).toMatch(/by tester/i);
  });

  it('clicking the author does not navigate', () => {
    const onAuthorClick = vi.fn();
    const { container } = render(
      <WorldListRow
        world={mockWorld}
        to="/worlds/wrld_test"
        onAuthorClick={onAuthorClick}
      />,
      { wrapper: Wrapper },
    );
    const authorButton = container.querySelector('button[class*="cursor-pointer"]') as HTMLElement;
    expect(authorButton).not.toBeNull();
    fireEvent.click(authorButton);
    expect(onAuthorClick).toHaveBeenCalledWith('Tester');
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('clicking a tag badge does not navigate', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} to="/worlds/wrld_test" />,
      { wrapper: Wrapper },
    );
    const tagBadge = container.querySelector('[title="chill"]') as HTMLElement;
    expect(tagBadge).not.toBeNull();
    expect(tagBadge.tagName).toBe('SPAN');
    fireEvent.click(tagBadge);
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('renders the rating bar when a summary is provided', () => {
    render(
      <WorldListRow world={mockWorld} to="/worlds/wrld_test" ratingSummary={mockSummary} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId('world-rating-bar-list')).toBeInTheDocument();
  });

  it('hides the rating bar when summary is undefined', () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    expect(screen.queryByTestId('world-rating-bar-list')).not.toBeInTheDocument();
  });

  it('hides the rating bar below the sm breakpoint so the row cannot overflow a narrow viewport', () => {
    render(
      <WorldListRow world={mockWorld} to="/worlds/wrld_test" ratingSummary={mockSummary} />,
      { wrapper: Wrapper },
    );
    const wrapper = screen.getByTestId('world-rating-bar-list').parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toMatch(/\bhidden\b/);
    expect(wrapper!.className).toMatch(/\bsm:block\b/);
  });

  it('renders the thumbnail through wsrv.nl at w=128 with fetchpriority low', () => {
    render(
      <WorldListRow
        world={{ ...mockWorld, imageUrl: 'https://api.vrchat.cloud/image.png' }}
        to="/worlds/wrld_test"
      />,
      { wrapper: Wrapper },
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
        to="/worlds/wrld_test"
      />,
      { wrapper: Wrapper },
    );
    const shimmer = document.querySelector('.animate-shimmer');
    expect(shimmer).not.toBeNull();
    expect(shimmer).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('WorldListRow curator badges', () => {
  it('shows the high priority badge when showCuratorBadges is true (default)', () => {
    render(
      <WorldListRow world={{ ...mockWorld, highPriority: true }} to="/worlds/wrld_test" />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('hides the high priority badge when showCuratorBadges is false', () => {
    render(
      <WorldListRow
        world={{ ...mockWorld, highPriority: true }}
        to="/worlds/wrld_test"
        showCuratorBadges={false}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
  });

  it('hides the quality indicator when showCuratorBadges is false', () => {
    const { container } = render(
      <WorldListRow world={mockWorld} to="/worlds/wrld_test" showCuratorBadges={false} />,
      { wrapper: Wrapper },
    );
    expect(container.textContent).not.toContain('✅');
  });
});

describe('WorldListRow show flags', () => {
  const flagWorld = { ...mockWorld, flags: ['furry', 'booth slop', 'poor performance', 'noisy'] };

  it('renders no Show flags toggle when the world has no flags', () => {
    render(<WorldListRow world={mockWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /show flags/i })).not.toBeInTheDocument();
  });

  it('hides exclude chips by default, caps at 3 with +N, and expands on click', async () => {
    render(<WorldListRow world={flagWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });

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

  it('collapses again on second click and does not navigate', () => {
    render(<WorldListRow world={flagWorld} to="/worlds/wrld_test" />, { wrapper: Wrapper });

    const toggle = screen.getByRole('button', { name: 'Show flags' });
    fireEvent.click(toggle);
    expect(screen.getByTitle('furry')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTitle('furry')).not.toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('assigns a unique aria-controls target to each instance', async () => {
    render(
      <>
        <WorldListRow world={{ ...flagWorld, worldId: 'wrld_a', name: 'World A' }} to="/worlds/wrld_a" />
        <WorldListRow world={{ ...flagWorld, worldId: 'wrld_b', name: 'World B' }} to="/worlds/wrld_b" />
      </>,
      { wrapper: Wrapper },
    );

    const toggles = screen.getAllByRole('button', { name: 'Show flags' });
    expect(toggles).toHaveLength(2);
    const ids = toggles.map((toggle) => toggle.getAttribute('aria-controls'));
    expect(ids[0]).not.toEqual(ids[1]);

    await userEvent.click(toggles[0]);
    await userEvent.click(toggles[1]);
    ids.forEach((id) => expect(document.getElementById(id as string)).not.toBeNull());
  });
});
