
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LotFormValues } from "@/lib/types";
import { AddLotForm } from "./add-lot-form";

interface AddLotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LotFormValues) => void;
}

export function AddLotDialog({
  isOpen,
  onClose,
  onSubmit,
}: AddLotDialogProps) {

  const handleSuccess = (values: LotFormValues) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lot</DialogTitle>
          <DialogDescription>
            Create a new lot to group items in this auction.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AddLotForm
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

    