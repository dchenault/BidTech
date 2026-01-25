'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
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

  useEffect(() => {
    // Exit conditions: auth is loading, no user, no firestore, or setup already done.
    if (isAuthLoading || !user || !firestore || isSetupComplete) {
      if (!isAuthLoading) {
        setIsSetupProcessing(false); // Ensure loading stops if auth resolves to null
      }
      return;
    }

    const performUserSetup = async () => {
      setIsSetupProcessing(true);
      try {
        const accountId = 'account-1'; // Hardcoded for this single-account application.
        const batch = writeBatch(firestore);

        const accountRef = doc(firestore, 'accounts', accountId);
        const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);

        // Check for account and user documents in parallel.
        const [accountDoc, userDoc] = await Promise.all([
          getDoc(accountRef),
          getDoc(userRef),
        ]);

        let hasWritten = false;
        const isFirstUserEver = !accountDoc.exists();

        // Scenario 1: This is the very first user signing up.
        if (isFirstUserEver) {
          hasWritten = true;
          const accountData = {
            id: accountId,
            adminUserId: user.uid,
            name: user.displayName ? `${user.displayName}'s Account` : 'My Account',
            lastItemSku: 1000,
          };
          batch.set(accountRef, accountData);
          toast({
            title: 'Welcome!',
            description: 'Your account has been created, and you are the administrator.',
          });
        }

        // Scenario 2: The user document does not exist for the current user.
        if (!userDoc.exists()) {
          hasWritten = true;
          const userData = {
            id: user.uid,
            accountId: accountId,
            email: user.email,
            // If they are the first user ever, make them an admin. Otherwise, 'user'.
            // Invitation flow handles promoting to 'manager'.
            role: isFirstUserEver ? 'admin' : 'user', 
            avatarUrl: user.photoURL || null,
            name: user.displayName || 'New User',
          };
          batch.set(userRef, userData);
          if (!isFirstUserEver) {
            toast({
              title: 'Profile Created',
              description: 'Your user profile has been successfully created.',
            });
          }
        }
        
        if (hasWritten) {
            await batch.commit();
        }

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
    };

    performUserSetup();
  }, [user, firestore, toast, isSetupComplete, isAuthLoading]);

  // isSetupLoading is true if auth is still resolving or if our specific setup logic is running.
  return { isSetupLoading: isAuthLoading || isSetupProcessing };
}
