import { describe, it, expect, afterEach } from 'vitest';
import { getAppVersion } from './version';

describe('getAppVersion', () => {
  const originalVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const originalSha = process.env.NEXT_PUBLIC_APP_GIT_SHA;

  afterEach(() => {
    if (originalVersion === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = originalVersion;
    if (originalSha === undefined) delete process.env.NEXT_PUBLIC_APP_GIT_SHA;
    else process.env.NEXT_PUBLIC_APP_GIT_SHA = originalSha;
  });

  it('returns the version with git short SHA', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';
    process.env.NEXT_PUBLIC_APP_GIT_SHA = 'abc1234';
    expect(getAppVersion()).toBe('1.0.0 — abc1234');
  });
});
