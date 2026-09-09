import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

type Props = Parameters<typeof Pagination>[0];

function setup(overrides: Partial<Props> = {}) {
  const onJumpToPage = vi.fn();
  const onChangeOffset = vi.fn();
  const utils = render(
    <Pagination
      offset={40}
      limit={20}
      total={240}
      onChangeOffset={onChangeOffset}
      onJumpToPage={onJumpToPage}
      {...overrides}
    />,
  );
  return { onJumpToPage, onChangeOffset, rerender: utils.rerender };
}

async function typePage(text: string) {
  const input = screen.getByLabelText(/go to page/i);
  await userEvent.clear(input);
  await userEvent.type(input, text);
  return input;
}

describe('Pagination page input', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render the input when showPageInput is unset', () => {
    setup({ onJumpToPage: undefined, showPageInput: undefined });
    expect(screen.queryByLabelText(/go to page/i)).not.toBeInTheDocument();
  });

  it('shows the current page and total pages', () => {
    setup({ showPageInput: true });
    expect(screen.getByLabelText(/go to page/i)).toHaveValue('3');
    expect(screen.getByText('of 12')).toBeInTheDocument();
  });

  it('jumps to a valid page on Enter without scrolling', async () => {
    const scrollTo = window.scrollTo as ReturnType<typeof vi.fn>;
    const { onJumpToPage } = setup({ showPageInput: true });
    await typePage('7');
    await userEvent.type(screen.getByLabelText(/go to page/i), '{enter}');
    expect(onJumpToPage).toHaveBeenCalledWith(7);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('jumps to a valid page on blur', async () => {
    const { onJumpToPage } = setup({ showPageInput: true });
    await typePage('2');
    await userEvent.tab();
    expect(onJumpToPage).toHaveBeenCalledWith(2);
  });

  it('reverts and rejects invalid entries without firing a callback', async () => {
    const { onJumpToPage } = setup({ showPageInput: true });
    for (const value of ['0', '-3', 'abc', '99']) {
      const input = screen.getByLabelText(/go to page/i);
      await userEvent.clear(input);
      await userEvent.type(input, value);
      await userEvent.tab();
      expect(onJumpToPage).not.toHaveBeenCalled();
      expect(input).toHaveValue('3');
    }
  });

  it('treats an empty submit as a no-op', async () => {
    const { onJumpToPage } = setup({ showPageInput: true });
    const input = screen.getByLabelText(/go to page/i);
    await userEvent.type(input, '{backspace}');
    await userEvent.tab();
    expect(onJumpToPage).not.toHaveBeenCalled();
    expect(input).toHaveValue('3');
  });

  it('stays in sync when the current page changes', async () => {
    const { rerender } = setup({ showPageInput: true });
    rerender(
      <Pagination
        offset={60}
        limit={20}
        total={240}
        onChangeOffset={vi.fn()}
        onJumpToPage={vi.fn()}
        showPageInput
      />,
    );
    expect(screen.getByLabelText(/go to page/i)).toHaveValue('4');
  });
});
