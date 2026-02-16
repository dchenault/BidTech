'use client';

import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';
import { useStaffSession } from './use-staff-session';

interface AccountContextType {
  accountId: string | null;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { isStaffSession } = useStaffSession();
  const firestore = useFirestore();

  // --- Path 1: Regular User ---
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const userAccountId = useMemo(() => userProfile?.activeAccountId || null, [userProfile]);
  const isUserPathLoading = isAuthLoading || isProfileLoading;
  
  // --- Path 2: Staff Session ---
  const [staffAccountId, setStaffAccountId] = useState<string | null>(null);
  
  useEffect(() => {
    // This effect runs only on the client.
    if (isStaffSession) {
      const storedAccountId = sessionStorage.getItem('staffAccountId');
      setStaffAccountId(storedAccountId);
    } else {
      setStaffAccountId(null);
    }
  }, [isStaffSession]);
  
  // --- Combine Paths ---
  const accountId = isStaffSession ? staffAccountId : userAccountId;
  
  // The provider is only "loading" if it's NOT a staff session and the regular user path is still resolving.
  // For a staff session, the accountId is available synchronously from sessionStorage.
  const isLoading = !isStaffSession && isUserPathLoading;

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
