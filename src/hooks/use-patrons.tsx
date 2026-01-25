
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
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useAccount } from './use-account';


export function usePatrons() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { accountId } = useAccount();

  const patronsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'patrons') : null),
    [firestore, accountId]
  );
  
  const { data: patrons, isLoading } = useCollection<Patron>(patronsRef);

  const addPatron = async (patronData: PatronFormValues): Promise<Patron | void> => {
    if (!patronsRef || !accountId) return;
    const newPatron: Omit<Patron, 'id'> = {
        ...patronData,
        accountId: accountId, // Associate with the current account
        totalSpent: 0,
        itemsWon: 0,
    };
    const docRef = await addDoc(patronsRef, newPatron);
    return {
        id: docRef.id,
        ...newPatron,
    }
  };
  
  const updatePatron = (id: string, updatedPatron: Partial<Patron>) => {
    if (!firestore || !accountId) return;
    const patronDocRef = doc(firestore, 'accounts', accountId, 'patrons', id);
    updateDocumentNonBlocking(patronDocRef, updatedPatron);
  };

  const deletePatron = async (patronId: string, allItems: Item[]) => {
    if (!firestore || !accountId) {
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
