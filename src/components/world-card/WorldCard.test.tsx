import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorldCard } from '../world-card';
import { ListsProvider } from '../../contexts/ListsContext';
import { resetListsDb } from '../../test/listsDb';

const mockWorld = {
  worldId: 'wrld_test',
  name: 'Test World',
  authorName: 'Tester',
  capacity: 40,
  platforms: ['standalonewindows', 'android', 'ios'],
  tags: ['chill'],
  imageUrl: '',
  vrchatUrl: 'https://vrchat.com/home/world/wrld_test',
  quality: 'good' as const,
  createdAt: '2024-01-01',
  internalAddDate: '2024-02-01',
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ListsProvider>{children}</ListsProvider>;
}

describe('WorldCard', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await resetListsDb();
  });

  it('renders world name and author', () => {
    render(<WorldCard world={mockWorld} />, { wrapper: Wrapper });
    expect(screen.getByText('Test World')).toBeInTheDocument();
    expect(screen.getByText(/by Tester/)).toBeInTheDocument();
  });

  it('renders mapped platform chips', () => {
    render(<WorldCard world={mockWorld} />, { wrapper: Wrapper });
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Android')).toBeInTheDocument();
    expect(screen.getByText('iOS')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<WorldCard world={mockWorld} onSelect={onSelect} />, { wrapper: Wrapper });
    screen.getByLabelText(/Details - Test World/).click();
    expect(onSelect).toHaveBeenCalledWith('wrld_test');
  });

  it('renders a share button that copies the VRChat URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, { wrapper: Wrapper });

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();

    await userEvent.click(shareButton);

    expect(writeText).toHaveBeenCalledWith(mockWorld.vrchatUrl);
  });

  it('calls onTagClick when a tag is clicked', async () => {
    const onTagClick = vi.fn();
    render(
      <WorldCard world={mockWorld} onSelect={vi.fn()} onTagClick={onTagClick} />,
      { wrapper: Wrapper },
    );

    const tagButton = screen.getByTitle('chill');
    await userEvent.click(tagButton);

    expect(onTagClick).toHaveBeenCalledWith('chill');
  });

  it('does not trigger card navigation when a tag is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <WorldCard world={mockWorld} onSelect={onSelect} onTagClick={vi.fn()} />,
      { wrapper: Wrapper },
    );

    const tagButton = screen.getByTitle('chill');
    await userEvent.click(tagButton);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onPlatformClick when a platform chip is clicked', async () => {
    const onPlatformClick = vi.fn();
    render(
      <WorldCard world={mockWorld} onSelect={vi.fn()} onPlatformClick={onPlatformClick} />,
      { wrapper: Wrapper },
    );

    const platformButton = screen.getByTitle('Desktop');
    await userEvent.click(platformButton);

    expect(onPlatformClick).toHaveBeenCalledWith('standalonewindows');
  });

  it('does not trigger card navigation when a platform chip is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <WorldCard world={mockWorld} onSelect={onSelect} onPlatformClick={vi.fn()} />,
      { wrapper: Wrapper },
    );

    const platformButton = screen.getByTitle('Desktop');
    await userEvent.click(platformButton);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('falls back to createdAt when internalAddDate is missing', () => {
    render(<WorldCard world={{ ...mockWorld, internalAddDate: undefined }} />, { wrapper: Wrapper });
    expect(
      screen.getByText(new Date('2024-01-01').toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it('does not trigger card navigation when the share button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const onSelect = vi.fn();
    render(<WorldCard world={mockWorld} onSelect={onSelect} />, { wrapper: Wrapper });

    const shareButton = screen.getByRole('button', { name: /share/i });
    await userEvent.click(shareButton);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders a save button when the world is not in any list', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /save to list/i })).toBeInTheDocument();
  });

  it('does not trigger card navigation when the save button is clicked', async () => {
    const onSelect = vi.fn();
    render(<WorldCard world={mockWorld} onSelect={onSelect} />, { wrapper: Wrapper });
    const saveButton = screen.getByRole('button', { name: /save to list/i });
    await userEvent.click(saveButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders the author as a clickable button when onAuthorClick is provided', () => {
    render(
      <WorldCard world={mockWorld} onSelect={vi.fn()} onAuthorClick={vi.fn()} />,
      { wrapper: Wrapper },
    );
    const authorButton = screen.getByRole('button', { name: /by tester/i });
    expect(authorButton).toBeInTheDocument();
    expect(authorButton.tagName).toBe('BUTTON');
  });

  it('calls onAuthorClick with the author name when the author is clicked', async () => {
    const onAuthorClick = vi.fn();
    render(
      <WorldCard
        world={mockWorld}
        onSelect={vi.fn()}
        onAuthorClick={onAuthorClick}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: /by tester/i }));

    expect(onAuthorClick).toHaveBeenCalledWith('Tester');
  });

  it('does not trigger card navigation when the author is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <WorldCard
        world={mockWorld}
        onSelect={onSelect}
        onAuthorClick={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: /by tester/i }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders the author as plain text when authorName is missing', () => {
    const onAuthorClick = vi.fn();
    render(
      <WorldCard
        world={{ ...mockWorld, authorName: '' }}
        onSelect={vi.fn()}
        onAuthorClick={onAuthorClick}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('button', { name: /by/i })).not.toBeInTheDocument();
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it('renders the author as plain text when onAuthorClick is not provided', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /by tester/i })).not.toBeInTheDocument();
    expect(screen.getByText(/by tester/i)).toBeInTheDocument();
  });

  it('hides the rating bar when ratingSummary prop is not provided', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.queryByTestId('world-rating-bar-card')).not.toBeInTheDocument();
  });

  it('renders a filled rating bar when a summary is provided', () => {
    render(
      <WorldCard
        world={mockWorld}
        onSelect={vi.fn()}
        ratingSummary={{ worldId: 'wrld_test', good: 4, bad: 1, userRating: null }}
      />,
      { wrapper: Wrapper },
    );
    const bar = screen.getByTestId('world-rating-bar-card');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveTextContent('80%');
  });

  it('hides the rating bar when ratingSummary is null (no ratings for this world)', () => {
    render(
      <WorldCard world={mockWorld} onSelect={vi.fn()} ratingSummary={null} />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByTestId('world-rating-bar-card')).not.toBeInTheDocument();
  });

  it('renders the image through wsrv.nl at w=280 with lazy loading', () => {
    render(
      <WorldCard
        world={{ ...mockWorld, imageUrl: 'https://api.vrchat.cloud/image.png' }}
        onSelect={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    const img = screen.getByRole('img', { name: 'Test World' });
    expect(img).toHaveAttribute(
      'src',
      'https://wsrv.nl/?url=https%3A%2F%2Fapi.vrchat.cloud%2Fimage.png&w=280&output=webp&q=65',
    );
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('shows a shimmer placeholder behind the card image', () => {
    render(
      <WorldCard
        world={{ ...mockWorld, imageUrl: 'https://api.vrchat.cloud/image.png' }}
        onSelect={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    const shimmer = document.querySelector('.animate-shimmer');
    expect(shimmer).not.toBeNull();
    expect(shimmer).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the Open in VRChat link as an anchor when vrchatUrl is present', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /open in vrchat/i });
    expect(link).toHaveAttribute('href', 'https://vrchat.com/home/world/wrld_test');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render a clickable Open in VRChat link when vrchatUrl is empty', () => {
    render(
      <WorldCard world={{ ...mockWorld, vrchatUrl: '' }} onSelect={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByRole('link', { name: /open in vrchat/i })).not.toBeInTheDocument();
    expect(
      screen.getByTitle(/no vrchat link is available/i),
    ).toBeInTheDocument();
  });
});

describe('WorldCard curator badges', () => {
  it('shows quality and high priority badges when showCuratorBadges is true (default)', () => {
    render(
      <WorldCard
        world={{ ...mockWorld, highPriority: true }}
        onSelect={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('hides quality and high priority badges when showCuratorBadges is false', () => {
    render(
      <WorldCard
        world={{ ...mockWorld, highPriority: true }}
        onSelect={vi.fn()}
        showCuratorBadges={false}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
  });
});

describe('WorldCard curator quick actions', () => {
  function CuratorWrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={client}>
        <ListsProvider>{children}</ListsProvider>
      </QueryClientProvider>
    );
  }

  it('renders quick actions for an untagged world when canCurate is true', () => {
    render(
      <WorldCard world={{ ...mockWorld, quality: null }} onSelect={vi.fn()} canCurate />,
      { wrapper: CuratorWrapper },
    );
    expect(screen.getByRole('button', { name: 'Mark Good' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Bad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark High Priority' })).toBeInTheDocument();
  });

  it('hides quick actions when canCurate is false (default)', () => {
    render(<WorldCard world={{ ...mockWorld, quality: null }} onSelect={vi.fn()} />, {
      wrapper: CuratorWrapper,
    });
    expect(
      screen.queryByRole('button', {
        name: /mark good|mark bad|mark high priority|clear quality/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('renders an Edit tags button when canCurate is true', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} canCurate />, {
      wrapper: CuratorWrapper,
    });
    expect(screen.getByRole('button', { name: /edit tags/i })).toBeInTheDocument();
  });

  it('hides the Edit tags button when canCurate is false (default)', () => {
    render(<WorldCard world={mockWorld} onSelect={vi.fn()} />, {
      wrapper: CuratorWrapper,
    });
    expect(screen.queryByRole('button', { name: /edit tags/i })).not.toBeInTheDocument();
  });

  it('opens the edit tags dialog pre-selected when Edit tags is clicked', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/api/tags')) {
        return Promise.resolve(
          new Response(JSON.stringify({ tags: [{ tag: 'chill', count: 1 }] }), { status: 200 }),
        );
      }
      if (url.includes('/tags') && init?.method === 'PUT') {
        return Promise.resolve(new Response(JSON.stringify({ updated: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<WorldCard world={{ ...mockWorld, tags: ['chill'] }} onSelect={vi.fn()} canCurate />, {
      wrapper: CuratorWrapper,
    });
    await user.click(screen.getByRole('button', { name: /edit tags/i }));
    await screen.findByRole('dialog');
    expect(await screen.findByRole('checkbox', { name: /chill/i })).toBeChecked();
  });
});
