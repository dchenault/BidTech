
'use client';

import { useAuctions, fetchAuctionItems } from '@/hooks/use-auctions';
import { usePatrons } from '@/hooks/use-patrons';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { DollarSign, Gavel, Users, Activity, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMemo, useEffect, useState } from 'react';
import type { Item } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from '@/hooks/use-account';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function DashboardPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { user } = useUser();
    const { accountId, role, isAccountLoading } = useAccount();
    const { auctions, isLoading: isLoadingAuctions } = useAuctions();
    const { patrons, isLoading: isLoadingPatrons } = usePatrons();
    const [allItems, setAllItems] = useState<Item[]>([]);
    const [isLoadingAllItems, setIsLoadingAllItems] = useState(true);
    const [selectedActiveAuctionId, setSelectedActiveAuctionId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (firestore && accountId && auctions.length > 0 && role === 'admin') {
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
    }, [firestore, accountId, auctions, isLoadingAuctions, role]);

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

    const isLoading = isAccountLoading || isLoadingAuctions || (role === 'admin' && (isLoadingPatrons || isLoadingAllItems));

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
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    {role === 'admin' ? 'Account Dashboard' : 'Staff Portal'}
                </h1>
            </div>

            {role === 'admin' ? (
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                            <p className="text-xs text-muted-foreground">From all completed bids</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Auction Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(selectedAuctionRevenue)}</div>
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
                            <div className="text-2xl font-bold">{stats.totalPatrons}</div>
                            <p className="text-xs text-muted-foreground">In your master list</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{allItems.length}</div>
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
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="col-span-full">
                        <CardHeader>
                            <CardTitle>Welcome back, {user?.displayName || 'Staff'}</CardTitle>
                            <CardDescription>
                                You are currently logged in to the Staff Portal. You have access to manage items, enter winning bids, and check in patrons for your assigned auctions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <Button asChild size="lg">
                                <Link href="/dashboard/auctions">
                                    <Gavel className="mr-2 h-5 w-5" />
                                    Go to My Auctions
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Your Active Auctions</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeAuctions.length}</div>
                            <p className="text-xs text-muted-foreground">Auctions currently live</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Assigned Auctions</CardTitle>
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{auctions.length}</div>
                            <p className="text-xs text-muted-foreground">Total assigned events</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
