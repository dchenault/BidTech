
'use client';

import Image from 'next/image';
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
import { MoreHorizontal, PlusCircle, Download, Pencil, Power, PowerOff, Search, Trash2, HeartHandshake } from 'lucide-react';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Item, Patron, ItemFormValues, Category, CategoryFormValues, RegisteredPatron, Lot, LotFormValues, Auction } from '@/lib/types';
import { EnterWinningBidDialog } from '@/components/enter-winning-bid-dialog';
import { EditItemDialog } from '@/components/edit-item-dialog';
import { AddItemDialog } from '@/components/add-item-dialog';
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { usePatrons } from '@/hooks/use-patrons';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { RegisterPatronDialog } from '@/components/register-patron-dialog';
import { AddLotDialog } from '@/components/add-lot-dialog';
import { exportAuctionCatalogToHTML } from '@/lib/export';
import { AuctionCatalog } from '@/components/auction-catalog';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExportCatalogDialog } from '@/components/export-catalog-dialog';
import { useAccount } from '@/hooks/use-account';

export default function AuctionDetailsPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { searchQuery, setSearchQuery } = useSearch();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const { getAuction, getAuctionItems, getAuctionLots, addItemToAuction, addCategoryToAuction, updateCategoryInAuction, addLotToAuction, moveItemToLot, updateAuction, deleteItemFromAuction, unregisterPatronFromAuction } = useAuctions();
  const { patrons, addPatron, isLoading: isLoadingPatrons } = usePatrons();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isWinningBidDialogOpen, setIsWinningBidDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isExportCatalogDialogOpen, setIsExportCatalogDialogOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddLotDialogOpen, setIsAddLotDialogOpen] = useState(false);

  const [isRegisterPatronDialogOpen, setIsRegisterPatronDialogOpen] = useState(false);

  const auctionId = typeof params.id === 'string' ? params.id : '';
  
  const auction = getAuction(auctionId);
  const { items, isLoadingItems } = getAuctionItems(auctionId);
  const { lots, isLoadingLots } = getAuctionLots(auctionId);

  const registeredPatronsRef = useMemoFirebase(
    () => (firestore && accountId && auctionId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons') : null),
    [firestore, accountId, auctionId]
  );
  const { data: registeredPatronsData, isLoading: isLoadingRegisteredPatrons } = useCollection<RegisteredPatron>(registeredPatronsRef);

  const searchedItems = useMemo(() => {
    if (!items) return [];
    const actualItems = items.filter(item => !item.sku.toString().startsWith('DON-'));

    if (!searchQuery) return actualItems;
    
    return actualItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toString().includes(searchQuery)
    );
  }, [items, searchQuery]);

  const searchedDonations = useMemo(() => {
      if (!items) return [];
      const donations = items.filter(item => item.sku.toString().startsWith('DON-'));

      if (!searchQuery) return donations;

      return donations.filter(item =>
          item.winner?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.winner?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toString().includes(searchQuery)
      );
  }, [items, searchQuery]);

  const { liveItems, silentItemsByLot } = useMemo(() => {
    if (!searchedItems) return { liveItems: [], silentItemsByLot: new Map() };
    const liveItems = searchedItems.filter(item => !item.lotId);
    const silentItemsByLot = searchedItems
        .filter(item => item.lotId)
        .reduce((acc, item) => {
            if (!item.lotId) return acc;
            if (!acc.has(item.lotId)) {
                acc.set(item.lotId, []);
            }
            acc.get(item.lotId)!.push(item);
            return acc;
        }, new Map<string, Item[]>());

    return { liveItems, silentItemsByLot };
  }, [searchedItems]);


  const registeredPatronsWithDetails: (Patron & { registeredPatronDocId: string; biddingNumber: number; })[] = useMemo(() => {
    if (!registeredPatronsData || isLoadingPatrons) return [];
  
    return registeredPatronsData
      .map(rp => {
        const patronDetails = patrons.find(p => p.id === rp.patronId);
        if (!patronDetails) return null;
  
        return {
          ...patronDetails,
          accountId: patronDetails.accountId,
          registeredPatronDocId: rp.id,
          biddingNumber: rp.bidderNumber,
        };
      })
      .filter((p): p is Patron & { registeredPatronDocId: string; biddingNumber: number; } => p !== null);
  }, [registeredPatronsData, patrons, isLoadingPatrons]);


  const filteredRegisteredPatrons = useMemo(() => {
    if (!searchQuery) return registeredPatronsWithDetails;
    return registeredPatronsWithDetails.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.biddingNumber?.toString().includes(searchQuery)
    );
  }, [registeredPatronsWithDetails, searchQuery]);


  if (!auction || !accountId) {
    return <div>Loading auction...</div>;
  }

  const handleToggleAuctionStatus = () => {
    if (!auction) return;
    const newStatus = auction.status === 'completed' ? 'active' : 'completed';
    updateAuction(auction.id, { status: newStatus });
  };

  const handleExportCatalog = (orderedItems: Item[], finalLots: Lot[]) => {
    if (auction) {
      exportAuctionCatalogToHTML({ ...auction, items: orderedItems, lots: finalLots });
    }
  };

  const handleOpenWinningBidDialog = (item: Item) => {
    setSelectedItem(item);
    setIsWinningBidDialogOpen(true);
  };
  
  const handleOpenEditDialog = (item: Item) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (item: Item) => {
    if (item.winningBidderId || item.winningBid) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Item",
        description: "This item has already been won and cannot be deleted."
      });
      return;
    }
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItemFromAuction(auction.id, itemToDelete.id);
      toast({
        title: "Item Deleted",
        description: `"${itemToDelete.name}" has been successfully deleted.`
      });
      setItemToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting Item",
        description: error.message || "An unexpected error occurred."
      });
    }
  };

  const handleOpenEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsEditCategoryDialogOpen(true);
  }

  const handleWinningBidSubmit = (winningBid: number, winner: Patron) => {
    if (!auction || !selectedItem || !firestore || !accountId) return;

    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auction.id, 'items', selectedItem.id);
    updateDocumentNonBlocking(itemRef, { winningBid: winningBid, winningBidderId: winner.id, winner: winner });

    setIsWinningBidDialogOpen(false);
    setSelectedItem(null);
  };

  const handleItemUpdate = (updatedItemData: ItemFormValues) => {
    if (!auction || !selectedItem || !firestore || !accountId) return;
    const category = auction.categories.find(c => c.name === updatedItemData.categoryId) || {id: 'cat-misc', name: 'Misc'};
    
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auction.id, 'items', selectedItem.id);
    
    const payload: { [key: string]: any } = {
        ...updatedItemData,
        category,
        categoryId: category.id,
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    if (payload.lotId === 'none') {
        payload.lotId = null;
    }

    updateDocumentNonBlocking(itemRef, payload);

    setIsEditDialogOpen(false);
    setSelectedItem(null);
  }

  const handleItemAdd = (newItemData: ItemFormValues) => {
    if (!auction) return;
    addItemToAuction(auction.id, newItemData);
    setIsAddItemDialogOpen(false);
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

  const handleAddLot = (values: LotFormValues) => {
    if (!auction) return;
    addLotToAuction(auction.id, values);
    setIsAddLotDialogOpen(false);
  }

  const handleAssignItemToLot = (itemId: string, lotId: string) => {
    if (!auction) return;
    moveItemToLot(auction.id, itemId, lotId);
  }

  const handleRegisterPatron = async (patron: Patron, bidderNumber: number) => {
    if (!registeredPatronsRef || !accountId) return;

    const newRegistrationData: Omit<RegisteredPatron, 'id'> = {
      accountId: accountId,
      auctionId: auctionId,
      patronId: patron.id,
      bidderNumber: bidderNumber,
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

    const renderItemsTable = (itemsToRender: Item[], title: string, description: string) => (
         <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingItems ? (
                    <div className="text-center text-muted-foreground py-8">Loading items...</div>
                ) : itemsToRender.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="hidden w-[100px] sm:table-cell">
                        <span className="sr-only">Image</span>
                        </TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden md:table-cell">Est. Value</TableHead>
                        <TableHead className="hidden md:table-cell">Winning Bid</TableHead>
                        <TableHead className="hidden md:table-cell">Winner</TableHead>
                        <TableHead>
                           Actions
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {itemsToRender.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell className="hidden sm:table-cell">
                            <Image
                            alt={item.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            src={item.imageUrl || 'https://picsum.photos/seed/placeholder/64/64'}
                            width="64"
                            data-ai-hint="item image"
                            />
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="font-medium">
                            <Link href={`/dashboard/auctions/${auction.id}/items/${item.id}`} className="hover:underline">
                                {item.name}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{item.category.name}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {formatCurrency(item.estimatedValue)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {item.winningBid ? formatCurrency(item.winningBid) : 'N/A'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {item.winner ? `${item.winner.firstName} ${item.winner.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                <Link href={`/dashboard/auctions/${auction.id}/items/${item.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(item)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenWinningBidDialog(item)}>
                                Enter Winning Bid
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(item)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
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
            </CardContent>
        </Card>
    );

    const renderDonationsTable = () => (
      <Card>
          <CardHeader>
              <CardTitle>Donations</CardTitle>
              <CardDescription>Cash donations made during this auction.</CardDescription>
          </CardHeader>
          <CardContent>
              {isLoadingItems ? (
                  <div className="text-center text-muted-foreground py-8">Loading donations...</div>
              ) : searchedDonations.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Patron</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>SKU</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {searchedDonations.map((donation) => (
                              <TableRow key={donation.id}>
                                  <TableCell>
                                      <div className="flex items-center gap-3">
                                          <Avatar className="hidden h-9 w-9 sm:flex">
                                              <AvatarImage src={donation.winner?.avatarUrl} alt="Avatar" />
                                              <AvatarFallback>{donation.winner?.firstName?.charAt(0)}{donation.winner?.lastName?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div className="grid gap-0.5">
                                              <p className="font-medium">
                                                  <Link href={`/dashboard/patrons/${donation.winner?.id}`} className="hover:underline">
                                                      {donation.winner?.firstName} {donation.winner?.lastName}
                                                  </Link>
                                              </p>
                                              <p className="text-xs text-muted-foreground">{donation.winner?.email}</p>
                                          </div>
                                      </div>
                                  </TableCell>
                                  <TableCell className="font-medium text-green-600">{formatCurrency(donation.winningBid || 0)}</TableCell>
                                  <TableCell className="font-mono text-muted-foreground">{donation.sku}</TableCell>
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
  );

  const renderSilentAuctionView = () => (
    <div className="space-y-6">
        {isLoadingLots ? (
            <div className="text-center text-muted-foreground py-8">Loading lots...</div>
        ) : lots.length === 0 ? (
            renderItemsTable(searchedItems, 'All Items', 'Manage all items for this silent auction.')
        ) : (
            lots.map(lot => (
                <div key={lot.id}>
                    {renderItemsTable(silentItemsByLot.get(lot.id) || [], lot.name, `Items in lot: ${lot.name}`)}
                </div>
            ))
        )}
        {liveItems.length > 0 && (
             <div className="pt-8">
                {renderItemsTable(liveItems, 'Unassigned Items', 'These items have not been assigned to a lot yet.')}
            </div>
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
            {renderItemsTable(liveItems, 'Live Auction Items', 'Items to be auctioned live.')}
        </TabsContent>
        <TabsContent value="silent" className="mt-4">
             {isLoadingLots ? (
                <div className="text-center text-muted-foreground py-8">Loading lots...</div>
            ) : lots.length > 0 ? (
                <div className="space-y-6">
                    {lots.map(lot => (
                         <div key={lot.id}>
                            {renderItemsTable(silentItemsByLot.get(lot.id) || [], lot.name, `Items in lot: ${lot.name}`)}
                        </div>
                    ))}
                </div>
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
        return renderItemsTable(searchedItems, 'Auction Items', 'Manage the items for this auction.');
    }
  }

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{auction.name}</h1>
                <p className="text-muted-foreground">{auction.description}</p>
            </div>
             <div className="ml-auto flex items-center gap-2">
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
                    <Button size="sm" variant="outline" onClick={() => setIsExportCatalogDialogOpen(true)}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Catalog
                    </Button>
                    {(auction.type === 'Silent' || auction.type === 'Hybrid') && (
                        <Button size="sm" variant="outline" onClick={() => setIsAddLotDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Lot
                        </Button>
                    )}
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
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search donations by patron name or SKU..."
                        className="w-full rounded-lg bg-background pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {renderDonationsTable()}
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
                            <TableHead>Bidding #</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredRegisteredPatrons.map((patron) => (
                            <TableRow key={patron.id}>
                            <TableCell className="font-medium">{patron.biddingNumber}</TableCell>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/patrons/${patron.id}`} className="hover:underline">
                                {patron.firstName} {patron.lastName}
                                </Link>
                            </TableCell>
                            <TableCell>{patron.email}</TableCell>
                            <TableCell className="hidden md:table-cell">{patron.phone}</TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleUnregisterPatron(patron)}
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
                <Card>
                <CardHeader>
                    <CardTitle>Auction Settings</CardTitle>
                    <CardDescription>Configuration for this specific auction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Item Categories</CardTitle>
                            <CardDescription>Manage the categories for items in this auction.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setIsAddCategoryDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Category Name</TableHead>
                            <TableHead className="w-[100px] text-right">Edit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auction.categories?.map(category => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditCategoryDialog(category)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
                </CardContent>
                </Card>
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
        />

      {selectedItem && (
        <EnterWinningBidDialog
            isOpen={isWinningBidDialogOpen}
            onClose={() => setIsWinningBidDialogOpen(false)}
            item={selectedItem}
            patrons={registeredPatronsWithDetails}
            onSubmit={handleWinningBidSubmit}
        />
      )}

      {selectedItem && (
        <EditItemDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            item={selectedItem}
            onSubmit={handleItemUpdate}
            categories={auction.categories || []}
            lots={lots || []}
            auctionType={auction.type}
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

      <RegisterPatronDialog
        isOpen={isRegisterPatronDialogOpen}
        onClose={() => setIsRegisterPatronDialogOpen(false)}
        allPatrons={patrons}
        registeredPatrons={registeredPatronsWithDetails}
        onRegister={handleRegisterPatron}
        onAddNewPatron={addPatron}
        isLoadingPatrons={isLoadingPatrons}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
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

      <ExportCatalogDialog
        isOpen={isExportCatalogDialogOpen}
        onClose={() => setIsExportCatalogDialogOpen(false)}
        items={items}
        lots={lots}
        onSubmit={(orderedItems) => handleExportCatalog(orderedItems, lots)}
        isLoading={isLoadingItems || isLoadingLots}
      />
    </>
  );
}
