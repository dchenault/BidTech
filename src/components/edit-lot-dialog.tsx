
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Lot, LotFormValues } from "@/lib/types";
import { EditLotForm } from "./edit-lot-form";

interface EditLotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LotFormValues) => void;
  lot: Lot | null;
}

export function EditLotDialog({
  isOpen,
  onClose,
  onSubmit,
  lot,
}: EditLotDialogProps) {

  if (!lot) return null;

  const handleSuccess = (values: LotFormValues) => {
    onSubmit(values);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Lot</DialogTitle>
          <DialogDescription>Update the name for the "{lot.name}" lot.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditLotForm 
            onSuccess={handleSuccess}
            lot={lot}
            submitButtonText="Update Lot"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
