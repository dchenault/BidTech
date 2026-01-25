
'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Account, User } from '@/lib/types';

/**
 * Handles one-time setup for a newly authenticated user in a multi-account system.
 * It ensures every new user gets their own account and user profile document.
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
      // Every user has a profile document in the root `users` collection.
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      // If the user document already exists, setup is complete.
      if (userDoc.exists()) {
        setIsSetupProcessing(false);
        return;
      }
      
      // --- This is a new user, create their account and profile ---

      // The new account will have an ID matching the user's UID.
      const newAccountId = user.uid;
      const accountRef = doc(firestore, 'accounts', newAccountId);

      // Create a batch to write both documents atomically.
      const batch = writeBatch(firestore);

      // 1. Define the new account document.
      const newAccount: Account = {
        id: newAccountId,
        adminUserId: user.uid,
        name: user.displayName ? `${user.displayName}'s Account` : 'My First Account',
        lastItemSku: 1000,
      };
      batch.set(accountRef, newAccount);

      // 2. Define the new user profile document.
      const newUser: Omit<User, 'id'> = {
        name: user.displayName || 'New User',
        email: user.email || '',
        avatarUrl: user.photoURL || '',
        accounts: {
          [newAccountId]: 'admin', // The user is the admin of their own account.
        },
        activeAccountId: newAccountId, // Their new account is active by default.
      };
      batch.set(userRef, newUser);
      
      // 3. Commit the batch.
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

  return { isSetupLoading: isAuthLoading || isSetupProcessing };
}
