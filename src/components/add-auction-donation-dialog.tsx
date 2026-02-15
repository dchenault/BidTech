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
import type { Patron } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "./ui/combobox";

interface AddAuctionDonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patrons: (Patron & { biddingNumber: number; })[];
  onSubmit: (amount: number, patron: Patron) => void;
}

export function AddAuctionDonationDialog({
  isOpen,
  onClose,
  patrons,
  onSubmit,
}: AddAuctionDonationDialogProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [patronId, setPatronId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when dialog opens
    if (isOpen) {
      setAmount("");
      setPatronId(undefined);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const donationAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (!donationAmount || donationAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
      });
      return;
    }

    if (!patronId) {
      toast({
        variant: "destructive",
        title: "No Patron Selected",
        description: "Please select a patron.",
      });
      return;
    }

    const patron = patrons.find(p => p.id === patronId);
    if (!patron) {
         toast({
            variant: "destructive",
            title: "Patron Not Found",
            description: "The selected patron could not be found.",
         });
         return;
    }
    
    onSubmit(donationAmount, patron);
    toast({
        title: "Donation Recorded",
        description: `A donation of ${donationAmount} for ${patron.firstName} ${patron.lastName} has been recorded.`
    })
    onClose();
  };

  const patronOptions = patrons.map(p => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} (#${p.biddingNumber})`
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record a Donation</DialogTitle>
          <DialogDescription>
            Select a registered patron and enter the donation amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="winner" className="text-right">
              Patron
            </Label>
            <Combobox
                options={patronOptions}
                value={patronId}
                onChange={setPatronId}
                placeholder="Select a patron..."
                searchPlaceholder="Search patrons..."
                noResultsText="No patron found."
                className="col-span-3"
             />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Donation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
