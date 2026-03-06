'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File, AlertCircle, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import type { Category, Auction, Item, Donor } from '@/lib/types';
import { useAuctions } from '@/hooks/use-auctions';

interface ImportItemsCsvDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  auctionId?: string;
  categories?: Category[];
}

const REQUIRED_HEADERS = ['SKU', 'Name', 'Description', 'Category', 'DonorName', 'EstimatedValue', 'lotID'];

export function ImportItemsCsvDialog({
  isOpen,
  onClose,
  accountId,
  auctionId: initialAuctionId,
  categories: initialCategories,
}: ImportItemsCsvDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(initialAuctionId || '');
  
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();
  const firestore = useFirestore();
  const { toast } = useToast();

  const activeAuctions = useMemo(() => auctions.filter(a => a.status !== 'completed'), [auctions]);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsProcessing(false);
    setProgress(0);
    if (!initialAuctionId) setSelectedAuctionId('');
  }, [initialAuctionId]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const csvFile = acceptedFiles[0];
      if (csvFile) {
        setFile(csvFile);
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const receivedHeaders = results.meta.fields || [];
            const missingHeaders = REQUIRED_HEADERS.filter(h => !receivedHeaders.includes(h));

            if (missingHeaders.length > 0) {
              setError(`Missing required columns: ${missingHeaders.join(', ')}`);
              setParsedData([]);
            } else {
              setParsedData(results.data);
            }
          },
          error: (err) => setError(`Failed to parse CSV: ${err.message}`),
        });
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    disabled: isProcessing,
  });

  const handleImport = async () => {
    if (!firestore || !selectedAuctionId || parsedData.length === 0) return;

    setIsProcessing(true);
    setError(null);
    let successCount = 0;
    let newDonorsCount = 0;
    let updatedDonorsCount = 0;

    try {
      const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', selectedAuctionId);
      const auctionSnap = await getDocs(query(collection(firestore, 'accounts', accountId, 'auctions'), where('__name__', '==', selectedAuctionId)));
      const auctionData = auctionSnap.docs[0]?.data() as Auction;
      
      const categories = initialCategories || auctionData.categories || [];
      const lotsSnap = await getDocs(collection(auctionRef, 'lots'));
      const lots = lotsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Process in small batches to respect Firestore limits and keep UI responsive
      const batchSize = 25;
      for (let i = 0; i < parsedData.length; i += batchSize) {
        const chunk = parsedData.slice(i, i + batchSize);
        const batch = writeBatch(firestore);

        for (const row of chunk) {
          // 1. Reconcile Donor
          const donorName = row.DonorName?.trim();
          let donorId: string | undefined;
          let donorObj: Donor | undefined;

          if (donorName) {
            const donorsRef = collection(firestore, 'accounts', accountId, 'donors');
            const q = query(donorsRef, where('name', '==', donorName)); // Simplistic exact match, case-sensitivity depends on Firestore config
            const donorSnap = await getDocs(q);

            if (!donorSnap.empty) {
              const existingDonorDoc = donorSnap.docs[0];
              donorId = existingDonorDoc.id;
              donorObj = { id: donorId, ...existingDonorDoc.data() } as Donor;
              
              // Update missing donor info if provided in CSV
              const updatePayload: any = {};
              if (row.DonorPhone && !donorObj.phone) updatePayload.phone = row.DonorPhone;
              if (!donorObj.address) donorObj.address = {};
              if (row.DonorStreet && !donorObj.address.street) updatePayload['address.street'] = row.DonorStreet;
              if (row.DonorCity && !donorObj.address.city) updatePayload['address.city'] = row.DonorCity;
              if (row.DonorState && !donorObj.address.state) updatePayload['address.state'] = row.DonorState;
              if (row.DonorZip && !donorObj.address.zip) updatePayload['address.zip'] = row.DonorZip;

              if (Object.keys(updatePayload).length > 0) {
                batch.update(existingDonorDoc.ref, updatePayload);
                updatedDonorsCount++;
              }
            } else {
              // Create new donor
              const newDonorRef = doc(collection(firestore, 'accounts', accountId, 'donors'));
              donorId = newDonorRef.id;
              donorObj = {
                id: donorId,
                accountId,
                name: donorName,
                type: 'Individual',
                phone: row.DonorPhone || '',
                address: {
                  street: row.DonorStreet || '',
                  city: row.DonorCity || '',
                  state: row.DonorState || '',
                  zip: row.DonorZip || '',
                }
              };
              batch.set(newDonorRef, donorObj);
              newDonorsCount++;
            }
          }

          // 2. Resolve Category
          const categoryName = row.Category?.trim();
          const category = categories.find(c => c.name.toLowerCase() === categoryName?.toLowerCase()) || { id: 'cat-misc', name: categoryName || 'Misc' };

          // 3. Resolve Lot
          const lotVal = row.lotID?.trim();
          const lot = lots.find(l => l.name.toLowerCase() === lotVal?.toLowerCase() || l.id === lotVal);

          // 4. Create Item
          const itemRef = doc(collection(auctionRef, 'items'));
          const newItem: Omit<Item, 'id'> = {
            sku: row.SKU || (Date.now() + Math.floor(Math.random() * 1000)),
            name: row.Name || 'Unnamed Item',
            description: row.Description || '',
            estimatedValue: parseFloat(row.EstimatedValue) || 0,
            category,
            categoryId: category.id,
            auctionId: selectedAuctionId,
            accountId,
            paid: false,
            ...(donorId && { donorId, donor: donorObj }),
            ...(lot && { lotId: lot.id }),
          };

          batch.set(itemRef, newItem);
          successCount++;
        }

        // Update auction item count
        batch.update(auctionRef, { itemCount: increment(chunk.length) });
        
        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / parsedData.length) * 100));
      }

      toast({
        title: 'Import Successful',
        description: `Imported ${successCount} items. Created ${newDonorsCount} new donors.`,
      });
      handleClose();

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during import.');
      toast({ variant: 'destructive', title: 'Import Failed', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Auction Items</DialogTitle>
          <DialogDescription>
            Upload a CSV to add multiple items and reconcile donors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!initialAuctionId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Target Auction</label>
              {isLoadingAuctions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Select value={selectedAuctionId} onValueChange={setSelectedAuctionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an active auction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAuctions.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div
            {...getRootProps()}
            className={cn(
              'relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-input bg-transparent text-muted-foreground transition-colors hover:border-primary/50',
              isDragActive && 'border-primary bg-primary/10',
              (isProcessing || (!selectedAuctionId && !initialAuctionId)) && 'cursor-not-allowed opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center px-4">
              <UploadCloud className="mb-2 h-8 w-8" />
              <p className="font-semibold">
                {isDragActive ? 'Drop CSV file here' : 'Drag & drop or click to upload a CSV file'}
              </p>
              <p className="text-xs">Required: SKU, Name, Description, Category, DonorName, EstimatedValue, lotID</p>
            </div>
          </div>

          {parsedData.length > 0 && !error && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
                <div className="flex items-center">
                  <File className="mr-3 h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} items found in file.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Info className="h-4 w-4" />
                  Pre-flight mapping active
                </div>
              </div>

              <ScrollArea className="h-48 w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {REQUIRED_HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {REQUIRED_HEADERS.map(h => (
                          <TableCell key={h} className="text-xs truncate max-w-[150px]">
                            {row[h]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Importing items...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedData.length === 0 || !!error || isProcessing || !selectedAuctionId}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Import {parsedData.length} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
