import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanManageCurator } from './useCanManageCurator';

const mocks = vi.hoisted(() => ({
  useMe: vi.fn(),
}));

vi.mock('./useApi', () => ({
  useMe: mocks.useMe,
}));

describe('useCanManageCurator', () => {
  beforeEach(() => {
    mocks.useMe.mockReset();
    window.localStorage.clear();
  });

  it('returns true for a stored token with worlds:write', () => {
    window.localStorage.setItem('sos-api-token', 'curator-token');
    mocks.useMe.mockReturnValue({
      data: { permissions: ['worlds:write'] },
      isError: false,
    });

    const { result } = renderHook(() => useCanManageCurator());

    expect(result.current).toBe(true);
  });

  it('returns false for a stored token without worlds:write', () => {
    window.localStorage.setItem('sos-api-token', 'viewer-token');
    mocks.useMe.mockReturnValue({
      data: { permissions: ['worlds:read'] },
      isError: false,
    });

    const { result } = renderHook(() => useCanManageCurator());

    expect(result.current).toBe(false);
  });

  it('returns false without a stored token even with worlds:write', () => {
    mocks.useMe.mockReturnValue({
      data: { permissions: ['worlds:write'] },
      isError: false,
    });

    const { result } = renderHook(() => useCanManageCurator());

    expect(result.current).toBe(false);
  });

  it('returns false when the identity fetch errored', () => {
    window.localStorage.setItem('sos-api-token', 'curator-token');
    mocks.useMe.mockReturnValue({
      data: { permissions: ['worlds:write'] },
      isError: true,
    });

    const { result } = renderHook(() => useCanManageCurator());

    expect(result.current).toBe(false);
  });
});
