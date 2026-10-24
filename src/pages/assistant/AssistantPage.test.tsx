import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AssistantPage } from './AssistantPage';

let canManageCurator = true;
let isFetching = false;

vi.mock('../../hooks/useCanManageCurator', () => ({
  useCanManageCurator: () => canManageCurator,
}));

vi.mock('../../hooks/useApi', () => ({
  useMe: () => ({ isFetching }),
}));

vi.mock('../../components/worlds-agent-panel', () => ({
  WorldsAgentPanel: () => <div data-testid="agent-panel" />,
}));

function renderAssistant() {
  return render(
    <MemoryRouter initialEntries={['/assistant']}>
      <Routes>
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/worlds" element={<div>Worlds stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AssistantPage', () => {
  beforeEach(() => {
    canManageCurator = true;
    isFetching = false;
    vi.stubEnv('VITE_ENABLE_AI_SEARCH', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the panel for a curator', () => {
    renderAssistant();
    expect(screen.getByTestId('agent-panel')).toBeInTheDocument();
    expect(screen.queryByText('Worlds stub')).not.toBeInTheDocument();
  });

  it('redirects a non-curator to /worlds', () => {
    canManageCurator = false;
    renderAssistant();
    expect(screen.getByText('Worlds stub')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-panel')).not.toBeInTheDocument();
  });

  it('waits for the identity check instead of redirecting while it is in flight', () => {
    canManageCurator = false;
    isFetching = true;
    renderAssistant();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.queryByText('Worlds stub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-panel')).not.toBeInTheDocument();
  });

  it('renders a heading while the identity check is in flight', () => {
    canManageCurator = false;
    isFetching = true;
    renderAssistant();
    expect(screen.getByRole('heading', { name: /worlds assistant/i })).toBeInTheDocument();
  });

  it('sets the document title for the route', () => {
    renderAssistant();
    expect(document.title).toBe('Worlds assistant');
  });

  it('titles the disabled route as Worlds instead of the assistant', () => {
    vi.stubEnv('VITE_ENABLE_AI_SEARCH', 'false');
    renderAssistant();
    expect(document.title).toBe('Worlds');
  });

  it('redirects to /worlds when AI search is disabled, even for a curator', () => {
    vi.stubEnv('VITE_ENABLE_AI_SEARCH', 'false');
    renderAssistant();
    expect(screen.getByText('Worlds stub')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-panel')).not.toBeInTheDocument();
  });

  it('redirects to /worlds when the flag is unset', () => {
    vi.stubEnv('VITE_ENABLE_AI_SEARCH', '');
    renderAssistant();
    expect(screen.getByText('Worlds stub')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-panel')).not.toBeInTheDocument();
  });

  it('redirects to /worlds without a loading state when AI search is disabled', () => {
    vi.stubEnv('VITE_ENABLE_AI_SEARCH', 'false');
    canManageCurator = false;
    isFetching = true;
    renderAssistant();
    expect(screen.getByText('Worlds stub')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-panel')).not.toBeInTheDocument();
  });
});
