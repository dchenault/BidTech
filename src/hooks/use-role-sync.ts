'use client';

import { useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * A hook that syncs a user's admin role from a simple email list in Firestore
 * to their user profile document. This runs on authenticated layouts to ensure
 * permissions are up-to-date.
 * @param accountId The current active account ID.
 */
export function useRoleSync(accountId: string | null) {
  const { firestore, user, isUserLoading } = useFirebase();

  useEffect(() => {
    const syncRole = async () => {
      // Wait for all dependencies to be ready
      if (isUserLoading || !user || !user.email || !firestore || !accountId) {
        return;
      }

      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminRoleRef = doc(firestore, 'accounts', accountId, 'admins', user.email.toLowerCase());

      try {
        const [userProfileSnap, adminRoleSnap] = await Promise.all([
          getDoc(userProfileRef),
          getDoc(adminRoleRef),
        ]);
        
        const userProfile = userProfileSnap.data();
        const isAlreadyAdmin = userProfile?.accounts?.[accountId] === 'admin';

        // If the user's email is in the admin list, but they don't have the role in their profile, grant it.
        if (adminRoleSnap.exists() && !isAlreadyAdmin) {
          console.log(`Syncing admin role for ${user.email} on account ${accountId}`);
          await updateDoc(userProfileRef, {
            [`accounts.${accountId}`]: 'admin'
          });
        }
      } catch (error) {
        // This might fail due to security rules if the user isn't allowed to read the admins collection,
        // which is expected for non-admins. We can safely ignore these errors.
        if (error instanceof Error && error.message.includes('permission-denied')) {
           // console.log('Permission denied to check admin role, which is expected for non-admins.');
        } else {
           console.error('Error during role sync:', error);
        }
      }
    };

    syncRole();
  }, [user, accountId, firestore, isUserLoading]);
}
