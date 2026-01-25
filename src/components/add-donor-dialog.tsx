
"use client"

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Donor, DonorFormValues } from "@/lib/types";
import { EditDonorForm } from "./edit-donor-form";
import { useDonors } from "@/hooks/use-donors";

interface AddDonorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDonor: Donor) => void;
}

export function AddDonorDialog({ isOpen, onClose, onSuccess }: AddDonorDialogProps) {
  const { addDonor } = useDonors();
  const [formKey, setFormKey] = useState(Date.now());

  const handleSuccess = async (values: DonorFormValues) => {
    const newDonor = await addDonor(values);
    if (newDonor) {
      onSuccess(newDonor as Donor);
    }
    onClose();
    setFormKey(Date.now()); // Reset form for next time
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setFormKey(Date.now());
      }
    }}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add New Donor</DialogTitle>
          <DialogDescription>
            Fill out the details for the new donor. This will add them to your master list.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditDonorForm
            key={formKey}
            onSuccess={handleSuccess}
            submitButtonText="Add Donor"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
