
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
import { Loader2 } from 'lucide-react';
import type { Auction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface PrintReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  auctions: Auction[];
  onSubmit: (auctionId: string) => void;
  isLoading: boolean;
}

export function PrintReceiptDialog({
  isOpen,
  onClose,
  auctions,
  onSubmit,
  isLoading,
}: PrintReceiptDialogProps) {
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAuctionId) {
      toast({
        variant: 'destructive',
        title: 'No Auction Selected',
        description: 'Please select an auction to generate a receipt.',
      });
      return;
    }
    onSubmit(selectedAuctionId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Patron Receipt</DialogTitle>
          <DialogDescription>
            Select an auction to generate a printable receipt for this patron's winnings.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading auctions...</span>
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center text-muted-foreground">This patron has not won items in any auction yet.</div>
          ) : (
            <Select onValueChange={setSelectedAuctionId} value={selectedAuctionId}>
              <SelectTrigger>
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedAuctionId || isLoading || auctions.length === 0}>
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
