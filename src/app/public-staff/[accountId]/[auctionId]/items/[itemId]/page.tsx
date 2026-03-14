'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Gift, ImageIcon, Pencil, Gavel, Loader2, Frown, Printer, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { EditItemDialog } from '@/components/edit-item-dialog';
import type { Item, ItemFormValues, Patron, RegisteredPatron, Auction, Lot, Donor } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, getDocs, query, where, runTransaction, deleteField } from 'firebase/firestore';
import { EnterWinningBidDialog } from '@/components/enter-winning-bid-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase/provider';
import { uploadDataUriAndGetURL, deleteFileByUrl } from '@/firebase/storage';
import { exportAuctioneerSheetToHTML } from '@/lib/export';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PublicStaffItemDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [registeredPatrons, setRegisteredPatrons] = useState<RegisteredPatron[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runnerName, setRunnerName] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWinningBidDialogOpen, setIsWinningBidDialogOpen] = useState(false);

  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  useEffect(() => {
    const name = localStorage.getItem('staffName');
    const sessionAccountId = localStorage.getItem('staffAccountId');
    const sessionAuctionId = localStorage.getItem('activeAuctionId');
    const isSession = localStorage.getItem('isStaffSession') === 'true';

    if (name && isSession && sessionAccountId === accountId && sessionAuctionId === auctionId) {
      setIsAuthorized(true);
      setStaffName(name);
    } else {
      setIsAuthorized(false);
    }
  }, [accountId, auctionId]);

  useEffect(() => {
    if (!isAuthorized || !firestore || !accountId || !auctionId || !itemId) {
      if (isAuthorized === false) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribers = [
      onSnapshot(doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId), (docSnap) => {
        if (docSnap.exists()) {
          const itemData = { id: docSnap.id, ...docSnap.data() } as Item;
          setItem(itemData);
          setRunnerName(itemData.assignedRunner || '');
        } else {
          setItem(null);
        }
      }),
      onSnapshot(doc(firestore, 'accounts', accountId, 'auctions', auctionId), (docSnap) => {
        setAuction(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Auction : null);
      }),
      onSnapshot(collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'lots'), (snap) => {
        setLots(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lot)));
      }),
      onSnapshot(collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons'), (snap) => {
        setRegisteredPatrons(snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisteredPatron)));
      }),
      onSnapshot(collection(firestore, 'accounts', accountId, 'patrons'), (snap) => {
        setPatrons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patron)));
      }),
    ];

    setIsLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [isAuthorized, firestore, accountId, auctionId, itemId]);

  const registeredPatronsWithDetails = useMemo(() => {
    return registeredPatrons
      .map(rp => {
        const p = patrons.find(patron => patron.id === rp.patronId);
        if (!p) return null;
        return { ...p, biddingNumber: rp.bidderNumber };
      })
      .filter((p): p is Patron & { biddingNumber: number } => p !== null);
  }, [registeredPatrons, patrons]);

  if (isAuthorized === false) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 text-center">
        <Frown className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have an active staff session for this auction.</p>
        <Button asChild>
          <Link href={`/staff-login/${accountId}/${auctionId}`}>Go to Staff Login</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || isAuthorized === null) {
    return <div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!item || !auction) {
    return <div className="text-center p-8">Item or auction not found.</div>;
  }

  const handleItemUpdate = async (itemData: ItemFormValues) => {
    if (!firestore || !accountId || !storage) {
        if (!accountId) console.error("Developer Error: accountId is missing from the save handler");
        return;
    }
    try {
        const storagePath = `items/${accountId}/${auctionId}`;
        const finalImageUrl = itemData.imageUrl && itemData.imageUrl.startsWith('data:')
            ? await uploadDataUriAndGetURL(storage, itemData.imageUrl, storagePath)
            : (itemData.imageUrl === "" ? deleteField() : itemData.imageUrl);
        
        if (itemData.imageUrl === "" && item.imageUrl) await deleteFileByUrl(storage, item.imageUrl);
        
        await runTransaction(firestore, async (transaction) => {
            const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
            const category = auction.categories.find(c => c.name === itemData.categoryId) || {id: 'cat-misc', name: 'Misc'};
            
            let donor: Donor | undefined | null = null;
            if (itemData.donorId) {
                const donorSnap = await transaction.get(doc(firestore, 'accounts', accountId, 'donors', itemData.donorId));
                if (donorSnap.exists()) donor = { id: donorSnap.id, ...donorSnap.data() } as Donor;
            }

            const updatePayload: { [key: string]: any } = {
                sku: itemData.sku || item.sku,
                name: itemData.name,
                description: itemData.description || "",
                estimatedValue: itemData.estimatedValue,
                category,
                categoryId: category.id,
                lotId: itemData.lotId === 'none' ? deleteField() : (itemData.lotId || deleteField()),
                donor: donor === null ? deleteField() : donor,
                donorId: itemData.donorId || deleteField(),
                assignedRunner: itemData.assignedRunner || deleteField(),
                ...(finalImageUrl !== item.imageUrl && { imageUrl: finalImageUrl, thumbnailUrl: finalImageUrl })
            };
            transaction.update(itemRef, updatePayload);
        });
        toast({ title: "Item Updated", description: `Changes to "${itemData.name}" were saved.` });
        setIsEditDialogOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };

  const handleWinningBidSubmit = async (winningBid: number, winner: Patron) => {
    if (!firestore || !accountId) {
        if (!accountId) console.error("Developer Error: accountId is missing from the save handler");
        return;
    }
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
    try {
      await updateDoc(itemRef, { 
        winningBid: winningBid, 
        winnerId: winner.id, 
        winner: winner,
        metadata: { updatedBy: staffName, updatedAt: serverTimestamp() } 
      });
      toast({ title: "Winning Bid Entered" });
      setIsWinningBidDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handlePrintAuctioneerSheet = () => {
    if (!item || !auction) return;
    exportAuctioneerSheetToHTML(item, auction);
  };

  const handleSaveRunner = async () => {
    if (!firestore || !accountId || !auctionId || !itemId) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'items', itemId);
    try {
      await updateDoc(itemRef, { assignedRunner: runnerName });
      toast({ title: "Runner Assigned" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Save Failed" });
    }
  };

  return (
    <>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href={`/public-staff/${accountId}/${auctionId}`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">
                {item.name}
            </h1>
            <div className="flex items-center gap-2">
                <Badge variant="outline">{item.category.name}</Badge>
                {item.assignedRunner && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        Runner: {item.assignedRunner}
                    </Badge>
                )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:ml-auto sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintAuctioneerSheet}
              className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print for Auctioneer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsWinningBidDialogOpen(true)}>
              <Gavel className="mr-2 h-4 w-4" />
              Enter Winning Bid
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Item
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
             <Card>
              <CardHeader><CardTitle>Item Image</CardTitle></CardHeader>
              <CardContent className="flex justify-center items-center">
                <div className="relative aspect-video w-full max-w-lg bg-muted rounded-lg flex items-center justify-center">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-contain rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground"><ImageIcon className="h-12 w-12" /><p>No image uploaded</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="runner">Assigned Runner / Child</Label>
                    <div className="flex gap-2">
                        <Input 
                            id="runner"
                            placeholder="Enter name"
                            value={runnerName}
                            onChange={(e) => setRunnerName(e.target.value)}
                            onBlur={handleSaveRunner}
                        />
                        <Button variant="ghost" size="icon" onClick={handleSaveRunner}>
                            <UserCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Valuation & Bidding</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Estimated Value</span><span>{formatCurrency(item.estimatedValue)}</span></div>
                <div className="flex items-center justify-between font-semibold"><span>Winning Bid</span><span>{item.winningBid ? formatCurrency(item.winningBid) : 'N/A'}</span></div>
              </CardContent>
            </Card>
            {item.donor && (
              <Card>
                <CardHeader><CardTitle>Donated By</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="h-12 w-12 sm:flex"><AvatarFallback><Gift /></AvatarFallback></Avatar>
                    <div className="grid gap-1 flex-1"><p className="text-sm font-medium leading-none">{item.donor.name}</p><p className="text-sm text-muted-foreground">{item.donor.email}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
            {item.winner && (
              <Card>
                <CardHeader><CardTitle>Winner</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="h-12 w-12 sm:flex">
                      <AvatarImage src={userAvatar?.imageUrl} alt={item.winner.firstName} />
                      <AvatarFallback>{item.winner.firstName.charAt(0)}{item.winner.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1 flex-1"><p className="text-sm font-medium leading-none">{item.winner.firstName} {item.winner.lastName}</p><p className="text-sm text-muted-foreground">{item.winner.email}</p></div>
                     <div className="w-full sm:w-auto">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href={`/public-staff/${accountId}/${auctionId}/patrons/${item.winner.id}`}>View Patron</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <EnterWinningBidDialog isOpen={isWinningBidDialogOpen} onClose={() => setIsWinningBidDialogOpen(false)} item={item} patrons={registeredPatronsWithDetails} onSubmit={handleWinningBidSubmit} />
      <EditItemDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} item={item} onSubmit={handleItemUpdate} categories={auction.categories || []} lots={lots || []} auctionType={auction.type} accountId={accountId} />
    </>
  );
}
