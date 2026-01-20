
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

interface ExportAuctionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  auctions: Auction[];
  onSubmit: (auctionId: string) => void;
  title: string;
  description: string;
  isLoading: boolean;
}

export function ExportAuctionDialog({
  isOpen,
  onClose,
  auctions,
  onSubmit,
  title,
  description,
  isLoading,
}: ExportAuctionDialogProps) {
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAuctionId) {
      toast({
        variant: 'destructive',
        title: 'No Auction Selected',
        description: 'Please select an auction to export.',
      });
      return;
    }
    onSubmit(selectedAuctionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading auctions...</span>
            </div>
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
          <Button onClick={handleSubmit} disabled={!selectedAuctionId || isLoading}>
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
