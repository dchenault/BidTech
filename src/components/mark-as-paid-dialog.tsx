
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/lib/types';

interface MarkAsPaidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => void;
  itemCount: number;
}

export function MarkAsPaidDialog({
  isOpen,
  onClose,
  onSubmit,
  itemCount,
}: MarkAsPaidDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Payment Method Required',
        description: 'Please select a payment method.',
      });
      return;
    }
    onSubmit(paymentMethod);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {itemCount} {itemCount > 1 ? 'Items' : 'Item'} as Paid</DialogTitle>
          <DialogDescription>Select the payment method used for this transaction.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Select onValueChange={(val) => setPaymentMethod(val as PaymentMethod)} value={paymentMethod}>
            <SelectTrigger>
                <SelectValue placeholder="Select a payment method" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!paymentMethod}>
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

