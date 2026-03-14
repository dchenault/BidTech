
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, cn } from '@/lib/utils';
import { Mail, Phone, Home, DollarSign, Award, Pencil, Printer, HeartHandshake, CreditCard, Loader2, Trash2, Save, RotateCcw } from 'lucide-react';
import type { Item, PatronFormValues, Auction, PaymentMethod, Patron, RegisteredPatron } from '@/lib/types';
import { useAuctions } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Button } from '@/components/ui/button';
import { exportPatronReceiptToHTML } from '@/lib/export';
import { AddDonationDialog } from '@/components/add-donation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { doc, writeBatch, collection, collectionGroup, query, where, getDoc, getDocs, limit, updateDoc, deleteField } from 'firebase/firestore';
import { MarkAsPaidDialog } from '@/components/mark-as-paid-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patronFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [itemsToPay, setItemsToPay] = useState<Item[]>([]);
  const [itemToRemove, setItemToRemove] = useState<WonItem | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PatronFormValues>({
    resolver: zodResolver(patronFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: { street: '', city: '', state: 'ID', zip: '' }
    }
  });

  const { isDirty } = form.formState;

  // Waterfall data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !accountId || !patronId || isLoadingAuctions) {
        return;
      }
      
      let fetchedPatron: Patron | null = null;
      let patronFetchError: string | null = null;

      try {
        const patronRef = doc(firestore, 'accounts', accountId, 'patrons', patronId);
        const patronSnap = await getDoc(patronRef);

        if (!patronSnap.exists()) {
          throw new Error('Patron not found.');
        }
        fetchedPatron = { id: patronSnap.id, ...patronSnap.data() } as Patron;
        setNotes(fetchedPatron.notes || '');
        
        // Populate form
        form.reset({
            firstName: fetchedPatron.firstName,
            lastName: fetchedPatron.lastName,
            email: fetchedPatron.email || '',
            phone: fetchedPatron.phone || '',
            address: {
                street: fetchedPatron.address?.street || '',
                city: fetchedPatron.address?.city || '',
                state: fetchedPatron.address?.state || 'ID',
                zip: fetchedPatron.address?.zip || ''
            }
        });

      } catch (err: any) {
        console.error("CRITICAL: Failed to fetch patron document:", err);
        patronFetchError = err.message || "Failed to load patron details.";
        setPageData({ patron: null, wonItems: [], isInitialLoad: false, error: patronFetchError });
        return;
      }

      let fetchedWonItems: WonItem[] = [];
      try {
        const itemsQuery = query(
          collectionGroup(firestore, 'items'),
          where('accountId', '==', accountId),
          where('winnerId', '==', patronId)
        );
        
        const itemsSnapshot = await getDocs(itemsQuery);
        
        const auctionMap = new Map(auctions.map(a => [a.id, a.name]));
        fetchedWonItems = itemsSnapshot.docs.map(doc => {
          const item = { id: doc.id, ...doc.data() } as Item;
          return {
            ...item,
            auctionName: auctionMap.get(item.auctionId) || 'Unknown Auction',
          };
        });

      } catch (err: any) {
          console.error("NON-CRITICAL: Failed to fetch won items:", err);
      }

      setPageData({
        patron: fetchedPatron,
        wonItems: fetchedWonItems,
        isInitialLoad: false,
        error: null,
      });
    };

    fetchData();
  }, [firestore, accountId, patronId, isLoadingAuctions, auctions, form]);

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
  
  const onSaveProfile = async (values: PatronFormValues) => {
    if (!patron) return;
    setIsSaving(true);
    try {
        await updatePatron(patron.id, values);
        setPageData(prev => ({ ...prev, patron: { ...prev.patron!, ...values }}));
        toast({ title: "Profile Updated", description: "The patron's contact info has been synced." });
        form.reset(values);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handlePrintReceipt = async (auctionId: string) => {
    if (!patron || !firestore || !accountId) return;
    const selectedAuction = auctions.find(a => a.id === auctionId);
    if (!selectedAuction) return;

    const itemsForReceipt = wonItems.filter((item: WonItem) => item.auctionId === auctionId && item.paid);
    
    if (itemsForReceipt.length === 0) {
      toast({
        variant: "destructive",
        title: "No Paid Items",
        description: "This patron has no paid items in the selected auction to generate a receipt for."
      });
      return;
    }

    try {
        const regPatronsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons');
        const q = query(regPatronsRef, where('patronId', '==', patron.id), limit(1));
        const querySnapshot = await getDocs(q);

        let biddingNumber: number | undefined;
        if (!querySnapshot.empty) {
            const regData = querySnapshot.docs[0].data() as RegisteredPatron;
            biddingNumber = regData.bidderNumber;
        }

        const patronForReceipt = {
            ...patron,
            biddingNumber: biddingNumber,
        };

        exportPatronReceiptToHTML({
          patron: patronForReceipt,
          items: itemsForReceipt,
          auction: selectedAuction
        });

    } catch (error) {
        console.error("Error fetching bidding number for receipt:", error);
        toast({
            variant: "destructive",
            title: "Error Printing Receipt",
            description: "Could not find the bidder number for this auction."
        });
    }
  };

  const handleAddDonation = async (amount: number, auctionId: string) => {
    if (!patron) return;
    try {
        await addDonationToAuction(auctionId, patron, amount, true);
        
        const newDonation: WonItem = {
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

  const handleRemoveItem = async () => {
    if (!itemToRemove || !firestore) return;

    try {
      const itemRef = doc(firestore, 'accounts', itemToRemove.accountId, 'auctions', itemToRemove.auctionId, 'items', itemToRemove.id);
      
      // Clear all winning bid fields to return item to unsold state
      await updateDoc(itemRef, {
        winningBid: deleteField(),
        winnerId: deleteField(),
        winner: deleteField(),
        paid: deleteField(),
        paymentMethod: deleteField(),
      });

      // Update local state
      setPageData(prev => ({
        ...prev,
        wonItems: prev.wonItems.filter(item => item.id !== itemToRemove.id)
      }));

      toast({
        title: "Item Removed",
        description: `"${itemToRemove.name}" has been removed from the invoice.`,
      });
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Failed to remove the item from the invoice.",
      });
    } finally {
      setItemToRemove(null);
    }
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
    return <div>Patron not found. Redirecting...</div>; 
  }
  
  const totalSpent = wonItems.reduce((sum, item) => sum + (item.winningBid || 0), 0);
  const itemsWonCount = wonItems.filter(item => !item.sku.toString().startsWith("DON-")).length;

  return (
    <>
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Patron CRM</h1>
            <div className="flex items-center gap-2">
                {isDirty && (
                    <Button variant="ghost" size="sm" onClick={() => form.reset()} disabled={isSaving}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Discard Changes
                    </Button>
                )}
                <Button 
                    size="sm" 
                    onClick={form.handleSubmit(onSaveProfile)} 
                    disabled={!isDirty || isSaving}
                >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Profile Changes
                </Button>
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-3xl">
                      {patron.firstName.charAt(0)}
                      {patron.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-4xl">{`${patron.firstName} ${patron.lastName}`}</CardTitle>
                    <CardDescription>Master Patron Profile</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...form}>
                    <form className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl><Input type="email" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Mailing Address</Label>
                            <FormField
                                control={form.control}
                                name="address.street"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Street Address</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <FormField
                                    control={form.control}
                                    name="address.city"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>City</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="ID" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ID">ID</SelectItem>
                                                    <SelectItem value="WA">WA</SelectItem>
                                                    <SelectItem value="OR">OR</SelectItem>
                                                    <SelectItem value="MT">MT</SelectItem>
                                                    <SelectItem value="CA">CA</SelectItem>
                                                    <SelectItem value="NV">NV</SelectItem>
                                                    <SelectItem value="UT">UT</SelectItem>
                                                    <SelectItem value="WY">WY</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.zip"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ZIP</FormLabel>
                                            <FormControl><Input {...field} maxLength={5} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg">Key Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-2">
                        <span className="text-sm text-muted-foreground">Total Contributions</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(totalSpent)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-muted-foreground">Items Won</span>
                        <span className="text-2xl font-bold">{itemsWonCount}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>
                    Notes for staff use only.
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
                <Button variant="outline" size="sm" onClick={handleSaveNotes} className="ml-auto">Save Notes</Button>
                </CardFooter>
            </Card>
          </div>
        </div>


        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <CardTitle>Contributions Ledger</CardTitle>
                <CardDescription>History of wins and donations grouped by auction.</CardDescription>
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
                const unpaidForAuction = auctionItems.filter((i: WonItem) => !i.paid);
                const paidForAuction = auctionItems.filter((i: WonItem) => i.paid);
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
                                  {auctionItems.map((item: WonItem) => {
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
                                            <TableCell className="text-center w-[220px]">
                                                <div className="flex items-center justify-center gap-2">
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
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => { e.stopPropagation(); setItemToRemove(item); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Remove Item</span>
                                                    </Button>
                                                </div>
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

      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item from invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{itemToRemove?.name}" from {patron.firstName}&apos;s invoice? 
              This will clear the winning bid and return the item to the auction catalog. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveItem} className="bg-destructive hover:bg-destructive/90">
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
