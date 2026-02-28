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
        
        // --- STEP 1: Try Direct Fetch ---
        // If we have an account ID in the URL, try to get the membership record directly.
        // This is much more reliable and permission-safe than a discovery query.
        if (urlAccountId) {
          console.log('RBAC: Attempting direct membership fetch for account:', urlAccountId);
          const directRef = doc(firestore, 'accounts', urlAccountId, 'memberships', user.uid);
          try {
            const directSnap = await getDoc(directRef);
            if (directSnap.exists()) {
              console.log('RBAC: Direct membership hit.');
              const activeMembership = { id: directSnap.id, ...directSnap.data() } as Membership;
              setMemberships([activeMembership]);
              setIsLoading(false);
              return; // Exit early if we found our context
            }
          } catch (directErr) {
            console.warn('RBAC: Direct fetch failed or restricted, falling back to discovery.', directErr);
          }
        }

        // --- STEP 2: Discovery Query (Fallback) ---
        // If direct fetch failed or we don't have a URL account ID, search for all memberships.
        console.log('RBAC Discovery: Started for UID', user.uid);
        const q = query(
          collectionGroup(firestore, 'memberships'),
          where('userId', '==', user.uid)
        );
        
        let foundMemberships: Membership[] = [];
        try {
          const querySnapshot = await getDocs(q);
          console.log('RBAC Discovery: Found docs:', querySnapshot.size);
          foundMemberships = querySnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Membership));
        } catch (discoveryErr: any) {
          console.error("RBAC Discovery Query Error:", discoveryErr);
          // If we get a permission error here, we don't want to hang the app.
          // We let it settle with whatever we have (likely empty).
        }
        
        setMemberships(foundMemberships);

        // --- STEP 3: Fallback / Self-Healing ---
        if (foundMemberships.length === 0) {
          console.warn('RBAC Discovery: No memberships found in DB');
          
          const targetId = urlAccountId || user.uid;
          const accountRef = doc(firestore, 'accounts', targetId);
          
          try {
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
            }
          } catch (healingErr) {
            console.error("RBAC Healing Error:", healingErr);
          }
        }
      } catch (err) {
        console.error("RBAC Critical Resolve Error:", err);
      } finally {
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
        const params = new URLSearchParams(searchParams.toString());
        params.set('account', memberships[0].accountId);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } else if (pathname !== '/dashboard/select-account' && pathname !== '/login') {
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
