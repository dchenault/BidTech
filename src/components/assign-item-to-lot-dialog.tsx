
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Item, Lot } from "@/lib/types";

interface AssignItemToLotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  lots: Lot[];
  onAssign: (itemId: string, lotId: string) => void;
}

export function AssignItemToLotDialog({
  isOpen,
  onClose,
  items,
  lots,
  onAssign,
}: AssignItemToLotDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [selectedLotId, setSelectedLotId] = useState<string | undefined>();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedItemId || !selectedLotId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select both an item and a lot.",
      });
      return;
    }
    onAssign(selectedItemId, selectedLotId);
    toast({
      title: "Item Assigned",
      description: "The item has been moved to the selected lot.",
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Item to a Lot</DialogTitle>
          <DialogDescription>
            Select a live item and choose a silent auction lot to move it to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="item" className="text-right">
              Item
            </Label>
            <Select onValueChange={setSelectedItemId} value={selectedItemId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an item to move" />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                            {item.name} (SKU: {item.sku})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lot" className="text-right">
                Lot
            </Label>
             <Select onValueChange={setSelectedLotId} value={selectedLotId} disabled={!lots || lots.length === 0}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={lots.length > 0 ? "Select a destination lot" : "No lots available"} />
                </SelectTrigger>
                <SelectContent>
                    {lots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                            {lot.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!selectedItemId || !selectedLotId}>Assign Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    