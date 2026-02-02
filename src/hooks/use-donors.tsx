
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
import type { Donor, DonorFormValues } from '@/lib/types';
import {
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useAccount } from './use-account';

const EMPTY_DONORS: Donor[] = [];

export function useDonors() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { accountId } = useAccount();

  const donorsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'donors') : null),
    [firestore, accountId]
  );
  
  const { data: donors, isLoading } = useCollection<Donor>(donorsRef);

  const addDonor = async (donorData: DonorFormValues): Promise<Donor | void> => {
    if (!donorsRef || !accountId) return;
    const newDonor: Omit<Donor, 'id'> = {
        ...donorData,
        accountId: accountId,
    };
    const docRef = await addDoc(donorsRef, newDonor);
    return {
        id: docRef.id,
        ...newDonor,
    }
  };
  
  const updateDonor = (id: string, updatedDonor: Partial<Donor>) => {
    if (!firestore || !accountId) return;
    const donorDocRef = doc(firestore, 'accounts', accountId, 'donors', id);
    updateDocumentNonBlocking(donorDocRef, updatedDonor);
  };

  const deleteDonor = async (donorId: string) => {
    if (!firestore || !accountId) {
      throw new Error("Firestore not available");
    }

    // TODO: Add check to see if donor is associated with any items before deleting.
    // For now, we allow deletion.

    const donorDocRef = doc(firestore, 'accounts', accountId, 'donors', donorId);
    await deleteDoc(donorDocRef);
  };
  
  return {
    donors: donors || EMPTY_DONORS,
    isLoading,
    addDonor,
    updateDonor,
    deleteDonor,
  };
}
