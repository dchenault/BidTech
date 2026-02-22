
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useAuctions } from '@/hooks/use-auctions';
import { useAccount } from '@/hooks/use-account';

export default function MyAuctionsPage() {
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();
  const { accountId, assignedAuctions, isLoading: isLoadingAccount } = useAccount();
  const isLoading = isLoadingAuctions || isLoadingAccount;

  const myAuctions = useMemo(() => {
    if (!auctions || !assignedAuctions) return [];
    // For managers, filter by assignedAuctions.
    return auctions.filter(auction => assignedAuctions.includes(auction.id));
  }, [auctions, assignedAuctions]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Loading your auctions...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Assigned Auctions</CardTitle>
        <CardDescription>These are the auctions you have been assigned to help manage.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auction Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myAuctions.length > 0 ? myAuctions.map((auction) => (
              <TableRow key={auction.id}>
                <TableCell className="font-medium">{auction.name}</TableCell>
                <TableCell>
                  <Badge variant={auction.status === 'completed' ? 'secondary' : auction.status === 'active' ? 'default' : 'outline'} className="capitalize">
                    {auction.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(auction.startDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {auction.isPublic && auction.slug && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/catalog/${accountId}/${auction.slug}`} target="_blank">
                          <BookOpen className="mr-2 h-4 w-4" /> View Catalog
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm">
                      <Link href={`/public-staff/${accountId}/${auction.id}`}>
                        Open Staff Portal <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  You have not been assigned to any auctions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
