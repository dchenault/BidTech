'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Membership, User } from '@/lib/types';
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

  useEffect(() => {
    const resolveAccount = async () => {
      // Exit if auth isn't resolved, there's no user, or no firestore connection.
      if (!user || !firestore) {
        if (!isAuthLoading && !isSessionLoading) {
          setIsLoading(false);
        }
        return;
      }

      // Bypass RBAC discovery on public routes
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/invite') || window.location.pathname.startsWith('/catalog'))) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const urlAccountId = searchParams.get('account');
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() as User : null;

        // --- PHASE 1: Active Membership Discovery ---
        // Instead of collectionGroup, we use the user's profile as a registry of active accounts.
        let activeMemberships: Membership[] = [];
        if (userData?.accounts) {
          const accountIds = Object.keys(userData.accounts);
          const fetchPromises = accountIds.map(async (accId) => {
            const mRef = doc(firestore, 'accounts', accId, 'memberships', user.uid);
            const mSnap = await getDoc(mRef);
            return mSnap.exists() ? { id: mSnap.id, ...mSnap.data() } as Membership : null;
          });
          const results = await Promise.all(fetchPromises);
          activeMemberships = results.filter((m): m is Membership => m !== null);
        }

        // --- PHASE 2: Targeted Invitation Handshake (Direct Path) ---
        // If an account is specified in the URL, check for a pending email-indexed invite.
        if (urlAccountId && user.email) {
          const isAlreadyActive = activeMemberships.some(m => m.accountId === urlAccountId);
          
          if (!isAlreadyActive) {
            const invitePath = `accounts/${urlAccountId}/memberships/${user.email.toLowerCase()}`;
            const inviteRef = doc(firestore, invitePath);
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists()) {
              const inviteData = inviteSnap.data() as Membership;
              
              if (inviteData.status === 'pending') {
                console.log("RBAC: Found pending invite. Starting Auto-Claim batch...");
                const batch = writeBatch(firestore);
                
                // 1. Create permanent UID-based membership
                const newMRef = doc(firestore, 'accounts', urlAccountId, 'memberships', user.uid);
                const activeM: Membership = {
                  ...inviteData,
                  id: user.uid,
                  userId: user.uid,
                  status: 'active',
                };
                batch.set(newMRef, activeM);

                // 2. Delete temporary email-indexed invitation doc
                batch.delete(inviteRef);

                // 3. Update/Initialize user profile to link organizational context
                const profileUpdate: Partial<User> = {
                  activeAccountId: urlAccountId,
                  [`accounts.${urlAccountId}`]: inviteData.role,
                };
                batch.set(userRef, profileUpdate, { merge: true });
                
                await batch.commit();
                console.log("RBAC: Auto-claim successful.");
                activeMemberships.push(activeM);
              }
            }
          }
        }

        setMemberships(activeMemberships);

        // --- PHASE 3: Self-Healing Fallback (Owners) ---
        if (activeMemberships.length === 0) {
          const targetId = urlAccountId || user.uid;
          const accountRef = doc(firestore, 'accounts', targetId);
          const accountSnap = await getDoc(accountRef);
          
          if (accountSnap.exists() && accountSnap.data().adminUserId === user.uid) {
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
            await writeBatch(firestore)
              .set(mRef, newMData)
              .set(userRef, { accounts: { [targetId]: 'admin' }, activeAccountId: targetId }, { merge: true })
              .commit();
            
            setMemberships([{ id: user.uid, ...newMData } as any]);
          }
        }
      } catch (err) {
        console.error("RBAC Discovery Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading && !isSessionLoading) {
      resolveAccount();
    }
  }, [user, firestore, isAuthLoading, isSessionLoading, searchParams, pathname, router]);

  // Route Guard: Ensure the user is in an organizational context
  useEffect(() => {
    if (isLoading || !user) return;

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
  }, [isLoading, memberships, searchParams, pathname, router, user]);

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
