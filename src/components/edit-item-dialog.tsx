
"use client";

import { useState } from "react";
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
  onSubmit: (values: ItemFormValues) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  const handleSuccess = async (values: ItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
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
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

    