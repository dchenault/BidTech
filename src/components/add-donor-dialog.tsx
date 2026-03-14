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
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";

interface AddDonorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDonor: Donor) => void;
  accountId: string;
}

export function AddDonorDialog({ isOpen, onClose, onSuccess, accountId }: AddDonorDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = async (values: DonorFormValues) => {
    if (!firestore || !accountId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot add donor: database connection not available.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const donorsRef = collection(firestore, 'accounts', accountId, 'donors');
      const newDonorData: Omit<Donor, 'id'> = { 
        ...values, 
        accountId: accountId,
        // Ensure the legacy name field is populated for backward compatibility
        name: values.businessName || `${values.firstName} ${values.lastName}`.trim()
      };
      const docRef = await addDoc(donorsRef, newDonorData);
      
      const newDonor = { id: docRef.id, ...newDonorData };
      onSuccess(newDonor);
      
      const displayName = values.type === 'Business' 
        ? values.businessName 
        : `${values.firstName} ${values.lastName}`.trim();

      toast({
        title: "Donor Added!",
        description: `The details for ${displayName} have been successfully added.`,
      });

      onClose();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error Adding Donor",
        description: "Could not save the new donor. Please try again.",
      });
      console.error("Error adding donor from dialog:", error);
    } finally {
      setIsSubmitting(false);
    }
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
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
