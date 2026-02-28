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
      if (!firestore || !user || isMembershipsLoading || isStaffSession || isSelfHealing) return;
      if (memberships && memberships.length > 0) return;

      setIsSelfHealing(true);
      try {
        const accountRef = doc(firestore, 'accounts', user.uid);
        const accountSnap = await getDoc(accountRef);
        
        if (accountSnap.exists()) {
          const accountData = accountSnap.data() as Account;
          if (accountData.adminUserId === user.uid) {
            const membershipRef = doc(firestore, 'accounts', user.uid, 'memberships', user.uid);
            await setDoc(membershipRef, {
              userId: user.uid,
              accountId: user.uid,
              role: 'admin',
              email: user.email || '',
              assignedAuctions: []
            });
            console.log("Membership self-healed for account owner.");
          }
        }
      } catch (e) {
        console.error("Membership healing failed:", e);
      } finally {
        setIsSelfHealing(false);
      }
    };
    heal();
  }, [firestore, user, isMembershipsLoading, memberships, isStaffSession, isSelfHealing]);

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
    if (isSessionLoading) {
      return { accountId: null, role: null, assignedAuctions: [], isLoading: true };
    }

    if (isStaffSession) {
      const staffAuctionId = typeof window !== 'undefined' ? localStorage.getItem('activeAuctionId') : null;
      return {
        accountId: staffAccountId,
        role: 'staff',
        assignedAuctions: staffAuctionId ? [staffAuctionId] : [],
        isLoading: false
      };
    }

    const isLoading = isAuthLoading || isMembershipsLoading || isSelfHealing;

    return {
      accountId: activeMembership?.accountId || null,
      role: (activeMembership?.role as 'admin' | 'staff') || null,
      assignedAuctions: activeMembership?.assignedAuctions || [],
      isLoading
    };
  }, [isSessionLoading, isStaffSession, staffAccountId, activeMembership, isAuthLoading, isMembershipsLoading, isSelfHealing]);

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
