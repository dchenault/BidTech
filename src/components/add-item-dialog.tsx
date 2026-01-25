
"use client";

import { useState } from "react";
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
  onSubmit: (values: ItemFormValues) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = async (values: ItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      // Error is handled by the hook's toast, just need to re-enable the form.
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
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
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

    