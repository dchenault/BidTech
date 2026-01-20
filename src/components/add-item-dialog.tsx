
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ItemFormValues, Category, Lot, Auction } from "@/lib/types";
import { AddItemForm } from "./add-item-form";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ItemFormValues) => void;
  categories: Category[];
  lots: Lot[];
  auctionType: Auction['type'];
}

export function AddItemDialog({
  isOpen,
  onClose,
  onSubmit,
  categories,
  lots,
  auctionType
}: AddItemDialogProps) {

  const handleSuccess = (values: ItemFormValues) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Fill out the details for the new item below.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AddItemForm
            onSuccess={handleSuccess}
            categories={categories}
            lots={lots}
            auctionType={auctionType}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
