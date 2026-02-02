
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Copy, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateAuctionForm } from '@/components/create-auction-form';
import type { Auction, FormValues } from '@/lib/types';
import { useAuctions } from '@/hooks/use-auctions';
import { useToast } from '@/hooks/use-toast';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';


export default function AuctionsPage() {
  const router = useRouter();
  const { auctions, addAuction, updateAuction, isLoading } = useAuctions();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const { toast } = useToast();

  const filteredAuctions = useMemo(() => {
    if (!searchQuery) return auctions;
    return auctions.filter(auction => 
      auction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (auction.description && auction.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [auctions, searchQuery]);

  const handleAuctionCreated = (newAuctionData: FormValues) => {
    const newAuction = {
      ...newAuctionData,
      startDate: newAuctionData.startDate.toISOString(),
    };
    addAuction(newAuction);
    setIsCreateDialogOpen(false);
  };
  
  const handleAuctionUpdated = (updatedAuctionData: FormValues) => {
    if (!editingAuction) return;

    const updatedAuctionPayload: Partial<Auction> = {
      ...updatedAuctionData,
      startDate: updatedAuctionData.startDate.toISOString(),
      status: new Date(updatedAuctionData.startDate) > new Date() ? 'upcoming' : 'active',
    };
    updateAuction(editingAuction.id, updatedAuctionPayload);
    setEditingAuction(null);
  };

  const handleDuplicateAuction = (auctionToDuplicate: Auction) => {
    const { id, name, ...restOfAuction } = auctionToDuplicate;
    const newAuctionData = {
        ...restOfAuction,
        name: `${name} --copy`,
    };
    addAuction(newAuctionData);
    toast({
      title: 'Auction Duplicated!',
      description: `A copy of "${auctionToDuplicate.name}" has been created.`,
    });
  };


  const renderAuctionsTable = (auctionsToShow: typeof auctions) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Auction Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Items</TableHead>
          <TableHead className="hidden md:table-cell">Start Date</TableHead>
          <TableHead>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {auctionsToShow.map((auction) => (
          <TableRow 
            key={auction.id}
            onClick={() => router.push(`/dashboard/auctions/${auction.id}`)}
            className="cursor-pointer"
          >
            <TableCell className="font-medium">
               {auction.name}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{auction.type}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  auction.status === 'completed'
                    ? 'secondary'
                    : auction.status === 'active'
                    ? 'default'
                    : 'outline'
                }
                className="capitalize"
              >
                {auction.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">{auction.itemCount}</TableCell>
            <TableCell className="hidden md:table-cell">
              {new Date(auction.startDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    aria-haspopup="true" 
                    size="icon" 
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                     <Link href={`/dashboard/auctions/${auction.id}`} className="w-full">View</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingAuction(auction)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateAuction(auction)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Create Auction
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Create New Auction</DialogTitle>
                <DialogDescription>
                  Fill out the details below to create a new auction.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <CreateAuctionForm onSuccess={handleAuctionCreated} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="mt-4">
        <CardHeader>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search auctions by name or description..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="pt-0">
            {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading auctions...</div>
            ) : (
                <>
                    <TabsContent value="all">{renderAuctionsTable(filteredAuctions)}</TabsContent>
                    <TabsContent value="active">
                        {renderAuctionsTable(filteredAuctions.filter((a) => a.status === 'active'))}
                    </TabsContent>
                    <TabsContent value="upcoming">
                        {renderAuctionsTable(filteredAuctions.filter((a) => a.status === 'upcoming'))}
                    </TabsContent>
                    <TabsContent value="completed">
                        {renderAuctionsTable(filteredAuctions.filter((a) => a.status === 'completed'))}
                    </TabsContent>
                </>
            )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{filteredAuctions.length}</strong> of <strong>{auctions.length}</strong> auctions
          </div>
        </CardFooter>
      </Card>
    </Tabs>
    
    <Dialog open={!!editingAuction} onOpenChange={(isOpen) => !isOpen && setEditingAuction(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Auction</DialogTitle>
            <DialogDescription>
              Update the details for the "{editingAuction?.name}" auction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CreateAuctionForm 
              onSuccess={handleAuctionUpdated} 
              auction={editingAuction}
              submitButtonText="Update Auction"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
