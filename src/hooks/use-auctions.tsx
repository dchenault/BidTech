
'use client';
import {
  collection,
  doc,
  type DocumentData,
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
  type Firestore,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  type WithId,
} from '@/firebase';
import type { Auction, Item, Category, ItemFormValues, RegisteredPatron, Account, Lot, LotFormValues, Patron } from '@/lib/types';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useMemo, useCallback } from 'react';
import { useToast } from './use-toast';


export function useAuctions() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const accountId = 'account-1'; // This should be dynamically determined
  const { toast } = useToast();

  const auctionsRef = useMemoFirebase(
    () => (firestore && !isUserLoading && user ? collection(firestore, 'accounts', accountId, 'auctions') : null),
    [firestore, accountId, user, isUserLoading]
  );
  const { data: auctionsData, isLoading } = useCollection<Auction>(auctionsRef);

  const addAuction = useCallback((auctionData: Omit<Auction, 'id' | 'itemCount' | 'items' | 'categories' | 'status' | 'accountId' | 'lots'> & { startDate: string }) => {
    if (!auctionsRef) return;
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
    if (!firestore) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', id);
    updateDocumentNonBlocking(auctionDocRef, updatedAuction);
  }, [firestore, accountId]);

  const addItemToAuction = useCallback(async (auctionId: string, itemData: ItemFormValues) => {
    if (!firestore || !auctionsData) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const auction = auctionsData.find(a => a.id === auctionId);
            if (!auction) throw new Error("Auction not found");

            const accountRef = doc(firestore, 'accounts', accountId);
            const accountSnap = await transaction.get(accountRef);
            if (!accountSnap.exists()) throw new Error("Account not found");

            const accountData = accountSnap.data() as Account;
            const newSku = (accountData.lastItemSku || 999) + 1;

            const category = auction.categories.find(c => c.name === itemData.categoryId) || {id: 'cat-misc', name: 'Misc'};

            const newItem: { [key: string]: any } = {
                ...itemData,
                sku: newSku,
                category,
                categoryId: category.id,
                auctionId: auctionId,
                accountId: accountId,
                paid: false,
            };
            
            // Firestore transactions fail on `undefined` values. Clean the object.
            Object.keys(newItem).forEach(key => {
                if (newItem[key] === undefined) {
                    delete newItem[key];
                }
            });
            if (newItem.lotId === 'none' || newItem.lotId === '') {
                delete newItem.lotId;
            }


            const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
            const itemsColRef = collection(auctionDocRef, 'items');
            const newItemRef = doc(itemsColRef); // Create a new ref in the subcollection

            transaction.set(newItemRef, newItem);
            transaction.update(auctionDocRef, { itemCount: (auction.itemCount || 0) + 1 });
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
    }
}, [firestore, accountId, auctionsData, toast]);

  const deleteItemFromAuction = useCallback(async (auctionId: string, itemId: string) => {
    if (!firestore) throw new Error("Firestore not available");

    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const itemDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);

    await runTransaction(firestore, async (transaction) => {
      const itemDoc = await transaction.get(itemDocRef);
      if (!itemDoc.exists()) {
        throw new Error("Item not found");
      }
      if (itemDoc.data().winningBidderId) {
        throw new Error("Cannot delete an item that has already been won.");
      }

      transaction.delete(itemDocRef);
      transaction.update(auctionDocRef, { itemCount: increment(-1) });
    });
  }, [firestore, accountId]);

  const addDonationToAuction = useCallback(async (auctionId: string, patronId: string, amount: number, isPaid: boolean = false) => {
      if (!firestore) {
          throw new Error("Firestore not available");
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

          const donationItem = {
              name: "Donation",
              description: `Cash donation of ${amount}`,
              sku: newSku,
              estimatedValue: amount,
              winningBid: amount,
              winningBidderId: patronId,
              winner: patronData, // Embed patron data directly
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
    if (!firestore) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    const newCategory = { ...category, id: `cat-${Date.now()}` };
    updateDocumentNonBlocking(auctionDocRef, {
        categories: arrayUnion(newCategory)
    });
  }, [firestore, accountId]);

  const updateCategoryInAuction = useCallback((auctionId: string, updatedCategory: Category) => {
     if (!auctionsData || !firestore) return;
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
    if (!firestore) return;
    const lotsColRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots');
    const newLot: Omit<Lot, 'id'> = {
        ...lotData,
        auctionId: auctionId,
    };
    addDocumentNonBlocking(lotsColRef, newLot);
  }, [firestore, accountId]);

  const moveItemToLot = useCallback((auctionId: string, itemId: string, lotId: string) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
    updateDocumentNonBlocking(itemRef, { lotId: lotId });
  }, [firestore, accountId]);
  
    const getAuction = useCallback((auctionId: string): WithId<Auction> | undefined => {
        return auctionsData?.find(a => a.id === auctionId);
    }, [auctionsData]);
    
    const getAuctionItems = useCallback((auctionId: string) => {
        const itemsRef = useMemoFirebase(
            () => (firestore && !isUserLoading && user ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items') : null),
            [firestore, accountId, auctionId, user, isUserLoading]
        );
        const { data: items, isLoading } = useCollection<Item>(itemsRef);
        return { items: items || [], isLoadingItems: isLoading };
    }, [firestore, accountId, user, isUserLoading]);
    
    const getItem = useCallback((auctionId: string, itemId: string) => {
        const { items } = getAuctionItems(auctionId);
        return items?.find(i => i.id === itemId);
    }, [getAuctionItems]);

    const getAuctionLots = useCallback((auctionId: string) => {
        const lotsRef = useMemoFirebase(
            () => (firestore && !isUserLoading && user ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots') : null),
            [firestore, accountId, auctionId, user, isUserLoading]
        );
        const { data: lots, isLoading } = useCollection<Lot>(lotsRef);
        return { lots: lots || [], isLoadingLots: isLoading };
    }, [firestore, accountId, user, isUserLoading]);

    const getRegisteredPatrons = useCallback((auctionId: string) => {
        const ref = useMemoFirebase(
            () => (firestore ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons') : null),
            [firestore, accountId, auctionId]
        );
        const { data, isLoading } = useCollection<RegisteredPatron>(ref);
        return { registeredPatrons: data || [], isLoading };
    }, [firestore, accountId]);

    const unregisterPatronFromAuction = useCallback(async (auctionId: string, patronId: string, registrationDocId: string) => {
        if (!firestore) throw new Error("Firestore not available");

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
  auctionId: string
): Promise<Item[]> => {
  const accountId = 'account-1'; // This should be dynamically determined
  const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
};

export const fetchRegisteredPatronsWithDetails = async (
  firestore: Firestore,
  auctionId: string
): Promise<(Patron & { biddingNumber: number })[]> => {
  const accountId = 'account-1'; // This should be dynamically determined
  
  // 1. Get registered patron IDs for the auction
  const registeredPatronsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons');
  const regSnapshot = await getDocs(registeredPatronsRef);
  const registeredPatrons = regSnapshot.docs.map(doc => doc.data() as RegisteredPatron);
  const patronIds = registeredPatrons.map(rp => rp.patronId);

  if (patronIds.length === 0) {
    return [];
  }

  // 2. Fetch all patron documents from the master list
  const patronsRef = collection(firestore, 'accounts', accountId, 'patrons');
  const patronsSnapshot = await getDocs(patronsRef);
  const allPatrons = patronsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patron));
  const patronMap = new Map(allPatrons.map(p => [p.id, p]));

  // 3. Map registered patron data to full patron details
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
    