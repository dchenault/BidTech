
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
  const { isStaffSession, isSessionLoading } = useStaffSession();
  const firestore = useFirestore();

  // --- Path 1: Regular User ---
  // Only create this ref if we're certain it's NOT a staff session to prevent unnecessary reads.
  const userProfileRef = useMemoFirebase(
    () => (!isSessionLoading && !isStaffSession && firestore && user ? doc(firestore, 'users', user.uid) : null),
    [isSessionLoading, isStaffSession, firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  // --- Combine Paths ---
  // Memoize the final accountId to ensure it's stable and only recalculates when dependencies change.
  const accountId = useMemo(() => {
    // If we're still determining the session type, we don't have an ID yet.
    if (isSessionLoading) {
      return null;
    }
    
    // If it's a staff session, the account ID is in localStorage.
    if (isStaffSession) {
      // This part runs only on the client and after isSessionLoading is false.
      return localStorage.getItem('staffAccountId');
    }
    
    // If it's a regular user, the account ID comes from their profile.
    return userProfile?.activeAccountId || null;
  }, [isSessionLoading, isStaffSession, userProfile]);
  
  const isLoading = isSessionLoading || (!isStaffSession && (isAuthLoading || isProfileLoading));

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
