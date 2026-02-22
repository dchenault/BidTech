
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { User as UserProfile, Invitation } from '@/lib/types';
import { useStaffSession } from './use-staff-session';

interface AccountContextType {
  accountId: string | null;
  role: 'admin' | 'manager' | null;
  assignedAuctions: string[];
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { isStaffSession, staffAccountId, isSessionLoading } = useStaffSession();
  const firestore = useFirestore();

  // Path 1: Regular User Profile
  const userProfileRef = useMemoFirebase(
    () => (!isSessionLoading && !isStaffSession && firestore && user ? doc(firestore, 'users', user.uid) : null),
    [isSessionLoading, isStaffSession, firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  // Determine active accountId
  const accountId = useMemo(() => {
    if (isSessionLoading) return null;
    if (isStaffSession) return staffAccountId;
    if (userProfile?.activeAccountId) return userProfile.activeAccountId;
    
    if (userProfile?.accounts && Object.keys(userProfile.accounts).length > 0) {
        const adminAccount = Object.entries(userProfile.accounts).find(([, role]) => role === 'admin');
        if (adminAccount) return adminAccount[0];
        return Object.keys(userProfile.accounts)[0];
    }
    
    return null;
  }, [isSessionLoading, isStaffSession, staffAccountId, userProfile]);

  // Determine user's role in the active account
  const role = useMemo(() => {
    if (!userProfile || !accountId || isStaffSession) return null;
    return (userProfile.accounts?.[accountId] as 'admin' | 'manager') || null;
  }, [userProfile, accountId, isStaffSession]);

  // For managers, find which auctions they are explicitly assigned to.
  const managerAuctionsQuery = useMemoFirebase(
    () => (firestore && user && accountId && role === 'manager'
      ? query(
          collection(firestore, 'invitations'),
          where('accountId', '==', accountId),
          where('acceptedBy', '==', user.uid),
          where('status', '==', 'accepted')
        )
      : null),
    [firestore, user, accountId, role]
  );
  const { data: assignedInvitations, isLoading: isLoadingInvites } = useCollection<Invitation>(managerAuctionsQuery);

  const assignedAuctions = useMemo(() => {
    if (role === 'admin') return []; // Admins have implicit access to all.
    if (role === 'manager' && assignedInvitations) {
      return assignedInvitations.map(inv => inv.auctionId);
    }
    return [];
  }, [role, assignedInvitations]);

  // Combine loading states
  const isLoading = isSessionLoading || (!isStaffSession && (isAuthLoading || isProfileLoading || (role === 'manager' && isLoadingInvites)));

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
