
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
} from 'firebase/firestore';
import {
  useFirestore,
  useStorage,
  useCollection,
  useMemoFirebase,
  useUser,
  type WithId,
} from '@/firebase';
import type { Auction, Item, Category, ItemFormValues, RegisteredPatron, Account, Lot, LotFormValues, Patron, Donor } from '@/lib/types';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { uploadDataUriAndGetURL, deleteFileByUrl } from '@/firebase/storage';
import { useMemo, useCallback } from 'react';
import { useToast } from './use-toast';
import { useAccount } from './use-account';
import { FirebaseStorage } from 'firebase/storage';

async function _handleImageUpload(
  storage: FirebaseStorage,
  accountId: string,
  auctionId: string,
  newImageData: string | undefined, // from the form
  oldImageUrl: string | undefined // from the existing item
): Promise<{ newUrl: string | undefined, error: string | null }> {
  // Case 1: No change in image
  if (newImageData === oldImageUrl) {
    return { newUrl: oldImageUrl, error: null };
  }

  try {
    // Case 2: New image is being uploaded (it's a data URI)
    if (newImageData && newImageData.startsWith('data:')) {
      // If there was an old image, delete it first.
      if (oldImageUrl) {
        await deleteFileByUrl(storage, oldImageUrl);
      }
      const imagePath = `items/${accountId}/${auctionId}`;
      const uploadedUrl = await uploadDataUriAndGetURL(storage, newImageData, imagePath);
      return { newUrl: uploadedUrl, error: null };
    }

    // Case 3: Image is being removed
    if (!newImageData && oldImageUrl) {
      await deleteFileByUrl(storage, oldImageUrl);
      return { newUrl: undefined, error: null };
    }
    
    // Case 4: No image was present, and none is being added.
    return { newUrl: undefined, error: null };

  } catch (error: any) {
    console.error("Image handling failed:", error);
    return { newUrl: oldImageUrl, error: error.message || "Failed to process image." };
  }
}

export function useAuctions() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const auctionsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions') : null),
    [firestore, accountId]
  );
  const { data: auctionsData, isLoading } = useCollection<Auction>(auctionsRef);

  const addAuction = useCallback((auctionData: Omit<Auction, 'id' | 'itemCount' | 'items' | 'categories' | 'status' | 'accountId' | 'lots'> & { startDate: string }) => {
    if (!auctionsRef || !accountId) return;
    const newAuction: Omit<Auction, 'id'> = {
        ...auctionData,
        accountId: accountId,
        itemCount: 0,
        items: [],
        categories: [],
        lots: [],
        status: new Date(auctionData.startDate) > new Date() ? 'upcoming' : 'active',
    }
    addDocumentNonBlocking(auctionsRef, newAuction);
  }, [auctionsRef, accountId]);

  const updateAuction = useCallback((id: string, updatedAuction: Partial<Auction>) => {
    if (!firestore || !accountId) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', id);
    updateDocumentNonBlocking(auctionDocRef, updatedAuction);
  }, [firestore, accountId]);

  const addItemToAuction = useCallback(async (auctionId: string, itemData: ItemFormValues) => {
    if (!firestore || !accountId || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot add item: missing context.' });
        throw new Error('Missing context');
    }

    let imageUrl: string | undefined = undefined;
    try {
        if (itemData.imageUrl && itemData.imageUrl.startsWith('data:')) {
            const { newUrl, error } = await _handleImageUpload(storage, accountId, auctionId, itemData.imageUrl, undefined);
            if (error) {
                toast({ variant: 'destructive', title: 'Image Upload Failed', description: error });
            } else {
                imageUrl = newUrl;
            }
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Image Processing Error', description: e.message || 'Could not process the image file.' });
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
            const auctionSnap = await transaction.get(auctionRef);
            if (!auctionSnap.exists()) throw new Error("Auction not found");
            const auction = auctionSnap.data() as Auction;

            const accountRef = doc(firestore, 'accounts', accountId);
            const accountSnap = await transaction.get(accountRef);
            if (!accountSnap.exists()) throw new Error("Account not found");
            const accountData = accountSnap.data() as Account;
            
            const newSku = (accountData.lastItemSku || 999) + 1;
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
                lotId: itemData.lotId || undefined,
                donorId: itemData.donorId || undefined,
                sku: newSku,
                category,
                auctionId: auctionId,
                accountId: accountId,
                paid: false,
                donor: donor || undefined,
                categoryId: category.id,
                imageUrl: imageUrl,
                thumbnailUrl: imageUrl,
            };

            const itemsColRef = collection(auctionRef, 'items');
            const newItemRef = doc(itemsColRef); 

            transaction.set(newItemRef, newItemPayload);
            transaction.update(auctionRef, { itemCount: increment(1) });
            transaction.update(accountRef, { lastItemSku: newSku });
        });

        toast({
            title: "Item Added",
            description: `Successfully added "${itemData.name}" to the auction.`
        });
    } catch (error: any) {
        console.error("Failed to add item:", error);
        toast({
            variant: "destructive",
            title: "Error adding item",
            description: error.message || "Could not add the new item due to an unexpected error."
        });
        throw error;
    }
  }, [firestore, accountId, storage, toast]);


  const updateItemInAuction = useCallback(async (auctionId: string, itemId: string, item: Item, itemData: ItemFormValues) => {
    if (!firestore || !accountId || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot update item: missing context.' });
        throw new Error('Missing context');
    }

    let finalImageUrl: string | undefined = item.imageUrl;
    try {
        if (itemData.imageUrl !== item.imageUrl) {
            const { newUrl, error } = await _handleImageUpload(storage, accountId, auctionId, itemData.imageUrl, item.imageUrl);
            if (error) {
                toast({ variant: 'destructive', title: 'Image Update Failed', description: error });
            } else {
                finalImageUrl = newUrl;
            }
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Image Processing Error', description: e.message || 'Could not process the image file.' });
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
            const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
            
            const auctionSnap = await transaction.get(auctionRef);
            if (!auctionSnap.exists()) throw new Error("Auction not found");
            const auction = auctionSnap.data() as Auction;

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
                name: itemData.name,
                description: itemData.description || "",
                estimatedValue: itemData.estimatedValue,
                category,
                categoryId: category.id,
                imageUrl: finalImageUrl,
                thumbnailUrl: finalImageUrl,
                donor: donor === undefined ? deleteField() : (donor || null),
                donorId: itemData.donorId || deleteField(),
                lotId: (itemData.lotId && itemData.lotId !== 'none') ? itemData.lotId : deleteField(),
            };
            
            transaction.update(itemRef, updatePayload);
        });

        toast({
            title: "Item Updated",
            description: `Successfully updated "${itemData.name}".`
        });
    } catch (error: any) {
        console.error("Failed to update item:", error);
        toast({
            variant: "destructive",
            title: "Error Updating Item",
            description: error.message || "Could not update the item due to an unexpected error."
        });
        throw error;
    }
  }, [firestore, accountId, storage, toast]);


  const deleteItemFromAuction = useCallback(async (auctionId: string, itemId: string) => {
    if (!firestore || !accountId || !storage) throw new Error("Firestore/Storage not available");

    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const itemDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);

    await runTransaction(firestore, async (transaction) => {
      const itemDoc = await transaction.get(itemDocRef);
      if (!itemDoc.exists()) {
        throw new Error("Item not found");
      }
      const itemData = itemDoc.data() as Item;

      if (itemData.winningBidderId) {
        throw new Error("Cannot delete an item that has already been won.");
      }

      // Delete the image from storage if it exists
      if (itemData.imageUrl) {
        await deleteFileByUrl(storage, itemData.imageUrl).catch(err => console.error("Non-critical error: failed to delete image from storage:", err));
      }

      transaction.delete(itemDocRef);
      transaction.update(auctionDocRef, { itemCount: increment(-1) });
    });
  }, [firestore, accountId, storage]);

  const addDonationToAuction = useCallback(async (auctionId: string, patronId: string, amount: number, isPaid: boolean = false) => {
      if (!firestore || !accountId) {
          throw new Error("Firestore or account not available");
      }

      await runTransaction(firestore, async (transaction) => {
          const accountRef = doc(firestore, 'accounts', accountId);
          const accountSnap = await transaction.get(accountRef);
          if (!accountSnap.exists()) throw new Error("Account not found");
          const accountData = accountSnap.data() as Account;

          const patronRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
          const patronSnap = await transaction.get(patronRef);
          if (!patronSnap.exists()) throw new Error("Patron not found");
          const patronData = { id: patronSnap.id, ...patronSnap.data() } as Patron;
          
          const newSku = `DON-${(accountData.lastItemSku || 999) + 1}`;

          const donationItem: Omit<Item, 'id'> = {
              name: "Donation",
              description: `Cash donation of ${amount}`,
              sku: newSku,
              estimatedValue: amount,
              winningBid: amount,
              winningBidderId: patronId,
              winner: patronData, 
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

  const addCategoryToAuction = useCallback((auctionId: string, category: Omit<Category, 'id'>) => {
    if (!firestore || !accountId) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const newCategory = { ...category, id: `cat-${Date.now()}` };
    updateDocumentNonBlocking(auctionDocRef, {
        categories: arrayUnion(newCategory)
    });
  }, [firestore, accountId]);

  const updateCategoryInAuction = useCallback((auctionId: string, updatedCategory: Category) => {
     if (!auctionsData || !firestore || !accountId) return;
     const auction = auctionsData.find(a => a.id === auctionId);
     if (!auction || !auction.categories) return;

     const oldCategory = auction.categories.find(c => c.id === updatedCategory.id);
     
     if (oldCategory) {
        const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
        updateDocumentNonBlocking(auctionDocRef, { categories: arrayRemove(oldCategory) });
        updateDocumentNonBlocking(auctionDocRef, { categories: arrayUnion(updatedCategory) });
     }
  }, [firestore, accountId, auctionsData]);

  const addLotToAuction = useCallback((auctionId: string, lotData: LotFormValues) => {
    if (!firestore || !accountId) return;
    const lotsColRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots');
    const newLot: Omit<Lot, 'id'> = {
        ...lotData,
        auctionId: auctionId,
    };
    addDocumentNonBlocking(lotsColRef, newLot);
  }, [firestore, accountId]);

  const moveItemToLot = useCallback((auctionId: string, itemId: string, lotId: string) => {
    if (!firestore || !accountId) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
    updateDocumentNonBlocking(itemRef, { lotId: lotId });
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
        const q = query(itemsRef, where('winningBidderId', '==', patronId), limit(1));

        const wonItemsSnapshot = await getDocs(q);
        if (!wonItemsSnapshot.empty) {
            throw new Error("Cannot unregister a patron who has won items in this auction.");
        }
        
        const registrationRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons', registrationDocId);
        await deleteDoc(registrationRef);
    }, [firestore, accountId]);
    
  return { 
      auctions: auctionsData || [], 
      isLoading,
      addAuction, 
      updateAuction, 
      addItemToAuction,
      updateItemInAuction,
      deleteItemFromAuction,
      addCategoryToAuction, 
      updateCategoryInAuction,
      addDonationToAuction,
      getAuction,
      getAuctionItems,
      getItem,
      getRegisteredPatrons,
      addLotToAuction,
      getAuctionLots,
      moveItemToLot,
      unregisterPatronFromAuction,
 };
}

export const fetchAuctionItems = async (
  firestore: Firestore,
  accountId: string,
  auctionId: string
): Promise<Item[]> => {
  const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
};

export const fetchRegisteredPatronsWithDetails = async (
  firestore: Firestore,
  accountId: string,
  auctionId: string
): Promise<(Patron & { biddingNumber: number })[]> => {
  const registeredPatronsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons');
  const regSnapshot = await getDocs(registeredPatronsRef);
  const registeredPatrons = regSnapshot.docs.map(doc => doc.data() as RegisteredPatron);
  const patronIds = registeredPatrons.map(rp => rp.patronId);

  if (patronIds.length === 0) {
    return [];
  }

  const patronsRef = collection(firestore, 'accounts', accountId, 'patrons');
  const patronsSnapshot = await getDocs(patronsRef);
  const allPatrons = patronsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patron));
  const patronMap = new Map(allPatrons.map(p => [p.id, p]));

  const detailedPatrons = registeredPatrons.map(rp => {
    const patronDetails = patronMap.get(rp.patronId);
    if (!patronDetails) {
      return null;
    }
    return {
      ...patronDetails,
      biddingNumber: rp.bidderNumber,
    };
  }).filter((p): p is (Patron & { biddingNumber: number }) => p !== null);

  return detailedPatrons;
};
