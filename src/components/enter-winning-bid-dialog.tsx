"use client";

import { useState, useEffect, useMemo } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setBidAmount(item?.winningBid || "");
      setWinnerId(item?.winnerId);
      setSearchQuery("");
    }
  }, [isOpen, item]);

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

  const filteredPatrons = useMemo(() => {
    if (!searchQuery) {
      return patrons;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return patrons.filter(p => 
      p.biddingNumber?.toString().includes(searchQuery) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowercasedQuery)
    );
  }, [patrons, searchQuery]);

  const selectedPatronLabel = useMemo(() => {
    if (!winnerId) return "Select a patron...";
    const patron = patrons.find(p => p.id === winnerId);
    if (!patron) return "Select a patron...";
    return `[#${patron.biddingNumber}] ${patron.firstName} ${patron.lastName}`;
  }, [winnerId, patrons]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Winning Bid for "{item.name}"</DialogTitle>
          <DialogDescription>
            Enter the final bid amount and select the winning patron.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bidAmount">
              Bid Amount
            </Label>
            <Input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="e.g. 150.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Winner
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  <span className="truncate">{selectedPatronLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search by name or bidder #..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    autoFocus
                  />
                  <CommandList>
                    <CommandEmpty>No patron found.</CommandEmpty>
                    {filteredPatrons.map((patron) => (
                      <CommandItem
                        key={patron.id}
                        value={`${patron.firstName} ${patron.lastName} ${patron.biddingNumber}`}
                        onSelect={() => {
                          setWinnerId(patron.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            winnerId === patron.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        [#${patron.biddingNumber}] {patron.firstName} {patron.lastName}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!winnerId}>Save Winning Bid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
