'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { useToast } from '@/hooks/use-toast';
import type { Account, User as UserProfile } from '@/lib/types';

/**
 * Handles the one-time setup for a newly authenticated user. This hook is now a "writer"
 * that relies on the `useAccount` hook to determine if setup is needed.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  // `useAccount` is now the single source of truth for loading and profile data.
  const { isLoading: isAccountLoading, accountId } = useAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Wait until both auth and the account profile check have completed.
    if (isAuthLoading || isAccountLoading) {
      return;
    }

    // If we have an accountId, it means the user's profile exists and setup is complete.
    if (accountId) {
      setIsProcessing(false);
      return;
    }

    // If we get here, it means auth and account hooks are done loading, but there's
    // no accountId. This is the definitive signal that this is a new user.
    if (!user || !firestore) {
      return; // Should not happen if auth is loaded, but a safe guard.
    }

    setIsProcessing(true);
    
    try {
      // Create the user's profile and their personal account in one atomic batch.
      const batch = writeBatch(firestore);

      // Define the new account document. The account ID is the user's UID.
      const newAccountId = user.uid;
      const accountRef = doc(firestore, 'accounts', newAccountId);
      const newAccount: Account = {
        id: newAccountId,
        adminUserId: user.uid,
        name: user.displayName ? `${user.displayName}'s Account` : 'My First Account',
        lastItemSku: 1000,
      };
      batch.set(accountRef, newAccount);

      // Define the new user profile document in the root /users collection.
      const userRef = doc(firestore, 'users', user.uid);
      const newUser: Omit<UserProfile, 'id'> = {
        name: user.displayName || 'New User',
        email: user.email || '',
        avatarUrl: user.photoURL || '',
        accounts: {
          [newAccountId]: 'admin', // User is the admin of their own new account
        },
        activeAccountId: newAccountId, // Their new account is active by default
      };
      batch.set(userRef, newUser);
      
      await batch.commit();

      toast({
        title: 'Welcome!',
        description: 'Your account has been created successfully.',
      });

    } catch (error) {
      console.error('Error during user setup:', error);
      toast({
        variant: 'destructive',
        title: 'Setup Error',
        description: 'Could not complete initial account setup. Please try again.',
      });
    } finally {
      // The setup process is finished. The useAccount hook will now pick up the
      // new profile on its next render and the loading state will resolve.
      setIsProcessing(false);
    }
  }, [user, firestore, toast, isAuthLoading, isAccountLoading, accountId]);

  useEffect(() => {
    performUserSetup();
  }, [performUserSetup]);

  // The overall loading state for the dashboard setup is now a combination of
  // the main account loading state and the brief processing window.
  return { isSetupLoading: isAccountLoading || isProcessing };
}
