'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, collection, addDoc, writeBatch } from 'firebase/firestore';
import type { Membership, Account, User } from '@/lib/types';
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
      // Exit if auth isn't resolved, there's no user, or no firestore connection.
      if (!user || !firestore) {
        if (!isAuthLoading && !isSessionLoading) {
          setIsLoading(false);
        }
        return;
      }

      // Bypass RBAC background discovery on invitation routes
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/invite')) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const urlAccountId = searchParams.get('account');
        
        // --- STEP 1: Direct Fetch Priority (By UID) ---
        if (urlAccountId) {
          const directPath = `accounts/${urlAccountId}/memberships/${user.uid}`;
          const directRef = doc(firestore, directPath);
          try {
            const directSnap = await getDoc(directRef);
            if (directSnap.exists()) {
              const activeMembership = { id: directSnap.id, ...directSnap.data() } as Membership;
              setMemberships([activeMembership]);
              setIsLoading(false);
              return;
            }
          } catch (directErr) {
            console.warn('RBAC: Direct fetch failed, trying discovery query...', directErr);
          }
        }

        // --- STEP 2: Discovery Fallback (UID Search) ---
        const qByUid = query(
          collectionGroup(firestore, 'memberships'),
          where('userId', '==', user.uid)
        );
        
        let foundMemberships: Membership[] = [];
        try {
          const querySnapshot = await getDocs(qByUid);
          foundMemberships = querySnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Membership));
        } catch (discoveryErr: any) {
          console.error("RBAC Discovery (UID) Query Failed:", discoveryErr);
        }

        // --- STEP 3: Auto-Claim Handshake (Email Discovery) ---
        // If no UID matches exist, search for invitations sent to the user's email address
        if (foundMemberships.length === 0 && user.email) {
          console.log("RBAC: No UID memberships found. Searching for email invitations...");
          const emailQ = query(
            collectionGroup(firestore, 'memberships'),
            where('email', '==', user.email.toLowerCase()),
            where('status', '==', 'pending')
          );
          
          try {
            const emailSnap = await getDocs(emailQ);
            if (!emailSnap.empty) {
              const batch = writeBatch(firestore);
              const claimed: Membership[] = [];

              for (const d of emailSnap.docs) {
                const inviteData = d.data() as Membership;
                const targetAccountId = inviteData.accountId;
                
                // 1. Create permanent UID-based membership
                const newMRef = doc(firestore, 'accounts', targetAccountId, 'memberships', user.uid);
                const activeM: Membership = {
                  ...inviteData,
                  id: user.uid,
                  userId: user.uid,
                  status: 'active',
                };
                batch.set(newMRef, activeM);

                // 2. Delete temporary email-indexed invitation doc
                batch.delete(d.ref);

                // 3. Update/Initialize user profile to link organizational context
                const profileRef = doc(firestore, 'users', user.uid);
                const profileUpdate: Partial<User> = {
                  activeAccountId: targetAccountId,
                  [`accounts.${targetAccountId}`]: inviteData.role,
                };
                batch.set(profileRef, profileUpdate, { merge: true });
                
                claimed.push(activeM);
              }

              await batch.commit();
              console.log(`RBAC: Auto-claimed ${claimed.length} invitations.`);
              foundMemberships = claimed;
            }
          } catch (emailErr) {
            console.error("RBAC Discovery (Email) Failed:", emailErr);
          }
        }
        
        // De-duplicate memberships by accountId (UID priority)
        const membershipMap = new Map<string, Membership>();
        foundMemberships.forEach(m => {
          if (!membershipMap.has(m.accountId) || m.userId === user.uid) {
            membershipMap.set(m.accountId, m);
          }
        });

        const finalMemberships = Array.from(membershipMap.values());
        setMemberships(finalMemberships);

        // --- STEP 4: Self-Healing Fallback (Account Owners) ---
        if (finalMemberships.length === 0) {
          const targetId = urlAccountId || user.uid;
          const accountRef = doc(firestore, 'accounts', targetId);
          
          try {
            const accountSnap = await getDoc(accountRef);
            if (accountSnap.exists() && accountSnap.data().adminUserId === user.uid) {
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

  // Route Guard: Ensure the user is in an organizational context
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
