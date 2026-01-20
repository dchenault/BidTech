
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Category, CategoryFormValues } from "@/lib/types";
import { EditCategoryForm } from "./edit-category-form";

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
  category?: Category | null;
  title: string;
  description: string;
  submitButtonText?: string;
}

export function EditCategoryDialog({
  isOpen,
  onClose,
  onSubmit,
  category,
  title,
  description,
  submitButtonText,
}: EditCategoryDialogProps) {

  const handleSuccess = (values: CategoryFormValues) => {
    onSubmit(values);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditCategoryForm 
            onSuccess={handleSuccess}
            category={category}
            submitButtonText={submitButtonText}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
