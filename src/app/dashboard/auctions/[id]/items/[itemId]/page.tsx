
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
import { ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ItemDetailsPage() {
  const params = useParams();
  const { getAuction, getItem } = useAuctions();

  const auctionId = typeof params.id === 'string' ? params.id : '';
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';

  const auction = getAuction(auctionId);
  const item = getItem(auctionId, itemId);
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  if (!auction || !item) {
    return <div>Item not found.</div>;
  }

  return (
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
        <Badge variant="outline" className="ml-auto sm:ml-0">
          {item.category.name}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Image
              alt={item.name}
              className="aspect-[4/3] w-full rounded-md object-cover"
              height="400"
              src={item.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
              width="600"
              data-ai-hint="item image"
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valuation & Bidding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Value</span>
                <span>{formatCurrency(item.estimatedValue)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Winning Bid</span>
                <span>{item.winningBid ? formatCurrency(item.winningBid) : 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
          {item.winner && (
            <Card>
              <CardHeader>
                <CardTitle>Winner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="hidden h-12 w-12 sm:flex">
                     <AvatarImage src={userAvatar?.imageUrl} alt={item.winner.firstName} />
                     <AvatarFallback>
                        {item.winner.firstName.charAt(0)}
                        {item.winner.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {item.winner.firstName} {item.winner.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.winner.email}</p>
                  </div>
                   <div className="ml-auto font-medium">
                     <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/patrons/${item.winner.id}`}>View Patron</Link>
                     </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
