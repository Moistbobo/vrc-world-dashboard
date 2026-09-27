import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
