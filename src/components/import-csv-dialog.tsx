'use client';

import { useState, useCallback } from 'react';
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
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImportCsvDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: T[]) => Promise<{ success: boolean; message: string }>;
  expectedHeaders: string[];
  title: string;
  description: string;
}

export function ImportCsvDialog<T>({
  isOpen,
  onClose,
  onImport,
  expectedHeaders,
  title,
  description,
}: ImportCsvDialogProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsProcessing(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      resetState();
      const csvFile = acceptedFiles[0];
      if (csvFile) {
        setFile(csvFile);
        setIsProcessing(true);
        Papa.parse<T>(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const receivedHeaders = results.meta.fields || [];
            const missingHeaders = expectedHeaders.filter(
              (h) => !receivedHeaders.includes(h)
            );

            if (missingHeaders.length > 0) {
              setError(
                `The CSV file is missing required columns: ${missingHeaders.join(', ')}.`
              );
              setParsedData([]);
            } else {
              setParsedData(results.data);
            }
            setIsProcessing(false);
          },
          error: (err) => {
            setError(`Failed to parse CSV file: ${err.message}`);
            setIsProcessing(false);
          },
        });
      }
    },
    [resetState, expectedHeaders]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await onImport(parsedData);
      if (result.success) {
        toast({
          title: 'Import Successful',
          description: result.message,
        });
        handleClose();
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during import.');
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: e.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const headers = parsedData.length > 0 ? Object.keys(parsedData[0] as object) : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div
            {...getRootProps()}
            className={cn(
              'relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-input bg-transparent text-muted-foreground transition-colors hover:border-primary/50',
              isDragActive && 'border-primary bg-primary/10'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="mb-2 h-8 w-8" />
              <p className="font-semibold">
                {isDragActive ? 'Drop CSV file here' : 'Drag & drop or click to upload a CSV file'}
              </p>
            </div>
          </div>
          {file && !error && (
            <div className="flex items-center rounded-md border p-3">
              <File className="mr-3 h-6 w-6" />
              <div className="flex-grow">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} rows found.
                </p>
              </div>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {parsedData.length > 0 && !error && (
            <div>
                <h3 className="mb-2 font-semibold">Data Preview</h3>
                <ScrollArea className="h-64 w-full rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            {headers.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                            ))}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {parsedData.slice(0, 10).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                            {headers.map((header) => (
                                <TableCell key={header}>{(row as any)[header]}</TableCell>
                            ))}
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                {parsedData.length > 10 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        Showing first 10 of {parsedData.length} rows.
                    </p>
                )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedData.length === 0 || !!error || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsedData.length} Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
