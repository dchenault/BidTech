
'use client';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  writeBatch
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
import { donorFormSchema } from '@/lib/types';

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
  
  const importDonorsFromCSV = async (data: any[]): Promise<{ success: boolean; message: string }> => {
    if (!firestore || !accountId || !donorsRef) {
      return { success: false, message: 'Database connection not available.' };
    }

    const batch = writeBatch(firestore);
    let validRecords = 0;
    const errors: string[] = [];

    data.forEach((record, index) => {
       const parsedRecord = {
        ...record,
        address: {
          street: record.street || '',
          city: record.city || '',
          state: record.state || '',
          zip: record.zip || '',
        },
      };
      
      const result = donorFormSchema.safeParse(parsedRecord);

      if (result.success) {
        const newDonorDoc = doc(donorsRef);
        const newDonorData: Omit<Donor, 'id'> = {
          ...result.data,
          accountId: accountId,
        };
        batch.set(newDonorDoc, newDonorData);
        validRecords++;
      } else {
        const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        errors.push(`Row ${index + 2}: ${errorMessages}`);
      }
    });

    if (validRecords > 500) {
      return { success: false, message: 'Cannot import more than 500 records at a time.' };
    }

    if (validRecords > 0) {
      await batch.commit();
    }
    
    if (errors.length > 0) {
       return { success: false, message: `Import failed for ${errors.length} rows. Please check your data. Errors: ${errors.slice(0, 5).join('; ')}` };
    }

    return { success: true, message: `Successfully imported ${validRecords} donors.` };
  };

  return {
    donors: donors || EMPTY_DONORS,
    isLoading,
    addDonor,
    updateDonor,
    deleteDonor,
    importDonorsFromCSV,
  };
}
