'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';

interface AccountContextType {
  accountId: string | null;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // The user's profile contains the `activeAccountId`. We need to fetch this.
  // This is now the single source of truth for the user's profile data.
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const accountId = useMemo(() => userProfile?.activeAccountId || null, [userProfile]);

  // The overall loading state is true if auth is loading OR the user profile is loading.
  const isLoading = isAuthLoading || isProfileLoading;

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
