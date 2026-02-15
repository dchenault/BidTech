
'use client';
import {
  collection,
  doc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  getDocs,
  runTransaction,
  getDoc,
  deleteDoc,
  increment,
  query,
  where,
  limit,
  deleteField,
  type Firestore,
  addDoc,
  updateDoc,
  documentId,
} from 'firebase/firestore';
import {
  useFirestore,
  useStorage,
  useCollection,
  useMemoFirebase,
  useUser,
  type WithId,
} from '@/firebase';
import type { Auction, Item, Category, ItemFormValues, RegisteredPatron, Account, Lot, LotFormValues, Patron, Donor, FormValues } from '@/lib/types';
import { uploadDataUriAndGetURL, deleteFileByUrl } from '@/firebase/storage';
import { useCallback, useMemo } from 'react';
import { useToast } from './use-toast';
import { useAccount } from './use-account';
import { FirebaseStorage } from 'firebase/storage';
import { generateSlug } from '@/lib/utils';

const EMPTY_AUCTIONS: Auction[] = [];

async function _handleImageUpload(
  storage: FirebaseStorage,
  accountId: string,
  auctionId: string,
  newImageData: string | undefined,
  oldImageUrl: string | undefined
): Promise<string | undefined> { 
  if (newImageData === oldImageUrl) return oldImageUrl;

  if (oldImageUrl && newImageData !== oldImageUrl) {
      try {
        await deleteFileByUrl(storage, oldImageUrl);
      } catch (e: any) {
        console.warn("FYI: Could not delete the old image, it may already be gone.");
      }
  }

  // Case 2: New image is being uploaded (it's a data URI)
  if (newImageData && newImageData.startsWith('data:')) {
    try {
        const imagePath = `items/${accountId}/${auctionId}`; 
        const uploadedUrl = await uploadDataUriAndGetURL(storage, newImageData, imagePath);
        return uploadedUrl;
    } catch (error) {
        console.error("Error during image upload:", error);
        alert("Image upload failed! Please check the console for details.");
        return undefined;
    }
  }

  return undefined;
}

export function useAuctions() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const auctionsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions') : null),
    [firestore, accountId]
  );
  const { data: auctionsData, isLoading } = useCollection<Auction>(auctionsRef);

  const addAuction = useCallback(async (auctionData: FormValues) => {
    if (!auctionsRef || !accountId) return;
    const slug = generateSlug(auctionData.name);
    const newAuction: Omit<Auction, 'id'> = {
        name: auctionData.name,
        description: auctionData.description,
        type: auctionData.type,
        startDate: auctionData.startDate,
        isPublic: auctionData.isPublic || false,
        slug: slug,
        accountId: accountId,
        itemCount: 0,
        items: [],
        categories: [],
        lots: [],
        status: new Date(auctionData.startDate) > new Date() ? 'upcoming' : 'active',
    }
    await addDoc(auctionsRef, newAuction);
  }, [auctionsRef, accountId]);

  const updateAuction = useCallback(async (id: string, updatedAuctionData: Partial<Auction>) => {
    if (!firestore || !accountId) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', id);
    
    const payload: Partial<Auction> = { ...updatedAuctionData };
    if (updatedAuctionData.name) {
      payload.slug = generateSlug(updatedAuctionData.name);
    }
     if (updatedAuctionData.startDate && typeof updatedAuctionData.startDate !== 'string') {
      // @ts-ignore
      payload.startDate = updatedAuctionData.startDate.toISOString();
    }

    await updateDoc(auctionDocRef, payload);
  }, [firestore, accountId]);

  const addItemToAuction = useCallback(async (auctionId: string, itemData: ItemFormValues) => {
    if (!firestore || !accountId || !storage || !user) {
        throw new Error('Cannot add item: missing context.');
    }
    
    try {
      const finalImageUrl = await _handleImageUpload(storage, accountId, auctionId, itemData.imageUrl, undefined);
    
      // Check for SKU uniqueness BEFORE the transaction if a SKU is provided.
      if (itemData.sku && itemData.sku.trim() !== '') {
          const newSku = itemData.sku.trim();
          const itemsColRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
          const skuQuery = query(itemsColRef, where('sku', '==', newSku));
          const skuSnapshot = await getDocs(skuQuery);
          if (!skuSnapshot.empty) {
              throw new Error(`SKU "${newSku}" is already in use in this auction.`);
          }
      }

      await runTransaction(firestore, async (transaction) => {
          const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
          const auctionSnap = await transaction.get(auctionRef);
          if (!auctionSnap.exists()) throw new Error("Auction not found");
          const auction = auctionSnap.data() as Auction;

          const accountRef = doc(firestore, 'accounts', accountId);
          const accountSnap = await transaction.get(accountRef);
          if (!accountSnap.exists()) throw new Error("Account not found");
          const accountData = accountSnap.data() as Account;
          
          let newSku: string | number;
          let shouldIncrementSku = false;

          // Now, we determine the SKU inside the transaction. If it was provided, we use it.
          // If not, we generate it atomically.
          if (itemData.sku && itemData.sku.trim() !== '') {
            newSku = itemData.sku.trim();
          } else {
            newSku = (accountData.lastItemSku || 999) + 1;
            shouldIncrementSku = true;
          }

          const category = auction.categories.find(c => c.name === itemData.categoryId) || {id: 'cat-misc', name: 'Misc'};
          
          let donor: Donor | undefined = undefined;
          if (itemData.donorId) {
              const donorRef = doc(firestore, 'accounts', accountId, 'donors', itemData.donorId);
              const donorSnap = await transaction.get(donorRef);
              if (donorSnap.exists()) {
                  donor = { id: donorSnap.id, ...donorSnap.data() } as Donor;
              }
          }
          
          const newItemPayload: Omit<Item, 'id'> = {
              name: itemData.name,
              description: itemData.description || "",
              estimatedValue: itemData.estimatedValue,
              sku: newSku,
              category,
              auctionId: auctionId,
              accountId: accountId,
              paid: false,
              categoryId: category.id,
              ...(itemData.lotId && { lotId: itemData.lotId }),
              ...(itemData.donorId && { donorId: itemData.donorId }),
              ...(donor && { donor: donor }),
              ...(finalImageUrl && { imageUrl: finalImageUrl, thumbnailUrl: finalImageUrl }),
          };

          const itemsColRef = collection(auctionRef, 'items');
          const newItemRef = doc(itemsColRef); 

          transaction.set(newItemRef, newItemPayload);
          transaction.update(auctionRef, { itemCount: increment(1) });
          if (shouldIncrementSku) {
            transaction.update(accountRef, { lastItemSku: newSku as number });
          }
      });

      toast({
        title: "Success",
        description: `"${itemData.name}" added successfully.`,
      });

    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        throw error;
    }
  }, [firestore, accountId, storage, user, toast]);


  const updateItemInAuction = useCallback(async (auctionId: string, itemId: string, item: Item, itemData: ItemFormValues) => {
    if (!firestore || !accountId || !storage || !user) {
       throw new Error('Missing context.');
    }
    
    try {
      const finalImageUrl = await _handleImageUpload(storage, accountId, auctionId, itemData.imageUrl, item.imageUrl);
      
      const newSku = itemData.sku?.toString().trim();
      // Check for SKU uniqueness BEFORE the transaction if the SKU has changed.
      if (newSku && newSku !== item.sku.toString()) {
          const itemsColRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
          const skuQuery = query(itemsColRef, where('sku', '==', newSku));
          const skuSnapshot = await getDocs(skuQuery);
          if (!skuSnapshot.empty) {
              throw new Error(`SKU "${newSku}" is already in use in this auction.`);
          }
      }
    
      await runTransaction(firestore, async (transaction) => {
          const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
          const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
          
          const auctionSnap = await transaction.get(auctionRef);
          if (!auctionSnap.exists()) throw new Error("Auction not found");
          const auction = auctionSnap.data() as Auction;
          
          const itemSnap = await transaction.get(itemRef);
          if (!itemSnap.exists()) throw new Error("Item to update not found.");
          
          const category = auction.categories.find(c => c.name === itemData.categoryId) || {id: 'cat-misc', name: 'Misc'};
          
          let donor: Donor | undefined = undefined;
          if (itemData.donorId) {
              const donorRef = doc(firestore, 'accounts', accountId, 'donors', itemData.donorId);
              const donorSnap = await transaction.get(donorRef);
              if (donorSnap.exists()) {
                  donor = { id: donorSnap.id, ...donorSnap.data() } as Donor;
              }
          }

          const updatePayload: { [key: string]: any } = {
              sku: newSku || item.sku,
              name: itemData.name,
              description: itemData.description || "",
              estimatedValue: itemData.estimatedValue,
              category,
              categoryId: category.id,
              donor: donor === undefined ? deleteField() : (donor || null),
              donorId: itemData.donorId || deleteField(),
              lotId: (itemData.lotId && itemData.lotId !== 'none') ? itemData.lotId : deleteField(),
              ...(finalImageUrl !== undefined ? { imageUrl: finalImageUrl, thumbnailUrl: finalImageUrl } : (itemData.imageUrl === "" ? { imageUrl: deleteField(), thumbnailUrl: deleteField() } : {})),
          };

          transaction.update(itemRef, updatePayload);
      });

      toast({
        title: "Item Updated",
        description: `Changes to "${itemData.name}" were saved.`,
      });

    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
        throw error;
    }
  }, [firestore, accountId, storage, user, toast]);


  const deleteItemFromAuction = useCallback(async (auctionId: string, itemId: string) => {
    if (!firestore || !accountId || !storage) throw new Error("Firestore/Storage not available");

    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const itemDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);

    await runTransaction(firestore, async (transaction) => {
      const itemDoc = await transaction.get(itemDocRef);
      if (!itemDoc.exists()) throw new Error("Item not found");
      const itemData = itemDoc.data() as Item;

      if (itemData.winnerId) throw new Error("Cannot delete won items.");

      if (itemData.imageUrl) {
        await deleteFileByUrl(storage, itemData.imageUrl).catch(() => {});
      }

      transaction.delete(itemDocRef);
      transaction.update(auctionDocRef, { itemCount: increment(-1) });
    });
  }, [firestore, accountId, storage]);

  // ... rest of the file ...
  const addDonationToAuction = useCallback(async (auctionId: string, patron: Patron, amount: number, isPaid: boolean = false) => {
      if (!firestore || !accountId) throw new Error("Missing context");

      await runTransaction(firestore, async (transaction) => {
          const accountRef = doc(firestore, 'accounts', accountId);
          const accountSnap = await transaction.get(accountRef);
          if (!accountSnap.exists()) throw new Error("Account not found");
          const accountData = accountSnap.data() as Account;
          
          const newSku = `DON-${(accountData.lastItemSku || 999) + 1}`;

          const donationItem: Omit<Item, 'id'> = {
              name: "Donation",
              description: `Cash donation of ${amount}`,
              sku: newSku,
              estimatedValue: amount,
              winningBid: amount,
              winnerId: patron.id,
              winner: patron, 
              auctionId: auctionId,
              accountId: accountId,
              category: { id: "cat-donation", name: "Donation" },
              categoryId: "cat-donation",
              paid: isPaid,
              paymentMethod: isPaid ? 'Cash' : undefined,
          };

          const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
          const itemsColRef = collection(auctionDocRef, 'items');
          const newItemRef = doc(itemsColRef);

          transaction.set(newItemRef, donationItem);
          transaction.update(accountRef, { lastItemSku: (accountData.lastItemSku || 999) + 1 });
      });
  }, [firestore, accountId]);

  const addCategoryToAuction = useCallback(async (auctionId: string, category: Omit<Category, 'id'>) => {
    if (!firestore || !accountId) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const newCategory = { ...category, id: `cat-${Date.now()}` };
    await updateDoc(auctionDocRef, { categories: arrayUnion(newCategory) });
  }, [firestore, accountId]);

  const updateCategoryInAuction = useCallback(async (auctionId: string, updatedCategory: Category) => {
     if (!auctionsData || !firestore || !accountId) return;
     const auction = auctionsData.find(a => a.id === auctionId);
     if (!auction || !auction.categories) return;

     const oldCategory = auction.categories.find(c => c.id === updatedCategory.id);
     if (oldCategory) {
        const batch = writeBatch(firestore);
        const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
        batch.update(auctionDocRef, { categories: arrayRemove(oldCategory) });
        batch.update(auctionDocRef, { categories: arrayUnion(updatedCategory) });
        await batch.commit();
     }
  }, [firestore, accountId, auctionsData]);

  const deleteCategoryFromAuction = useCallback(async (auctionId: string, categoryId: string) => {
    if (!firestore || !accountId || !auctionsData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
        return;
    };

    const auction = auctionsData.find(a => a.id === auctionId);
    if (!auction) {
      toast({ variant: 'destructive', title: 'Error', description: 'Auction not found.' });
      return;
    }
    
    const categoryToDelete = auction.categories?.find(c => c.id === categoryId);
    if (!categoryToDelete) {
        toast({ variant: 'destructive', title: 'Error', description: 'Category not found.' });
        return;
    }

    // Check if any items are using this category
    const itemsInAuction = await fetchAuctionItems(firestore, accountId, auctionId);
    const isCategoryInUse = itemsInAuction.some(item => item.categoryId === categoryId);

    if (isCategoryInUse) {
      toast({
        variant: 'destructive',
        title: 'Cannot Delete Category',
        description: `"${categoryToDelete.name}" is in use by one or more items. Please reassign them to another category before deleting.`,
      });
      return;
    }

    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    await updateDoc(auctionDocRef, {
      categories: arrayRemove(categoryToDelete)
    });

    toast({
      title: 'Category Deleted',
      description: `"${categoryToDelete.name}" has been deleted successfully.`,
    });
  }, [firestore, accountId, auctionsData, toast]);

  const addLotToAuction = useCallback(async (auctionId: string, lotData: LotFormValues) => {
    if (!firestore || !accountId) return;
    const lotsColRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots');
    const newLot: Omit<Lot, 'id'> = { ...lotData, auctionId: auctionId, accountId: accountId };
    await addDoc(lotsColRef, newLot);
  }, [firestore, accountId]);
  
  const updateLotInAuction = useCallback(async (auctionId: string, lotId: string, values: LotFormValues) => {
    if (!firestore || !accountId) return;
    const lotDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots', lotId);
    await updateDoc(lotDocRef, values);
  }, [firestore, accountId]);
  
  const deleteLotFromAuction = useCallback(async (auctionId: string, lotId: string) => {
    if (!firestore || !accountId) return;
    const lotDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots', lotId);
    await deleteDoc(lotDocRef);
  }, [firestore, accountId]);

  const moveItemToLot = useCallback(async (auctionId: string, itemId: string, lotId: string) => {
    if (!firestore || !accountId) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
    await updateDoc(itemRef, { lotId: lotId });
  }, [firestore, accountId]);
  
    const getAuction = useCallback((auctionId: string): WithId<Auction> | undefined => {
        return auctionsData?.find(a => a.id === auctionId);
    }, [auctionsData]);
    
    const getAuctionItems = useCallback((auctionId: string) => {
        const itemsRef = useMemoFirebase(
            () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items') : null),
            [firestore, accountId, auctionId]
        );
        const { data: items, isLoading } = useCollection<Item>(itemsRef);
        return { items: items || [], isLoadingItems: isLoading };
    }, [firestore, accountId]);
    
    const getItem = useCallback((auctionId: string, itemId: string) => {
        const { items } = getAuctionItems(auctionId);
        return items?.find(i => i.id === itemId);
    }, [getAuctionItems]);

    const getAuctionLots = useCallback((auctionId: string) => {
        const lotsRef = useMemoFirebase(
            () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots') : null),
            [firestore, accountId, auctionId]
        );
        const { data: lots, isLoading } = useCollection<Lot>(lotsRef);
        return { lots: lots || [], isLoadingLots: isLoading };
    }, [firestore, accountId]);

    const getRegisteredPatrons = useCallback((auctionId: string) => {
        const ref = useMemoFirebase(
            () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons') : null),
            [firestore, accountId, auctionId]
        );
        const { data, isLoading } = useCollection<RegisteredPatron>(ref);
        return { registeredPatrons: data || [], isLoading };
    }, [firestore, accountId]);

    const unregisterPatronFromAuction = useCallback(async (auctionId: string, patronId: string, registrationDocId: string) => {
        if (!firestore || !accountId) throw new Error("Firestore not available");
        const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
        const q = query(itemsRef, where('winnerId', '==', patronId), limit(1));
        const wonItemsSnapshot = await getDocs(q);
        if (!wonItemsSnapshot.empty) throw new Error("Cannot unregister patron with won items.");
        const registrationRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons', registrationDocId);
        await deleteDoc(registrationRef);
    }, [firestore, accountId]);
    
  return { 
      auctions: auctionsData || EMPTY_AUCTIONS, 
      isLoading, addAuction, updateAuction, addItemToAuction, updateItemInAuction,
      deleteItemFromAuction, addCategoryToAuction, updateCategoryInAuction,
      deleteCategoryFromAuction, addDonationToAuction, getAuction, getAuctionItems, getItem,
      getRegisteredPatrons, addLotToAuction, getAuctionLots, moveItemToLot,
      updateLotInAuction, deleteLotFromAuction,
      unregisterPatronFromAuction,
 };
}

export const fetchAuctionItems = async (firestore: Firestore, accountId: string, auctionId: string): Promise<Item[]> => {
  const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
};

export const fetchRegisteredPatronsWithDetails = async (firestore: Firestore, accountId: string, auctionId: string): Promise<(Patron & { biddingNumber: number })[]> => {
  const registeredPatronsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons');
  const regSnapshot = await getDocs(registeredPatronsRef);
  const registeredPatrons = regSnapshot.docs.map(doc => doc.data() as RegisteredPatron);
  const patronIds = registeredPatrons.map(rp => rp.patronId);
  if (patronIds.length === 0) return [];
  const patronsRef = collection(firestore, 'accounts', accountId, 'patrons');
  // Firestore 'in' queries are limited to 30 items. We need to handle more.
  const patronChunks = [];
  for (let i = 0; i < patronIds.length; i += 30) {
      patronChunks.push(patronIds.slice(i, i + 30));
  }
  const patronPromises = patronChunks.map(chunk => getDocs(query(patronsRef, where(documentId(), 'in', chunk))));
  const patronSnapshots = await Promise.all(patronPromises);
  const allPatrons = patronSnapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patron)));

  const patronMap = new Map(allPatrons.map(p => [p.id, p]));
  return registeredPatrons.map(rp => {
    const p = patronMap.get(rp.patronId);
    return p ? { ...p, biddingNumber: rp.bidderNumber } : null;
  }).filter((p): p is (Patron & { biddingNumber: number }) => p !== null);
};
