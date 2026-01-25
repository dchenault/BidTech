
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import { Loader2, Gavel } from 'lucide-react';

interface AccountContextType {
  accountId: string | null;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Correctly reference the user's profile in the root `users` collection.
  const userProfileRef = useMemoFirebase(() => {
    if (firestore && user) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userProfileRef);

  const accountId = useMemo(() => {
    // The active account is stored directly on the user's profile.
    // The useUserSetup hook sets this for new users.
    return userProfile?.activeAccountId || null;
  }, [userProfile]);

  const isLoading = isAuthLoading || isProfileLoading;

  // The loading UI is handled by the DashboardLayout, not this global provider.
  // Removing the loading screen from here fixes the 404 on public pages.

  return (
    <AccountContext.Provider value={{ accountId: accountId || null, isLoading }}>
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
