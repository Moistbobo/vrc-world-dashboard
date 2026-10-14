import { describe, expect, it } from 'vitest';
import { resolveLanguage, SUPPORTED_LANGUAGES } from './languages';

describe('resolveLanguage', () => {
  it('keeps a supported language', () => {
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('ja')).toBe('ja');
  });

  it('falls back to en for an unsupported language', () => {
    expect(resolveLanguage('fr')).toBe('en');
  });

  it('falls back to en for missing or empty values', () => {
    expect(resolveLanguage(null)).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
    expect(resolveLanguage('')).toBe('en');
  });

  it('covers every supported language', () => {
    for (const code of SUPPORTED_LANGUAGES) {
      expect(resolveLanguage(code)).toBe(code);
    }
  });
});
