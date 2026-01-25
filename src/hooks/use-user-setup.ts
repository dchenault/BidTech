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
        const accountRef = doc(firestore, 'accounts', accountId);
        
        // Sequentially check for account first. This is critical.
        const accountDoc = await getDoc(accountRef);

        const isFirstUserEver = !accountDoc.exists();

        if (isFirstUserEver) {
          // This is the first user ever. Create the account and their user doc in a batch.
          const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);
          const batch = writeBatch(firestore);
          
          const accountData = {
            id: accountId,
            adminUserId: user.uid,
            name: user.displayName ? `${user.displayName}'s Account` : 'My Account',
            lastItemSku: 1000,
          };
          batch.set(accountRef, accountData);

          const userData = {
            id: user.uid,
            accountId: accountId,
            email: user.email,
            role: 'admin', 
            avatarUrl: user.photoURL || null,
            name: user.displayName || 'New User',
          };
          batch.set(userRef, userData);
          
          await batch.commit();
          
          toast({
            title: 'Welcome!',
            description: 'Your account has been created, and you are the administrator.',
          });
        } else {
          // The account already exists. Now, safely check if this specific user's doc exists.
          const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            // This is a new user joining an existing account. Create their user doc.
            const userData = {
              id: user.uid,
              accountId: accountId,
              email: user.email,
              role: 'user', // Default role. Invitation flow can elevate to 'manager'.
              avatarUrl: user.photoURL || null,
              name: user.displayName || 'New User',
            };
            // Use a batch even for one write for consistency, though setDoc is also fine here.
            const batch = writeBatch(firestore);
            batch.set(userRef, userData);
            await batch.commit();

            toast({
              title: 'Profile Created',
              description: 'Your user profile has been successfully created.',
            });
          }
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
