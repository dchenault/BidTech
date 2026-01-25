
import { doc, writeBatch, type Firestore, getDoc } from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';
import type { Account, User as UserProfile } from '@/lib/types';

/**
 * Creates the necessary Firestore documents (account and user profile) for a brand new user.
 * This is intended to be a one-time setup operation, callable from any part of the app.
 * @param firestore The Firestore instance.
 * @param user The Firebase Auth user object for the new user.
 * @returns {Promise<void>}
 */
export async function setupNewUser(firestore: Firestore, user: AuthUser): Promise<void> {
  if (!firestore || !user) {
    throw new Error('Firestore and User must be provided for setup.');
  }

  // Double-check that the user profile doesn't already exist to avoid overwriting.
  const userRef = doc(firestore, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    console.log('User profile already exists, skipping setup.');
    return;
  }

  // Create the user's profile and their personal account in one atomic batch.
  const batch = writeBatch(firestore);

  // Define the new account document. The account ID is the user's UID.
  const newAccountId = user.uid;
  const accountRef = doc(firestore, 'accounts', newAccountId);
  const newAccount: Account = {
    id: newAccountId,
    adminUserId: user.uid,
    name: user.displayName ? `${user.displayName}'s Account` : 'My First Account',
    lastItemSku: 1000,
  };
  batch.set(accountRef, newAccount);

  // Define the new user profile document in the root /users collection.
  const newUser: Omit<UserProfile, 'id'> = {
    name: user.displayName || 'New User',
    email: user.email || '',
    avatarUrl: user.photoURL || '',
    accounts: {
      [newAccountId]: 'admin', // User is the admin of their own new account
    },
    activeAccountId: newAccountId, // Their new account is active by default
  };
  batch.set(userRef, newUser);

  await batch.commit();
}
