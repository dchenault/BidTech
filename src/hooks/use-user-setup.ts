'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

/**
 * A hook to handle one-time setup for a newly authenticated user.
 * It ensures the account and user documents exist.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { toast } = useToast();
  const [isSetupProcessing, setIsSetupProcessing] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Exit conditions: auth is loading, no user, no firestore, or setup already done.
    if (isAuthLoading || !user || !firestore || isSetupComplete) {
      if (!isAuthLoading) {
        setIsSetupProcessing(false); // Ensure loading stops if auth resolves to null
      }
      return;
    }

    setIsSetupProcessing(true);
    
    try {
      const accountId = 'account-1'; // Hardcoded for this single-account application.
      const accountRef = doc(firestore, 'accounts', accountId);
      const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);
      
      // First, check if the user's own document exists. This is a fast, targeted read.
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // The user document already exists, so their setup is complete.
        setIsSetupComplete(true);
        setIsSetupProcessing(false);
        return;
      }
      
      // User doc doesn't exist. Now check if the account exists.
      const accountDoc = await getDoc(accountRef);
      const batch = writeBatch(firestore);

      if (!accountDoc.exists()) {
        // This is the very first user. Create the account document.
        const accountData = {
          id: accountId,
          adminUserId: user.uid,
          name: user.displayName ? `${user.displayName}'s Account` : 'My Account',
          lastItemSku: 1000,
        };
        batch.set(accountRef, accountData);

        // Also create the user document with an 'admin' role.
        const userData = {
          id: user.uid,
          accountId: accountId,
          email: user.email,
          role: 'admin', 
          avatarUrl: user.photoURL || null,
          name: user.displayName || 'New User',
        };
        batch.set(userRef, userData);
        
        toast({
          title: 'Welcome!',
          description: 'Your account has been created, and you are the administrator.',
        });

      } else {
        // The account exists, but the user does not. Create the user document with a 'user' role.
        const userData = {
          id: user.uid,
          accountId: accountId,
          email: user.email,
          role: 'user', // Default role. Invitation flow can elevate to 'manager'.
          avatarUrl: user.photoURL || null,
          name: user.displayName || 'New User',
        };
        batch.set(userRef, userData);
        
        toast({
          title: 'Profile Created',
          description: 'Your user profile has been successfully created.',
        });
      }
      
      // Commit the batch for either new account or new user scenario.
      await batch.commit();
      setIsSetupComplete(true);

    } catch (error) {
      console.error('Error during user setup:', error);
      toast({
        variant: 'destructive',
        title: 'Setup Error',
        description: 'Could not complete initial account setup. Please check permissions and try again.',
      });
    } finally {
      setIsSetupProcessing(false);
    }
  }, [user, firestore, toast, isSetupComplete, isAuthLoading]);

  useEffect(() => {
    performUserSetup();
  }, [performUserSetup]);

  // isSetupLoading is true if auth is still resolving or if our specific setup logic is running.
  return { isSetupLoading: isAuthLoading || isSetupProcessing };
}
