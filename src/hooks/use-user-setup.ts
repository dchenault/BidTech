
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc, collectionGroup, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Hook that runs on authenticated layouts to handle one-time setup for new users.
 * This hook is critical for correctly associating a new user with an existing account
 * if they were invited as an admin or staff, or creating a new personal account for them if not.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { toast } = useToast();
  // isProcessing is the local loading state for this hook's operations.
  const [isProcessing, setIsProcessing] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Exit if auth isn't resolved, there's no user, or no firestore connection.
    if (isAuthLoading || !user || !firestore) {
      return;
    }

    // Use sessionStorage to prevent this complex check from re-running on every render
    // during a single user session after it has completed once.
    if (sessionStorage.getItem(`user-setup-complete-${user.uid}`)) {
      return;
    }

    setIsProcessing(true);

    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);

      // If a complete user profile already exists, we're done.
      if (userProfileSnap.exists() && userProfileSnap.data().activeAccountId) {
        sessionStorage.setItem(`user-setup-complete-${user.uid}`, 'true');
        setIsProcessing(false);
        return;
      }

      // Check if the user's email is listed in ANY account's memberships.
      const membershipsQuery = query(
        collectionGroup(firestore, 'memberships'),
        where('email', '==', user.email?.toLowerCase())
      );
      const membershipDocsSnap = await getDocs(membershipsQuery);

      if (!membershipDocsSnap.empty) {
        // --- Path A: User has a pre-existing membership (Admin or Staff) ---
        const membershipDoc = membershipDocsSnap.docs[0];
        const accountId = membershipDoc.ref.parent.parent?.id;
        const membershipData = membershipDoc.data();

        if (!accountId) {
          throw new Error("Could not determine Account ID from membership record.");
        }

        const batch = writeBatch(firestore);
        
        // 1. Update the membership document to be active and linked to the UID
        batch.update(membershipDoc.ref, { 
          userId: user.uid, 
          status: 'active' 
        });

        // 2. Initialize or update the root user profile
        const userData = {
          name: user.displayName || 'Team Member',
          email: user.email || '',
          avatarUrl: user.photoURL || '',
          accounts: { [accountId]: membershipData.role },
          activeAccountId: accountId,
        };

        batch.set(userProfileRef, userData, { merge: true });
        
        await batch.commit();

        toast({
          title: 'Welcome!',
          description: `You've joined the account as ${membershipData.role}.`,
        });
      } else {
        // --- Path B: Standard new user signup ---
        // User is not part of any team yet, so run the standard new account creation flow.
        await setupNewUser(firestore, user);
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
      }

      // Mark setup as complete for this session to prevent re-running.
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

  // The overall setup is considered loading if auth is loading OR this hook is processing.
  return { isSetupLoading: isAuthLoading || isProcessing };
}
