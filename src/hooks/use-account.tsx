'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
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
        
        // --- STEP 1: Direct Fetch Priority ---
        if (urlAccountId) {
          const directPath = `accounts/${urlAccountId}/memberships/${user.uid}`;
          console.log('RBAC: Searching for membership at:', directPath);
          const directRef = doc(firestore, directPath);
          try {
            const directSnap = await getDoc(directRef);
            if (directSnap.exists()) {
              console.log('RBAC: Direct membership found.');
              const activeMembership = { id: directSnap.id, ...directSnap.data() } as Membership;
              setMemberships([activeMembership]);
              setIsLoading(false);
              return;
            }
          } catch (directErr) {
            console.warn('RBAC: Direct fetch failed, trying discovery query...', directErr);
          }
        }

        // --- STEP 2: Discovery Fallback ---
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
          console.error("RBAC Discovery Query Failed:", discoveryErr);
        }
        
        setMemberships(foundMemberships);

        // --- STEP 3: Self-Healing Fallback ---
        if (foundMemberships.length === 0) {
          console.warn('RBAC Discovery: No memberships found. Checking account ownership...');
          
          const targetId = urlAccountId || user.uid;
          const accountRef = doc(firestore, 'accounts', targetId);
          
          try {
            const accountSnap = await getDoc(accountRef);
            if (accountSnap.exists() && accountSnap.data().adminUserId === user.uid) {
              console.log('RBAC Discovery: Owner found without membership record. Repairing...');
              setIsSelfHealing(true);
              const mRef = doc(firestore, 'accounts', targetId, 'memberships', user.uid);
              
              const newMData = {
                userId: user.uid,
                accountId: targetId,
                role: 'admin' as const,
                email: user.email || '',
                assignedAuctions: [],
                status: 'active' as const,
                joinedAt: serverTimestamp(),
              };
              
              await setDoc(mRef, newMData);

              // Standardized Mail Document Structure
              try {
                const mailRef = collection(firestore, 'mail');
                await addDoc(mailRef, {
                  to: user.email,
                  accountId: targetId, // Root field required by security rules
                  template: {
                    name: 'welcome-owner',
                    data: {
                      name: user.displayName || 'Owner'
                    }
                  }
                });
                console.log('RBAC: Welcome email successfully queued.');
              } catch (mailErr: any) {
                console.error(`RBAC Mail Write Failed. Path: mail/. accountId: ${targetId}. Error: ${mailErr.message}`);
              }

              setMemberships([{ id: user.uid, ...newMData } as any]);
              setIsSelfHealing(false);
            }
          } catch (healingErr) {
            console.error("RBAC Self-Healing Failed:", healingErr);
          }
        }
      } catch (err) {
        console.error("RBAC Critical Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading && !isSessionLoading) {
      resolveAccount();
    }
  }, [user, firestore, isAuthLoading, isSessionLoading, searchParams, isStaffSession]);

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
