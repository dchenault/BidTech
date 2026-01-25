
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, WithId } from '@/firebase';
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

  const userProfileRef = useMemo(() => {
    if (firestore && user) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userProfileRef);

  const accountId = useMemo(() => {
    // Determine the active account ID.
    // For now, we'll just use the first account where the user is an admin.
    // A future improvement would be to use `userProfile.activeAccountId`.
    if (userProfile?.accounts) {
      return Object.keys(userProfile.accounts).find(
        (id) => userProfile.accounts[id] === 'admin'
      );
    }
    return null;
  }, [userProfile]);

  const isLoading = isAuthLoading || isProfileLoading;

  if (isLoading) {
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Gavel className="h-10 w-10 text-primary-foreground" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading account...</p>
      </div>
    );
  }

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
