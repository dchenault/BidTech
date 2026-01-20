
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Auction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AddDonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  auctions: Auction[];
  onSubmit: (amount: number, auctionId: string) => void;
  isLoading: boolean;
}

export function AddDonationDialog({
  isOpen,
  onClose,
  auctions,
  onSubmit,
  isLoading,
}: AddDonationDialogProps) {
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>();
  const [amount, setAmount] = useState<number | string>("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAuctionId) {
      toast({
        variant: 'destructive',
        title: 'No Auction Selected',
        description: 'Please select an auction to associate the donation with.',
      });
      return;
    }
    const donationAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!donationAmount || donationAmount <= 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Amount',
            description: 'Please enter a valid donation amount.',
        });
        return;
    }
    onSubmit(donationAmount, selectedAuctionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a Donation</DialogTitle>
          <DialogDescription>Enter the donation amount and select the auction to associate it with.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="amount" className="text-right">
                    Amount ($)
                 </Label>
                 <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g. 500.00"
                    required
                 />
            </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading auctions...</span>
            </div>
          ) : (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="auction" className="text-right">
                    Auction
                </Label>
                <Select onValueChange={setSelectedAuctionId} value={selectedAuctionId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an auction" />
                </SelectTrigger>
                <SelectContent>
                    {auctions.map((auction) => (
                    <SelectItem key={auction.id} value={auction.id}>
                        {auction.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedAuctionId || !amount || isLoading}>
            Save Donation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
