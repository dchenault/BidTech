"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import type { Item, Patron } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface EnterWinningBidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  patrons: (Patron & { biddingNumber?: number })[];
  onSubmit: (winningBid: number, winner: Patron) => void;
}

export function EnterWinningBidDialog({
  isOpen,
  onClose,
  item,
  patrons,
  onSubmit,
}: EnterWinningBidDialogProps) {
  const [bidAmount, setBidAmount] = useState<number | string>("");
  const [winnerId, setWinnerId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setBidAmount(item.winningBid || "");
      setWinnerId(item.winner?.id || item.winnerId);
    }
  }, [item]);

  const handleSubmit = () => {
    const bid = typeof bidAmount === 'string' ? parseFloat(bidAmount) : bidAmount;

    if (!bid || bid <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Bid",
        description: "Please enter a valid winning bid amount.",
      });
      return;
    }

    if (!winnerId) {
      toast({
        variant: "destructive",
        title: "No Winner Selected",
        description: "Please select a winning patron.",
      });
      return;
    }

    const winner = patrons.find(p => p.id === winnerId);
    if (!winner) {
         toast({
            variant: "destructive",
            title: "Patron Not Found",
            description: "The selected patron could not be found.",
         });
         return;
    }
    
    onSubmit(bid, winner);
    onClose();
  };
  
  if (!item) return null;

  const patronOptions = patrons.map((p) => ({
    value: p.id,
    label: `${p.biddingNumber ? `#${p.biddingNumber}` : 'N/A'} - ${p.firstName} ${p.lastName}`,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Winning Bid for "{item.name}"</DialogTitle>
          <DialogDescription>
            Search for a bidder by number or name and enter the final amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="winner">
              Winning Bidder
            </Label>
            <Combobox
              options={patronOptions}
              value={winnerId}
              onChange={setWinnerId}
              placeholder="Search Bidder # or Name..."
              searchPlaceholder="Type bidder # or name..."
              noResultsText="No registered patron found."
              autoFocusSearch={true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bidAmount">
              Final Bid Amount ($)
            </Label>
            <Input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="e.g. 150.00"
              required
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Winning Bid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
