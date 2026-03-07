
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Pencil, Power, PowerOff, Search, Trash2, HeartHandshake, Image as ImageIcon, ArrowUp, ArrowDown, Share2, Copy, Gavel, Upload, Loader2, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuctions } from '@/hooks/use-auctions';
import { useState, useMemo } from 'react';
import type { Item, Patron, ItemFormValues, Category, CategoryFormValues, RegisteredPatron, Lot, Auction } from '@/lib/types';
import { EnterWinningBidDialog } from '@/components/enter-winning-bid-dialog';
import { EditItemDialog } from '@/components/edit-item-dialog';
import { AddItemDialog } from '@/components/add-item-dialog';
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { usePatrons } from '@/hooks/use-patrons';
import { doc, collection, addDoc, updateDoc, serverTimestamp, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { RegisterPatronDialog } from '@/components/register-patron-dialog';
import { AddLotDialog } from '@/components/add-lot-dialog';
import { exportAuctionCatalogToHTML } from '@/lib/export';
import { AuctionCatalog } from '@/components/auction-catalog';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAccount } from '@/hooks/use-account';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditLotDialog } from '@/components/edit-lot-dialog';
import { AddAuctionDonationDialog } from '@/components/add-auction-donation-dialog';
import { ImportItemsCsvDialog } from '@/components/import-items-csv-dialog';

export default function AuctionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { searchQuery, setSearchQuery } = useSearch();
  const { accountId, isLoading: isAccountLoading } = useAccount();
  const { toast } = useToast();

  const { getAuction, getAuctionItems, getAuctionLots, addItemToAuction, updateItemInAuction, addCategoryToAuction, updateCategoryInAuction, deleteCategoryFromAuction, addLotToAuction, updateLotInAuction, deleteLotFromAuction, updateAuction, deleteItemFromAuction, unregisterPatronFromAuction, addDonationToAuction } = useAuctions();
  const { patrons, addPatron, isLoading: isLoadingPatrons } = usePatrons();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isWinningBidDialogOpen, setIsWinningBidDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddDonationDialogOpen, setIsAddDonationDialogOpen] = useState(false);
  const [isImportItemsDialogOpen, setIsImportItemsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddLotDialogOpen, setIsAddLotDialogOpen] = useState(false);
  const [lotToEdit, setLotToEdit] = useState<Lot | null>(null);
  const [lotToDelete, setLotToDelete] = useState<Lot | null>(null);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);


  const [isRegisterPatronDialogOpen, setIsRegisterPatronDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'sku', direction: 'ascending' });
  const [patronSortConfig, setPatronSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'biddingNumber', direction: 'ascending' });
  
  const auctionId = typeof params.id === 'string' ? params.id : '';
  
  const auction = getAuction(auctionId);
  const { items, isLoadingItems } = getAuctionItems(auctionId);
  const { lots, isLoadingLots } = getAuctionLots(auctionId);

  const staffRef = useMemoFirebase(
    () => (firestore && accountId && auctionId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff') : null),
    [firestore, accountId, auctionId]
  );
  const { data: staffData, isLoading: isLoadingStaff } = useCollection(staffRef);

  const registeredPatronsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons') : null),
    [firestore, accountId, auctionId]
  );
  const { data: registeredPatronsData, isLoading: isLoadingRegisteredPatrons } = useCollection<RegisteredPatron>(registeredPatronsRef);

  const searchedItems = useMemo(() => {
    if (!items) return [];
    const actualItems = items.filter((item: Item) => !item.sku.toString().startsWith('DON-'));

    if (!searchQuery) return actualItems;
    
    return actualItems.filter((item: Item) => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.sku.toString().includes(searchQuery)
    );
  }, [items, searchQuery]);

  const sortedAndSearchedItems = useMemo(() => {
    let sortableItems = [...searchedItems];
    if (sortConfig) {
      sortableItems.sort((a: Item, b: Item) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'sku':
            const res = a.sku.toString().localeCompare(b.sku.toString(), undefined, { numeric: true, sensitivity: 'base' });
            return sortConfig.direction === 'ascending' ? res : -res;
          case 'winner':
            aValue = a.winner ? `${a.winner.firstName} ${a.winner.lastName}`.toLowerCase() : '';
            bValue = b.winner ? `${b.winner.firstName} ${b.winner.lastName}`.toLowerCase() : '';
            break;
          case 'category':
            aValue = a.category?.name.toLowerCase() || '';
            bValue = b.category?.name.toLowerCase() || '';
            break;
          default:
            aValue = a[sortConfig.key as keyof Item];
            bValue = b[sortConfig.key as keyof Item];
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        }

        aValue = aValue ?? (typeof aValue === 'number' ? 0 : '');
        bValue = bValue ?? (typeof bValue === 'number' ? 0 : '');

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [searchedItems, sortConfig]);

  const searchedDonations = useMemo(() => {
      if (!items) return [];
      const donations = items.filter((item: Item) => item.sku.toString().startsWith('DON-'));

      if (!searchQuery) return donations;

      return donations.filter((item: Item) =>
          item.winner?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.winner?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toString().includes(searchQuery)
      );
  }, [items, searchQuery]);

  const { liveItems, silentItemsByLot } = useMemo(() => {
    if (!sortedAndSearchedItems) return { liveItems: [], silentItemsByLot: new Map() };
    const liveItems = sortedAndSearchedItems.filter((item: Item) => !item.lotId);
    const silentItemsByLot = sortedAndSearchedItems
        .filter((item: Item) => item.lotId)
        .reduce((acc, item: Item) => {
            if (!item.lotId) return acc;
            if (!acc.has(item.lotId)) {
                acc.set(item.lotId, []);
            }
            acc.get(item.lotId)!.push(item);
            return acc;
        }, new Map<string, Item[]>());

    return { liveItems, silentItemsByLot };
  }, [sortedAndSearchedItems]);


  const registeredPatronsWithDetails: (Patron & { 
      registeredPatronDocId: string; 
      biddingNumber: number;
      itemsWonInAuction: number;
      amountDueInAuction: number;
      paymentStatus: 'Paid' | 'Unpaid' | 'N/A';
  })[] = useMemo(() => {
    if (!registeredPatronsData || isLoadingPatrons || isLoadingItems) return [];
    
    let results = registeredPatronsData
      .map(rp => {
        const patronDetails = patrons.find(p => p.id === rp.patronId);
        if (!patronDetails) return null;
        
        const wonItems = items.filter(i => i.winnerId === rp.patronId && !i.sku.toString().startsWith('DON-'));
        const unpaidItems = wonItems.filter(i => !i.paid);
        const amountDue = unpaidItems.reduce((sum, i) => sum + (i.winningBid || 0), 0);
        
        let paymentStatus: 'Paid' | 'Unpaid' | 'N/A' = 'N/A';
        if (wonItems.length > 0) {
            paymentStatus = unpaidItems.length === 0 ? 'Paid' : 'Unpaid';
        }

        return {
          ...patronDetails,
          accountId: patronDetails.accountId,
          registeredPatronDocId: rp.id,
          biddingNumber: rp.bidderNumber,
          itemsWonInAuction: wonItems.length,
          amountDueInAuction: amountDue,
          paymentStatus: paymentStatus,
        };
      })
      .filter((p): p is any => p !== null);

    if (patronSortConfig) {
        results.sort((a, b) => {
            let res = 0;
            switch(patronSortConfig.key) {
                case 'biddingNumber':
                    res = a.biddingNumber - b.biddingNumber;
                    break;
                case 'firstName':
                    res = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                    break;
                case 'itemsWonInAuction':
                    res = a.itemsWonInAuction - b.itemsWonInAuction;
                    break;
                case 'amountDueInAuction':
                    res = a.amountDueInAuction - b.amountDueInAuction;
                    break;
                default:
                    res = 0;
            }
            return patronSortConfig.direction === 'ascending' ? res : -res;
        });
    }

    return results;
  }, [registeredPatronsData, patrons, items, isLoadingPatrons, isLoadingItems, patronSortConfig]);


  const filteredRegisteredPatrons = useMemo(() => {
    if (!searchQuery) return registeredPatronsWithDetails;
    return registeredPatronsWithDetails.filter((p: Patron & {biddingNumber: number}) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.biddingNumber?.toString().includes(searchQuery)
    );
  }, [registeredPatronsWithDetails, searchQuery]);

  const isLoading = isLoadingItems || isLoadingLots || isLoadingPatrons || isLoadingRegisteredPatrons || isAccountLoading;

  if (isLoading) {
    return <div>Loading auction...</div>;
  }
  
  if (!auction) {
    return <div>Loading auction details...</div>;
  }
  
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const requestPatronSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (patronSortConfig && patronSortConfig.key === key && patronSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setPatronSortConfig({ key, direction });
  };

  const handleToggleAuctionStatus = () => {
    if (!auction) return;
    const newStatus = auction.status === 'completed' ? 'active' : 'completed';
    updateAuction(auction.id, { status: newStatus });
  };

  const handleExportCatalog = () => {
    if (!auction || !items) return;
    setIsExporting(true);
    // Simulate generation delay for user feedback
    setTimeout(() => {
        exportAuctionCatalogToHTML({ ...auction, items, lots });
        setIsExporting(false);
        toast({
            title: 'Catalog Generated',
            description: 'The print-ready catalog has been opened in a new tab.'
        });
    }, 1000);
  };

  const handleShareCatalog = () => {
    if (!auction.isPublic || !auction.slug) {
        toast({ variant: 'destructive', title: 'Catalog is not public.'});
        return;
    }
    const url = `${window.location.origin}/catalog/${auction.accountId}/${auction.slug}`;
    navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Public Link Passed!', description: 'The link to the public catalog has been copied to your clipboard.'});
    }).catch(err => {
        toast({ variant: 'destructive', title: 'Failed to Copy Link'});
        console.error('Failed to copy: ', err);
    });
  }

  const handleCopyStaffLoginLink = () => {
    if (!auctionId || !accountId) return;
    const url = `${window.location.origin}/staff-login/${accountId}/${auctionId}`;
    navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Staff Login Link Copied!', description: 'Share this public login link with your on-site staff.'});
    }).catch(err => {
        toast({ variant: 'destructive', title: 'Failed to Copy Link'});
        console.error('Failed to copy staff login link: ', err);
    });
  };

  const handleAddStaff = async () => {
    const username = newStaffUsername.trim().toLowerCase();
    if (!username) {
        toast({ variant: 'destructive', title: 'Username required' });
        return;
    }
    if (!staffRef) {
        toast({ variant: 'destructive', title: 'Database error' });
        return;
    }

    const newStaffDocRef = doc(staffRef, username);
    const docSnap = await getDoc(newStaffDocRef);
    if(docSnap.exists()){
      toast({ variant: 'destructive', title: 'Username already exists' });
      return;
    }

    await setDoc(newStaffDocRef, {});
    toast({ title: 'Staff Added', description: `Username "${username}" can now log in.` });
    setNewStaffUsername("");
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete || !staffRef) return;
    await deleteDoc(doc(staffRef, staffToDelete));
    toast({ title: 'Staff Removed', description: `Username "${staffToDelete}" has been removed.` });
    setStaffToDelete(null);
  };

  const handleOpenWinningBidDialog = (item: Item) => {
    setSelectedItem(item);
    setIsWinningBidDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItemFromAuction(auction.id, itemToDelete.id);
      toast({
        title: itemToDelete.sku.toString().startsWith('DON-') ? "Donation Deleted" : "Item Deleted",
        description: `"${itemToDelete.name}" has been successfully deleted.`
      });
      setItemToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting",
        description: error.message || "An unexpected error occurred."
      });
    }
  };

  const handleOpenEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsEditCategoryDialogOpen(true);
  }

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete || !auction) return;
    await deleteCategoryFromAuction(auction.id, categoryToDelete.id);
    setCategoryToDelete(null);
  };

  const handleWinningBidSubmit = async (winningBid: number, winner: Patron) => {
    if (!auction || !selectedItem || !firestore || !accountId || !user) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auction.id, 'items', selectedItem.id);
    
    try {
      const payload: { [key: string]: any } = { 
        winningBid: winningBid, 
        winnerId: winner.id, 
        winner: winner,
        metadata: {
            updatedBy: user?.email || 'Unknown User',
            updatedAt: serverTimestamp()
        }
      };
      await updateDoc(itemRef, payload);
      setIsWinningBidDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error submitting winning bid:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the winning bid. Please try again.'
      });
    }
  };

  const handleItemUpdate = async (updatedItemData: ItemFormValues) => {
    if (!auction || !selectedItem) return;
    await updateItemInAuction(auction.id, selectedItem.id, selectedItem, updatedItemData);
  }

  const handleItemAdd = async (newItemData: ItemFormValues) => {
    if (!auction) return;
    await addItemToAuction(auction.id, newItemData);
  }

  const handleAddDonation = async (amount: number, patron: Patron) => {
    if (!auctionId || !patron.id) return;
    try {
      // For donations added in-auction, we assume they are paid immediately (cash/check).
      await addDonationToAuction(auctionId, patron, amount, true);
      // toast is handled inside the dialog
      setIsAddDonationDialogOpen(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to record donation."
      })
    }
  }

  const handleAddCategory = (values: CategoryFormValues) => {
    if (!auction) return;
    addCategoryToAuction(auction.id, { name: values.name });
    setIsAddCategoryDialogOpen(false);
  }
  
  const handleUpdateCategory = (values: CategoryFormValues) => {
    if (!auction || !selectedCategory) return;
    updateCategoryInAuction(auction.id, { ...selectedCategory, name: values.name });
    setIsEditCategoryDialogOpen(false);
    setSelectedCategory(null);
  }

  const handleAddLot = (values: { name: string, closingDate?: Date }) => {
    if (!auction) return;
    addLotToAuction(auction.id, values);
    setIsAddLotDialogOpen(false);
  }
  
  const handleUpdateLot = (values: { name: string, closingDate?: Date }) => {
    if (!lotToEdit) return;
    updateLotInAuction(auctionId, lotToEdit.id, values);
    toast({ title: 'Lot Updated', description: `Lot "${values.name}" has been updated.` });
    setLotToEdit(null);
  };

  const handleConfirmDeleteLot = () => {
    if (!lotToDelete) return;
    deleteLotFromAuction(auctionId, lotToDelete.id);
    toast({ title: 'Lot Deleted', description: `Lot "${lotToDelete.name}" has been deleted.` });
    setLotToDelete(null);
  };


  const handleRegisterPatron = async (patron: Patron, bidderNumber: number) => {
    if (!registeredPatronsRef || !accountId || !user) return;

    const newRegistrationData: Omit<RegisteredPatron, 'id'> = {
      accountId: accountId,
      auctionId: auctionId,
      patronId: patron.id,
      bidderNumber: bidderNumber,
      metadata: {
        updatedBy: user.email || 'Unknown User',
        updatedAt: serverTimestamp()
      }
    };
    
    await addDoc(registeredPatronsRef, newRegistrationData);
    setIsRegisterPatronDialogOpen(false);
  };
  
    const handleUnregisterPatron = async (patron: Patron & { registeredPatronDocId: string }) => {
        try {
            await unregisterPatronFromAuction(auctionId, patron.id, patron.registeredPatronDocId);
            toast({
                title: 'Patron Unregistered',
                description: `${patron.firstName} ${patron.lastName} has been removed from this auction.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        }
    };
    
    const ItemsTable = ({ itemsToRender }: { itemsToRender: Item[] }) => (
      <>
        {isLoadingItems ? (
          <div className="text-center text-muted-foreground py-8">Loading items...</div>
        ) : itemsToRender.length > 0 ? (
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="hidden sm:table-cell w-[80px]">Image</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('sku')} className="-ml-4 h-8">
                        SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </Button>
                </TableHead>
                <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('name')} className="-ml-4 h-8">
                        Name {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('category')} className="-ml-4 h-8">
                        Category {sortConfig?.key === 'category' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                      <Button variant="ghost" onClick={() => requestSort('winningBid')} className="-ml-4 h-8">
                        Winning Bid {sortConfig?.key === 'winningBid' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('winner')} className="-ml-4 h-8">
                        Winner {sortConfig?.key === 'winner' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {itemsToRender.map((item: Item) => (
                <TableRow 
                    key={item.id}
                    onClick={() => router.push(`/dashboard/auctions/${auction.id}/items/${item.id}`)}
                    className="cursor-pointer"
                >
                  <TableCell className="hidden sm:table-cell">
                    <div className="relative h-16 w-16 bg-muted rounded-md flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <Image
                          alt={item.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={item.thumbnailUrl}
                          width="64"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                <TableCell className="font-mono text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="font-medium">
                    {item.name}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{item.category.name}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                    {item.winningBid ? formatCurrency(item.winningBid) : 'N/A'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                    {item.winner ? `${item.winner.firstName} ${item.winner.lastName}` : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                    {item.winningBid ? (
                        <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-8 w-24"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWinningBidDialog(item);
                            }}
                        >
                            Edit Bid
                        </Button>
                    ) : (
                        <Button 
                            size="sm" 
                            className="h-8 w-24 bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWinningBidDialog(item);
                            }}
                        >
                            Winning Bid
                        </Button>
                    )}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        ) : (
        <div className="text-center text-muted-foreground py-8">
            No items found{searchQuery && ` for "${searchQuery}"`}.
        </div>
        )}
      </>
    );

  const renderLiveAuctionView = () => (
    <Card>
        <CardHeader>
            <CardTitle>Auction Items</CardTitle>
            <CardDescription>Manage the items for this auction.</CardDescription>
        </CardHeader>
        <CardContent>
            <ItemsTable itemsToRender={sortedAndSearchedItems} />
        </CardContent>
    </Card>
  );

  const renderSilentAuctionView = () => (
    <div className="space-y-6">
      {isLoadingLots ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">Loading lots...</CardContent>
        </Card>
      ) : lots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Items</CardTitle>
            <CardDescription>Manage all items for this silent auction.</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemsTable itemsToRender={sortedAndSearchedItems} />
          </CardContent>
        </Card>
      ) : (
        <>
          {lots.map((lot: Lot) => {
            const lotItems = silentItemsByLot.get(lot.id) || [];
            const hasItems = lotItems.length > 0;
            return (
              <Card key={lot.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{lot.name}</CardTitle>
                    {lot.closingDate && (
                      <CardDescription>
                          Closes: {new Date(lot.closingDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </CardDescription>
                    )}
                    <CardDescription>
                      {hasItems ? `${lotItems.length} item(s) in this lot.` : 'This lot is empty.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setLotToEdit(lot)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Lot</span>
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <Button variant="destructive" size="icon" disabled={hasItems} onClick={() => setLotToDelete(lot)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete Lot</span>
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {hasItems && (
                          <TooltipContent>
                            <p>Cannot delete a lot with items. Unassign items first.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasItems ? (
                    <ItemsTable itemsToRender={lotItems} />
                  ) : (
                    <div className="text-center text-muted-foreground py-8">This lot has no items.</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {liveItems.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Unassigned Items</CardTitle>
                <CardDescription>These items have not been assigned to a lot yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <ItemsTable itemsToRender={liveItems} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  const renderHybridAuctionView = () => (
    <Tabs defaultValue="live">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="live">Live Items</TabsTrigger>
          <TabsTrigger value="silent">Silent Items</TabsTrigger>
        </TabsList>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items by SKU, name, or description..."
          className="w-full rounded-lg bg-background pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <TabsContent value="live" className="mt-4">
        <Card>
            <CardHeader>
                <CardTitle>Live Auction Items</CardTitle>
                <CardDescription>Items to be auctioned live.</CardDescription>
            </CardHeader>
            <CardContent>
                <ItemsTable itemsToRender={liveItems} />
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="silent" className="mt-4 space-y-6">
        {isLoadingLots ? (
          <Card><CardContent className="text-center text-muted-foreground py-8">Loading lots...</CardContent></Card>
        ) : lots.length > 0 ? (
          <>
            {lots.map((lot: Lot) => {
              const lotItems = silentItemsByLot.get(lot.id) || [];
              const hasItems = lotItems.length > 0;
              return (
                <Card key={lot.id}>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>{lot.name}</CardTitle>
                      {lot.closingDate && (
                        <CardDescription>
                            Closes: {new Date(lot.closingDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </CardDescription>
                      )}
                      <CardDescription>
                        {hasItems ? `${lotItems.length} item(s) in this lot.` : 'This lot is empty.'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="icon" onClick={() => setLotToEdit(lot)}>
                         <Pencil className="h-4 w-4" />
                         <span className="sr-only">Edit Lot</span>
                       </Button>
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <span tabIndex={0}>
                               <Button variant="destructive" size="icon" disabled={hasItems} onClick={() => setLotToDelete(lot)}>
                                 <Trash2 className="h-4 w-4" />
                                 <span className="sr-only">Delete Lot</span>
                               </Button>
                             </span>
                           </TooltipTrigger>
                           {hasItems && (
                             <TooltipContent>
                               <p>Cannot delete lot with items. Unassign items first.</p>
                             </TooltipContent>
                           )}
                         </Tooltip>
                       </TooltipProvider>
                     </div>
                  </CardHeader>
                  <CardContent>
                    {hasItems ? (
                      <ItemsTable itemsToRender={lotItems} />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">This lot has no items.</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8 border rounded-lg">
            <p>No silent lots have been created yet.</p>
            <Button variant="link" onClick={() => setIsAddLotDialogOpen(true)}>Create the first lot</Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  const renderAuctionContent = () => {
    switch (auction.type) {
      case 'Silent':
        return renderSilentAuctionView();
      case 'Hybrid':
        return renderHybridAuctionView();
      case 'Live':
      default:
        return renderLiveAuctionView();
    }
  }

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{auction.name}</h1>
                <p className="text-muted-foreground">{auction.description}</p>
            </div>
             <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <Button 
                        size="sm"
                        variant={auction.status === 'completed' ? 'default' : 'destructive'}
                        onClick={handleToggleAuctionStatus}
                    >
                        {auction.status === 'completed' ? (
                            <Power className="mr-2 h-3.5 w-3.5" />
                        ) : (
                            <PowerOff className="mr-2 h-3.5 w-3.5" />
                        )}
                        {auction.status === 'completed' ? 'Re-open Auction' : 'Close Auction'}
                    </Button>
                     {auction.isPublic && (
                        <Button size="sm" variant="outline" onClick={handleShareCatalog}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Catalog
                        </Button>
                    )}
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleExportCatalog}
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? 'Generating...' : 'Export Catalog'}
                    </Button>
                    {(auction.type === 'Silent' || auction.type === 'Hybrid') && (
                        <Button size="sm" variant="outline" onClick={() => setIsAddLotDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Lot
                        </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setIsImportItemsDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Items
                    </Button>
                    <Button size="sm" onClick={() => setIsAddItemDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Item
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="items">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="donations">Donations</TabsTrigger>
                    <TabsTrigger value="patrons">Patrons</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="items" className="mt-4 space-y-4">
                 {auction.type !== 'Hybrid' && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search items by SKU, name, or description..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                 )}
                {renderAuctionContent()}
            </TabsContent>
              <TabsContent value="donations" className="space-y-4">
                  <Card>
                      <CardHeader className="flex-row items-center justify-between">
                          <div>
                              <CardTitle>Donations</CardTitle>
                              <CardDescription>Cash donations made during this auction.</CardDescription>
                          </div>
                          <Button size="sm" onClick={() => setIsAddDonationDialogOpen(true)}>
                              <HeartHandshake className="mr-2 h-4 w-4" />
                              Add Donation
                          </Button>
                      </CardHeader>
                      <CardContent>
                          <div className="relative pb-4">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                  type="search"
                                  placeholder="Search donations by patron name or SKU..."
                                  className="w-full rounded-lg bg-background pl-8"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                              />
                          </div>
                          {isLoadingItems ? (
                              <div className="text-center text-muted-foreground py-8">Loading donations...</div>
                          ) : searchedDonations.length > 0 ? (
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Patron</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>SKU</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {searchedDonations.map((donation: Item) => (
                                          <TableRow 
                                              key={donation.id}
                                              onClick={() => donation.winner?.id && router.push(`/dashboard/patrons/${donation.winner.id}`)}
                                              className={cn(donation.winner?.id && "cursor-pointer")}
                                          >
                                              <TableCell>
                                                  <div className="flex items-center gap-3">
                                                      <Avatar className="hidden h-9 w-9 sm:flex">
                                                          <AvatarImage src={donation.winner?.avatarUrl} alt="Avatar" />
                                                          <AvatarFallback>{donation.winner?.firstName?.charAt(0)}{donation.winner?.lastName?.charAt(0)}</AvatarFallback>
                                                      </Avatar>
                                                      <div className="grid gap-0.5">
                                                          <p className="font-medium">
                                                              {donation.winner?.firstName} {donation.winner?.lastName}
                                                          </p>
                                                          <p className="text-xs text-muted-foreground">{donation.winner?.email}</p>
                                                      </div>
                                                  </div>
                                              </TableCell>
                                              <TableCell className="font-medium text-green-600">{formatCurrency(donation.winningBid || 0)}</TableCell>
                                              <TableCell className="font-mono text-muted-foreground">{donation.sku}</TableCell>
                                              <TableCell className="text-right">
                                                  <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          setItemToDelete(donation);
                                                      }}
                                                  >
                                                      <Trash2 className="h-4 w-4" />
                                                      <span className="sr-only">Delete Donation</span>
                                                  </Button>
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          ) : (
                              <div className="text-center text-muted-foreground py-8">
                                  No donations found{searchQuery && ` for "${searchQuery}"`}.
                              </div>
                          )}
                      </CardContent>
                  </Card>
              </TabsContent>
            <TabsContent value="patrons" className="space-y-4">
                <Card>
                <CardHeader className='flex-row items-center justify-between'>
                    <div>
                    <CardTitle>Registered Patrons</CardTitle>
                    <CardDescription>Patrons registered for this auction.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsRegisterPatronDialogOpen(true)}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Register Patron
                        </span>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="relative pb-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search patrons by name, email, or bidding number..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isLoadingRegisteredPatrons ? (
                        <div className="text-center text-muted-foreground py-8">Loading registered patrons...</div>
                    ) : filteredRegisteredPatrons.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestPatronSort('biddingNumber')} className="-ml-4 h-8">
                                    # {patronSortConfig?.key === 'biddingNumber' && (patronSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestPatronSort('firstName')} className="-ml-4 h-8">
                                    Name {patronSortConfig?.key === 'firstName' && (patronSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                                </Button>
                            </TableHead>
                            <TableHead className="hidden md:table-cell text-center">
                                <Button variant="ghost" onClick={() => requestPatronSort('itemsWonInAuction')} className="h-8">
                                    Items Won {patronSortConfig?.key === 'itemsWonInAuction' && (patronSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                                </Button>
                            </TableHead>
                            <TableHead className="hidden lg:table-cell text-right">
                                <Button variant="ghost" onClick={() => requestPatronSort('amountDueInAuction')} className="h-8">
                                    Amount Due {patronSortConfig?.key === 'amountDueInAuction' && (patronSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                                </Button>
                            </TableHead>
                            <TableHead className="hidden lg:table-cell text-center">Payment Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredRegisteredPatrons.map((patron: any) => (
                            <TableRow 
                                key={patron.id}
                                onClick={() => router.push(`/dashboard/patrons/${patron.id}`)}
                                className="cursor-pointer"
                            >
                            <TableCell className="font-medium">{patron.biddingNumber}</TableCell>
                            <TableCell className="font-medium">
                                {patron.firstName} {patron.lastName}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-center">{patron.itemsWonInAuction}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right">{formatCurrency(patron.amountDueInAuction)}</TableCell>
                             <TableCell className="hidden lg:table-cell text-center">
                                {patron.notes && patron.notes.trim() !== '' ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center justify-center gap-1 cursor-help">
                                                    <Badge variant={patron.paymentStatus === 'Paid' ? 'secondary' : patron.paymentStatus === 'Unpaid' ? 'destructive' : 'outline'} className="capitalize">
                                                        {patron.paymentStatus}
                                                    </Badge>
                                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p className="text-xs font-bold mb-1 border-b pb-1">Patron Notes</p>
                                                <p className="text-xs">{patron.notes}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <Badge variant={patron.paymentStatus === 'Paid' ? 'secondary' : patron.paymentStatus === 'Unpaid' ? 'destructive' : 'outline'} className="capitalize">
                                        {patron.paymentStatus}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); handleUnregisterPatron(patron); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Patron</span>
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    ) : (
                    <div className="text-center text-muted-foreground py-8">
                        No patrons found{searchQuery && ` for "${searchQuery}"`}.
                    </div>
                    )}
                </CardContent>
                </Card>
            </TabsContent>
              <TabsContent value="settings">
                  <div className="grid gap-6">
                      <Card>
                          <CardHeader className="flex items-center justify-between">
                              <div>
                                  <CardTitle className="text-xl">Item Categories</CardTitle>
                                  <CardDescription>Manage the categories for items in this auction.</CardDescription>
                              </div>
                              <Button size="sm" onClick={() => setIsAddCategoryDialogOpen(true)}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                              </Button>
                          </CardHeader>
                          <CardContent>
                              <Table>
                              <TableHeader>
                                  <TableRow>
                                  <TableHead>Category Name</TableHead>
                                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {auction.categories?.map((category: Category) => (
                                  <TableRow key={category.id}>
                                      <TableCell className="font-medium">{category.name}</TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditCategoryDialog(category)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setCategoryToDelete(category)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete Category</span>
                                        </Button>
                                      </TableCell>
                                  </TableRow>
                                  ))}
                              </TableBody>
                              </Table>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-xl">Public Online Catalog</CardTitle>
                              <CardDescription>Manage and share the public URL for your auction catalog.</CardDescription>
                          </CardHeader>
                          <CardContent>
                              {auction.isPublic && auction.slug ? (
                                  <div className="space-y-4">
                                      <p className="text-sm text-muted-foreground">
                                          Your public catalog is live. Share this link with potential bidders.
                                      </p>
                                      <div className="flex w-full items-center space-x-2">
                                          <Input
                                              id="public-url"
                                              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/${auction.accountId}/${auction.slug}`}
                                              readOnly
                                          />
                                          <Button type="button" onClick={handleShareCatalog}>
                                              <Copy className="mr-2 h-4 w-4" />
                                              Copy Link
                                          </Button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-sm text-muted-foreground">
                                      This auction's catalog is private. To generate a shareable public link,
                                      edit the auction and enable the "Make Catalog Public" option.
                                  </div>
                              )}
                          </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Staff Management</CardTitle>
                            <CardDescription>Add or remove staff usernames for this auction. Share the login link for on-site access.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex w-full items-center space-x-2">
                                    <Input
                                        id="staff-login-url"
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/staff-login/${accountId}/${auctionId}`}
                                        readOnly
                                    />
                                    <Button type="button" onClick={handleCopyStaffLoginLink}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Staff Login Link
                                    </Button>
                                </div>
                            </div>
                             <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Enter new staff username"
                                        value={newStaffUsername}
                                        onChange={(e) => setNewStaffUsername(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
                                    />
                                    <Button onClick={handleAddStaff}>Add Staff</Button>
                                </div>
                                {isLoadingStaff ? (
                                    <p className="text-sm text-muted-foreground">Loading staff...</p>
                                ) : (staffData && staffData.length > 0) ? (
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Username</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {staffData.map(staff => (
                                                <TableRow key={staff.id}>
                                                    <TableCell className="font-medium">{staff.id}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setStaffToDelete(staff.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                     </Table>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No staff members have been added to this auction yet.</p>
                                )}
                            </div>
                        </CardContent>
                      </Card>
                  </div>
              </TabsContent>
            </Tabs>
        </div>
      </div>
      <div className="hidden print:block">
        {auction && <AuctionCatalog auction={{...auction, items, lots}} />}
      </div>

      <AddItemDialog 
        isOpen={isAddItemDialogOpen}
        onClose={() => setIsAddItemDialogOpen(false)}
        onSubmit={handleItemAdd}
        categories={auction.categories || []}
        lots={lots || []}
        auctionType={auction.type}
        accountId={accountId!}
        />

      {selectedItem && (
        <EnterWinningBidDialog
            isOpen={isWinningBidDialogOpen}
            onClose={() => {
                setIsWinningBidDialogOpen(false);
                setSelectedItem(null);
            }}
            item={selectedItem}
            patrons={registeredPatronsWithDetails}
            onSubmit={handleWinningBidSubmit}
        />
      )}

      {selectedItem && (
        <EditItemDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedItem(null);
            }}
            item={selectedItem}
            onSubmit={handleItemUpdate}
            categories={auction.categories || []}
            lots={lots || []}
            auctionType={auction.type}
            accountId={accountId!}
        />
      )}

      <EditCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
        onSubmit={handleAddCategory}
        title="Add New Category"
        description="Create a new category for items in this auction."
        submitButtonText="Add Category"
      />

      {selectedCategory && (
        <EditCategoryDialog
          isOpen={isEditCategoryDialogOpen}
          onClose={() => setIsEditCategoryDialogOpen(false)}
          onSubmit={handleUpdateCategory}
          category={selectedCategory}
          title="Edit Category"
          description="Update the name of this category."
          submitButtonText="Update Category"
        />
      )}

      <AddLotDialog
        isOpen={isAddLotDialogOpen}
        onClose={() => setIsAddLotDialogOpen(false)}
        onSubmit={handleAddLot}
      />
      
      <EditLotDialog
        isOpen={!!lotToEdit}
        onClose={() => setLotToEdit(null)}
        onSubmit={handleUpdateLot}
        lot={lotToEdit}
      />


      <RegisterPatronDialog
        isOpen={isRegisterPatronDialogOpen}
        onClose={() => setIsRegisterPatronDialogOpen(false)}
        allPatrons={patrons}
        registeredPatrons={registeredPatronsWithDetails}
        onRegister={handleRegisterPatron}
        onAddNewPatron={addPatron}
        isLoadingPatrons={isLoadingPatrons}
      />

      <AddAuctionDonationDialog
        isOpen={isAddDonationDialogOpen}
        onClose={() => setIsAddDonationDialogOpen(false)}
        patrons={registeredPatronsWithDetails}
        onSubmit={handleAddDonation}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              {itemToDelete?.sku.toString().startsWith('DON-') ? ' donation ' : ' item '}
              "{itemToDelete?.name}" from the auction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!lotToDelete} onOpenChange={(isOpen) => !isOpen && setLotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lot: {lotToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this lot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteLot} className="bg-destructive hover:bg-destructive/90">
              Delete Lot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!staffToDelete} onOpenChange={(isOpen) => !isOpen && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff: {staffToDelete}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will revoke access for this username.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{categoryToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive hover:bg-destructive/90">
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportItemsCsvDialog
        isOpen={isImportItemsDialogOpen}
        onClose={() => setIsImportItemsDialogOpen(false)}
        accountId={accountId!}
        auctionId={auctionId}
        categories={auction.categories || []}
      />
    </>
  );
}
