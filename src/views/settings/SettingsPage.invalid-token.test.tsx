import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './SettingsPage';
import { WorldsPreferencesProvider } from '../../contexts/WorldsPreferencesContext';
import * as client from '../../api/client';
import i18n from '../../i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorldsPreferencesProvider>{children}</WorldsPreferencesProvider>
    </QueryClientProvider>
  );
}

describe('SettingsPage invalid token', () => {
  beforeEach(() => {
    window.localStorage.clear();
    queryClient.clear();
    vi.clearAllMocks();
    vi.spyOn(client, 'fetchMe').mockRejectedValue(new Error('Unauthorized'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    i18n.changeLanguage('en');
    document.documentElement.lang = 'en';
  });

  it('shows "Invalid token." after Apply when the token is rejected, without retrying', async () => {
    render(<SettingsPage />, { wrapper: Wrapper });

    const input = screen.getByLabelText(/api token/i);
    fireEvent.change(input, { target: { value: 'garbage-token' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(screen.getByText('Invalid token.')).toBeInTheDocument());
    expect(client.fetchMe).toHaveBeenCalledTimes(1);
  });
});