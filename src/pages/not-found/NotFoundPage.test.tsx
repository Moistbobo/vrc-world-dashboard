import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders a level-one heading and sets the document title', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(document.title).toBe('Page not found');
  });

  it('links back to the dashboard', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/');
  });
});
