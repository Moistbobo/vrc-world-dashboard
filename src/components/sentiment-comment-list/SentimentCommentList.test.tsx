import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentimentCommentList } from './SentimentCommentList';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

describe('SentimentCommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('shows empty state', () => {
    render(<SentimentCommentList comments={[]} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    render(<SentimentCommentList comments={[]} isLoading={true} />);
    expect(screen.getByTestId('sentiment-comment-list-loading')).toBeInTheDocument();
    expect(screen.queryByText(/no comments yet/i)).not.toBeInTheDocument();
  });

  it('renders comments', () => {
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u1',
        username: 'Anonymous',
        content: 'Nice!',
        created_at: new Date().toISOString(),
      },
    ];
    render(<SentimentCommentList comments={comments} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    expect(screen.getByText('Nice!')).toBeInTheDocument();
  });

  it('wraps long unbroken comment content so it stays inside the card', () => {
    const longContent = 'x'.repeat(200);
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u1',
        username: 'Anonymous',
        content: longContent,
        created_at: new Date().toISOString(),
      },
    ];
    render(<SentimentCommentList comments={comments} />);
    const paragraph = screen.getByText(longContent);
    expect(paragraph).toHaveClass('whitespace-pre-wrap');
    expect(paragraph).toHaveClass('break-words');
  });

  it('highlights the current user comment with (You)', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u-current' } } },
      error: null,
    });
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u-current',
        username: 'Anonymous',
        content: 'My comment',
        created_at: new Date().toISOString(),
      },
      {
        id: 'c2',
        world_id: 'w1',
        user_id: 'u-other',
        username: 'Anonymous',
        content: 'Other comment',
        created_at: new Date().toISOString(),
      },
    ];
    render(<SentimentCommentList comments={comments} />);
    const youLabel = await screen.findByText('(You)');
    expect(youLabel).toBeInTheDocument();
    expect(youLabel.parentElement).toHaveTextContent('Anonymous (You)');
    expect(screen.getAllByText('Anonymous')).toHaveLength(2);
  });

  it('renders the timestamp next to the author label', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u-current' } } },
      error: null,
    });
    const date = new Date('2026-06-27T21:22:20Z');
    const expected = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear() % 100).padStart(2, '0')}(${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]})${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u-current',
        username: 'Anonymous',
        content: 'My comment',
        created_at: '2026-06-27T21:22:20Z',
      },
    ];
    render(<SentimentCommentList comments={comments} />);
    const listItem = (await screen.findByText('My comment')).closest('li');
    expect(listItem).toBeInTheDocument();
    const children = Array.from(listItem!.children[0].children);
    expect(children[0]).toHaveTextContent('Anonymous (You)');
    expect(children[1]).toHaveTextContent(expected);
    expect(children[2]).toHaveTextContent('c1');
  });

  it('shows a Load more button when there are more comments', () => {
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u1',
        username: 'Anonymous',
        content: 'Nice!',
        created_at: new Date().toISOString(),
      },
    ];
    const onLoadMore = vi.fn();
    render(<SentimentCommentList comments={comments} hasMore={true} onLoadMore={onLoadMore} />);
    const button = screen.getByRole('button', { name: /Load more/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not show Load more button when hasMore is false', () => {
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u1',
        username: 'Anonymous',
        content: 'Nice!',
        created_at: new Date().toISOString(),
      },
    ];
    render(<SentimentCommentList comments={comments} hasMore={false} />);
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });

  it('shows a loading spinner on the Load more button while loading', () => {
    const comments = [
      {
        id: 'c1',
        world_id: 'w1',
        user_id: 'u1',
        username: 'Anonymous',
        content: 'Nice!',
        created_at: new Date().toISOString(),
      },
    ];
    render(<SentimentCommentList comments={comments} hasMore={true} isLoadingMore={true} />);
    expect(screen.getByText(/Loading more comments/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
