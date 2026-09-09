import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditTagsDialog } from './EditTagsDialog';
import type { World } from '../../types';

const world: World = {
  worldId: 'wrld_1',
  name: 'Test World',
  authorName: 'Tester',
  capacity: 10,
  platforms: [],
  tags: ['chill'],
  flags: ['furry'],
  imageUrl: '',
  vrchatUrl: '',
  quality: null,
  createdAt: '2024-01-01',
  guildId: 'guild_1',
};

const tagsBody = {
  tags: [
    { tag: 'chill', count: 2 },
    { tag: 'social', count: 3 },
    { tag: 'dance', count: 1 },
  ],
};

const flagsBody = {
  flags: [
    { flag: 'furry', count: 5 },
    { flag: 'booth slop', count: 2 },
    { flag: 'gimmick', count: 1 },
  ],
};

function stubFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    if (url.includes('/api/tags')) {
      return Promise.resolve(new Response(JSON.stringify(tagsBody), { status: 200 }));
    }
    if (url.includes('/api/flags')) {
      return Promise.resolve(new Response(JSON.stringify(flagsBody), { status: 200 }));
    }
    if (url.includes('/tags') && init?.method === 'PUT') {
      return Promise.resolve(new Response(JSON.stringify({ updated: true }), { status: 200 }));
    }
    if (url.includes('/flags') && init?.method === 'PUT') {
      return Promise.resolve(
        new Response(JSON.stringify({ updated: 1, flags: [] }), { status: 200 }),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
  }) as unknown as typeof fetch;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const putCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');

async function renderDialog(onOpenChange = vi.fn()) {
  const result = render(
    <EditTagsDialog world={world} open={true} onOpenChange={onOpenChange} />,
    { wrapper: Wrapper },
  );
  await screen.findByRole('dialog');
  return { onOpenChange, result };
}

describe('EditTagsDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubFetch();
  });

  it('loads tag options and pre-selects the world current tags', async () => {
    await renderDialog();
    expect(await screen.findByRole('checkbox', { name: /chill/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /social/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /dance/i })).not.toBeChecked();
  });

  it('renders tag options in alphabetical order', async () => {
    await renderDialog();
    const tagNames = (await screen.findAllByRole('checkbox'))
      .map((el) => el.textContent ?? '')
      .map((text) => text.match(/(chill|dance|social)/)?.[0])
      .filter((name) => name !== undefined);
    expect(tagNames).toEqual(['chill', 'dance', 'social']);
  });

  it('filters tags by a case-insensitive search query', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'CH');
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /social/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /dance/i })).not.toBeInTheDocument();
  });

  it('shows an empty-state message when no tags match', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'zzz');
    expect(screen.queryByRole('checkbox', { name: /social/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /dance/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no tags match/i)).toBeInTheDocument();
  });

  it('clears the search query when the dialog reopens', async () => {    const user = userEvent.setup();
    const { result } = await renderDialog();
    await user.type(await screen.findByRole('textbox', { name: /search/i }), 'chill');
    expect(screen.queryByRole('checkbox', { name: /social/i })).not.toBeInTheDocument();

    result.rerender(
      <EditTagsDialog world={world} open={false} onOpenChange={vi.fn()} />,
    );
    result.rerender(
      <EditTagsDialog world={world} open={true} onOpenChange={vi.fn()} />,
    );

    const search = await screen.findByRole('textbox', { name: /search/i });
    expect((search as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('checkbox', { name: /social/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeInTheDocument();
  });

  it('filters flags by a case-insensitive search query', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'FUR');
    expect(screen.getByRole('checkbox', { name: /furry/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /booth slop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /gimmick/i })).not.toBeInTheDocument();
  });

  it('filters tags and flags independently from the shared search input', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'social');
    expect(screen.getByRole('checkbox', { name: /social/i })).toBeInTheDocument();
    expect(screen.getByText(/no flags match/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /furry/i })).not.toBeInTheDocument();
  });

  it('shows the flags empty state while tags still populate for a shared query', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'dance');
    expect(screen.getByRole('checkbox', { name: /dance/i })).toBeInTheDocument();
    expect(screen.getByText(/no flags match/i)).toBeInTheDocument();
    expect(screen.queryByText(/no tags match/i)).not.toBeInTheDocument();
  });

  it('keeps flag selection while the search query changes', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search/i });
    await user.type(search, 'gim');
    await user.click(screen.getByRole('checkbox', { name: /gimmick/i }));
    expect(screen.getByRole('checkbox', { name: /gimmick/i })).toBeChecked();
    await user.clear(search);
    expect(screen.getByRole('checkbox', { name: /gimmick/i })).toBeChecked();
  });

  it('toggles a tag on and off', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const social = await screen.findByRole('checkbox', { name: /social/i });
    await user.click(social);
    expect(social).toBeChecked();
    await user.click(social);
    expect(social).not.toBeChecked();
  });

  it('saves the full selected tag set via PUT and closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await user.click(await screen.findByRole('checkbox', { name: /social/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    const put = putCalls().find(([url]) => String(url).includes('/api/worlds/wrld_1/tags/edit'));
    expect(put).toBeDefined();
    expect(String(put![0])).toContain('/api/worlds/wrld_1/tags/edit');
    expect(JSON.parse((put![1] as RequestInit).body as string)).toEqual({
      guildId: 'guild_1',
      tags: ['chill', 'social'],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders a Flags section pre-selected from the world flags with counts', async () => {
    await renderDialog();
    expect(await screen.findByRole('heading', { name: /flags/i })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: /furry/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /booth slop/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /gimmick/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /furry/i }).textContent).toContain('5');
  });

  it('renders flag options in alphabetical order', async () => {
    await renderDialog();
    const flagNames = (await screen.findAllByRole('checkbox'))
      .map((el) => el.textContent ?? '')
      .map((text) => text.match(/(furry|booth slop|gimmick)/)?.[0])
      .filter((name) => name !== undefined);
    expect(flagNames).toEqual(['booth slop', 'furry', 'gimmick']);
  });

  it('styles selected flag chips with the rose scheme and a flag marker, unlike unselected ones', async () => {
    await renderDialog();
    const selected = await screen.findByRole('checkbox', { name: /furry/i });
    expect(selected.className).toContain('bg-rose-500/15');
    expect(selected.className).toContain('text-rose-700');
    expect(selected.className).toContain('dark:text-rose-400');
    expect(selected.className).toContain('border-rose-500/30');
    expect(selected.textContent).toContain('🚩');

    const unselected = screen.getByRole('checkbox', { name: /booth slop/i });
    expect(unselected.className).not.toContain('rose');
    expect(unselected.textContent).not.toContain('🚩');

    const user = userEvent.setup();
    await user.click(unselected);
    const newlySelected = screen.getByRole('checkbox', { name: /booth slop/i });
    expect(newlySelected.className).toContain('bg-rose-500/15');
    expect(newlySelected.textContent).toContain('🚩');

    await user.click(screen.getByRole('checkbox', { name: /furry/i }));
    const deselected = screen.getByRole('checkbox', { name: /furry/i });
    expect(deselected.className).not.toContain('rose');
    expect(deselected.textContent).not.toContain('🚩');
  });

  it('toggles a flag chip independently of the tag checkboxes', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const booth = await screen.findByRole('checkbox', { name: /booth slop/i });
    await user.click(booth);
    expect(booth).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /furry/i }));
    expect(screen.getByRole('checkbox', { name: /furry/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeChecked();
  });

  it('sends both a tags PUT and a flags PUT on save and closes once both settle', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await user.click(await screen.findByRole('checkbox', { name: /social/i }));
    await user.click(screen.getByRole('checkbox', { name: /booth slop/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    const tagsPut = putCalls().find(([url]) => String(url).includes('/api/worlds/wrld_1/tags/edit'));
    expect(tagsPut).toBeDefined();
    expect(JSON.parse((tagsPut![1] as RequestInit).body as string)).toEqual({
      guildId: 'guild_1',
      tags: ['chill', 'social'],
    });

    const flagsPut = putCalls().find(([url]) => String(url).includes('/api/worlds/wrld_1/flags/edit'));
    expect(flagsPut).toBeDefined();
    expect(JSON.parse((flagsPut![1] as RequestInit).body as string)).toEqual({
      flags: ['furry', 'booth slop'],
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('deselecting every flag sends an empty flags array', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await user.click(await screen.findByRole('checkbox', { name: /furry/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    const flagsPut = putCalls().find(([url]) => String(url).includes('/api/worlds/wrld_1/flags/edit'));
    expect(flagsPut).toBeDefined();
    expect(JSON.parse((flagsPut![1] as RequestInit).body as string)).toEqual({ flags: [] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Cancel without sending a mutation', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(putCalls()).toHaveLength(0);
  });

  it('closes on Escape without sending a mutation', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(putCalls()).toHaveLength(0);
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(putCalls()).toHaveLength(0);
  });

  it('stays open when a text selection drag starting inside the panel ends on the backdrop', async () => {
    const { onOpenChange, result } = await renderDialog();
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: /edit tags/i });
    heading.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenChange).not.toHaveBeenCalled();
    result.unmount();
  });

  it('stays open when the dialog panel itself is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = await renderDialog();
    await user.click(screen.getByRole('heading', { name: /edit tags/i }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('focuses the search tags input when the dialog opens', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['tags'], tagsBody);
    render(
      <EditTagsDialog world={world} open={true} onOpenChange={vi.fn()} />,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      },
    );

    const search = await screen.findByRole('textbox', { name: /search/i });
    expect(document.activeElement).toBe(search);
  });

  it('opens without error when no tags are available', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/api/tags')) {
        return Promise.resolve(new Response(JSON.stringify({ tags: [] }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
    }) as unknown as typeof fetch;

    const { onOpenChange } = await renderDialog();
    expect(await screen.findByText(/no tags available/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('locks body scroll while open and restores it on close', async () => {
    Object.defineProperty(window, 'scrollY', { value: 750, configurable: true });
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    document.body.style.overflow = '';

    const { rerender, unmount } = render(
      <EditTagsDialog world={world} open={true} onOpenChange={vi.fn()} />,
      { wrapper: Wrapper },
    );
    await screen.findByRole('dialog');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(
      <EditTagsDialog world={world} open={false} onOpenChange={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 750);
    unmount();
  });
});