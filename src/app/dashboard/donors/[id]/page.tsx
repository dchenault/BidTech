
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDonors } from '@/hooks/use-donors';
import { useAuctions } from '@/hooks/use-auctions';
import type { Item, Donor } from '@/lib/types';

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Gift, Mail, Phone, Building, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { query, collectionGroup, where } from 'firebase/firestore';

export default function DonorDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { accountId } = useAccount();
    const donorId = typeof params.id === 'string' ? params.id : '';

    const { donors, isLoading: isLoadingDonors } = useDonors();
    const { auctions, isLoading: isLoadingAuctions } = useAuctions();
    
    // Targeted query for items belonging to this donor across all auctions in this account.
    const itemsQuery = useMemoFirebase(
        () => (firestore && accountId && donorId
            ? query(
                collectionGroup(firestore, 'items'),
                where('accountId', '==', accountId),
                where('donorId', '==', donorId)
              )
            : null),
        [firestore, accountId, donorId]
    );

    const { data: donorItems, isLoading: isLoadingItems } = useCollection<Item>(itemsQuery);

    const donor = useMemo(() => {
        return donors.find(d => d.id === donorId);
    }, [donors, donorId]);
    
    const itemsWithAuctionName = useMemo(() => {
        if (!donorItems || !auctions) return [];
        return donorItems.map(item => {
            const auction = auctions.find(a => a.id === item.auctionId);
            return { ...item, auctionName: auction?.name || 'Unknown Auction' };
        });
    }, [donorItems, auctions]);

    if (isLoadingDonors || isLoadingAuctions || isLoadingItems) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading donor details...</p>
            </div>
        );
    }

    if (!donor) {
        return (
             <div className="text-center py-10">
                <h2 className="text-xl font-bold">Donor Not Found</h2>
                <Button onClick={() => router.push('/dashboard/donors')} className="mt-4">Back to Donors List</Button>
            </div>
        );
    }

    const totalValueDonated = itemsWithAuctionName.reduce((sum, item) => sum + item.estimatedValue, 0);

    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/dashboard/donors">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Donors</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">
                    Donor Details
                </h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-2xl bg-secondary">
                                    {donor.type === 'Business' ? <Building /> : <Gift />}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{donor.name}</CardTitle>
                                <CardDescription>{donor.type}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           {donor.contactPerson && <p><b>Contact:</b> {donor.contactPerson}</p>}
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{donor.email || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{donor.phone || 'No phone provided'}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Donation Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Items Donated</span>
                                <span className="font-medium">{itemsWithAuctionName.length}</span>
                            </div>
                             <div className="flex justify-between font-semibold">
                                <span>Total Value Donated</span>
                                <span>{formatCurrency(totalValueDonated)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Donated Items</CardTitle>
                            <CardDescription>
                                A history of all items donated by {donor.name}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Auction</TableHead>
                                        <TableHead className="text-right">Est. Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemsWithAuctionName.length > 0 ? (
                                        itemsWithAuctionName.map(item => (
                                            <TableRow key={item.id} onClick={() => router.push(`/dashboard/auctions/${item.auctionId}/items/${item.id}`)} className="cursor-pointer">
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.auctionName}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.estimatedValue)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                                No items have been donated by this donor yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
