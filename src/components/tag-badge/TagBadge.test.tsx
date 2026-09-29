import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagBadge } from '../tag-badge';

describe('TagBadge', () => {
  it('renders the tag with emoji and default styling', () => {
    const { container } = render(<TagBadge tag="chill" />);
    expect(screen.getByTitle('chill')).toBeInTheDocument();
    expect(container.textContent).toContain('chill');
  });

  it('renders the exclude variant with the flag marker and rose scheme', () => {
    const { container } = render(<TagBadge tag="booth slop" exclude />);
    const badge = screen.getByTitle('booth slop');
    expect(badge.className).toContain('bg-rose-500/15');
    expect(badge.className).toContain('text-rose-700');
    expect(badge.className).toContain('dark:text-rose-400');
    expect(badge.className).toContain('border-rose-500/30');
    expect(container.textContent).toContain('🚩');
  });

  it('names an emoji-only badge with the tag and hides the emoji from assistive tech', () => {
    render(<TagBadge tag="chill" emojiOnly />);
    const badge = screen.getByRole('button', { name: 'chill' });
    expect(badge).toHaveAccessibleName('chill');
    expect(badge.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('passes clicks through to onClick in both variants', async () => {
    const onClick = vi.fn();
    render(
      <>
        <TagBadge tag="chill" onClick={onClick} />
        <TagBadge tag="furry" exclude onClick={onClick} />
      </>,
    );
    await userEvent.click(screen.getByTitle('chill'));
    await userEvent.click(screen.getByTitle('furry'));
    expect(onClick).toHaveBeenCalledWith('chill');
    expect(onClick).toHaveBeenCalledWith('furry');
  });
});
