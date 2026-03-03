'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';
import { doc, getDoc } from 'firebase/firestore';
import { useAccount } from './use-account';

/**
 * Hook that handles fallback user setup (creating a personal account) 
 * if no organizational memberships were discovered or claimed during the RBAC phase.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { accountId, isLoading: isAccountLoading } = useAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const performUserSetup = useCallback(async () => {
    // Only run if everything is resolved
    if (isAuthLoading || isAccountLoading || !user || !firestore) {
      return;
    }

    // Use session storage to ensure we don't spam checks in the same session
    const setupKey = `user-setup-check-${user.uid}`;
    if (sessionStorage.getItem(setupKey)) {
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: If useAccount found/claimed an account, just verify profile existence.
      if (accountId) {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        // If the profile doesn't exist but the account was claimed, initialize the profile.
        if (!userProfileSnap.exists()) {
          console.log("Setup: Claim detected but profile missing. Initializing profile...");
          await setupNewUser(firestore, user);
        }
        
        sessionStorage.setItem(setupKey, 'true');
        return;
      }

      // Step 2: Standard Fallback - If NO account was found (no param, no existing memberships),
      // create a new personal organization.
      if (!accountId) {
        console.log("Setup: No organization context found. Creating personal account...");
        await setupNewUser(firestore, user);
        toast({
          title: 'Welcome!',
          description: 'Your personal organization has been created.',
        });
      }

      sessionStorage.setItem(setupKey, 'true');

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
