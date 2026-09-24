import { createContext, useEffect, useState, type ReactNode } from 'react';

export type WorldsViewMode = 'grid' | 'list';
export type WorldsScrollMode = 'infinite' | 'pagination';

interface WorldsPreferencesContextValue {
  viewMode: WorldsViewMode;
  setViewMode: (mode: WorldsViewMode) => void;
  scrollMode: WorldsScrollMode;
  setScrollMode: (mode: WorldsScrollMode) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const WorldsPreferencesContext = createContext<WorldsPreferencesContextValue>({
  viewMode: 'grid',
  setViewMode: () => {},
  scrollMode: 'infinite',
  setScrollMode: () => {},
});

const VIEW_MODE_KEY = 'sos-worlds-view-mode';
const SCROLL_MODE_KEY = 'sos-worlds-scroll-mode';

function getInitialViewMode(): WorldsViewMode {
  if (typeof window === 'undefined') return 'grid';
  const saved = window.localStorage.getItem(VIEW_MODE_KEY) as WorldsViewMode | null;
  return saved === 'list' ? 'list' : 'grid';
}

function getInitialScrollMode(): WorldsScrollMode {
  if (typeof window === 'undefined') return 'infinite';
  const saved = window.localStorage.getItem(SCROLL_MODE_KEY) as WorldsScrollMode | null;
  return saved === 'pagination' ? 'pagination' : 'infinite';
}

export function WorldsPreferencesProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<WorldsViewMode>('grid');
  const [scrollMode, setScrollModeState] = useState<WorldsScrollMode>('infinite');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setViewModeState(getInitialViewMode());
    setScrollModeState(getInitialScrollMode());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(SCROLL_MODE_KEY, scrollMode);
  }, [scrollMode, hydrated]);

  const setViewMode = (mode: WorldsViewMode) => {
    setViewModeState(mode);
  };

  const setScrollMode = (mode: WorldsScrollMode) => {
    setScrollModeState(mode);
  };

  return (
    <WorldsPreferencesContext.Provider value={{ viewMode, setViewMode, scrollMode, setScrollMode }}>
      {children}
    </WorldsPreferencesContext.Provider>
  );
}
