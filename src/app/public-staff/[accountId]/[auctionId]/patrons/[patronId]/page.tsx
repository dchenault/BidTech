
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
import { Mail, Phone, Home, DollarSign, Award, Printer, CreditCard, Loader2, Frown, ChevronLeft, Pencil, HeartHandshake } from 'lucide-react';
import type { Item, Auction, PaymentMethod, Patron, RegisteredPatron, Account, PatronFormValues } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { exportPatronReceiptToHTML } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { doc, writeBatch, collection, collectionGroup, query, where, getDoc, getDocs, limit, updateDoc, runTransaction } from 'firebase/firestore';
import { MarkAsPaidDialog } from '@/components/mark-as-paid-dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { EditPatronDialog } from '@/components/edit-patron-dialog';
import { AddDonationDialog } from '@/components/add-donation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WonItem extends Item {
  auctionName: string;
}

interface PageData {
  patron: Patron | null;
  auction: Auction | null;
  wonItems: WonItem[];
  isInitialLoad: boolean;
  error: string | null;
}

export default function PublicStaffPatronDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';
  const patronId = typeof params.patronId === 'string' ? params.patronId : '';

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    patron: null,
    auction: null,
    wonItems: [],
    isInitialLoad: true,
    error: null,
  });
  const [itemsToPay, setItemsToPay] = useState<Item[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');


  useEffect(() => {
    const staffName = localStorage.getItem('staffName');
    const sessionAccountId = localStorage.getItem('staffAccountId');
    const sessionAuctionId = localStorage.getItem('activeAuctionId');
    if (staffName && sessionAccountId === accountId && sessionAuctionId === auctionId) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      setPageData(prev => ({ ...prev, isInitialLoad: false, error: "Not authorized." }));
    }
  }, [accountId, auctionId]);

  useEffect(() => {
    if (!isAuthorized || !firestore) return;

    const fetchData = async () => {
      try {
        const [patronSnap, auctionSnap] = await Promise.all([
          getDoc(doc(firestore, 'accounts', accountId, 'patrons', patronId)),
          getDoc(doc(firestore, 'accounts', accountId, 'auctions', auctionId))
        ]);

        if (!patronSnap.exists()) throw new Error('Patron not found.');
        if (!auctionSnap.exists()) throw new Error('Auction not found.');
        
        const fetchedPatron = { id: patronSnap.id, ...patronSnap.data() } as Patron;
        const fetchedAuction = { id: auctionSnap.id, ...auctionSnap.data() } as Auction;

        const itemsQuery = query(
          collectionGroup(firestore, 'items'),
          where('accountId', '==', accountId),
          where('auctionId', '==', auctionId),
          where('winnerId', '==', patronId)
        );

        const itemsSnapshot = await getDocs(itemsQuery);
        const fetchedWonItems = itemsSnapshot.docs.map(doc => ({
          ...(doc.data() as Item),
          id: doc.id,
          auctionName: fetchedAuction.name,
        } as WonItem));
        
        setNotes(fetchedPatron.notes || '');

        setPageData({
          patron: fetchedPatron,
          auction: fetchedAuction,
          wonItems: fetchedWonItems,
          isInitialLoad: false,
          error: null,
        });

      } catch (err: any) {
        console.error("Error fetching patron checkout data:", err);
        setPageData({ patron: null, auction: null, wonItems: [], isInitialLoad: false, error: err.message });
      }
    };

    fetchData();
  }, [firestore, accountId, auctionId, patronId, isAuthorized]);

  const { patron, auction, wonItems, isInitialLoad, error } = pageData;

  const unpaidItems = useMemo(() => wonItems.filter(item => !item.paid), [wonItems]);
  const paidItems = useMemo(() => wonItems.filter(item => item.paid), [wonItems]);
  const totalSpent = useMemo(() => wonItems.reduce((sum, item) => sum + (item.winningBid || 0), 0), [wonItems]);
  const itemsWonCount = useMemo(() => wonItems.filter(item => !item.sku.toString().startsWith("DON-")).length, [wonItems]);

  const openPaymentDialog = (items: Item[]) => {
    if (items.length === 0) {
      toast({ title: 'No items to pay for.' });
      return;
    }
    setItemsToPay(items);
    setIsPaymentDialogOpen(true);
  };
  
    const handleSaveNotes = async () => {
        if (!firestore || !accountId || !patronId) return;
        const patronRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
        try {
            await updateDoc(patronRef, { notes });
            toast({
                title: 'Notes Saved',
                description: 'Your notes for this patron have been updated.',
            });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error Saving Notes',
            });
        }
    };

    const handlePatronUpdated = async (values: PatronFormValues) => {
        if (!firestore || !accountId || !patronId) return;
        const patronRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
        try {
            await updateDoc(patronRef, values);
            setPageData(prev => ({
                ...prev,
                patron: prev.patron ? { ...prev.patron, ...values } : null
            }));
            toast({ title: 'Patron Updated' });
            setIsEditDialogOpen(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Updating Patron' });
        }
    };
    
    const handleAddDonation = async (amount: number, selectedAuctionId: string) => {
        if (!firestore || !accountId || !patron) return;
    
        try {
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
                    auctionId: selectedAuctionId,
                    accountId: accountId,
                    category: { id: "cat-donation", name: "Donation" },
                    categoryId: "cat-donation",
                    paid: true, 
                    paymentMethod: 'Cash',
                };
    
                const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', selectedAuctionId);
                const itemsColRef = collection(auctionDocRef, 'items');
                const newItemRef = doc(itemsColRef);
    
                transaction.set(newItemRef, donationItem);
                transaction.update(accountRef, { lastItemSku: (accountData.lastItemSku || 999) + 1 });
            });
    
            if (selectedAuctionId === auctionId) {
                const newDonation: WonItem = {
                  id: `temp-donation-${Date.now()}`,
                  sku: `DON-${Date.now()}`, name: "Donation", description: `Cash donation of ${amount}`, estimatedValue: amount, winningBid: amount, winnerId: patron.id, winner: patron,
                  auctionId: selectedAuctionId, accountId: accountId, category: { id: "cat-donation", name: "Donation" }, categoryId: "cat-donation", paid: true, paymentMethod: 'Cash', auctionName: auction?.name || 'Unknown',
                };
                setPageData(prev => ({...prev, wonItems: [...prev.wonItems, newDonation]}));
            }
            
            toast({ title: 'Donation Recorded' });
            setIsDonationDialogOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
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
      const idsToUpdate = new Set(itemsToPay.map(i => i.id));
      setPageData(prev => ({
        ...prev,
        wonItems: prev.wonItems.map(item =>
          idsToUpdate.has(item.id) ? { ...item, paid: true, paymentMethod } : item
        ),
      }));
      toast({
        title: 'Payment Successful',
        description: `${itemsToPay.length} item(s) have been marked as paid.`,
      });
    } catch (error) {
      console.error("Error marking items as paid:", error);
      toast({ variant: 'destructive', title: 'Payment Failed' });
    }
    setIsPaymentDialogOpen(false);
  };

  const handlePrintReceipt = async () => {
    if (!patron || !auction || paidItems.length === 0) {
      toast({ variant: "destructive", title: "No Paid Items to Print" });
      return;
    }

    if (!firestore || !accountId || !auctionId) {
        toast({ variant: "destructive", title: "Database Error", description: "Connection to the database is not available." });
        return;
    }
    
     const regPatronsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons');
     const q = query(regPatronsRef, where('patronId', '==', patron.id), limit(1));
     const querySnapshot = await getDocs(q);
     let biddingNumber: number | undefined;
     if (!querySnapshot.empty) {
        biddingNumber = (querySnapshot.docs[0].data() as RegisteredPatron).bidderNumber;
     }

    exportPatronReceiptToHTML({
      patron: {...patron, biddingNumber },
      items: paidItems,
      auction,
    });
  };

  if (isInitialLoad) {
    return <div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 text-center">
        <Frown className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have an active staff session for this auction.</p>
        <Button asChild><Link href={`/staff-login/${accountId}/${auctionId}`}>Go to Staff Login</Link></Button>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-10">Error: {error}</div>;
  }
  
  if (!patron || !auction) {
     return <div className="text-center text-muted-foreground py-10">Could not load patron or auction data.</div>;
  }
  
  return (
    <>
    <div className="grid gap-6">
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href={`/public-staff/${accountId}/${auctionId}`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back to Auction</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Patron Checkout
          </h1>
        </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{`${patron.firstName} ${patron.lastName}`}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{patron.email}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{patron.phone}</span></div>
              <div className="flex items-center gap-2"><Home className="h-4 w-4 text-muted-foreground" /><span>{`${patron.address?.street || ''}, ${patron.address?.city || ''}, ${patron.address?.state || ''} ${patron.address?.zip || ''}`}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Items Won</span><span className="font-medium">{itemsWonCount}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-lg">Total Due</span><span className="text-lg">{formatCurrency(totalSpent)}</span></div>
            </CardContent>
          </Card>
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
                    className="min-h-[150px]"
                />
                </CardContent>
                <CardFooter>
                <Button onClick={handleSaveNotes} className="ml-auto">Save Notes</Button>
                </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Contributions in this Auction</CardTitle>
                </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDonationDialogOpen(true)}>
                    <HeartHandshake className="mr-2 h-4 w-4" />
                    Add Donation
                </Button>
                <Button size="sm" onClick={() => openPaymentDialog(unpaidItems)} disabled={unpaidItems.length === 0}><CreditCard className="mr-2 h-4 w-4" />Pay All Unpaid ({unpaidItems.length})</Button>
                <Button variant="outline" size="sm" onClick={handlePrintReceipt} disabled={paidItems.length === 0}><Printer className="mr-2 h-4 w-4" />Print Receipt</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {wonItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.winningBid || 0)}</TableCell>
                      <TableCell className="text-center w-[180px]">
                        {item.paid ? <Badge variant="secondary">Paid ({item.paymentMethod})</Badge> : <Button size="sm" onClick={() => openPaymentDialog([item])}>Mark Paid</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {wonItems.length === 0 && <div className="text-center py-8 text-muted-foreground">This patron has not won any items in this auction.</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <MarkAsPaidDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} onSubmit={handleMarkAsPaid} itemCount={itemsToPay.length} />
      
      <EditPatronDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        patron={patron}
        onSuccess={handlePatronUpdated}
      />
      
      <AddDonationDialog
        isOpen={isDonationDialogOpen}
        onClose={() => setIsDonationDialogOpen(false)}
        auctions={[auction]}
        onSubmit={handleAddDonation}
        isLoading={isInitialLoad}
      />
    </div>
    </>
  );
}

