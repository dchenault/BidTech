
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
  const { isStaffSession, staffAccountId, isSessionLoading } = useStaffSession();
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
    
    // If it's a staff session, use the account ID from the hook's state.
    if (isStaffSession) {
      return staffAccountId;
    }
    
    // If it's a regular user, try to get the active account ID first.
    if (userProfile?.activeAccountId) {
      return userProfile.activeAccountId;
    }
    
    // Fallback for invited users who might not have an activeAccountId set yet.
    // If they have accounts, pick one to be the active one.
    if (userProfile?.accounts && Object.keys(userProfile.accounts).length > 0) {
        // Prioritize an 'admin' account if available.
        const adminAccount = Object.entries(userProfile.accounts).find(([, role]) => role === 'admin');
        if (adminAccount) {
            return adminAccount[0]; // Return the accountId of the admin role
        }
        // Otherwise, just return the first account they have access to.
        return Object.keys(userProfile.accounts)[0];
    }
    
    return null;
  }, [isSessionLoading, isStaffSession, staffAccountId, userProfile]);
  
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
