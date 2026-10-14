import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import i18n from '../../i18n';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('exposes an action-describing accessible name', () => {
    window.localStorage.setItem('sos-theme', 'light');
    renderToggle();

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('reports the pressed state for the light theme', () => {
    window.localStorage.setItem('sos-theme', 'light');
    renderToggle();

    const toggle = screen.getByRole('button', { name: 'Toggle theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the pressed state for the dark theme', () => {
    window.localStorage.setItem('sos-theme', 'dark');
    renderToggle();

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('localizes its name', async () => {
    window.localStorage.setItem('sos-theme', 'light');
    renderToggle();

    await act(async () => {
      await i18n.changeLanguage('ja');
    });

    expect(screen.getByRole('button', { name: 'テーマを切り替える' })).toBeInTheDocument();
  });
});
