
'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Membership, Account } from '@/lib/types';
import { useStaffSession } from './use-staff-session';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();
  
  const urlAccountId = searchParams.get('account');

  // 1. Discovery Query: Fetch all memberships for this user across all accounts.
  const membershipsQuery = useMemoFirebase(
    () => (firestore && user && !isStaffSession ? query(collectionGroup(firestore, 'memberships'), where('userId', '==', user.uid)) : null),
    [firestore, user, isStaffSession]
  );
  
  const { data: memberships, isLoading: isMembershipsLoading } = useCollection<Membership>(membershipsQuery);

  const [isSelfHealing, setIsSelfHealing] = useState(false);
  const [hasTimeoutReached, setHasTimeoutReached] = useState(false);

  // Debug Logging
  useEffect(() => {
    if (user) {
      console.log('RBAC Debug: Current User', user.uid);
    }
    if (memberships) {
      console.log('RBAC Debug: Memberships Found', memberships.length);
    }
  }, [user, memberships]);

  // 2. Timeout/Fallback Logic: 5 seconds to prevent infinite hang
  useEffect(() => {
    if (isAuthLoading || isSessionLoading || !user) return;
    
    const timer = setTimeout(() => {
      if (isMembershipsLoading || isSelfHealing) {
        setHasTimeoutReached(true);
        console.warn("Account resolution timed out after 5s. Falling back to forced non-loading state.");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthLoading, isSessionLoading, isMembershipsLoading, isSelfHealing, user]);

  // 3. Self-healing logic for Account Owners
  useEffect(() => {
    const heal = async () => {
      if (!firestore || !user || isMembershipsLoading || isStaffSession || isSelfHealing) return;
      
      const currentMembershipForUrl = urlAccountId ? memberships?.find(m => m.accountId === urlAccountId) : null;
      const needsHeal = !memberships || memberships.length === 0 || (urlAccountId && !currentMembershipForUrl);

      if (!needsHeal) return;

      setIsSelfHealing(true);
      try {
        const targetAccountId = urlAccountId || user.uid;
        const accountRef = doc(firestore, 'accounts', targetAccountId);
        const accountSnap = await getDoc(accountRef);
        
        if (accountSnap.exists()) {
          const accountData = accountSnap.data() as Account;
          if (accountData.adminUserId === user.uid) {
            const membershipRef = doc(firestore, 'accounts', targetAccountId, 'memberships', user.uid);
            const mSnap = await getDoc(membershipRef);
            if (!mSnap.exists()) {
                await setDoc(membershipRef, {
                    userId: user.uid,
                    accountId: targetAccountId,
                    role: 'admin',
                    email: user.email || '',
                    assignedAuctions: [],
                    status: 'active'
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

  // 4. Resolve active membership (Discovery Logic)
  const activeMembership = useMemo(() => {
    if (isStaffSession || !memberships || memberships.length === 0) return null;
    if (urlAccountId) {
      const found = memberships.find(m => m.accountId === urlAccountId);
      if (found) return found;
    }
    // Discovery: Default to the first found membership if none is specified in URL
    return memberships[0];
  }, [memberships, urlAccountId, isStaffSession]);

  // 5. Self-Correction & Redirection Logic
  useEffect(() => {
    if (isAuthLoading || isSessionLoading || isMembershipsLoading || isSelfHealing || isStaffSession || !user) return;

    const isDashboardArea = pathname.startsWith('/dashboard');
    if (!isDashboardArea) return;

    if (activeMembership && !urlAccountId) {
        // Discovery Correction: Automatically set the accountId to the membership's account and sync URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('account', activeMembership.accountId);
        router.replace(`${pathname}?${params.toString()}`);
    } else if (!activeMembership && !isMembershipsLoading && !isSelfHealing && !isAuthLoading) {
        // Redirection: No memberships found after all checks
        if (pathname !== '/dashboard/select-account' && pathname !== '/login') {
            router.push('/dashboard/select-account');
        }
    }
  }, [activeMembership, urlAccountId, pathname, isAuthLoading, isSessionLoading, isMembershipsLoading, isSelfHealing, isStaffSession, router, searchParams, user]);

  // 6. Compute final context value
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

    if (hasTimeoutReached) {
        return {
            accountId: null,
            role: null,
            assignedAuctions: [],
            isLoading: false
        };
    }

    // Standard resolution state
    const isLoading = isAuthLoading || (!!user && isMembershipsLoading) || isSelfHealing;

    return {
      accountId: activeMembership?.accountId || null,
      role: (activeMembership?.role as 'admin' | 'staff') || null,
      assignedAuctions: activeMembership?.assignedAuctions || [],
      isLoading
    };
  }, [isSessionLoading, isStaffSession, staffAccountId, activeMembership, isAuthLoading, isMembershipsLoading, isSelfHealing, user, hasTimeoutReached]);

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
