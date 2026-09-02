import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaffleChart } from './WaffleChart';

const data = [
  { name: 'chill', value: 60 },
  { name: 'club', value: 40 },
];

function renderChart(onSelectTag = vi.fn()) {
  render(
    <WaffleChart data={data} onSelectTag={onSelectTag} getEmoji={(tag) => (tag === 'chill' ? '😎' : '🕺')} />,
  );
  return onSelectTag;
}

describe('WaffleChart legend', () => {
  it('calls onSelectTag when the color chip is clicked', async () => {
    const onSelectTag = renderChart();
    await userEvent.click(screen.getByRole('button', { name: 'Filter by chill' }));
    expect(onSelectTag).toHaveBeenCalledWith('chill');
  });

  it('calls onSelectTag when the tag name is clicked', async () => {
    const onSelectTag = renderChart();
    const button = screen.getByRole('button', { name: 'Filter by club' });
    await userEvent.click(within(button).getByText('club'));
    expect(onSelectTag).toHaveBeenCalledWith('club');
  });

  it('calls onSelectTag when the emoji or count is clicked', async () => {
    const onSelectTag = renderChart();
    const button = screen.getByRole('button', { name: 'Filter by chill' });
    await userEvent.click(within(button).getByText('😎'));
    expect(onSelectTag).toHaveBeenCalledWith('chill');
    await userEvent.click(within(button).getByText('(60)'));
    expect(onSelectTag).toHaveBeenCalledTimes(2);
  });

  it('activates via Enter and Space keys', async () => {
    const onSelectTag = renderChart();
    const button = screen.getByRole('button', { name: 'Filter by club' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelectTag).toHaveBeenCalledWith('club');
    await userEvent.keyboard(' ');
    expect(onSelectTag).toHaveBeenCalledTimes(2);
  });

  it('renders one button per legend item and no anchors', () => {
    renderChart();
    expect(screen.getAllByRole('button', { name: /Filter by/ })).toHaveLength(2);
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });
});
