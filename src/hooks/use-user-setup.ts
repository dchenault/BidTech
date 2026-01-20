
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

/**
 * A hook to handle one-time setup for a newly authenticated user.
 * 1. Checks if the user is the first user, and if so, creates the primary account.
 * 2. Creates a user document for the new user if one doesn't exist.
 * 3. Checks for and processes any pending invitations for the user's email.
 * @returns {boolean} A loading state `isSetupLoading`.
 */
export function useUserSetup() {
  const { firestore, user, isUserLoading: isAuthLoading } = useFirebase();
  const { toast } = useToast();
  const [isSetupProcessing, setIsSetupProcessing] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    // If auth is loading, or we have no user, or setup is already done, we don't need to do anything.
    if (isAuthLoading || !user || !firestore || isSetupComplete) {
      if (!isAuthLoading && !user) {
        // If the user is definitely logged out, setup is not needed and not processing.
        setIsSetupProcessing(false);
      }
      return;
    }

    const performUserSetup = async () => {
      // Avoid re-running setup if it's already completed for this session
      if (isSetupComplete) {
        setIsSetupProcessing(false);
        return;
      }

      setIsSetupProcessing(true);
      try {
        const accountId = 'account-1'; // Hardcoded for this single-account application.
        const batch = writeBatch(firestore);

        const accountRef = doc(firestore, 'accounts', accountId);
        const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);
        
        const [accountDoc, userDoc] = await Promise.all([
            getDoc(accountRef),
            getDoc(userRef)
        ]);

        let isFirstUserEver = !accountDoc.exists();

        if (isFirstUserEver) {
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

        if (!userDoc.exists()) {
            const userData = {
                id: user.uid,
                accountId: accountId,
                email: user.email,
                role: isFirstUserEver ? 'admin' : 'manager', // New users are managers by default
                avatarUrl: user.photoURL,
            };
            batch.set(userRef, userData);
             if (!isFirstUserEver) {
                 toast({
                    title: 'Welcome!',
                    description: 'Your user profile has been created.',
                });
            }
        }

        // Check for and process pending invitations
        if (user.email) {
            const invitationsRef = collection(firestore, 'accounts', accountId, 'invitations');
            const q = query(invitationsRef, where('email', '==', user.email), where('status', '==', 'pending'));
            const invitationSnapshot = await getDocs(q);

            if (!invitationSnapshot.empty) {
                invitationSnapshot.forEach(invitationDoc => {
                    const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', invitationDoc.data().auctionId);
                    batch.update(auctionRef, { [`managers.${user.uid}`]: invitationDoc.data().role || 'manager' });
                    batch.update(invitationDoc.ref, { status: 'accepted', acceptedBy: user.uid });
                });
            }
        }
        
        await batch.commit();
        setIsSetupComplete(true);
      } catch (error) {
        console.error("Error during user setup:", error);
        toast({
            variant: "destructive",
            title: "Setup Error",
            description: "Could not complete initial account setup. Please try again later."
        })
      } finally {
        setIsSetupProcessing(false);
      }
    };

    performUserSetup();
  }, [user, firestore, toast, isSetupComplete, isAuthLoading]);

  // isSetupLoading is true if auth is still resolving or if our setup logic is running
  return { isSetupLoading: isAuthLoading || isSetupProcessing };
}
