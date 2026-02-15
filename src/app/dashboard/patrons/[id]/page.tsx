
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, cn } from '@/lib/utils';
import { Mail, Phone, Home, DollarSign, Award, Pencil, Printer, HeartHandshake, CreditCard, Loader2 } from 'lucide-react';
import type { Item, PatronFormValues, Auction, PaymentMethod, Patron } from '@/lib/types';
import { useAuctions } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Button } from '@/components/ui/button';
import { EditPatronDialog } from '@/components/edit-patron-dialog';
import { exportPatronReceiptToHTML } from '@/lib/export';
import { AddDonationDialog } from '@/components/add-donation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { doc, writeBatch, collectionGroup, query, where, getDoc, getDocs } from 'firebase/firestore';
import { MarkAsPaidDialog } from '@/components/mark-as-paid-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface WonItem extends Item {
  auctionName: string;
}

interface PageData {
  patron: Patron | null;
  wonItems: WonItem[];
  isInitialLoad: boolean;
  error: string | null;
}

export default function PatronDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { updatePatron } = usePatrons();
  const { auctions, isLoading: isLoadingAuctions, addDonationToAuction } = useAuctions();
  const patronId = typeof params.id === 'string' ? params.id : '';
  const { toast } = useToast();
  
  const [pageData, setPageData] = useState<PageData>({
    patron: null,
    wonItems: [],
    isInitialLoad: true,
    error: null,
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [itemsToPay, setItemsToPay] = useState<Item[]>([]);
  const [notes, setNotes] = useState('');

  // Waterfall data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !accountId || !patronId || isLoadingAuctions) {
        return;
      }
      
      let fetchedPatron: Patron | null = null;
      let patronFetchError: string | null = null;

      // Waterfall Step 1: Fetch the Patron document. This is critical.
      try {
        console.log(`Fetching patron with ID: ${patronId} for account: ${accountId}`);
        const patronRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
        const patronSnap = await getDoc(patronRef);

        if (!patronSnap.exists()) {
          throw new Error('Patron not found.');
        }
        fetchedPatron = { id: patronSnap.id, ...patronSnap.data() } as Patron;
        console.log("Successfully fetched patron:", fetchedPatron);
        setNotes(fetchedPatron.notes || '');
      } catch (err: any) {
        console.error("CRITICAL: Failed to fetch patron document:", err);
        patronFetchError = err.message || "Failed to load patron details.";
        setPageData({ patron: null, wonItems: [], isInitialLoad: false, error: patronFetchError });
        return; // Hard stop if we can't get the patron.
      }

      // Waterfall Step 2: Fetch won items. This is a "soft failure".
      let fetchedWonItems: WonItem[] = [];
      try {
        const itemsQuery = query(
          collectionGroup(firestore, 'items'),
          where('accountId', '==', accountId),
          where('winnerId', '==', patronId)
        );
        console.log(`Querying for items with accountId: ${accountId} and winnerId: ${patronId}`);
        
        const itemsSnapshot = await getDocs(itemsQuery);
        
        const auctionMap = new Map(auctions.map(a => [a.id, a.name]));
        fetchedWonItems = itemsSnapshot.docs.map(doc => {
          const item = { id: doc.id, ...doc.data() } as Item;
          return {
            ...item,
            auctionName: auctionMap.get(item.auctionId) || 'Unknown Auction',
          };
        });
        console.log(`Found ${fetchedWonItems.length} won items/donations.`);

      } catch (err: any) {
          console.error("NON-CRITICAL: Failed to fetch won items:", err);
          // We will still proceed to render the patron's details, with an empty items array.
      }

      // Final state update
      setPageData({
        patron: fetchedPatron,
        wonItems: fetchedWonItems, // This will be [] if the fetch failed
        isInitialLoad: false,
        error: null, // No CRITICAL error
      });
    };

    fetchData();
  }, [firestore, accountId, patronId, isLoadingAuctions, auctions]);

  const { patron, wonItems, isInitialLoad, error } = pageData;
  
  const contributionsByAuction = useMemo(() => {
    if (!wonItems || !auctions) return new Map();

    const auctionMap = new Map(auctions.map(a => [a.id, a]));

    const sortedItems = [...wonItems].sort((a, b) => {
        const auctionA = auctionMap.get(a.auctionId);
        const auctionB = auctionMap.get(b.auctionId);
        if (auctionA && auctionB) {
            return new Date(auctionB.startDate).getTime() - new Date(auctionA.startDate).getTime();
        }
        return 0;
    });

    return sortedItems.reduce((acc, item) => {
      const auctionName = auctionMap.get(item.auctionId)?.name || 'Unknown Auction';
      if (!acc.has(item.auctionId)) {
        acc.set(item.auctionId, { auctionName, items: [] });
      }
      acc.get(item.auctionId)!.items.push(item);
      return acc;
    }, new Map<string, { auctionName: string, items: WonItem[] }>());
  }, [wonItems, auctions]);
  
  const handlePatronUpdated = (updatedPatronData: PatronFormValues) => {
    if (!patron) return;
    updatePatron(patron.id, updatedPatronData);
    setPageData(prev => ({ ...prev, patron: { ...prev.patron!, ...updatedPatronData }}));
    setIsEditDialogOpen(false);
  };
  
  const handlePrintReceipt = (auctionId: string) => {
    if (!patron) return;
    const selectedAuction = auctions.find(a => a.id === auctionId);
    if (!selectedAuction) return;

    const itemsForReceipt = wonItems.filter(item => item.auctionId === auctionId && item.paid);
    
    if (itemsForReceipt.length === 0) {
      toast({
        variant: "destructive",
        title: "No Paid Items",
        description: "This patron has no paid items in the selected auction to generate a receipt for."
      });
      return;
    }

    exportPatronReceiptToHTML({
      patron,
      items: itemsForReceipt,
      auction: selectedAuction
    });
  };

  const handleAddDonation = async (amount: number, auctionId: string) => {
    if (!patron) return;
    try {
        await addDonationToAuction(auctionId, patron, amount, true);
        
        const newDonation = {
          id: `temp-donation-${Date.now()}`,
          sku: `DON-${Date.now()}`,
          name: "Donation",
          description: `Cash donation of ${amount}`,
          estimatedValue: amount,
          winningBid: amount,
          winnerId: patron.id,
          winner: patron,
          auctionId,
          accountId: patron.accountId,
          category: { id: "cat-donation", name: "Donation" },
          categoryId: "cat-donation",
          paid: true,
          paymentMethod: 'Cash' as PaymentMethod,
          auctionName: auctions.find(a => a.id === auctionId)?.name || 'Unknown'
        };
        setPageData(prev => ({...prev, wonItems: [...prev.wonItems, newDonation]}));

        toast({
            title: "Donation Recorded",
            description: `A donation of ${formatCurrency(amount)} has been added for ${patron.firstName}.`
        });
        setIsDonationDialogOpen(false);
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: e.message || "Failed to record donation."
        })
    }
  }

  const openPaymentDialog = (items: Item[]) => {
    if (items.length === 0) {
      toast({ title: 'No items to pay for.' });
      return;
    }
    setItemsToPay(items);
    setIsPaymentDialogOpen(true);
  };

  const handleMarkAsPaid = async (paymentMethod: PaymentMethod) => {
    if (!firestore || itemsToPay.length === 0 || !accountId) return;

    const batch = writeBatch(firestore);
    itemsToPay.forEach(item => {
      if (!item.accountId) return; 
      const itemRef = doc(firestore, 'accounts', item.accountId, 'auctions', item.auctionId, 'items', item.id);
      batch.update(itemRef, { paid: true, paymentMethod: paymentMethod });
    });

    try {
      await batch.commit();

      const itemsToPayIds = new Set(itemsToPay.map(i => i.id));
      setPageData(prev => ({
        ...prev,
        wonItems: prev.wonItems.map(item => 
          itemsToPayIds.has(item.id) ? { ...item, paid: true, paymentMethod } : item
        )
      }));

      toast({
        title: 'Payment Successful',
        description: `${itemsToPay.length} item(s) have been marked as paid.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: 'There was an error updating the items.',
      });
      console.error("Error marking items as paid:", error);
    }

    setItemsToPay([]);
  };

  const handleSaveNotes = () => {
    if (!patron) return;
    updatePatron(patron.id, { notes });
    toast({
        title: 'Notes Saved',
        description: 'Your notes for this patron have been updated.',
    });
  };

  if (isInitialLoad) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-10">
        <h2 className="text-xl font-bold">Error</h2>
        <p>{error}</p>
        <Button onClick={() => router.push('/dashboard/patrons')} className="mt-4">Back to Patrons List</Button>
      </div>
    );
  }
  
  if (!patron) {
    // This case should be handled by the router push in useEffect, but it's a good safeguard.
    return <div>Patron not found. Redirecting...</div>; 
  }
  
  const totalSpent = wonItems.reduce((sum, item) => sum + (item.winningBid || 0), 0);
  const itemsWonCount = wonItems.filter(item => !item.sku.toString().startsWith("DON-")).length;

  return (
    <>
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-3xl">
                      {patron.firstName.charAt(0)}
                      {patron.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-4xl">{`${patron.firstName} ${patron.lastName}`}</CardTitle>
                    <CardDescription>Patron since 2023</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Patron
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 rounded-lg border p-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patron.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patron.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-full">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>{`${patron.address?.street || ''}, ${patron.address?.city || ''}, ${patron.address?.state || ''} ${patron.address?.zip || ''}`}</span>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Items Won</CardTitle>
                          <Award className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{itemsWonCount}</div>
                      </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
           <Card>
            <CardHeader>
              <CardTitle>Patron Notes</CardTitle>
              <CardDescription>
                Internal notes for this patron. Not visible to them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="notes" className="sr-only">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes here..."
                className="min-h-[200px]"
              />
            </CardContent>
             <CardFooter>
              <Button onClick={handleSaveNotes} className="ml-auto">Save Notes</Button>
            </CardFooter>
          </Card>
        </div>


        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <CardTitle>Contributions</CardTitle>
                <CardDescription>All items won and donations made by this patron, grouped by auction.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsDonationDialogOpen(true)}
                >
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  Add Donation
                </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {contributionsByAuction.size > 0 ? (
                Array.from(contributionsByAuction.entries()).map(([auctionId, { auctionName, items: auctionItems }]) => {
                const unpaidForAuction = auctionItems.filter(i => !i.paid);
                const paidForAuction = auctionItems.filter(i => i.paid);
                return (
                    <Card key={auctionId} className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl">{auctionName}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => openPaymentDialog(unpaidForAuction)} disabled={unpaidForAuction.length === 0} className="bg-green-600 hover:bg-green-700">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Pay Unpaid ({unpaidForAuction.length})
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(auctionId)} disabled={paidForAuction.length === 0}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Receipt
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {auctionItems.map((item) => {
                                    const isDonation = item.sku.toString().startsWith('DON-');
                                    return (
                                        <TableRow 
                                            key={item.id}
                                            onClick={() => !isDonation && router.push(`/dashboard/auctions/${item.auctionId}/items/${item.id}`)}
                                            className={cn(!isDonation && "cursor-pointer")}
                                        >
                                            <TableCell className={`font-medium ${isDonation ? 'text-green-600 dark:text-green-400' : ''}`}>
                                                {isDonation ? `Donation` : item.name}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.winningBid || 0)}</TableCell>
                                            <TableCell className="text-center w-[180px]">
                                                {item.paid ? (
                                                    <Badge variant="secondary">
                                                        Paid ({item.paymentMethod})
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={(e) => { e.stopPropagation(); openPaymentDialog([item]); }}
                                                    >
                                                        Mark Paid
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                  })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })
            ) : (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                This patron has not won any items or made donations yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <EditPatronDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        patron={patron}
        onSuccess={handlePatronUpdated}
      />

      <AddDonationDialog
        isOpen={isDonationDialogOpen}
        onClose={() => setIsDonationDialogOpen(false)}
        auctions={auctions}
        onSubmit={handleAddDonation}
        isLoading={isLoadingAuctions}
      />

      <MarkAsPaidDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        onSubmit={handleMarkAsPaid}
        itemCount={itemsToPay.length}
      />
    </>
  );
}
