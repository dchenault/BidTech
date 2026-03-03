'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc, collectionGroup, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Hook that runs on authenticated layouts to handle one-time setup for new users.
 * This hook is critical for correctly associating a new user with an existing account
 * if they were invited via email, or creating a new personal account for them if not.
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

      // Check if the user's email is listed in ANY account's memberships as pending.
      // This identifies invitations that were sent using the user's email as the document ID.
      const membershipsQuery = query(
        collectionGroup(firestore, 'memberships'),
        where('email', '==', user.email?.toLowerCase()),
        where('status', '==', 'pending')
      );
      const membershipDocsSnap = await getDocs(membershipsQuery);

      if (!membershipDocsSnap.empty) {
        // --- Path A: User has a pending email-based membership ---
        // Claim the invitation by creating a permanent UID-based record and deleting the email-based one.
        const membershipDoc = membershipDocsSnap.docs[0];
        const membershipData = membershipDoc.data();
        const accountId = membershipData.accountId;

        if (!accountId) {
          throw new Error("Could not determine Account ID from membership record.");
        }

        const batch = writeBatch(firestore);
        
        // 1. Create the permanent membership document linked to the actual user UID
        const newMRef = doc(firestore, 'accounts', accountId, 'memberships', user.uid);
        batch.set(newMRef, {
          ...membershipData,
          id: user.uid,
          userId: user.uid,
          status: 'active'
        });

        // 2. Delete the temporary email-indexed invitation document
        if (membershipDoc.id !== user.uid) {
          batch.delete(membershipDoc.ref);
        }

        // 3. Initialize or update the root user profile
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
        // --- Path B: Standard new user signup (create personal account) ---
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
