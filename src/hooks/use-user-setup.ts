'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { useToast } from '@/hooks/use-toast';
import { setupNewUser } from '@/firebase/user-setup';

/**
 * Hook that runs on the main dashboard layout to handle the one-time setup for a newly authenticated user.
 * It relies on the useAccount hook to determine if setup is needed.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
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
    // no accountId. This is the definitive signal that this is a new user who signed up directly.
    if (!user || !firestore) {
      return; // Should not happen if auth is loaded, but a safe guard.
    }

    setIsProcessing(true);
    
    try {
      await setupNewUser(firestore, user);
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
