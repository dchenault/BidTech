
'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuctions } from '@/hooks/use-auctions';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Gift, ImageIcon, Pencil, Gavel } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { EditItemDialog } from '@/components/edit-item-dialog';
import type { ItemFormValues, Patron, RegisteredPatron } from '@/lib/types';
import { usePatrons } from '@/hooks/use-patrons';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { EnterWinningBidDialog } from '@/components/enter-winning-bid-dialog';
import { useToast } from '@/hooks/use-toast';

export default function ItemDetailsPage() {
  const params = useParams();
  const { getAuction, getItem, getAuctionLots, updateItemInAuction } = useAuctions();
  const { patrons, isLoading: isLoadingPatrons } = usePatrons();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWinningBidDialogOpen, setIsWinningBidDialogOpen] = useState(false);

  const auctionId = typeof params.id === 'string' ? params.id : '';
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';

  const auction = getAuction(auctionId);
  const item = getItem(auctionId, itemId);
  const { lots } = getAuctionLots(auctionId);
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  const registeredPatronsRef = useMemoFirebase(
    () => (firestore && accountId && auctionId ? collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'registered_patrons') : null),
    [firestore, accountId, auctionId]
  );
  const { data: registeredPatronsData } = useCollection<RegisteredPatron>(registeredPatronsRef);

  const registeredPatronsWithDetails = useMemo(() => {
    if (!registeredPatronsData || isLoadingPatrons) return [];
  
    return registeredPatronsData
      .map(rp => {
        const patronDetails = patrons.find(p => p.id === rp.patronId);
        if (!patronDetails) return null;
  
        return {
          ...patronDetails,
          accountId: patronDetails.accountId,
          biddingNumber: rp.bidderNumber,
        };
      })
      .filter((p): p is Patron & { biddingNumber: number; } => p !== null);
  }, [registeredPatronsData, patrons, isLoadingPatrons]);


  if (!auction || !item) {
    return <div>Item not found.</div>;
  }

  const handleItemUpdate = async (updatedItemData: ItemFormValues) => {
    if (!auction || !item) return;
    await updateItemInAuction(auction.id, item.id, item, updatedItemData);
    setIsEditDialogOpen(false);
  };
  
  const handleWinningBidSubmit = async (winningBid: number, winner: Patron) => {
    if (!auction || !item || !firestore || !accountId) return;
    const itemRef = doc(firestore, 'accounts', accountId, 'auctions', auction.id, 'items', item.id);
    
    try {
      await updateDoc(itemRef, { 
        winningBid: winningBid, 
        winnerId: winner.id, 
        winner: winner 
      });
      toast({
        title: "Winning Bid Entered",
        description: `The winning bid for "${item.name}" has been recorded.`
      });
      setIsWinningBidDialogOpen(false);
    } catch (error) {
      console.error("Error submitting winning bid:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the winning bid. Please try again.'
      });
    }
  };


  return (
    <>
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href={`/dashboard/auctions/${auctionId}`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            {item.name}
          </h1>
          <Badge variant="outline">{item.category.name}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsWinningBidDialogOpen(true)}
            >
              <Gavel className="mr-2 h-4 w-4" />
              Enter Winning Bid
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Item
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2 space-y-6">
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Card>
                <CardHeader>
                  <CardTitle>Item Image</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                  <div className="relative aspect-video w-full max-w-lg bg-muted rounded-lg flex items-center justify-center">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-12 w-12" />
                        <p>No image uploaded</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Valuation & Bidding</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Estimated Value
                  </span>
                  <span>{formatCurrency(item.estimatedValue)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Winning Bid</span>
                  <span>
                    {item.winningBid ? formatCurrency(item.winningBid) : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
            {item.donor && (
              <Card>
                <CardHeader>
                  <CardTitle>Donated By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="hidden h-12 w-12 sm:flex">
                      <AvatarFallback>
                        <Gift />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">
                        {item.donor.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.donor.email}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/donors/${item.donor.id}`}>
                          View Donor
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {item.winner && (
              <Card>
                <CardHeader>
                  <CardTitle>Winner</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="hidden h-12 w-12 sm:flex">
                      <AvatarImage
                        src={userAvatar?.imageUrl}
                        alt={item.winner.firstName}
                      />
                      <AvatarFallback>
                        {item.winner.firstName.charAt(0)}
                        {item.winner.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">
                        {item.winner.firstName} {item.winner.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.winner.email}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/patrons/${item.winner.id}`}>
                          View Patron
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <EnterWinningBidDialog
        isOpen={isWinningBidDialogOpen}
        onClose={() => setIsWinningBidDialogOpen(false)}
        item={item}
        patrons={registeredPatronsWithDetails}
        onSubmit={handleWinningBidSubmit}
      />

      <EditItemDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        item={item}
        onSubmit={handleItemUpdate}
        categories={auction.categories || []}
        lots={lots || []}
        auctionType={auction.type}
      />
    </>
  );
}
