'use client';

import { useAuctions } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { DollarSign, Gavel, Users } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useMemo, useEffect, useState } from 'react';
import type { Item } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from '@/hooks/use-account';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { query, collectionGroup, where } from 'firebase/firestore';

export default function DashboardPage() {
    const firestore = useFirestore();
    const { accountId } = useAccount();
    const { auctions, isLoading: isLoadingAuctions } = useAuctions();
    const { patrons, isLoading: isLoadingPatrons } = usePatrons();
    
    // Real-time listener for all items in the account
    const itemsQuery = useMemoFirebase(
        () => (firestore && accountId ? query(collectionGroup(firestore, 'items'), where('accountId', '==', accountId)) : null),
        [firestore, accountId]
    );
    const { data: allItemsData, isLoading: isLoadingItems } = useCollection<Item>(itemsQuery);
    const allItems = useMemo(() => allItemsData || [], [allItemsData]);

    const [selectedActiveAuctionId, setSelectedActiveAuctionId] = useState<string | undefined>(undefined);
    
    // Animation states for pulsing metrics
    const [animateTotal, setAnimateTotal] = useState(false);
    const [animateActive, setAnimateActive] = useState(false);
    const [animatePatrons, setAnimatePatrons] = useState(false);
    const [animateItems, setAnimateItems] = useState(false);

    const stats = useMemo(() => {
        const totalRevenue = allItems.reduce((sum, item) => sum + (item.winningBid || 0), 0);
        const totalPatrons = patrons.length;
        return { totalRevenue, totalPatrons };
    }, [allItems, patrons]);

    const activeAuctions = useMemo(() => {
        return auctions.filter(a => a.status === 'active');
    }, [auctions]);

    useEffect(() => {
        if (activeAuctions.length > 0 && !selectedActiveAuctionId) {
            setSelectedActiveAuctionId(activeAuctions[0].id);
        }
        if (selectedActiveAuctionId && !activeAuctions.find(a => a.id === selectedActiveAuctionId)) {
            setSelectedActiveAuctionId(activeAuctions.length > 0 ? activeAuctions[0].id : undefined);
        }
    }, [activeAuctions, selectedActiveAuctionId]);

    const selectedAuctionRevenue = useMemo(() => {
        if (!selectedActiveAuctionId) return 0;
        return allItems
            .filter(item => item.auctionId === selectedActiveAuctionId)
            .reduce((sum, item) => sum + (item.winningBid || 0), 0);
    }, [allItems, selectedActiveAuctionId]);

    // Trigger pulse animations on value changes
    useEffect(() => { if (stats.totalRevenue > 0) { setAnimateTotal(true); const t = setTimeout(() => setAnimateTotal(false), 600); return () => clearTimeout(t); } }, [stats.totalRevenue]);
    useEffect(() => { if (selectedAuctionRevenue > 0) { setAnimateActive(true); const t = setTimeout(() => setAnimateActive(false), 600); return () => clearTimeout(t); } }, [selectedAuctionRevenue]);
    useEffect(() => { if (stats.totalPatrons > 0) { setAnimatePatrons(true); const t = setTimeout(() => setAnimatePatrons(false), 600); return () => clearTimeout(t); } }, [stats.totalPatrons]);
    useEffect(() => { if (allItems.length > 0) { setAnimateItems(true); const t = setTimeout(() => setAnimateItems(false), 600); return () => clearTimeout(t); } }, [allItems.length]);

    const chartData = useMemo(() => {
        return auctions
            .map(auction => {
                const auctionRevenue = allItems
                    .filter(item => item.auctionId === auction.id)
                    .reduce((sum, item) => sum + (item.winningBid || 0), 0);
                return { name: auction.name, total: auctionRevenue };
            })
            .filter(data => data.total > 0) 
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [auctions, allItems]);
    
    const chartConfig = {
        total: {
          label: "Revenue",
          color: "hsl(var(--chart-1))",
        },
    };

    const upcomingAuctions = useMemo(() => {
        return auctions
            .filter(a => a.status === 'upcoming')
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [auctions]);

    const isLoading = isLoadingAuctions || isLoadingPatrons || isLoadingItems;

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-3 w-3/4 mt-1" />
                        </CardContent>
                    </Card>
                ))}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Upcoming Auctions</CardTitle>
                        <CardDescription>Your next scheduled events.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
                <Card className="col-span-1 lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Top Auctions by Revenue</CardTitle>
                        <CardDescription>Your most successful events.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[200px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold transition-all", animateTotal && "animate-value-change")}>
                        {formatCurrency(stats.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">From all completed bids & donations</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Auction Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold transition-all", animateActive && "animate-value-change")}>
                        {formatCurrency(selectedAuctionRevenue)}
                    </div>
                    {activeAuctions.length > 0 ? (
                        <Select onValueChange={setSelectedActiveAuctionId} value={selectedActiveAuctionId}>
                            <SelectTrigger className="text-xs border-none shadow-none focus:ring-0 p-0 h-auto mt-1 w-auto bg-transparent">
                                <SelectValue placeholder="Select an active auction" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeAuctions.map(auction => (
                                    <SelectItem key={auction.id} value={auction.id}>
                                        {auction.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-xs text-muted-foreground">No active auctions</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Patrons</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold transition-all", animatePatrons && "animate-value-change")}>
                        {stats.totalPatrons}
                    </div>
                    <p className="text-xs text-muted-foreground">In your master list</p>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    <Gavel className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold transition-all", animateItems && "animate-value-change")}>
                        {allItems.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all auctions</p>
                </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Upcoming Auctions</CardTitle>
                    <CardDescription>Your next scheduled events.</CardDescription>
                </CardHeader>
                <CardContent>
                   {upcomingAuctions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Auction</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {upcomingAuctions.map(auction => (
                                    <TableRow key={auction.id}>
                                        <TableCell>
                                            <Link href={`/dashboard/auctions/${auction.id}`} className="font-medium hover:underline">
                                                {auction.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{new Date(auction.startDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline">{auction.type}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                   ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No upcoming auctions scheduled.
                        </div>
                   )}
                </CardContent>
            </Card>
             <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Top Auctions by Revenue</CardTitle>
                    <CardDescription>Your most successful events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    hideLabel
                                    formatter={(value) => formatCurrency(value as number)}
                                />}
                            />
                            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
