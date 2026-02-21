
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc, collectionGroup, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Hook that runs on authenticated layouts to handle one-time setup for new users.
 * This hook is critical for correctly associating a new user with an existing account
 * if they were invited as an admin, or creating a new personal account for them if not.
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

      // Check if the user's email is listed as an admin in ANY account.
      const adminsQuery = query(
        collectionGroup(firestore, 'admins'),
        where('email', '==', user.email?.toLowerCase())
      );
      const adminDocsSnap = await getDocs(adminsQuery);

      if (!adminDocsSnap.empty) {
        // --- Path A: User is an admin of an existing account ---
        const adminDoc = adminDocsSnap.docs[0];
        const accountId = adminDoc.ref.parent.parent?.id;

        if (!accountId) {
          throw new Error("Could not determine Account ID from admin record.");
        }

        const batch = writeBatch(firestore);
        
        const userData = {
          name: user.displayName || 'New Admin',
          email: user.email || '',
          avatarUrl: user.photoURL || '',
          accounts: { [accountId]: 'admin' },
          activeAccountId: accountId,
        };

        // Use set with merge: true. This creates the document if it doesn't exist,
        // or updates it if it does, without overwriting existing fields not in this payload.
        batch.set(userProfileRef, userData, { merge: true });
        
        await batch.commit();

        toast({
          title: 'Welcome!',
          description: "You've been granted admin access.",
        });
      } else {
        // --- Path B: Standard new user signup ---
        // User is not an admin, so run the standard new account creation flow.
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
