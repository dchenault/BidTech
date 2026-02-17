
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
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
  
  // --- Path 2: Staff Session (Optimized) ---
  const staffAccountId = useMemo(() => {
    // This runs on the client. On server, it's null.
    if (typeof window === 'undefined' || !isStaffSession) return null;
    return localStorage.getItem('staffAccountId');
  }, [isStaffSession]);
  
  // --- Combine Paths ---
  const accountId = isStaffSession ? staffAccountId : userAccountId;
  
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
