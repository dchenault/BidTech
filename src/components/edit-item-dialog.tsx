
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Item, ItemFormValues, Category, Lot, Auction } from "@/lib/types";
import { EditItemForm } from "./edit-item-form";

interface EditItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSubmit: (values: ItemFormValues) => void;
  categories: Category[];
  lots: Lot[];
  auctionType: Auction['type'];
}

export function EditItemDialog({
  isOpen,
  onClose,
  item,
  onSubmit,
  categories,
  lots,
  auctionType,
}: EditItemDialogProps) {

  if (!item) return null;

  const handleSuccess = (values: ItemFormValues) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.name}</DialogTitle>
          <DialogDescription>
            Update the details for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditItemForm
            item={item}
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
