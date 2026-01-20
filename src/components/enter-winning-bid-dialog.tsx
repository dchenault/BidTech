
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item, Patron } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface EnterWinningBidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  patrons: Patron[];
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
      setWinnerId(item.winner?.id);
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
    toast({
        title: "Winning Bid Entered",
        description: `The winning bid for "${item?.name}" has been recorded.`
    })
    onClose();
  };
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Winning Bid for "{item.name}"</DialogTitle>
          <DialogDescription>
            Enter the final bid amount and select the winning patron. Both fields are required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bidAmount" className="text-right">
              Bid Amount
            </Label>
            <Input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="col-span-3"
              placeholder="e.g. 150.00"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="winner" className="text-right">
              Winner
            </Label>
            <Select onValueChange={setWinnerId} value={winnerId} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a patron" />
              </SelectTrigger>
              <SelectContent>
                {patrons.map((patron) => (
                  <SelectItem key={patron.id} value={patron.id}>
                    {patron.firstName} {patron.lastName} (Bidder #: {patron.biddingNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
