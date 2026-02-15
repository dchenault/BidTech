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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Auction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export type ExportSelection = {
  type: 'full' | 'specific';
  auctionId?: string;
};

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  auctions: Auction[];
  onExport: (selection: ExportSelection) => void;
  isLoadingAuctions: boolean;
  isProcessingExport: boolean;
  reportOptions?: { full: string; specific: string };
}

export function ExportDialog({
  isOpen,
  onClose,
  title,
  auctions,
  onExport,
  isLoadingAuctions,
  isProcessingExport,
  reportOptions,
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<'full' | 'specific'>('full');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (exportType === 'specific' && !selectedAuctionId) {
      toast({
        variant: 'destructive',
        title: 'Auction Not Selected',
        description: 'Please select an auction to export from.',
      });
      return;
    }
    onExport({ type: exportType, auctionId: selectedAuctionId });
  };

  const fullLabel = reportOptions ? reportOptions.full : `Full Export (All ${title})`;
  const specificLabel = reportOptions ? reportOptions.specific : `Export from a specific auction`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export {title}</DialogTitle>
          <DialogDescription>Choose the scope of your data export.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as 'full' | 'specific')} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full">{fullLabel}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="specific" />
              <Label htmlFor="specific">{specificLabel}</Label>
            </div>
          </RadioGroup>

          {exportType === 'specific' && (
            <div className="pl-6 space-y-2">
                <Label>Select Auction</Label>
                {isLoadingAuctions ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading auctions...</span>
                    </div>
                ) : (
                    <Select onValueChange={setSelectedAuctionId} value={selectedAuctionId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an auction" />
                    </SelectTrigger>
                    <SelectContent>
                        {auctions.map((auction) => (
                        <SelectItem key={auction.id} value={auction.id}>
                            {auction.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessingExport}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoadingAuctions || isProcessingExport || (exportType === 'specific' && !selectedAuctionId)}>
            {isProcessingExport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
