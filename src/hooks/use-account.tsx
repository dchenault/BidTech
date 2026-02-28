'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Membership, Account } from '@/lib/types';
import { useStaffSession } from './use-staff-session';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const urlAccountId = searchParams.get('account');

  // 1. Query for all memberships for this user across all accounts.
  const membershipsQuery = useMemoFirebase(
    () => (firestore && user && !isStaffSession ? query(collectionGroup(firestore, 'memberships'), where('userId', '==', user.uid)) : null),
    [firestore, user, isStaffSession]
  );
  
  const { data: memberships, isLoading: isMembershipsLoading } = useCollection<Membership>(membershipsQuery);

  const [isSelfHealing, setIsSelfHealing] = useState(false);

  // 2. Self-healing logic: If no membership exists but the user is the owner of an account.
  useEffect(() => {
    const heal = async () => {
      // Don't run if still waiting for core auth or memberships query to settle
      if (!firestore || !user || isMembershipsLoading || isStaffSession || isSelfHealing) return;
      
      // Determine if healing is needed.
      // We heal if memberships is empty OR if we are specifically trying to access a URL account ID 
      // that we are the owner of but don't have a membership record for yet.
      const currentMembershipForUrl = urlAccountId ? memberships?.find(m => m.accountId === urlAccountId) : null;
      const needsHeal = !memberships || memberships.length === 0 || (urlAccountId && !currentMembershipForUrl);

      if (!needsHeal) return;

      setIsSelfHealing(true);
      try {
        // Strategy: Check either the specific account from URL or the user's default personal account (ID matches UID).
        const targetAccountId = urlAccountId || user.uid;
        const accountRef = doc(firestore, 'accounts', targetAccountId);
        const accountSnap = await getDoc(accountRef);
        
        if (accountSnap.exists()) {
          const accountData = accountSnap.data() as Account;
          // If the user is the designated owner of this account, they MUST have a membership record.
          if (accountData.adminUserId === user.uid) {
            const membershipRef = doc(firestore, 'accounts', targetAccountId, 'memberships', user.uid);
            
            // Double check existence to avoid redundant writes if the query was just lagging.
            const mSnap = await getDoc(membershipRef);
            if (!mSnap.exists()) {
                await setDoc(membershipRef, {
                    userId: user.uid,
                    accountId: targetAccountId,
                    role: 'admin',
                    email: user.email || '',
                    assignedAuctions: []
                });
                console.log(`Self-healed Admin membership for account: ${targetAccountId}`);
            }
          }
        }
      } catch (e) {
        console.error("Membership self-healing failed:", e);
      } finally {
        setIsSelfHealing(false);
      }
    };
    heal();
  }, [firestore, user, isMembershipsLoading, memberships, isStaffSession, isSelfHealing, urlAccountId]);

  // 3. Resolve active membership
  const activeMembership = useMemo(() => {
    if (isStaffSession || !memberships || memberships.length === 0) return null;
    if (urlAccountId) {
      const found = memberships.find(m => m.accountId === urlAccountId);
      if (found) return found;
    }
    return memberships[0];
  }, [memberships, urlAccountId, isStaffSession]);

  // 4. Compute final context value
  const value = useMemo((): AccountContextType => {
    // High-priority global loading (App setup)
    if (isSessionLoading) {
      return { accountId: null, role: null, assignedAuctions: [], isLoading: true };
    }

    // Anonymous Staff portal logic
    if (isStaffSession) {
      const staffAuctionId = typeof window !== 'undefined' ? localStorage.getItem('activeAuctionId') : null;
      return {
        accountId: staffAccountId,
        role: 'staff',
        assignedAuctions: staffAuctionId ? [staffAuctionId] : [],
        isLoading: false
      };
    }

    // Standard User loading state.
    // If memberships query finishes (isMembershipsLoading: false) and self-healing finishes, 
    // isLoading becomes false, allowing the app to proceed even with empty results.
    const isLoading = isAuthLoading || (!!user && isMembershipsLoading) || isSelfHealing;

    return {
      accountId: activeMembership?.accountId || null,
      role: (activeMembership?.role as 'admin' | 'staff') || null,
      assignedAuctions: activeMembership?.assignedAuctions || [],
      isLoading
    };
  }, [isSessionLoading, isStaffSession, staffAccountId, activeMembership, isAuthLoading, isMembershipsLoading, isSelfHealing, user]);

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
