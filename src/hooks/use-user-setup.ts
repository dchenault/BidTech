
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc, collectionGroup, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';

/**
 * Hook that runs on authenticated layouts to handle one-time setup for new users.
 * This hook is critical for correctly associating a new user with an existing account
 * if they were invited as an admin. It no longer creates accounts automatically for users
 * who just log in without an invite. It also self-heals missing membership docs for account owners.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { toast } = useToast();
  // isProcessing is the local loading state for this hook's operations.
  const [isProcessing, setIsProcessing] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Exit if auth isn't resolved, there's no user, or no firestore connection.
    if (isAuthLoading || !user || !firestore || !user.email) {
      return;
    }

    if (sessionStorage.getItem(`user-setup-complete-${user.uid}`)) {
      return;
    }

    setIsProcessing(true);

    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);

      if (userProfileSnap.exists()) {
        // User has a profile. Let's check if their self-admin membership exists.
        const profile = userProfileSnap.data();
        const accountId = profile.activeAccountId;
        if (accountId) {
          const accountRef = doc(firestore, 'accounts', accountId);
          const accountSnap = await getDoc(accountRef);
          if (accountSnap.exists() && accountSnap.data().adminUserId === user.uid) {
            const membershipRef = doc(firestore, 'accounts', accountId, 'memberships', user.uid);
            const membershipSnap = await getDoc(membershipRef);
            if (!membershipSnap.exists()) {
              console.log(`Creating missing admin membership for ${user.email} on account ${accountId}`);
              await setDoc(membershipRef, {
                role: 'admin',
                email: user.email,
                name: user.displayName,
                assignedAuctions: []
              });
            }
          }
        }
      } else {
        // This is a brand new user with no profile. Check if they were invited as an admin anywhere.
        const adminsQuery = query(
          collectionGroup(firestore, 'admins'),
          where('email', '==', user.email.toLowerCase())
        );
        const adminDocsSnap = await getDocs(adminsQuery);
        if (adminDocsSnap.empty) {
          // Path B: Not an invited admin. Do nothing. The /signup flow will handle explicit account creation.
          // The dashboard layout will show the "waiting for invite" screen.
        }
      }
      
      sessionStorage.setItem(`user-setup-complete-${user.uid}`, 'true');

    } catch (error) {
      console.error('Error during user setup:', error);
      toast({
        variant: 'destructive',
        title: 'Setup Error',
        description: 'Could not complete initial account setup. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, firestore, toast, isAuthLoading]);

  useEffect(() => {
    performUserSetup();
  }, [performUserSetup]);

  return { isSetupLoading: isAuthLoading || isProcessing };
}
