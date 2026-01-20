
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Patron, PatronFormValues } from "@/lib/types";
import { EditPatronForm } from "./edit-patron-form";

interface EditPatronDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patron: Patron | null;
  onSuccess: (values: PatronFormValues) => void;
}

export function EditPatronDialog({
  isOpen,
  onClose,
  patron,
  onSuccess,
}: EditPatronDialogProps) {
  if (!patron) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Patron</DialogTitle>
          <DialogDescription>
            Update the details for {patron.firstName} {patron.lastName}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditPatronForm
            onSuccess={onSuccess}
            patron={patron}
            submitButtonText="Update Patron"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
