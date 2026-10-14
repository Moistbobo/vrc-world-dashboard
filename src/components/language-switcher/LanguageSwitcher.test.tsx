import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('labels itself', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
  });

  it('marks each option with its language', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('option', { name: '日本語' })).toHaveAttribute('lang', 'ja');
  });

  it('updates the document language when the selection changes', () => {
    render(<LanguageSwitcher />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
      target: { value: 'ja' },
    });

    expect(document.documentElement.lang).toBe('ja');
    expect(window.localStorage.getItem('i18nextLng')).toBe('ja');
  });
});
