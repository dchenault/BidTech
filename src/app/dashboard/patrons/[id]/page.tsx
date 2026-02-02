
'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import { Mail, Phone, Home, DollarSign, Award, Pencil, Printer, HeartHandshake, CreditCard } from 'lucide-react';
import type { Item, PatronFormValues, Auction, PaymentMethod } from '@/lib/types';
import { useAuctions, fetchAuctionItems } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Button } from '@/components/ui/button';
import { EditPatronDialog } from '@/components/edit-patron-dialog';
import type { Patron } from '@/lib/types';
import { exportPatronReceiptToHTML } from '@/lib/export';
import { PrintReceiptDialog } from '@/components/print-receipt-dialog';
import { AddDonationDialog } from '@/components/add-donation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAccount } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { MarkAsPaidDialog } from '@/components/mark-as-paid-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface WonItem extends Item {
  auctionName: string;
}

export default function PatronDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { patrons, updatePatron } = usePatrons();
  const { auctions, isLoading: isLoadingAuctions, addDonationToAuction } = useAuctions();
  const patronId = typeof params.id === 'string' ? params.id : '';
  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [itemsToPay, setItemsToPay] = useState<Item[]>([]);
  
  const patron = useMemo(() => patrons.find((p) => p.id === patronId), [patrons, patronId]);
  
  const [notes, setNotes] = useState(patron?.notes || '');
  
  useEffect(() => {
    setNotes(patron?.notes || '');
  }, [patron]);

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [isLoadingAllItems, setIsLoadingAllItems] = useState(true);

  useEffect(() => {
    if (firestore && accountId && auctions.length > 0) {
      setIsLoadingAllItems(true);
      Promise.all(
        auctions.map(auction => fetchAuctionItems(firestore, accountId, auction.id))
      ).then(itemArrays => {
        setAllItems(itemArrays.flat());
        setIsLoadingAllItems(false);
      }).catch(() => {
        setIsLoadingAllItems(false);
      });
    } else if (!isLoadingAuctions) {
      setIsLoadingAllItems(false);
    }
  }, [firestore, accountId, auctions, isLoadingAuctions]);


  const wonItems: WonItem[] = useMemo(() => {
    if (!patronId || isLoadingAllItems) return [];
    
    const auctionMap = new Map(auctions.map(a => [a.id, a.name]));

    return allItems
      .filter(item => item.winningBidderId === patronId && item.accountId)
      .map(item => {
        const auctionName = auctionMap.get(item.auctionId);
        if (!auctionName) return null;

        return {
          ...item,
          auctionName,
        };
      })
      .filter((item): item is WonItem => item !== null);
  }, [allItems, patronId, auctions, isLoadingAllItems]);

  const unpaidItems = useMemo(() => wonItems.filter(item => !item.paid), [wonItems]);

  const auctionsWithWonItems = useMemo(() => {
    const auctionIds = new Set(wonItems.map(item => item.auctionId));
    return auctions.filter(auction => auctionIds.has(auction.id));
  }, [wonItems, auctions]);
  
  const handlePatronUpdated = (updatedPatronData: PatronFormValues) => {
    if (!patron) return;
    updatePatron(patron.id, updatedPatronData);
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

    // @ts-ignore
    exportPatronReceiptToHTML({
      patron: { ...patron, biddingNumber: itemsForReceipt[0]?.winner?.biddingNumber } as any,
      items: itemsForReceipt,
      auction: selectedAuction
    } as any);
  };

  const handleAddDonation = async (amount: number, auctionId: string) => {
    if (!patron) return;
    try {
        await addDonationToAuction(auctionId, patron.id, amount, true);
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
    if (!firestore || itemsToPay.length === 0) return;

    const batch = writeBatch(firestore);
    itemsToPay.forEach(item => {
      const itemRef = doc(firestore, 'accounts', item.accountId, 'auctions', item.auctionId, 'items', item.id);
      batch.update(itemRef, { paid: true, paymentMethod: paymentMethod });
    });

    try {
      await batch.commit();
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


  if (!patron) {
    return <div>Patron not found.</div>;
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
                <CardDescription>A list of all items won and donations made by this patron.</CardDescription>
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
                <Button 
                    size="sm" 
                    onClick={() => openPaymentDialog(unpaidItems)}
                    disabled={unpaidItems.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay All
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsPrintDialogOpen(true)}
                    disabled={wonItems.length === 0}
                >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wonItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Auction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wonItems.map((item) => {
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
                            <TableCell>{item.auctionName}</TableCell>
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
            ) : (
              <div className="text-center text-muted-foreground py-8">
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

       <PrintReceiptDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        auctions={auctionsWithWonItems}
        onSubmit={handlePrintReceipt}
        isLoading={isLoadingAuctions}
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
