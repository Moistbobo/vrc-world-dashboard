import { createContext, useEffect, useState, type ReactNode } from 'react';

interface ListsPreferencesContextValue {
  skipRemoveWorldConfirmation: boolean;
  setSkipRemoveWorldConfirmation: (skip: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ListsPreferencesContext = createContext<ListsPreferencesContextValue>({
  skipRemoveWorldConfirmation: false,
  setSkipRemoveWorldConfirmation: () => {},
});

const SKIP_REMOVE_CONFIRM_KEY = 'sos-lists-skip-remove-confirmation';

function getInitialSkipConfirm(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SKIP_REMOVE_CONFIRM_KEY) === 'true';
}

export function ListsPreferencesProvider({ children }: { children: ReactNode }) {
  const [skipRemoveWorldConfirmation, setSkipRemoveWorldConfirmationState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSkipRemoveWorldConfirmationState(getInitialSkipConfirm());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(SKIP_REMOVE_CONFIRM_KEY, String(skipRemoveWorldConfirmation));
    }
  }, [skipRemoveWorldConfirmation, hydrated]);

  const setSkipRemoveWorldConfirmation = (skip: boolean) => {
    setSkipRemoveWorldConfirmationState(skip);
  };

  return (
    <ListsPreferencesContext.Provider
      value={{ skipRemoveWorldConfirmation, setSkipRemoveWorldConfirmation }}
    >
      {children}
    </ListsPreferencesContext.Provider>
  );
}
