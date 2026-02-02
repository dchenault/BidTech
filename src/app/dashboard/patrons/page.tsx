
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePatrons } from '@/hooks/use-patrons';
import type { Patron, PatronFormValues, Item } from '@/lib/types';
import { EditPatronForm } from '@/components/edit-patron-form';
import { useSearch } from '@/hooks/use-search';
import { useAuctions, fetchAuctionItems } from '@/hooks/use-auctions';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAccount } from '@/hooks/use-account';


export default function PatronsPage() {
  const router = useRouter();
  const { patrons, updatePatron, addPatron, deletePatron, isLoading: isLoadingPatrons } = usePatrons();
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();
  const { searchQuery, setSearchQuery } = useSearch();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { accountId } = useAccount();

  const [editingPatron, setEditingPatron] = useState<Patron | null>(null);
  const [patronToDelete, setPatronToDelete] = useState<Patron | null>(null);
  const [isAddPatronDialogOpen, setIsAddPatronDialogOpen] = useState(false);
  const [addFormKey, setAddFormKey] = useState(Date.now());

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [isLoadingAllItems, setIsLoadingAllItems] = useState(true);

  useEffect(() => {
    if (firestore && accountId && auctions.length > 0) {
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
  }, [firestore, accountId, auctions, isLoadingAuctions]);

  const patronsWithStats = useMemo(() => {
    if (patrons.length === 0) {
      return [];
    }

    const stats = allItems.reduce((acc, item) => {
      if (item.winningBidderId) {
        if (!acc[item.winningBidderId]) {
          acc[item.winningBidderId] = { totalSpent: 0, itemsWon: 0 };
        }
        // Don't count cash donations as "items won"
        if (!item.sku.toString().startsWith("DON-")) {
          acc[item.winningBidderId].itemsWon += 1;
        }
        acc[item.winningBidderId].totalSpent += item.winningBid || 0;
      }
      return acc;
    }, {} as Record<string, { totalSpent: number; itemsWon: number }>);

    return patrons.map(patron => ({
      ...patron,
      itemsWon: stats[patron.id]?.itemsWon || 0,
      totalSpent: stats[patron.id]?.totalSpent || 0,
    }));
  }, [patrons, allItems]);


  const filteredPatrons = useMemo(() => {
    const sourcePatrons = patronsWithStats;
    if (!searchQuery) return sourcePatrons;
    return sourcePatrons.filter(patron =>
      `${patron.firstName} ${patron.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patron.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patronsWithStats, searchQuery]);


  const handlePatronUpdated = (updatedPatronData: PatronFormValues) => {
    if (!editingPatron) return;
    updatePatron(editingPatron.id, updatedPatronData);
    setEditingPatron(null);
  };
  
  const handlePatronAdded = (newPatronData: PatronFormValues) => {
    addPatron(newPatronData);
    setIsAddPatronDialogOpen(false);
    setAddFormKey(Date.now()); // Reset the form for the next time
  }

  const handleDeleteClick = (patron: Patron & { itemsWon: number, totalSpent: number }) => {
    // This check is a quick UI check. The definitive check is in the hook.
    if (patron.totalSpent > 0 || patron.itemsWon > 0) {
      toast({
        variant: "destructive",
        title: "Deletion Not Allowed",
        description: "This patron cannot be deleted because they have won items or made donations.",
      });
      return;
    }
    setPatronToDelete(patron);
  };

  const handleConfirmDelete = async () => {
    if (!patronToDelete) return;

    try {
      await deletePatron(patronToDelete.id, allItems);
      toast({
        title: "Patron Deleted",
        description: `${patronToDelete.firstName} ${patronToDelete.lastName} has been successfully deleted.`,
      });
      setPatronToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting Patron",
        description: error.message,
      });
    }
  };
  
  const isLoading = isLoadingPatrons || isLoadingAllItems;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Patrons</CardTitle>
              <CardDescription>Manage your master list of patrons.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Dialog open={isAddPatronDialogOpen} onOpenChange={(isOpen) => {
                 setIsAddPatronDialogOpen(isOpen);
                 if (!isOpen) setAddFormKey(Date.now()); // Reset when closing
               }}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Patron</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Patron</DialogTitle>
                        <DialogDescription>Fill in the details for the new patron.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <EditPatronForm key={addFormKey} onSuccess={handlePatronAdded} submitButtonText="Add Patron" />
                    </div>
                </DialogContent>
               </Dialog>
            </div>
          </div>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search patrons by name or email..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading patrons...</div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Items Won</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Total Spent</TableHead>
                    <TableHead>
                      Actions
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredPatrons.map((patron) => (
                    <TableRow 
                        key={patron.id}
                        onClick={() => router.push(`/dashboard/patrons/${patron.id}`)}
                        className="cursor-pointer"
                    >
                    <TableCell className="font-medium">
                        {patron.firstName} {patron.lastName}
                    </TableCell>
                    <TableCell>{patron.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{patron.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{patron.itemsWon || 0}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                        {formatCurrency(patron.totalSpent || 0)}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/patrons/${patron.id}`)}}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPatron(patron)}}>
                            Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(patron) }} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{filteredPatrons.length}</strong> of <strong>{patrons.length}</strong> patrons
          </div>
        </CardFooter>
      </Card>

       <Dialog open={!!editingPatron} onOpenChange={(isOpen) => !isOpen && setEditingPatron(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Patron</DialogTitle>
            <DialogDescription>
              Update the details for {editingPatron?.firstName} {editingPatron?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <EditPatronForm 
              onSuccess={handlePatronUpdated} 
              patron={editingPatron}
              submitButtonText="Update Patron"
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!patronToDelete} onOpenChange={(isOpen) => !isOpen && setPatronToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patron "{patronToDelete?.firstName} {patronToDelete?.lastName}" from your master list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
