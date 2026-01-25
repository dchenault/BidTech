
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUser } from '@/firebase';

interface AccountContextType {
  accountId: string | null;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();

  // The accountId is now directly derived from the authenticated user's UID.
  // This simplifies the logic, removes a database fetch, and fixes build/race condition issues.
  const accountId = user ? user.uid : null;

  // The loading state of the account is now synonymous with the auth loading state.
  const isLoading = isUserLoading;

  return (
    <AccountContext.Provider value={{ accountId, isLoading }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
