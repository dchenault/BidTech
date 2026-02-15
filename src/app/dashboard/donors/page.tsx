
'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { useDonors } from '@/hooks/use-donors';
import type { Donor, DonorFormValues } from '@/lib/types';
import { EditDonorForm } from '@/components/edit-donor-form';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function DonorsPage() {
  const { donors, updateDonor, addDonor, deleteDonor, isLoading } = useDonors();
  const { searchQuery, setSearchQuery } = useSearch();
  const { toast } = useToast();

  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null);
  const [isAddDonorDialogOpen, setIsAddDonorDialogOpen] = useState(false);
  const [addFormKey, setAddFormKey] = useState(Date.now());

  const filteredDonors = useMemo(() => {
    if (!searchQuery) return donors;
    return donors.filter(donor =>
      donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [donors, searchQuery]);

  const handleDonorUpdated = (updatedDonorData: DonorFormValues) => {
    if (!editingDonor) return;
    updateDonor(editingDonor.id, updatedDonorData);
    setEditingDonor(null);
     toast({
        title: "Donor Updated!",
        description: `The details for ${updatedDonorData.name} have been successfully updated.`,
    });
  };
  
  const handleDonorAdded = async (newDonorData: DonorFormValues) => {
    try {
        await addDonor(newDonorData);
        setIsAddDonorDialogOpen(false);
        setAddFormKey(Date.now()); // Reset the form for the next time
        toast({
            title: "Donor Added!",
            description: `The details for ${newDonorData.name} have been successfully added.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error Adding Donor",
            description: "Could not save the new donor. Please try again.",
        });
        console.error("Error adding donor:", error);
    }
  }

  const handleDeleteClick = (donor: Donor) => {
    // TODO: Check if donor is linked to items before allowing deletion
    setDonorToDelete(donor);
  };

  const handleConfirmDelete = async () => {
    if (!donorToDelete) return;

    try {
      await deleteDonor(donorToDelete.id);
      toast({
        title: "Donor Deleted",
        description: `"${donorToDelete.name}" has been successfully deleted.`,
      });
      setDonorToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting Donor",
        description: error.message,
      });
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Donors</CardTitle>
              <CardDescription>Manage your master list of item donors.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Dialog open={isAddDonorDialogOpen} onOpenChange={(isOpen) => {
                 setIsAddDonorDialogOpen(isOpen);
                 if (!isOpen) setAddFormKey(Date.now());
               }}>
                <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Donor</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Donor</DialogTitle>
                        <DialogDescription>Fill in the details for the new donor.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <EditDonorForm key={addFormKey} onSuccess={handleDonorAdded} submitButtonText="Add Donor" />
                    </div>
                </DialogContent>
               </Dialog>
            </div>
          </div>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search donors by name or email..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading donors...</div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead>
                      Actions
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredDonors.map((donor) => (
                    <TableRow 
                        key={donor.id}
                        onClick={() => setEditingDonor(donor)}
                        className="cursor-pointer"
                    >
                    <TableCell className="font-medium">
                        {donor.name}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{donor.type}</Badge></TableCell>
                    <TableCell>{donor.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{donor.phone}</TableCell>
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
                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); setEditingDonor(donor)}}>
                            Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(donor) }} 
                                className="text-destructive"
                            >
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
            Showing <strong>1-{filteredDonors.length}</strong> of <strong>{donors.length}</strong> donors
          </div>
        </CardFooter>
      </Card>

       <Dialog open={!!editingDonor} onOpenChange={(isOpen) => !isOpen && setEditingDonor(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Donor</DialogTitle>
            <DialogDescription>
              Update the details for {editingDonor?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <EditDonorForm 
              onSuccess={handleDonorUpdated} 
              donor={editingDonor}
              submitButtonText="Update Donor"
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!donorToDelete} onOpenChange={(isOpen) => !isOpen && setDonorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the donor "{donorToDelete?.name}" from your master list.
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
