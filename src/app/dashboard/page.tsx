
'use client';

import { useAuctions } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { DollarSign, Gavel, Users, HeartHandshake, TrendingUp, Circle, ArrowLeft, Wallet, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useMemo, useEffect, useState } from 'react';
import type { Item, RegisteredPatron } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from '@/hooks/use-account';
import { Button } from '@/components/ui/button';
import { useStaffSession } from '@/hooks/use-staff-session';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { query, collectionGroup, where, collection } from 'firebase/firestore';

const LivePulse = () => (
  <div className="flex items-center gap-1.5 ml-auto">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </span>
    <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Live</span>
  </div>
);

export default function DashboardPage() {
    const firestore = useFirestore();
    const { accountId } = useAccount();
    const { auctions, isLoading: isLoadingAuctions } = useAuctions();
    const { patrons, isLoading: isLoadingPatrons } = usePatrons();
    const { isStaffSession } = useStaffSession();
    
    // Real-time listener for all items in the account
    const itemsQuery = useMemoFirebase(
        () => (firestore && accountId ? query(collectionGroup(firestore, 'items'), where('accountId', '==', accountId)) : null),
        [firestore, accountId]
    );
    const { data: allItemsData, isLoading: isLoadingItems } = useCollection<Item>(itemsQuery);
    const allItems = useMemo(() => allItemsData || [], [allItemsData]);

    const activeAuctions = useMemo(() => {
        return auctions.filter(a => a.status === 'active');
    }, [auctions]);

    const [selectedActiveAuctionId, setSelectedActiveAuctionId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (activeAuctions.length > 0 && !selectedActiveAuctionId) {
            setSelectedActiveAuctionId(activeAuctions[0].id);
        }
    }, [activeAuctions, selectedActiveAuctionId]);

    // Registered Patrons listener for the selected active auction
    const regPatronsRef = useMemoFirebase(
        () => (firestore && accountId && selectedActiveAuctionId ? collection(firestore, 'accounts', accountId, 'auctions', selectedActiveAuctionId, 'registered_patrons') : null),
        [firestore, accountId, selectedActiveAuctionId]
    );
    const { data: registeredPatronsData, isLoading: isLoadingRegPatrons } = useCollection<RegisteredPatron>(regPatronsRef);

    // Command Center Calculations
    const commandCenterStats = useMemo(() => {
        if (!selectedActiveAuctionId) return null;

        const auctionItems = allItems.filter(i => i.auctionId === selectedActiveAuctionId);
        const physicalItems = auctionItems.filter(i => !i.sku.toString().startsWith('DON-'));
        const donations = auctionItems.filter(i => i.sku.toString().startsWith('DON-'));

        const revenueItems = auctionItems.reduce((sum, i) => sum + (i.winningBid || 0), 0);
        const soldCount = physicalItems.filter(i => (i.winningBid || 0) > 0).length;
        const totalPhysicalCount = physicalItems.length;
        const totalDonations = donations.reduce((sum, i) => sum + (i.winningBid || 0), 0);

        // Payment Tracking (Physical Items Only)
        const totalPhysicalRevenue = physicalItems.reduce((sum, i) => sum + (i.winningBid || 0), 0);
        const paidPhysicalRevenue = physicalItems.filter(i => i.paid).reduce((sum, i) => sum + (i.winningBid || 0), 0);
        const unpaidPhysicalRevenue = totalPhysicalRevenue - paidPhysicalRevenue;
        const paymentProgress = totalPhysicalRevenue > 0 ? (paidPhysicalRevenue / totalPhysicalRevenue) * 100 : 0;

        return {
            revenue: revenueItems,
            soldCount,
            totalPhysicalCount,
            donations: totalDonations,
            registeredCount: registeredPatronsData?.length || 0,
            totalPhysicalRevenue,
            paidPhysicalRevenue,
            unpaidPhysicalRevenue,
            paymentProgress
        };
    }, [selectedActiveAuctionId, allItems, registeredPatronsData]);

    const globalStats = useMemo(() => {
        const totalRevenue = allItems.reduce((sum, item) => sum + (item.winningBid || 0), 0);
        const totalPatrons = patrons.length;
        return { totalRevenue, totalPatrons };
    }, [allItems, patrons]);

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

    const returnUrl = useMemo(() => {
        if (!selectedActiveAuctionId || !accountId) return null;
        return isStaffSession 
            ? `/public-staff/${accountId}/${selectedActiveAuctionId}`
            : `/dashboard/auctions/${selectedActiveAuctionId}`;
    }, [selectedActiveAuctionId, accountId, isStaffSession]);

    const isLoading = isLoadingAuctions || isLoadingPatrons || isLoadingItems;

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Bulk Update Notice */}
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">
                    New Business Name data is ready to be applied to Auction s3VnbScgvA5TgsLy6vRn.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/update-business">
                    Run Update Utility <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Command Center - Active Auction Focused */}
            {activeAuctions.length > 0 && commandCenterStats && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-bold uppercase tracking-tight">Auction Command Center</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {returnUrl && (
                                <Button 
                                    asChild 
                                    variant="outline" 
                                    size="sm"
                                    className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 font-bold"
                                >
                                    <Link href={returnUrl}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Return to Auction
                                    </Link>
                                </Button>
                            )}
                            <Select onValueChange={setSelectedActiveAuctionId} value={selectedActiveAuctionId}>
                                <SelectTrigger className="w-[200px] bg-background">
                                    <SelectValue placeholder="Select active auction" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeAuctions.map(auction => (
                                        <SelectItem key={auction.id} value={auction.id}>
                                            {auction.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <Card className="border-l-4 border-l-green-500 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Live Revenue</CardTitle>
                                <LivePulse />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-green-600 tracking-tighter">
                                    {formatCurrency(commandCenterStats.revenue)}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Winning Bids + Cash Donations</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Catalog Progress</CardTitle>
                                <LivePulse />
                            </Header>
                            <CardContent>
                                <div className="text-3xl font-black text-orange-600 tracking-tighter">
                                    {commandCenterStats.soldCount} <span className="text-lg text-muted-foreground font-medium">/ {commandCenterStats.totalPhysicalCount}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Items with recorded winners</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Registered Bidders</CardTitle>
                                <LivePulse />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-blue-600 tracking-tighter">
                                    {commandCenterStats.registeredCount}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Patrons assigned bidding numbers</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 shadow-md bg-amber-50/30 dark:bg-amber-950/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-amber-600">Unpaid Balance</CardTitle>
                                <Wallet className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-3xl font-black text-amber-600 tracking-tighter">
                                    {formatCurrency(commandCenterStats.unpaidPhysicalRevenue)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                        <span>Collection Progress</span>
                                        <span>{Math.round(commandCenterStats.paymentProgress)}%</span>
                                    </div>
                                    <Progress value={commandCenterStats.paymentProgress} className="h-1.5 bg-amber-200 dark:bg-amber-900/30" />
                                    <p className="text-[9px] text-muted-foreground leading-tight">
                                        {formatCurrency(commandCenterStats.paidPhysicalRevenue)} Paid / {formatCurrency(commandCenterStats.totalPhysicalRevenue)} Total Items
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-pink-500 shadow-md bg-pink-50/30 dark:bg-pink-950/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase text-pink-600">Direct Donations</CardTitle>
                                <HeartHandshake className="h-4 w-4 text-pink-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-pink-600 tracking-tighter">
                                    {formatCurrency(commandCenterStats.donations)}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-tight text-pink-600">Charitable donations from patrons</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* Global Stats Section */}
            <section className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(globalStats.totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all historical events</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Master Patron List</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {globalStats.totalPatrons}
                        </div>
                        <p className="text-xs text-muted-foreground">Total unique donors in system</p>
                    </CardContent>
                </Card>
            </section>

            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
                <Card className="col-span-1">
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
                <Card className="col-span-1">
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
        </div>
    );
}
