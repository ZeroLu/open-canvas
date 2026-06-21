'use client';

import { createContext, useContext } from 'react';

type AppUser = {
  id: string;
  email?: string | null;
  credits?: {
    remainingCredits: number | null;
  } | null;
} | null;

type AppContextValue = {
  user: AppUser;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
};

const AppContext = createContext<AppContextValue>({
  user: {
    id: 'local-user',
    email: null,
    credits: {
      remainingCredits: null,
    },
  },
  fetchUserCredits: async () => {},
  fetchUserInfo: async () => {},
});

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={useContextValue()}>{children}</AppContext.Provider>;
}

function useContextValue(): AppContextValue {
  return {
    user: {
      id: 'local-user',
      email: null,
      credits: {
        remainingCredits: null,
      },
    },
    fetchUserCredits: async () => {},
    fetchUserInfo: async () => {},
  };
}

export function useAppContext() {
  return useContext(AppContext);
}
