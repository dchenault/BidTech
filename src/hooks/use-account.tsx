'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
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

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelfHealing, setIsSelfHealing] = useState(false);

  useEffect(() => {
    const resolveAccount = async () => {
      // Step A: If !user, check for staff session or stop loading
      if (!user) {
        if (!isAuthLoading && !isSessionLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (!firestore) return;

      setIsLoading(true);
      
      try {
        const urlAccountId = searchParams.get('account');
        if (urlAccountId) {
            console.log('Searching for membership at:', 'accounts/' + urlAccountId + '/memberships/' + user.uid);
        }

        // Step C (Discovery): Perform Discovery Query
        console.log('RBAC Discovery: Started for UID', user.uid);
        const q = query(
          collectionGroup(firestore, 'memberships'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('RBAC Discovery: Found docs:', querySnapshot.size);
        
        const foundMemberships = querySnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Membership));
        
        setMemberships(foundMemberships);

        if (querySnapshot.empty) {
          console.warn('RBAC Discovery: No memberships found in DB');
          
          // Step B (Fallback): Check if user is owner of an account specified in URL or their personal UID account
          const targetId = urlAccountId || user.uid;
          const accountRef = doc(firestore, 'accounts', targetId);
          const accountSnap = await getDoc(accountRef);
          
          if (accountSnap.exists() && accountSnap.data().adminUserId === user.uid) {
            console.log('RBAC Discovery: Owner found without membership. Self-healing...');
            setIsSelfHealing(true);
            const mRef = doc(firestore, 'accounts', targetId, 'memberships', user.uid);
            
            const newM = {
              userId: user.uid,
              accountId: targetId,
              role: 'admin' as const,
              email: user.email || '',
              assignedAuctions: [],
              status: 'active' as const
            };
            
            await setDoc(mRef, newM);
            setMemberships([{ id: user.uid, ...newM }]);
            setIsSelfHealing(false);
          } else {
              console.log('RBAC Discovery: User has no memberships and is not an account owner. Setting role to null.');
          }
        }
      } catch (err) {
        console.error("RBAC Discovery Error:", err);
      } finally {
        // Step D (The Fix): Crucial - force state resolution
        setIsLoading(false);
      }
    };

    if (!isAuthLoading && !isSessionLoading) {
      resolveAccount();
    }
  }, [user, firestore, isAuthLoading, isSessionLoading, searchParams, isStaffSession]);

  // Handle Redirection logic after state resolution
  useEffect(() => {
    if (isLoading || isSelfHealing || !user) return;

    const urlAccountId = searchParams.get('account');
    const isDashboardArea = pathname.startsWith('/dashboard');
    if (!isDashboardArea) return;

    if (memberships.length > 0) {
      if (!urlAccountId) {
        // Discovery Correction: Pick first available and sync URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('account', memberships[0].accountId);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } else if (pathname !== '/dashboard/select-account' && pathname !== '/login') {
      // Access Restricted: No memberships found
      router.push('/dashboard/select-account');
    }
  }, [isLoading, memberships, searchParams, pathname, router, user, isSelfHealing]);

  const value = useMemo((): AccountContextType => {
    if (isStaffSession) {
      const staffAuctionId = typeof window !== 'undefined' ? localStorage.getItem('activeAuctionId') : null;
      return {
        accountId: staffAccountId,
        role: 'staff',
        assignedAuctions: staffAuctionId ? [staffAuctionId] : [],
        isLoading: false
      };
    }

    const urlAccountId = searchParams.get('account');
    const activeMembership = urlAccountId 
      ? memberships.find(m => m.accountId === urlAccountId) 
      : memberships[0];

    return {
      accountId: activeMembership?.accountId || null,
      role: (activeMembership?.role as 'admin' | 'staff') || null,
      assignedAuctions: activeMembership?.assignedAuctions || [],
      isLoading: isLoading || isAuthLoading || isSessionLoading
    };
  }, [isStaffSession, staffAccountId, memberships, searchParams, isLoading, isAuthLoading, isSessionLoading]);

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
