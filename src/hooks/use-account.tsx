
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';
import { useStaffSession } from './use-staff-session';

interface AccountContextType {
  accountId: string | null;
  role: 'admin' | 'staff' | null;
  assignedAuctions: string[];
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { isStaffSession, staffAccountId, isSessionLoading } = useStaffSession();
  const firestore = useFirestore();

  // Step 1: Keep fetching user profile to determine active account
  const userProfileRef = useMemoFirebase(
    () => (!isSessionLoading && !isStaffSession && firestore && user ? doc(firestore, 'users', user.uid) : null),
    [isSessionLoading, isStaffSession, firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const accountId = useMemo(() => {
    if (isSessionLoading) return null;
    if (isStaffSession) return staffAccountId;
    return userProfile?.activeAccountId || null;
  }, [isSessionLoading, isStaffSession, staffAccountId, userProfile]);

  // Step 2: Fetch membership data for the active account
  const membershipRef = useMemoFirebase(
    () => (firestore && user && accountId ? doc(firestore, 'accounts', accountId, 'memberships', user.uid) : null),
    [firestore, user, accountId]
  );
  const { data: membershipData, isLoading: isMembershipLoading } = useDoc<{ role: 'admin' | 'staff', assignedAuctions: string[] }>(membershipRef);

  const role = membershipData?.role || null;
  const assignedAuctions = useMemo(() => {
    if (role === 'admin') return []; // Admins have implicit access to all, return empty array for consistency.
    return membershipData?.assignedAuctions || [];
  }, [role, membershipData]);

  // Step 3: Combine loading states
  const isLoading = isSessionLoading || isAuthLoading || isProfileLoading || (!!user && !!accountId && isMembershipLoading);

  const value = { accountId, role, assignedAuctions, isLoading };

  return (
    <AccountContext.Provider value={value}>
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
