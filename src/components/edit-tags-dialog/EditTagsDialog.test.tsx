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

function stubFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    if (url.includes('/api/tags')) {
      return Promise.resolve(new Response(JSON.stringify(tagsBody), { status: 200 }));
    }
    if (url.includes('/tags') && init?.method === 'PUT') {
      return Promise.resolve(new Response(JSON.stringify({ updated: true }), { status: 200 }));
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
      .map((text) => text.match(/(chill|dance|social)/)?.[0]);
    expect(tagNames).toEqual(['chill', 'dance', 'social']);
  });

  it('filters tags by a case-insensitive search query', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search tags/i });
    await user.type(search, 'CH');
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /social/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /dance/i })).not.toBeInTheDocument();
  });

  it('shows an empty-state message when no tags match', async () => {
    const user = userEvent.setup();
    await renderDialog();
    const search = await screen.findByRole('textbox', { name: /search tags/i });
    await user.type(search, 'zzz');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/no tags match/i)).toBeInTheDocument();
  });

  it('clears the search query when the dialog reopens', async () => {
    const user = userEvent.setup();
    const { result } = await renderDialog();
    await user.type(await screen.findByRole('textbox', { name: /search tags/i }), 'chill');
    expect(screen.queryByRole('checkbox', { name: /social/i })).not.toBeInTheDocument();

    result.rerender(
      <EditTagsDialog world={world} open={false} onOpenChange={vi.fn()} />,
    );
    result.rerender(
      <EditTagsDialog world={world} open={true} onOpenChange={vi.fn()} />,
    );

    const search = await screen.findByRole('textbox', { name: /search tags/i });
    expect((search as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('checkbox', { name: /social/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /chill/i })).toBeInTheDocument();
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

    const search = await screen.findByRole('textbox', { name: /search tags/i });
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
    expect(screen.queryByRole('textbox', { name: /search tags/i })).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});