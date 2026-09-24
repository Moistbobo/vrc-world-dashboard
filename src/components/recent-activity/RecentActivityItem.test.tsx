import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentActivityItem } from './RecentActivityItem';
import { formatTimestamp } from '../../utils/formatTimestamp';

const commentRow = {
  type: 'comment',
  id: 'c1',
  worldId: 'w1',
  username: 'Ann',
  content: 'Nice world',
  createdAt: '2024-01-03T10:30:00Z',
  worldName: 'Alpha',
} as const;

const goodRatingRow = {
  type: 'rating',
  id: 'r1',
  worldId: 'w2',
  value: 'good',
  createdAt: '2024-01-02T09:00:00Z',
  worldName: 'Beta',
} as const;

const badRatingRow = {
  type: 'rating',
  id: 'r2',
  worldId: 'w3',
  value: 'bad',
  createdAt: '2024-01-01T08:00:00Z',
  worldName: 'Gamma',
} as const;

describe('RecentActivityItem', () => {
  it('renders a comment row with username, preview, timestamp, and comment icon', () => {
    render(
        <RecentActivityItem row={commentRow} />
    );

    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Nice world')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(commentRow.createdAt))).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-comment')).toBeInTheDocument();
  });

  it('links a comment row to its world', () => {
    render(
        <RecentActivityItem row={commentRow} />
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/worlds/w1');
  });

  it('renders a good rating row with the thumb-up icon', () => {
    render(
        <RecentActivityItem row={goodRatingRow} />
    );

    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(goodRatingRow.createdAt))).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-good')).toBeInTheDocument();
  });

  it('renders a bad rating row with the thumb-down icon', () => {
    render(
        <RecentActivityItem row={badRatingRow} />
    );

    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText(formatTimestamp(badRatingRow.createdAt))).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-bad')).toBeInTheDocument();
  });
});
