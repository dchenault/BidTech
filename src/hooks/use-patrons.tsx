
'use client';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  writeBatch,
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
import { patronFormSchema } from '@/lib/types';

const EMPTY_PATRONS: Patron[] = [];

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

    const hasContributions = allItems.some(item => item.winnerId === patronId);
    if (hasContributions) {
      throw new Error("Cannot delete a patron who has won items or made donations.");
    }

    const patronDocRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
    await deleteDoc(patronDocRef);
  };

  const importPatronsFromCSV = async (data: any[]): Promise<{ success: boolean; message: string }> => {
    if (!firestore || !accountId || !patronsRef) {
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

      const result = patronFormSchema.safeParse(parsedRecord);

      if (result.success) {
        const newPatronDoc = doc(patronsRef);
        const newPatronData: Omit<Patron, 'id'> = {
          ...result.data,
          accountId: accountId,
          totalSpent: 0,
          itemsWon: 0,
        };
        batch.set(newPatronDoc, newPatronData);
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

    return { success: true, message: `Successfully imported ${validRecords} patrons.` };
  };
  
  return {
    patrons: patrons || EMPTY_PATRONS,
    isLoading,
    addPatron,
    updatePatron,
    deletePatron,
    importPatronsFromCSV,
  };
}
