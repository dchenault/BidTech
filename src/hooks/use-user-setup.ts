
'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Account, User } from '@/lib/types';

/**
 * Handles one-time setup for a newly authenticated user.
 * It creates a user profile and a personal account for every new user.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { toast } = useToast();
  const [isSetupProcessing, setIsSetupProcessing] = useState(true);

  const performUserSetup = useCallback(async () => {
    // Exit if auth is loading, user is not logged in, or firestore is not available.
    if (isAuthLoading || !user || !firestore) {
      if (!isAuthLoading) {
        setIsSetupProcessing(false);
      }
      return;
    }

    setIsSetupProcessing(true);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      // If the user document already exists, setup is complete for them.
      if (userDoc.exists()) {
        setIsSetupProcessing(false);
        return;
      }
      
      // --- This is a new user, create their profile and their own account ---
      
      const batch = writeBatch(firestore);

      // 1. Define the new user's personal account.
      // The account ID will match the user's UID for a 1-to-1 mapping.
      const newAccountId = user.uid;
      const accountRef = doc(firestore, 'accounts', newAccountId);
      const newAccount: Account = {
        id: newAccountId,
        adminUserId: user.uid,
        name: user.displayName ? `${user.displayName}'s Account` : 'My First Account',
        lastItemSku: 1000,
      };
      batch.set(accountRef, newAccount);

      // 2. Define the new user's profile document in the root `users` collection.
      const newUser: Omit<User, 'id'> = {
        name: user.displayName || 'New User',
        email: user.email || '',
        avatarUrl: user.photoURL || '',
        accounts: {
          [newAccountId]: 'admin', // The user is the admin of their own new account.
        },
        activeAccountId: newAccountId, // Their new account is active by default.
      };
      batch.set(userRef, newUser);
      
      // 3. Commit both writes as a single atomic operation.
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
      setIsSetupProcessing(false);
    }
  }, [user, firestore, toast, isAuthLoading]);

  useEffect(() => {
    performUserSetup();
  }, [performUserSetup]);

  // The overall loading state is true if auth is loading OR setup is processing.
  return { isSetupLoading: isAuthLoading || isSetupProcessing };
}
