'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc } from 'firebase/firestore';
import { useAccount } from './use-account';

/**
 * Hook that handles final user setup if no organization was auto-claimed.
 * It primarily handles standard new user signup (personal account creation).
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { accountId, isLoading: isAccountLoading } = useAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Exit if auth isn't resolved, there's no user, or no firestore connection.
    if (isAuthLoading || isAccountLoading || !user || !firestore) {
      return;
    }

    // Use sessionStorage to prevent re-running
    if (sessionStorage.getItem(`user-setup-complete-${user.uid}`)) {
      return;
    }

    // If an organizational context already exists (from UID membership or auto-claim),
    // ensure the profile exists and then we are done.
    if (accountId) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        sessionStorage.setItem(`user-setup-complete-${user.uid}`, 'true');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Standard Path: If no account was discovered/claimed, create a new personal organization.
      if (!accountId) {
        await setupNewUser(firestore, user);
        toast({
          title: 'Welcome!',
          description: 'Your personal organization has been created.',
        });
      }

      sessionStorage.setItem(`user-setup-complete-${user.uid}`, 'true');

    } catch (error) {
      console.error('Error during user setup:', error);
      toast({
        variant: 'destructive',
        title: 'Setup Error',
        description: 'Could not complete organization setup.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, firestore, toast, isAuthLoading, isAccountLoading, accountId]);

  useEffect(() => {
    performUserSetup();
  }, [performUserSetup]);

  return { isSetupLoading: isAuthLoading || isAccountLoading || isProcessing };
}