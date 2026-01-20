
'use client';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser
} from '@/firebase';
import type { Patron, PatronFormValues, Item } from '@/lib/types';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


export function usePatrons() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  // TODO: This assumes the user is part of one account. This will need to be updated
  // if a user can be part of multiple accounts.
  const accountId = 'account-1';

  const patronsRef = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'accounts', accountId, 'patrons') : null),
    [firestore, accountId, user, isUserLoading]
  );
  
  const { data: patrons, isLoading } = useCollection<Patron>(patronsRef);

  const addPatron = async (patronData: PatronFormValues): Promise<Patron | void> => {
    if (!patronsRef || !user) return;
    const newPatron: Omit<Patron, 'id'> = {
        ...patronData,
        accountId: accountId, // Associate with the current account
        totalSpent: 0,
        itemsWon: 0,
    };
    // Use the blocking version to get the new doc reference
    const docRef = await addDoc(patronsRef, newPatron);
    return {
        id: docRef.id,
        ...newPatron,
    }
  };
  
  const updatePatron = (id: string, updatedPatron: Partial<Patron>) => {
    if (!firestore) return;
    const patronDocRef = doc(firestore, 'accounts', accountId, 'patrons', id);
    updateDocumentNonBlocking(patronDocRef, updatedPatron);
  };

  const deletePatron = async (patronId: string, allItems: Item[]) => {
    if (!firestore) {
      throw new Error("Firestore not available");
    }

    const hasContributions = allItems.some(item => item.winningBidderId === patronId);
    if (hasContributions) {
      throw new Error("Cannot delete a patron who has won items or made donations.");
    }

    const patronDocRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
    await deleteDoc(patronDocRef);
  };
  
  return {
    patrons: patrons || [],
    isLoading,
    addPatron,
    updatePatron,
    deletePatron,
  };
}

    